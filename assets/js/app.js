/* ============================================================
   MBTI 测试站 · 交互与计分逻辑
   ============================================================ */
(function () {
  'use strict';

  const TOTAL = QUESTIONS.length; // 28
  const DIMS = ['EI', 'SN', 'TF', 'JP'];
  const FIRST_POLE = { EI: 'E', SN: 'S', TF: 'T', JP: 'J' };

  const state = {
    index: 0,
    answers: new Array(TOTAL).fill(null),
  };

  /* ---------- 工具：本地存储 / 兼容性 / 主题色 ---------- */
  const PROGRESS_KEY = 'mbti-progress';
  const HISTORY_KEY = 'mbti-history';
  const MAX_HISTORY = 6;

  function saveProgress() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ index: state.index, answers: state.answers }));
    } catch (e) {}
  }
  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p && typeof p.index === 'number' && Array.isArray(p.answers)) return p;
    } catch (e) {}
    return null;
  }
  function clearProgress() {
    try { localStorage.removeItem(PROGRESS_KEY); } catch (e) {}
  }

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (e) { return []; }
  }
  function addHistory(code) {
    try {
      const list = getHistory().filter((h) => h.code !== code);
      list.unshift({ code, date: Date.now() });
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
    } catch (e) {}
  }

  // 各类型强调色（覆盖 CSS 变量，让结果页随类型变色）
  const TYPE_ACCENT = {
    INTJ: '#6366f1', INTP: '#0ea5e9', ENTJ: '#4f46e5', ENTP: '#06b6d4',
    INFJ: '#8b5cf6', INFP: '#ec4899', ENFJ: '#a855f7', ENFP: '#f43f5e',
    ISTJ: '#0d9488', ISFJ: '#14b8a6', ESTJ: '#0891b2', ESFJ: '#10b981',
    ISTP: '#64748b', ISFP: '#f59e0b', ESTP: '#ef4444', ESFP: '#f97316',
  };
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function setAccentForType(code) {
    const c = TYPE_ACCENT[code] || '#6366f1';
    document.documentElement.style.setProperty('--accent', c);
    document.documentElement.style.setProperty('--accent-2', shade(c, 30));
    syncThemeColor();
  }
  function resetAccent() {
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent-2');
  }

  // 兼容性计算：同维度 +12，互补维度给不同奖励，基础 40
  function compat(a, b) {
    const order = ['EI', 'SN', 'TF', 'JP'];
    let score = 40; const shared = [], diff = [];
    order.forEach((d, i) => {
      const ca = a[i], cb = b[i];
      if (ca === cb) { score += 12; shared.push(ca); }
      else { score += { EI: 0, SN: 3, TF: 6, JP: 4 }[d]; diff.push(d); }
    });
    return { score: Math.min(98, score), shared, diff };
  }

  /* ---------- 主题 ---------- */
  const THEME_KEY = 'mbti-theme';
  const themeBtns = document.querySelectorAll('.theme-btn');
  const metaThemeColor = document.getElementById('meta-theme-color');

  // 解析出实际生效的主题（system 需结合系统偏好）
  function effectiveTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return t;
  }

  // 同步移动端浏览器状态栏配色
  function syncThemeColor() {
    if (!metaThemeColor) return;
    metaThemeColor.setAttribute('content', effectiveTheme() === 'dark' ? '#0c0d14' : '#f4f5fb');
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeBtns.forEach((b) => {
      b.classList.toggle('is-active', b.dataset.setTheme === theme);
    });
    syncThemeColor();
  }
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'system';
    applyTheme(saved);
    themeBtns.forEach((b) => {
      b.addEventListener('click', () => {
        const t = b.dataset.setTheme;
        localStorage.setItem(THEME_KEY, t);
        applyTheme(t);
      });
    });
    // 跟随系统模式下，系统配色变化也实时同步状态栏
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', syncThemeColor);
    else if (mq.addListener) mq.addListener(syncThemeColor);
  }

  /* ---------- 屏幕切换 ---------- */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => {
      const active = s.id === id;
      s.classList.toggle('is-active', active);
      s.hidden = !active;
    });
    if (id !== 'screen-result') stopParticles();
  }

  /* ---------- 磁性按钮 ---------- */
  function initMagnetic() {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.28;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- 测试流程 ---------- */
  const elCounter = document.getElementById('test-counter');
  const elDim = document.getElementById('test-dim');
  const elQuestion = document.getElementById('test-question');
  const elScale = document.getElementById('scale');
  const scaleOpts = Array.from(elScale.querySelectorAll('.scale-opt'));
  const elPrev = document.getElementById('prev-btn');
  const elNext = document.getElementById('next-btn');
  const elProgressFill = document.getElementById('progress-fill');
  const elProgress = document.getElementById('progress-bar');

  function renderQuestion() {
    const q = QUESTIONS[state.index];
    elCounter.textContent = `第 ${state.index + 1} / ${TOTAL} 题`;
    elDim.textContent = DIM_LABELS[q.dim][q.pole];
    elQuestion.textContent = q.text;

    const answered = state.answers[state.index];
    scaleOpts.forEach((opt) => {
      const val = Number(opt.dataset.value);
      const checked = answered === val;
      opt.setAttribute('aria-checked', checked ? 'true' : 'false');
      opt.tabIndex = checked ? 0 : -1;
    });

    elPrev.disabled = state.index === 0;
    elNext.disabled = answered === null;
    elNext.textContent = state.index === TOTAL - 1 ? '查看结果' : '下一题';

    const pct = (state.index / TOTAL) * 100;
    elProgressFill.style.width = pct + '%';
    elProgress.setAttribute('aria-valuenow', String(state.index));

    // 进场动画
    elQuestion.style.animation = 'none';
    void elQuestion.offsetWidth;
    elQuestion.style.animation = 'screenIn 0.4s var(--ease)';
  }

  function selectOption(val) {
    state.answers[state.index] = val;
    scaleOpts.forEach((opt) => {
      const checked = Number(opt.dataset.value) === val;
      opt.setAttribute('aria-checked', checked ? 'true' : 'false');
      opt.tabIndex = checked ? 0 : -1;
    });
    elNext.disabled = false;
    saveProgress();
  }

  function goNext() {
    if (state.answers[state.index] === null) return;
    if (state.index < TOTAL - 1) {
      state.index++;
      saveProgress();
      renderQuestion();
    } else {
      finishTest();
    }
  }
  function goPrev() {
    if (state.index > 0) {
      state.index--;
      saveProgress();
      renderQuestion();
    }
  }

  /* ---------- 计分 ---------- */
  function computeResult() {
    const scores = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    QUESTIONS.forEach((q, i) => {
      const r = state.answers[i] || 3;
      scores[q.pole] += r;
      const opp = opposite(q.dim, q.pole);
      scores[opp] += (6 - r);
    });

    const code = DIMS.map((dim) => {
      const first = FIRST_POLE[dim];
      return scores[first] >= scores[other(dim, first)] ? first : other(dim, first);
    }).join('');

    const dims = DIMS.map((dim) => {
      const first = FIRST_POLE[dim];
      const second = other(dim, first);
      const win = scores[first] >= scores[second] ? first : second;
      const winScore = scores[win];
      const pct = Math.round((winScore / 42) * 100);
      return { dim, win, pct, fromLeft: win === first };
    });

    return { code, dims };
  }

  function other(dim, pole) {
    const pair = dim.split('');
    return pair[0] === pole ? pair[1] : pair[0];
  }
  function opposite(dim, pole) { return other(dim, pole); }

  /* ---------- 结果渲染 ---------- */
  const elType = document.getElementById('result-title');
  const elName = document.getElementById('result-name');
  const elTagline = document.getElementById('result-tagline');
  const elDesc = document.getElementById('result-desc');
  const elDims = document.getElementById('dims');
  const elStrengths = document.getElementById('strengths');
  const elGrowth = document.getElementById('growth');
  const elFields = document.getElementById('fields');
  const elAnalyzing = document.getElementById('analyzing');
  const elCopyHint = document.getElementById('copy-hint');
  const elDimDetails = document.getElementById('dim-details');
  const elCelebrities = document.getElementById('celebrities');
  const elLove = document.getElementById('love');

  function renderResult(res) {
    const t = TYPES[res.code];
    elType.textContent = res.code;
    elName.textContent = `${t.name} · ${t.en}`;
    elTagline.textContent = t.tagline;
    elDesc.textContent = t.desc;

    elDims.innerHTML = '';
    res.dims.forEach((d) => {
      const row = document.createElement('div');
      row.className = 'dim-row';
      const label = DIM_LABELS[d.dim][d.win];
      row.innerHTML =
        `<span class="dim-label">${label}</span>` +
        `<span class="dim-track"><span class="dim-fill${d.fromLeft ? '' : ' flip'}"></span></span>` +
        `<span class="dim-pct">${d.pct}%</span>`;
      elDims.appendChild(row);
      // 触发动画
      const fill = row.querySelector('.dim-fill');
      requestAnimationFrame(() => { fill.style.width = d.pct + '%'; });
    });

    fillList(elStrengths, t.strengths);
    fillList(elGrowth, t.growth);
    fillList(elFields, t.fields);

    // 逐维度解读
    if (elDimDetails) {
      elDimDetails.innerHTML = '';
      res.dims.forEach((d) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="dd-tag">${DIM_LABELS[d.dim][d.win]}</span><span>${DIM_EXPLAIN[d.dim][d.win]}</span>`;
        elDimDetails.appendChild(li);
      });
    }
    // 名人 & 恋爱建议
    if (elCelebrities) fillList(elCelebrities, t.celebrities);
    if (elLove) elLove.textContent = t.love;

    // 强调色随人格类型变化
    setAccentForType(res.code);

    // 类型字母逐个浮现
    if (elType) {
      elType.innerHTML = '';
      res.code.split('').forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.textContent = ch;
        span.style.animationDelay = (0.09 * i) + 's';
        elType.appendChild(span);
      });
    }

    elCopyHint.textContent = '';
  }

  function fillList(ul, items) {
    ul.innerHTML = '';
    items.forEach((it) => {
      const li = document.createElement('li');
      li.textContent = it;
      ul.appendChild(li);
    });
  }

  function finishTest() {
    elAnalyzing.hidden = false;
    setTimeout(() => {
      const res = computeResult();
      renderResult(res);
      addHistory(res.code);
      clearProgress();
      elAnalyzing.hidden = true;
      showScreen('screen-result');
      elProgressFill.style.width = '100%';
      startParticles();
    }, 850);
  }

  /* ---------- 复制结果 ---------- */
  function buildShareText(res) {
    const t = TYPES[res.code];
    const lines = res.dims.map((d) => `· ${DIM_LABELS[d.dim][d.win]}（${d.pct}%）`).join('\n');
    return (
      `我的 MBTI 是 ${res.code} · ${t.name}\n` +
      `${t.tagline}\n\n` +
      `${t.desc}\n\n` +
      `四维度倾向：\n${lines}\n\n` +
      `—— 来自 MBTI 人格测试`
    );
  }

  document.getElementById('copy-btn').addEventListener('click', async () => {
    const res = computeResult();
    const text = buildShareText(res);
    try {
      await navigator.clipboard.writeText(text);
      elCopyHint.textContent = '已复制，去分享给朋友吧！';
    } catch (e) {
      // 降级方案
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); elCopyHint.textContent = '已复制，去分享给朋友吧！'; }
      catch (_) { elCopyHint.textContent = '复制失败，请手动选择文本。'; }
      document.body.removeChild(ta);
    }
  });

  /* ---------- 结果粒子背景（原生 canvas，零依赖） ---------- */
  let particleRAF = null;
  function startParticles() {
    const cv = document.getElementById('result-canvas');
    if (!cv) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const ctx = cv.getContext('2d');
    const rect = cv.getBoundingClientRect();
    if (rect.width < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = rect.width * dpr; cv.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6366f1';
    const N = Math.min(48, Math.max(18, Math.floor(W * H / 9000)));
    const ps = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2 + 1,
    }));
    function frame() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = accent;
      ps.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      particleRAF = requestAnimationFrame(frame);
    }
    cancelAnimationFrame(particleRAF);
    particleRAF = requestAnimationFrame(frame);
  }
  function stopParticles() {
    if (particleRAF) cancelAnimationFrame(particleRAF);
    particleRAF = null;
  }

  /* ---------- 生成分享长图 ---------- */
  function generateShareImage() {
    const res = computeResult();
    const t = TYPES[res.code];
    const W = 1080, H = 1350;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6366f1';
    const accent2 = getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim() || '#8b5cf6';

    const bg = x.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0c0d14'); bg.addColorStop(1, '#1a1430');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    const glow = x.createRadialGradient(W * 0.82, H * 0.08, 0, W * 0.82, H * 0.08, 620);
    glow.addColorStop(0, hexA(accent, 0.55)); glow.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = glow; x.fillRect(0, 0, W, H);

    x.textAlign = 'center';
    x.fillStyle = '#b3b6ff'; x.font = '600 34px system-ui, sans-serif';
    x.fillText('我的人格类型是', W / 2, 170);

    const grad = x.createLinearGradient(W / 2 - 300, 0, W / 2 + 300, 0);
    grad.addColorStop(0, accent); grad.addColorStop(1, accent2);
    x.fillStyle = grad; x.font = '800 200px system-ui, sans-serif';
    x.fillText(res.code, W / 2, 390);

    x.fillStyle = '#f2f3f8'; x.font = '700 54px system-ui, sans-serif';
    x.fillText(`${t.name} · ${t.en}`, W / 2, 480);
    x.fillStyle = accent; x.font = '600 36px system-ui, sans-serif';
    x.fillText(t.tagline, W / 2, 540);

    let y = 650;
    res.dims.forEach((d) => {
      const label = DIM_LABELS[d.dim][d.win];
      x.fillStyle = '#b6b9cc'; x.font = '600 30px system-ui'; x.textAlign = 'left';
      x.fillText(label, 120, y + 22);
      const bx = 360, bw = 520, bh = 22;
      x.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(x, bx, y, bw, bh, 11); x.fill();
      const fg = x.createLinearGradient(bx, 0, bx + bw, 0); fg.addColorStop(0, accent); fg.addColorStop(1, accent2);
      x.fillStyle = fg;
      const fw = bw * d.pct / 100;
      if (d.fromLeft) roundRect(x, bx, y, fw, bh, 11); else roundRect(x, bx + bw - fw, y, fw, bh, 11);
      x.fill();
      x.fillStyle = '#8a8fa3'; x.font = '600 26px system-ui'; x.textAlign = 'right';
      x.fillText(d.pct + '%', 1000, y + 22);
      y += 72;
    });

    x.textAlign = 'center'; x.fillStyle = '#b6b9cc'; x.font = '400 30px system-ui';
    wrapText(x, t.desc, W / 2, 980, 840, 46);

    x.fillStyle = '#777b90'; x.font = '500 28px system-ui';
    x.fillText('MBTI 人格测试 · mbti-tjc.xyz', W / 2, H - 60);

    const url = cv.toDataURL('image/png');
    document.getElementById('share-img').src = url;
    document.getElementById('share-download').href = url;
    document.getElementById('share-modal').hidden = false;
  }
  function roundRect(ctx, rx, ry, w, h, r) {
    if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.arcTo(rx + w, ry, rx + w, ry + h, r);
    ctx.arcTo(rx + w, ry + h, rx, ry + h, r);
    ctx.arcTo(rx, ry + h, rx, ry, r);
    ctx.arcTo(rx, ry, rx + w, ry, r);
    ctx.closePath();
  }
  function wrapText(ctx, text, cx, y, maxW, lh) {
    const chars = text.split('');
    let line = ''; const lines = [];
    for (const ch of chars) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; }
      else line += ch;
    }
    if (line) lines.push(line);
    lines.slice(0, 4).forEach((ln, i) => ctx.fillText(ln, cx, y + i * lh));
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  /* ---------- 配对功能 ---------- */
  let pairMeCode = '';
  function openPair() {
    const res = computeResult();
    pairMeCode = res.code;
    document.getElementById('pair-me').textContent = res.code;
    const grid = document.getElementById('pair-grid');
    grid.innerHTML = '';
    TYPE_ORDER.forEach((code) => {
      const b = document.createElement('button');
      b.className = 'pair-opt'; b.type = 'button'; b.textContent = code;
      b.addEventListener('click', () => {
        grid.querySelectorAll('.pair-opt').forEach((o) => o.classList.remove('is-active'));
        b.classList.add('is-active');
        showPairResult(pairMeCode, code);
      });
      grid.appendChild(b);
    });
    document.getElementById('pair-result').hidden = true;
    document.getElementById('pair-modal').hidden = false;
  }
  function closePair() { document.getElementById('pair-modal').hidden = true; }
  function showPairResult(a, b) {
    const r = compat(a, b);
    document.getElementById('pair-score-num').textContent = r.score;
    let verdict;
    if (r.score >= 85) verdict = '天作之合';
    else if (r.score >= 75) verdict = '默契搭档';
    else if (r.score >= 65) verdict = '互补成长';
    else verdict = '差异磨合';
    document.getElementById('pair-verdict').textContent = verdict;
    const sharedTxt = r.shared.length ? `你们在 ${r.shared.join(' ')} 上高度一致，` : '';
    const diffTxt = r.diff.length ? `在 ${r.diff.join(' ')} 上互补，多些理解会更顺。` : `几乎同频，天然合拍。`;
    document.getElementById('pair-detail').textContent = sharedTxt + diffTxt;
    document.getElementById('pair-result').hidden = false;
  }

  /* ---------- 历史记录渲染 ---------- */
  function renderHistory() {
    const section = document.getElementById('history-section');
    const list = document.getElementById('history-list');
    const items = getHistory();
    if (!items.length) { section.hidden = true; return; }
    section.hidden = false;
    list.innerHTML = '';
    items.forEach((h) => {
      const t = TYPES[h.code];
      const li = document.createElement('li');
      li.className = 'history-item';
      const d = new Date(h.date);
      li.innerHTML = `<span class="hi-code">${h.code}</span><span class="hi-date">${t ? t.name : ''} · ${d.getMonth() + 1}/${d.getDate()}</span>`;
      li.addEventListener('click', () => { window.open('type.html?t=' + h.code, '_blank'); });
      list.appendChild(li);
    });
  }
  function setupResume() {
    const p = loadProgress();
    if (p && p.index > 0 && p.answers.some((a) => a !== null)) {
      const btn = document.getElementById('start-btn');
      btn.textContent = `继续测试（第 ${p.index + 1} 题）`;
      btn.dataset.resume = '1';
    }
  }

  /* ---------- 事件绑定 ---------- */
  document.getElementById('start-btn').addEventListener('click', () => {
    const btn = document.getElementById('start-btn');
    if (btn.dataset.resume === '1') {
      const p = loadProgress();
      if (p) { state.index = p.index; state.answers = p.answers; }
      btn.dataset.resume = '';
      btn.textContent = '开始测试';
    } else {
      state.index = 0;
      state.answers = new Array(TOTAL).fill(null);
    }
    clearProgress();
    showScreen('screen-test');
    renderQuestion();
  });

  scaleOpts.forEach((opt) => {
    opt.addEventListener('click', () => selectOption(Number(opt.dataset.value)));
  });

  // 键盘左右切换选项
  elScale.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const cur = Number(document.activeElement?.dataset?.value) || 3;
    let next = e.key === 'ArrowRight' ? cur + 1 : cur - 1;
    next = Math.max(1, Math.min(5, next));
    const target = scaleOpts.find((o) => Number(o.dataset.value) === next);
    if (target) { target.focus(); selectOption(next); }
    e.preventDefault();
  });

  elNext.addEventListener('click', goNext);
  elPrev.addEventListener('click', goPrev);

  document.getElementById('retest-btn').addEventListener('click', () => {
    state.index = 0;
    state.answers = new Array(TOTAL).fill(null);
    clearProgress();
    resetAccent();
    showScreen('screen-intro');
    elProgressFill.style.width = '0%';
  });

  // 结果页新功能按钮
  document.getElementById('share-img-btn').addEventListener('click', generateShareImage);
  document.getElementById('pair-btn').addEventListener('click', openPair);
  document.getElementById('type-page-btn').addEventListener('click', () => {
    const res = computeResult();
    window.open('type.html?t=' + res.code, '_blank');
  });
  document.getElementById('clear-history-btn').addEventListener('click', () => {
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
    renderHistory();
  });
  document.querySelectorAll('[data-close-pair]').forEach((el) => el.addEventListener('click', closePair));
  document.querySelectorAll('[data-close-share]').forEach((el) => el.addEventListener('click', () => {
    document.getElementById('share-modal').hidden = true;
  }));

  /* ---------- 初始化 ---------- */
  initTheme();
  initMagnetic();
  renderHistory();
  setupResume();
  showScreen('screen-intro');
})();
