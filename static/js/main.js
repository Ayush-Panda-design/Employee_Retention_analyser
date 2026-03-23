/* ═══════════════════════════════════════════════
   RetainIQ — main.js
   Features:
   · Multi-step form with progress tracking
   · Animated SVG gauge + needle on probability bar
   · Risk factor list with weight indicators
   · Retention recommendation engine
   · Session history drawer
   · Slider live-value display
   · Rating button groups & toggle groups
   · Nav scroll shadow
   · Cursor glow tracking
═══════════════════════════════════════════════ */
'use strict';

/* ────────────────────────────────────────────
   CURSOR GLOW
──────────────────────────────────────────── */
(function () {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;
  document.addEventListener('mousemove', e => {
    glow.style.left = e.clientX + 'px';
    glow.style.top  = e.clientY + 'px';
  });
})();

/* ────────────────────────────────────────────
   NAV SCROLL SHADOW
──────────────────────────────────────────── */
(function () {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ────────────────────────────────────────────
   SLIDER LIVE VALUES
──────────────────────────────────────────── */
function initSliders() {
  const map = {
    DistanceFromHome:       { el: 'distVal',    fmt: v => v + ' mi' },
    PercentSalaryHike:      { el: 'hikeVal',    fmt: v => v + '%' },
    TotalWorkingYears:      { el: 'twYearsVal', fmt: v => v + ' yrs' },
    NumCompaniesWorked:     { el: 'numCoVal',   fmt: v => v },
    YearsAtCompany:         { el: 'yacVal',     fmt: v => v + ' yrs' },
    YearsInCurrentRole:     { el: 'yicrVal',    fmt: v => v + ' yrs' },
    YearsSinceLastPromotion:{ el: 'yslpVal',    fmt: v => v + ' yrs' },
    YearsWithCurrManager:   { el: 'ywcmVal',    fmt: v => v + ' yrs' },
    TrainingTimesLastYear:  { el: 'trainVal',   fmt: v => v },
  };
  Object.entries(map).forEach(([id, cfg]) => {
    const slider = document.getElementById(id);
    const display = document.getElementById(cfg.el);
    if (!slider || !display) return;
    const update = () => { display.textContent = cfg.fmt(slider.value); };
    slider.addEventListener('input', update);
    update();
  });
}

/* ────────────────────────────────────────────
   RATING BUTTONS  (1–4 or 1–5 selectors)
──────────────────────────────────────────── */
function initRatingGroups() {
  const groups = [
    { group: 'educationRating', hidden: 'Education' },
    { group: 'jobLevelRating',  hidden: 'JobLevel' },
    { group: 'jobInvRating',    hidden: 'JobInvolvement' },
    { group: 'stockRating',     hidden: 'StockOptionLevel' },
    { group: 'jobSatRating',    hidden: 'JobSatisfaction' },
    { group: 'envSatRating',    hidden: 'EnvironmentSatisfaction' },
    { group: 'relSatRating',    hidden: 'RelationshipSatisfaction' },
    { group: 'wlbRating',       hidden: 'WorkLifeBalance' },
    { group: 'perfRating',      hidden: 'PerformanceRating' },
  ];
  groups.forEach(({ group, hidden }) => {
    const container = document.getElementById(group);
    const hiddenInput = document.getElementById(hidden);
    if (!container || !hiddenInput) return;
    container.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        hiddenInput.value = btn.dataset.val;
      });
    });
  });
}

/* ────────────────────────────────────────────
   TOGGLE GROUPS  (travel / overtime)
──────────────────────────────────────────── */
function initToggleGroups() {
  const groups = [
    { group: 'travelGroup',   hidden: 'BusinessTravel' },
    { group: 'overtimeGroup', hidden: 'OverTime' },
  ];
  groups.forEach(({ group, hidden }) => {
    const container = document.getElementById(group);
    const hiddenInput = document.getElementById(hidden);
    if (!container || !hiddenInput) return;
    container.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        hiddenInput.value = btn.dataset.val;
      });
    });
  });
}

/* ────────────────────────────────────────────
   MULTI-STEP FORM
──────────────────────────────────────────── */
function initMultiStep() {
  const pages  = document.querySelectorAll('.form-page');
  const steps  = document.querySelectorAll('.step');
  if (!pages.length) return;

  let currentPage = 1;

  function goTo(n) {
    pages.forEach(p => p.classList.remove('active'));
    steps.forEach(s => {
      const sn = parseInt(s.dataset.step);
      s.classList.remove('active', 'done');
      if (sn === n) s.classList.add('active');
      if (sn < n)   s.classList.add('done');
    });
    const target = document.querySelector(`.form-page[data-page="${n}"]`);
    if (target) { target.classList.add('active'); currentPage = n; }
    // Scroll to top of form
    document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Next / prev buttons
  document.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = parseInt(btn.dataset.next);
      goTo(next);
    });
  });
  document.querySelectorAll('[data-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prev = parseInt(btn.dataset.prev);
      goTo(prev);
    });
  });

  // Allow clicking step dots to navigate (only to already-done steps)
  steps.forEach(step => {
    step.addEventListener('click', () => {
      const n = parseInt(step.dataset.step);
      if (n < currentPage) goTo(n);
    });
  });
}

