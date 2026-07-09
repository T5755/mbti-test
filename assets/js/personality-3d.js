/* 3D 人格星形体 —— 本地化 Three.js（UMD，零 CDN 依赖）
 * 4 个二分维度映射为正四面体 4 条体对角线（±方向），
 * 沿每条轴按偏好强度拉伸 8 个端点，连线构成 4D 正叉多胞体(16-cell)的 3D 投影。
 * 配色跟随站点 --accent / --accent-2，自动旋转 + 拖拽 + 离屏暂停。
 */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') return; // 库未就绪则静默降级，不报错

  let renderer = null, scene = null, camera = null, group = null, rafId = null;
  let container = null, canvas = null, ro = null, io = null;
  let dragging = false, lastX = 0, lastY = 0, velX = 0, velY = 0, paused = false;

  // 正四面体 4 个顶点方向（归一化），互为反方向代表同一维度的两极
  const DIRS = [n([1, 1, 1]), n([1, -1, -1]), n([-1, 1, -1]), n([-1, -1, 1])];
  const DIM_ORDER = ['EI', 'SN', 'TF', 'JP'];
  const POS_POLE = { EI: 'E', SN: 'S', TF: 'T', JP: 'J' };

  function n(v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
  function mul(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }

  function initPersonality3D(res) {
    disposePersonality3D();
    const cv = document.getElementById('personality-3d');
    if (!cv) return;
    canvas = cv;
    container = canvas.parentElement;
    paused = false;

    const cs = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue('--accent').trim() || '#6366f1';
    const accent2 = cs.getPropertyValue('--accent-2').trim() || '#8b5cf6';

    // 每维偏好强度（0~1）：win 极强度 = pct/100
    const strength = [0.5, 0.5, 0.5, 0.5];
    (res.dims || []).forEach((d) => {
      const i = DIM_ORDER.indexOf(d.dim);
      if (i < 0) return;
      const pPlus = (d.win === POS_POLE[d.dim]) ? d.pct / 100 : (100 - d.pct) / 100;
      strength[i] = Math.max(0.08, Math.min(1, pPlus));
    });

    // 8 个端点：沿 4 方向 ±拉伸
    const pts = [];
    DIRS.forEach((dir, i) => {
      pts.push(mul(dir, 0.45 + 1.25 * strength[i]));
      pts.push(mul(dir, -(0.45 + 1.25 * (1 - strength[i]))));
    });

    const w = container.clientWidth || 300, h = container.clientHeight || 240;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 0, 4.6);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    group = new THREE.Group();
    scene.add(group);

    // 中心发光核
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 24, 24),
      new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.92 })
    ));

    // 端点发光球 + 光晕
    pts.forEach((p) => {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 16, 16),
        new THREE.MeshBasicMaterial({ color: accent2 })
      );
      s.position.set(p[0], p[1], p[2]); group.add(s);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 16, 16),
        new THREE.MeshBasicMaterial({ color: accent2, transparent: true, opacity: 0.16 })
      );
      halo.position.set(p[0], p[1], p[2]); group.add(halo);
    });

    // 16-cell 边：所有非本轴对顶点的连线（24 条）
    const verts = [];
    for (let a = 0; a < 8; a++) {
      for (let b = a + 1; b < 8; b++) {
        if ((a >> 1) === (b >> 1)) continue; // 跳过同一轴的正负两端点
        verts.push(pts[a][0], pts[a][1], pts[a][2], pts[b][0], pts[b][1], pts[b][2]);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    group.add(new THREE.LineSegments(
      lg, new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.5 })
    ));

    // 外层半透明线框壳，增加空间感
    group.add(new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 1),
      new THREE.MeshBasicMaterial({ color: accent, wireframe: true, transparent: true, opacity: 0.07 })
    ));

    group.rotation.x = 0.4;

    // 交互：指针拖拽旋转（鼠标 + 触摸统一）
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    // 自适应容器尺寸
    ro = new ResizeObserver(() => {
      if (!renderer || !container) return;
      const W = container.clientWidth || 300, H = container.clientHeight || 240;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
    });
    ro.observe(container);

    // 离屏暂停，省电
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((es) => {
        es.forEach((e) => { paused = !e.isIntersecting; if (!paused && !rafId) animate(); });
      }, { threshold: 0.05 });
      io.observe(container);
    }

    animate();
  }

  function animate() {
    if (rafId) cancelAnimationFrame(rafId);
    const loop = () => {
      if (paused) { rafId = null; return; }
      if (!dragging) {
        group.rotation.y += 0.006;
        group.rotation.x += 0.0014;
      } else {
        group.rotation.y += velY;
        group.rotation.x += velX;
        velX *= 0.92; velY *= 0.92;
      }
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function onDown(e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    velY = dx * 0.005; velX = dy * 0.005;
    group.rotation.y += velY; group.rotation.x += velX;
  }
  function onUp() { dragging = false; }

  function disposePersonality3D() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    paused = true;
    if (ro) { ro.disconnect(); ro = null; }
    if (io) { io.disconnect(); io = null; }
    if (canvas) {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    if (group) group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    if (renderer) { renderer.dispose(); renderer = null; }
    scene = null; group = null; canvas = null; container = null;
  }

  window.initPersonality3D = initPersonality3D;
  window.disposePersonality3D = disposePersonality3D;
})();
