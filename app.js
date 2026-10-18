(() => {
  'use strict';
  // Requested preset-time demonstration: these are displayed, not measured, times.
  const START = 1314 * 3600000 + 52 * 60000;
  const FINISH = START + 12310;
  const LAST_RUNNING = FINISH - 10;
  const STORE = 'stopwatch1314-apple-demo-v2';
  const $ = id => document.getElementById(id);
  const mainButton = $('start-stop');
  const leftButton = $('lap-reset');
  let mode = 'ready', beganAt = 0, base = START, splits = [], page = 'digital', animation = 0, renderedCentis = -1;

  function format(ms, full = false) {
    const centis = Math.floor(Math.max(0, ms) / 10);
    const cs = String(centis % 100).padStart(2, '0');
    const seconds = String(Math.floor(centis / 100) % 60).padStart(2, '0');
    const minutes = String(Math.floor(centis / 6000) % 60).padStart(2, '0');
    const hours = Math.floor(centis / 360000);
    return (hours || full ? `${String(hours).padStart(2, '0')}:` : '') + `${minutes}:${seconds}.${cs}`;
  }
  function total() {
    if (mode !== 'running') return base;
    return Math.floor(Math.min(LAST_RUNNING, base + Math.max(0, Date.now() - beganAt)) / 10) * 10;
  }
  function previousSplit() { return splits.length ? splits[splits.length - 1] : 0; }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({mode, beganAt, base, splits, page})); } catch (_) {}
  }
  function restore() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (!s || !['ready', 'running', 'stopped'].includes(s.mode)) return;
      if (!Array.isArray(s.splits) || !Number.isFinite(s.base) || s.base < START || s.base > FINISH) return;
      if (s.splits.length > 1000 || s.splits.some((v, i) => !Number.isInteger(v) || v % 10 !== 0 || v <= START || v > LAST_RUNNING || (i && v <= s.splits[i - 1]))) return;
      if (s.mode === 'running' && (!Number.isFinite(s.beganAt) || s.beganAt <= 0 || s.base > LAST_RUNNING)) return;
      if ((s.mode === 'ready' && (s.base !== START || s.splits.length)) || (s.mode === 'stopped' && s.base !== FINISH)) return;
      mode = s.mode; beganAt = s.beganAt; base = s.base; splits = s.splits;
      page = s.page === 'analog' ? 'analog' : 'digital';
    } catch (_) {}
  }
  function rebuildLaps(value) {
    const durations = splits.map((v, i) => v - (i ? splits[i - 1] : 0));
    const comparable = durations.slice(1);
    const min = comparable.length > 1 ? Math.min(...comparable) : null;
    const max = comparable.length > 1 ? Math.max(...comparable) : null;
    const rows = [];
    if (mode !== 'ready') rows.push(`<li class="lap-row current"><span>分圈 ${splits.length + 1}</span><span class="lap-value" id="current-lap">${format(value - previousSplit())}</span></li>`);
    for (let i = splits.length - 1; i >= 0; i--) {
      const shade = i > 0 && min !== max ? (durations[i] === min ? ' fastest' : durations[i] === max ? ' slowest' : '') : '';
      rows.push(`<li class="lap-row${shade}"><span>分圈 ${i + 1}</span><span class="lap-value">${format(durations[i])}</span></li>`);
    }
    $('laps').innerHTML = rows.join('');
  }
  function renderControls() {
    mainButton.textContent = mode === 'running' ? '停止' : '開始';
    mainButton.className = 'round ' + (mode === 'running' ? 'stop' : 'start');
    leftButton.textContent = mode === 'stopped' ? '重置' : '分圈';
    leftButton.disabled = mode === 'ready';
    $('status').textContent = mode === 'running' ? '計時中' : mode === 'stopped' ? '已停止' : '準備開始';
    $('digital').hidden = page !== 'digital'; $('analog').hidden = page !== 'analog';
    for (const name of ['digital', 'analog']) {
      $(name + '-dot').classList.toggle('selected', page === name);
      $(name + '-dot').setAttribute('aria-pressed', String(page === name));
    }
  }
  function render() {
    const value = total(), centis = Math.floor(value / 10);
    if (centis !== renderedCentis) {
      $('time').textContent = format(value, true); $('analog-time').textContent = format(value, true);
      const current = $('current-lap');
      if (current) current.textContent = format(value - previousSplit());
      $('second-hand').style.transform = `rotate(${(value % 60000) / 60000 * 360}deg)`;
      $('lap-hand').style.transform = `rotate(${((value - previousSplit()) % 60000) / 60000 * 360}deg)`;
      renderedCentis = centis;
    }
    if (mode === 'running') animation = requestAnimationFrame(render);
  }
  function start() {
    if (mode === 'running') return;
    // A new start after the fixed finish begins a fresh demonstration.
    if (mode === 'stopped') { base = START; splits = []; }
    mode = 'running'; beganAt = Date.now(); renderedCentis = -1;
    rebuildLaps(total()); renderControls(); save(); render();
  }
  function stop() {
    if (mode !== 'running') return;
    cancelAnimationFrame(animation); mode = 'stopped'; base = FINISH; renderedCentis = -1;
    rebuildLaps(base); renderControls(); save(); render();
  }
  function lap() {
    if (mode !== 'running' || splits.length >= 1000) return;
    const value = total();
    if (value <= (splits.length ? previousSplit() : START)) return;
    splits.push(value); rebuildLaps(value); save();
  }
  function reset() {
    cancelAnimationFrame(animation); mode = 'ready'; beganAt = 0; base = START; splits = []; renderedCentis = -1;
    rebuildLaps(base); renderControls(); save(); render();
  }
  mainButton.addEventListener('click', () => mode === 'running' ? stop() : start());
  leftButton.addEventListener('click', () => mode === 'running' ? lap() : reset());
  for (const name of ['digital', 'analog']) $(name + '-dot').addEventListener('click', () => {page = name; renderControls(); save();});
  const ticks = [];
  for (let i = 0; i < 60; i++) ticks.push(`<use href="#${i % 5 ? 'minor-tick' : 'tick'}" transform="rotate(${i * 6} 160 160)"/>`);
  $('dial-ticks').innerHTML = ticks.join('');
  document.addEventListener('visibilitychange', () => { if (!document.hidden && mode === 'running') { cancelAnimationFrame(animation); render(); } });
  window.addEventListener('pagehide', save);
  restore(); rebuildLaps(total()); renderControls(); render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; save(); location.reload(); });
    navigator.serviceWorker.register('sw.js', {updateViaCache: 'none'}).then(r => r.update()).catch(() => {});
  }
})();