/* ────────────────────────────────────────────
   GAUGE ANIMATION
──────────────────────────────────────────── */
function animateGauge(prob) {
  const path  = document.getElementById('gaugePath');
  const dot   = document.getElementById('gaugeDot');
  const pctEl = document.getElementById('gaugePct');
  if (!path) return;

  const fraction = Math.max(0, Math.min(1, prob / 100));

  // Color thresholds
  const color = fraction < 0.40 ? '#4ade9e' : fraction < 0.65 ? '#f5c542' : '#f56565';
  path.style.stroke = color;
  path.style.strokeDashoffset = String(1 - fraction);

  // Animate needle dot position along arc
  // Arc: center (100,110), radius 80, from 180° to 0° (left to right)
  const angle = Math.PI - fraction * Math.PI; // π → 0
  const cx = 100 + 80 * Math.cos(angle);
  const cy = 110 - 80 * Math.sin(angle);
  if (dot) {
    dot.setAttribute('cx', cx.toFixed(1));
    dot.setAttribute('cy', cy.toFixed(1));
    dot.style.fill = color;
    dot.style.opacity = '1';
  }

  // Animate counter
  animateNumber(pctEl, 0, prob, 1200, '%', true);
}

function animateNumber(el, from, to, duration, suffix, svg) {
  if (!el) return;
  const start = performance.now();
  const tick = now => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val = (from + (to - from) * ease).toFixed(1);
    if (svg) el.textContent = val + suffix;
    else     el.textContent = val + suffix;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ────────────────────────────────────────────
   PROBABILITY BAR NEEDLE
──────────────────────────────────────────── */
function setProbBar(prob, threshold) {
  const needle    = document.getElementById('probNeedle');
  const threshLn  = document.getElementById('thresholdLine');
  if (needle)   { setTimeout(() => { needle.style.left = prob + '%'; }, 100); }
  if (threshLn) { threshLn.style.left = (threshold * 100) + '%'; }
}

/* ────────────────────────────────────────────
   VERDICT BOX
──────────────────────────────────────────── */
function setVerdict(prediction, prob, riskLevel) {
  const badge  = document.getElementById('verdictBadge');
  const title  = document.getElementById('verdictTitle');
  const sub    = document.getElementById('verdictSub');
  if (!badge) return;

  if (prediction === 0) {
    badge.className = 'verdict__badge verdict__badge--stay';
    badge.textContent = '● Low Attrition Risk';
    title.textContent = 'Likely to Stay';
    title.style.color = 'var(--green)';
    sub.textContent   = `${prob}% attrition probability — below decision threshold.`;
  } else if (prob < 65) {
    badge.className = 'verdict__badge verdict__badge--medium';
    badge.textContent = '◐ Moderate Attrition Risk';
    title.textContent = 'Monitor Closely';
    title.style.color = 'var(--yellow)';
    sub.textContent   = `${prob}% probability — marginal attrition risk detected.`;
  } else {
    badge.className = 'verdict__badge verdict__badge--leave';
    badge.textContent = '⚠ High Attrition Risk';
    title.textContent = 'At Risk of Leaving';
    title.style.color = 'var(--red)';
    sub.textContent   = `${prob}% probability — immediate retention action advised.`;
  }
}

/* ────────────────────────────────────────────
   RISK FACTORS
──────────────────────────────────────────── */
function renderFactors(factors) {
  const list = document.getElementById('factorsList');
  if (!list) return;
  list.innerHTML = '';
  if (!factors || !factors.length) {
    list.innerHTML = '<p style="font-size:.8rem;color:var(--text-3)">No significant risk factors detected.</p>';
    return;
  }
  factors.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = `factor-item factor-item--${f.weight}`;
    item.style.animationDelay = (i * 0.07) + 's';
    item.innerHTML = `
      <div class="factor-item__dot"></div>
      <span>${f.label}</span>
      <div class="factor-item__bar"><div class="factor-item__bar-fill"></div></div>
    `;
    list.appendChild(item);
  });
}

/* ────────────────────────────────────────────
   RECOMMENDATION ENGINE
──────────────────────────────────────────── */
function setRecommendation(prediction, prob, factors) {
  const box  = document.getElementById('recBox');
  const icon = document.getElementById('recIcon');
  const body = document.getElementById('recBody');
  if (!box) return;

  const highFactors = factors.filter(f => f.weight === 'high').map(f => f.label);
  let msg = '';
  let iconChar = '';
  let iconBg   = '';

  if (prediction === 0) {
    iconChar = '✅'; iconBg = 'rgba(74,222,158,.12)';
    msg = `Employee shows stable engagement signals. Continue regular 1:1s and ensure career development opportunities remain visible. Review compensation annually to prevent future flight risk.`;
  } else if (prob < 50) {
    iconChar = '👁️'; iconBg = 'rgba(245,197,66,.12)';
    msg = `Moderate risk detected. Schedule a career conversation within 30 days. ` +
      (highFactors.length ? `Key concerns: ${highFactors.slice(0,2).join(', ')}. ` : '') +
      `Consider workload review and growth pathway alignment.`;
  } else {
    iconChar = '🚨'; iconBg = 'rgba(245,101,101,.12)';
    msg = `High attrition risk — immediate action recommended. ` +
      (highFactors.length ? `Primary drivers: ${highFactors.slice(0,3).join(', ')}. ` : '') +
      `Engage manager for urgent retention conversation, review compensation competitiveness, and discuss near-term promotion or project opportunity.`;
  }

  icon.textContent  = iconChar;
  icon.style.background = iconBg;
  body.textContent  = msg;
}

