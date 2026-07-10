// 类型档案页：读 ?t=CODE 渲染对应人格详情
(function () {
  'use strict';

  const DIMS = ['EI', 'SN', 'TF', 'JP'];
  const THEME_KEY = 'mbti-theme';

  /* ---------- 主题 ---------- */
  const meta = document.getElementById('meta-theme-color');
  function effective() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return t;
  }
  function sync() { if (meta) meta.setAttribute('content', effective() === 'dark' ? '#0c0d14' : '#f4f5fb'); }
  function applyTheme(th) {
    document.documentElement.setAttribute('data-theme', th);
    document.querySelectorAll('.theme-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.setTheme === th));
    sync();
  }
  applyTheme(localStorage.getItem(THEME_KEY) || 'system');
  document.querySelectorAll('.theme-btn').forEach((b) => {
    b.addEventListener('click', () => { localStorage.setItem(THEME_KEY, b.dataset.setTheme); applyTheme(b.dataset.setTheme); });
  });

  /* ---------- 强调色 ---------- */
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

  /* ---------- 取参数并渲染 ---------- */
  const params = new URLSearchParams(location.search);
  let code = (params.get('t') || '').toUpperCase();
  if (!TYPES[code]) code = 'INTJ';
  const t = TYPES[code];

  document.title = `${code} ${t.name} · MBTI 类型档案`;
  document.getElementById('result-title').textContent = code;
  document.getElementById('result-name').textContent = `${t.name} · ${t.en}`;
  document.getElementById('result-tagline').textContent = t.tagline;
  document.getElementById('result-desc').textContent = t.desc;

  // 逐维度解读（类型固有，四字母即各维度偏好）
  const dd = document.getElementById('dim-details');
  DIMS.forEach((dim) => {
    const pole = code[DIMS.indexOf(dim)];
    const li = document.createElement('li');
    li.innerHTML = `<span class="dd-tag">${DIM_LABELS[dim][pole]}</span><span>${DIM_EXPLAIN[dim][pole]}</span>`;
    dd.appendChild(li);
  });

  function fill(id, items) {
    const ul = document.getElementById(id);
    ul.innerHTML = '';
    items.forEach((it) => { const li = document.createElement('li'); li.textContent = it; ul.appendChild(li); });
  }
  fill('strengths', t.strengths);
  fill('growth', t.growth);
  fill('fields', t.fields);
  fill('celebrities', t.celebrities);
  document.getElementById('love').textContent = t.love;

  // 强调色随类型
  const c = TYPE_ACCENT[code] || '#6366f1';
  document.documentElement.style.setProperty('--accent', c);
  document.documentElement.style.setProperty('--accent-2', shade(c, 30));
  sync();

  // PWA：注册 Service Worker（离线可看档案）
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
