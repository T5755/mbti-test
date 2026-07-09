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

  /* ---------- 主题 ---------- */
  const THEME_KEY = 'mbti-theme';
  const themeBtns = document.querySelectorAll('.theme-btn');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeBtns.forEach((b) => {
      b.classList.toggle('is-active', b.dataset.setTheme === theme);
    });
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
  }

  /* ---------- 屏幕切换 ---------- */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => {
      const active = s.id === id;
      s.classList.toggle('is-active', active);
      s.hidden = !active;
    });
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
  }

  function goNext() {
    if (state.answers[state.index] === null) return;
    if (state.index < TOTAL - 1) {
      state.index++;
      renderQuestion();
    } else {
      finishTest();
    }
  }
  function goPrev() {
    if (state.index > 0) {
      state.index--;
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
      elAnalyzing.hidden = true;
      showScreen('screen-result');
      elProgressFill.style.width = '100%';
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

  /* ---------- 事件绑定 ---------- */
  document.getElementById('start-btn').addEventListener('click', () => {
    state.index = 0;
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
    showScreen('screen-intro');
    elProgressFill.style.width = '0%';
  });

  /* ---------- 初始化 ---------- */
  initTheme();
  initMagnetic();
  showScreen('screen-intro');
})();
