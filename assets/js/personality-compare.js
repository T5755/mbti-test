/* 双人格对比星象 —— 本地化 Three.js（UMD，零 CDN 依赖）
 * 把两颗「四维人格星形体」叠放在同一场景里，用不同颜色区分，
 * 同组旋转，形成「双人格交融」的视觉。支持拖拽旋转 + 离屏暂停。
 * 暴露：initCompare3D(canvas, dimsA, dimsB, colorA, colorB) / disposeCompare3D()
 */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') return; // 库未就绪则静默降级

  let renderer = null, scene = null, camera = null, parent = null, rafId = null;
  let container = null, canvas = null, ro = null, io = null;
  let dragging = false, lastX = 0, lastY = 0, velX = 0, velY = 0, paused = false;

  // 正四面体 4 个顶点方向（归一化），互为反方向代表同一维度的两极
  const DIRS = [n([1, 1, 1]), n([1, -1, -1]), n([-1, 1, -1]), n([-1, -1, 1])];
  const DIM_ORDER = ['EI', 'SN', 'TF', 'JP'];
  const POS_POLE = { EI: 'E', SN: 'S', TF: 'T', JP: 'J' };

  function n(v) { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; }
  function mul(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }

  function buildStar(dims, lineColor, pointColor) {
    const group = new THREE.Group();
    const strength = [0.5, 0.5, 0.5, 0.5];
    dims.forEach((d) => {
      const i = DIM_ORDER.indexOf(d.dim);
      if (i < 0) return;
      const pPlus = (d.win === POS_POLE[d.dim]) ? d.pct / 100 : (100 - d.pct) / 100;
      strength[i] = Math.max(0.08, Math.min(1, pPlus));
    });
    const pts = [];
    DIRS.forEach((dir, i) => {
      pts.push(mul(dir, 0.45 + 1.25 * strength[i]));
      pts.push(mul(dir, -(0.45 + 1.25 * (1 - strength[i]))));
    });

    // 端点发光球 + 光晕
    pts.forEach((p) => {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 14, 14),
        new THREE.MeshBasicMaterial({ color: pointColor })
      );
      s.position.set(p[0], p[1], p[2]); group.add(s);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 14, 14),
        new THREE.MeshBasicMaterial({ color: pointColor, transparent: true, opacity: 0.24 })
      );
      halo.position.set(p[0], p[1], p[2]); group.add(halo);
    });

    // 16-cell 边（24 条），半透明以便两颗叠加时互相透出
    const verts = [];
    for (let a = 0; a < 8; a++) {
      for (let b = a + 1; b < 8; b++) {
        if ((a >> 1) === (b >> 1)) continue;
        verts.push(pts[a][0], pts[a][1], pts[a][2], pts[b][0], pts[b][1], pts[b][2]);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    group.add(new THREE.LineSegments(
      lg, new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.8 })
    ));

    // 中心小核
    group.add(new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 18, 18),
      new THREE.MeshBasicMaterial({ color: pointColor, transparent: true, opacity: 0.9 })
    ));
    return group;
  }

  function initCompare3D(canvasEl, dimsA, dimsB, colorA, colorB) {
    disposeCompare3D();
    canvas = canvasEl;
    container = canvas.parentElement;
    paused = false;

    const w = container.clientWidth || 300, h = container.clientHeight || 240;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 0, 4.8);

    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (err) {
      disposeCompare3D();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    parent = new THREE.Group();
    scene.add(parent);
    parent.add(buildStar(dimsA, colorA, colorA));
    parent.add(buildStar(dimsB, colorB, colorB));
    parent.rotation.x = 0.45;

    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    ro = new ResizeObserver(() => {
      if (!renderer || !container) return;
      const W = container.clientWidth || 300, H = container.clientHeight || 240;
      camera.aspect = W / H; camera.updateProjectionMatrix();
      renderer.setSize(W, H, false);
    });
    ro.observe(container);

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
        parent.rotation.y += 0.006;
        parent.rotation.x += 0.0014;
      } else {
        parent.rotation.y += velY;
        parent.rotation.x += velX;
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
    parent.rotation.y += velY; parent.rotation.x += velX;
  }
  function onUp() { dragging = false; }

  function disposeCompare3D() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    paused = true;
    if (ro) { ro.disconnect(); ro = null; }
    if (io) { io.disconnect(); io = null; }
    if (canvas) {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    if (parent) parent.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
    if (renderer) { renderer.dispose(); renderer = null; }
    scene = null; parent = null; canvas = null; container = null;
  }

  window.initCompare3D = initCompare3D;
  window.disposeCompare3D = disposeCompare3D;
})();