/* ────────────────────────────────────────────
   SHOW RESULT PANEL
──────────────────────────────────────────── */
function showResult(json) {
  const placeholder = document.getElementById('resultPlaceholder');
  const panel       = document.getElementById('resultPanel');
  if (!panel) return;

  if (placeholder) placeholder.style.display = 'none';
  panel.style.display = 'block';

  const prob       = json.probability;   // 0–100
  const threshold  = json.threshold;     // 0–1
  const factors    = json.factors || [];

  animateGauge(prob);
  setProbBar(prob, threshold);
  setVerdict(json.prediction, prob, json.risk_level);
  renderFactors(factors);
  setRecommendation(json.prediction, prob, factors);

  // Smooth scroll to result on mobile
  if (window.innerWidth < 900) {
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ────────────────────────────────────────────
   FORM SUBMIT
──────────────────────────────────────────── */
function initForm() {
  const form      = document.getElementById('predict-form');
  const submitBtn = document.getElementById('submitBtn');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    submitBtn.classList.add('btn--loading');
    submitBtn.disabled = true;

    // Gather all form data
    const fd   = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    // Cast numeric fields
    const numFields = [
      'Age','DailyRate','DistanceFromHome','Education','EnvironmentSatisfaction',
      'HourlyRate','JobInvolvement','JobLevel','JobSatisfaction','MonthlyIncome',
      'MonthlyRate','NumCompaniesWorked','PercentSalaryHike','PerformanceRating',
      'RelationshipSatisfaction','StockOptionLevel','TotalWorkingYears',
      'TrainingTimesLastYear','WorkLifeBalance','YearsAtCompany',
      'YearsInCurrentRole','YearsSinceLastPromotion','YearsWithCurrManager'
    ];
    numFields.forEach(k => { if (data[k] !== undefined) data[k] = Number(data[k]); });

    try {
      const res  = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      showResult(json);
      loadHistory();
    } catch (err) {
      alert('Prediction error: ' + err.message);
    } finally {
      submitBtn.classList.remove('btn--loading');
      submitBtn.disabled = false;
    }
  });
}

/* ────────────────────────────────────────────
   HISTORY DRAWER
──────────────────────────────────────────── */
function initHistory() {
  const toggle   = document.getElementById('historyToggle');
  const drawer   = document.getElementById('historyDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const close    = document.getElementById('closeHistory');
  const clear    = document.getElementById('clearHistory');
  if (!toggle || !drawer) return;

  const openDrawer  = () => { drawer.classList.add('open'); backdrop.classList.add('show'); };
  const closeDrawer = () => { drawer.classList.remove('open'); backdrop.classList.remove('show'); };

  toggle.addEventListener('click', openDrawer);
  close?.addEventListener('click', closeDrawer);
  backdrop?.addEventListener('click', closeDrawer);

  clear?.addEventListener('click', async () => {
    await fetch('/clear_history', { method: 'POST' });
    loadHistory();
  });
}

async function loadHistory() {
  const body  = document.getElementById('historyBody');
  const count = document.getElementById('historyCount');
  if (!body) return;

  try {
    const res  = await fetch('/history');
    const json = await res.json();
    const list = json.history || [];

    if (count) {
      count.textContent = list.length;
      count.style.display = list.length ? 'inline-flex' : 'none';
    }

    if (!list.length) {
      body.innerHTML = '<p class="history-drawer__empty">No predictions yet this session.</p>';
      return;
    }

    body.innerHTML = list.map(item => `
      <div class="history-item">
        <div class="history-item__dot history-item__dot--${item.prediction === 0 ? 'stay' : item.prob >= 65 ? 'leave' : 'medium'}"></div>
        <div>
          <div class="history-item__name">${item.name || 'Anonymous'}</div>
          <div class="history-item__meta">${item.role} · ${item.department}</div>
        </div>
        <div class="history-item__prob" style="color:${item.prediction === 0 ? 'var(--green)' : item.prob >= 65 ? 'var(--red)' : 'var(--yellow)'}">${item.prob}%</div>
      </div>
    `).join('');
  } catch (e) {
    console.warn('History fetch failed:', e);
  }
}

/* ────────────────────────────────────────────
   INIT
──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSliders();
  initRatingGroups();
  initToggleGroups();
  initMultiStep();
  initForm();
  initHistory();
  loadHistory();
});