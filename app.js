(() => {
  'use strict';
  // Requested preset-time demonstration: these are displayed, not measured, times.
  const DEFAULT_START = 1314 * 3600000 + 52 * 60000;
  const DEFAULT_FINISH = DEFAULT_START + 12310;
  const MAX_TIME = 999999 * 3600000 + 3599990;
  const STORE = 'stopwatch1314-apple-demo-v2';
  const $ = id => document.getElementById(id);
  const mainButton = $('start-stop');
  const leftButton = $('lap-reset');
  let startTime = DEFAULT_START, finishTime = DEFAULT_FINISH;
  let mode = 'ready', beganAt = 0, base = startTime, splits = [], page = 'digital', animation = 0, renderedCentis = -1, renderedDigitCount = 0;
  const settings = $('preset-settings');

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
    return Math.floor(Math.min(finishTime - 10, base + Math.max(0, Date.now() - beganAt)) / 10) * 10;
  }
  function previousSplit() { return splits.length ? splits[splits.length - 1] : 0; }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({mode, beganAt, base, splits, page, startTime, finishTime})); } catch (_) {}
  }
  function restore() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (s && validRange(s.startTime, s.finishTime)) { startTime = s.startTime; finishTime = s.finishTime; base = startTime; }
      if (!s || !['ready', 'running', 'stopped'].includes(s.mode)) return;
      if (!Array.isArray(s.splits) || !Number.isInteger(s.base) || s.base % 10 !== 0 || s.base < startTime || s.base > finishTime) return;
      if (s.splits.length > 1000 || s.splits.some((v, i) => !Number.isInteger(v) || v % 10 !== 0 || v <= startTime || v > finishTime - 10 || (i && v <= s.splits[i - 1]))) return;
      if (s.mode === 'running' && (!Number.isFinite(s.beganAt) || s.beganAt <= 0 || s.base > finishTime - 10)) return;
      if ((s.mode === 'ready' && (s.base !== startTime || s.splits.length)) || (s.mode === 'stopped' && s.base !== finishTime)) return;
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
      const displayTime = format(value);
      $('time').textContent = displayTime; $('analog-time').textContent = displayTime;
      if (displayTime.length !== renderedDigitCount) {
        $('digital').style.setProperty('--time-length', String(displayTime.length));
        renderedDigitCount = displayTime.length;
      }
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
    if (mode === 'stopped') { base = startTime; splits = []; }
    mode = 'running'; beganAt = Date.now(); renderedCentis = -1;
    rebuildLaps(total()); renderControls(); save(); render();
  }
  function stop() {
    if (mode !== 'running') return;
    cancelAnimationFrame(animation); mode = 'stopped'; base = finishTime; renderedCentis = -1;
    rebuildLaps(base); renderControls(); save(); render();
  }
  function lap() {
    if (mode !== 'running' || splits.length >= 1000) return;
    const value = total();
    if (value <= (splits.length ? previousSplit() : startTime)) return;
    splits.push(value); rebuildLaps(value); save();
  }
  function reset() {
    cancelAnimationFrame(animation); mode = 'ready'; beganAt = 0; base = startTime; splits = []; renderedCentis = -1;
    rebuildLaps(base); renderControls(); save(); render();
  }
  function validRange(start, finish) {
    return [start, finish].every(value => Number.isSafeInteger(value) && value >= 0 && value <= MAX_TIME && value % 10 === 0) && finish > start;
  }
  function writeFields(prefix, ms) {
    const values = [Math.floor(ms / 3600000), Math.floor(ms / 60000) % 60, Math.floor(ms / 1000) % 60, Math.floor(ms / 10) % 100];
    ['hours', 'minutes', 'seconds', 'centis'].forEach((unit, i) => { $(prefix + '-' + unit).value = String(values[i]).padStart(i ? 2 : 1, '0'); });
  }
  function readFields(prefix) {
    const units = ['hours', 'minutes', 'seconds', 'centis'], limits = [999999, 59, 59, 99], values = [];
    for (let i = 0; i < units.length; i++) {
      const input = $(prefix + '-' + units[i]);
      if (!/^\d+$/.test(input.value) || Number(input.value) > limits[i]) return {input, error: `${prefix === 'start' ? '起始' : '停止'}時間的${['小時', '分鐘', '秒', '百分秒'][i]}須為 0–${limits[i]} 的整數。`};
      values.push(Number(input.value));
    }
    return {value: values[0] * 3600000 + values[1] * 60000 + values[2] * 1000 + values[3] * 10};
  }
  function previewSettings() {
    for (const prefix of ['start', 'finish']) {
      const parsed = readFields(prefix);
      $(prefix + '-preview').textContent = parsed.error ? '請輸入有效時間' : format(parsed.value, true);
    }
    $('settings-error').hidden = true;
  }
  function openSettings() {
    writeFields('start', startTime); writeFields('finish', finishTime); previewSettings();
    $('stopwatch-tab').classList.toggle('active', false); $('timer-tab').classList.toggle('active', true);
    settings.showModal();
  }
  function applySettings(event) {
    event.preventDefault();
    const start = readFields('start'), finish = readFields('finish');
    const invalid = start.error ? start : finish.error ? finish : !validRange(start.value, finish.value) ? {error: '停止時間必須晚於起始時間，至少相差 0.01 秒。', input: $('finish-hours')} : null;
    if (invalid) { $('settings-error').textContent = invalid.error; $('settings-error').hidden = false; invalid.input.focus(); return; }
    startTime = start.value; finishTime = finish.value; reset(); settings.close();
  }
  $('timer-tab').addEventListener('click', openSettings);
  $('preset-form').addEventListener('submit', applySettings);
  $('preset-form').addEventListener('input', previewSettings);
  $('settings-cancel').addEventListener('click', () => settings.close());
  $('stopwatch-tab').addEventListener('click', () => { if (settings.open) settings.close(); });
  settings.addEventListener('close', () => { $('stopwatch-tab').classList.toggle('active', true); $('timer-tab').classList.toggle('active', false); });
  $('settings-defaults').addEventListener('click', () => { writeFields('start', DEFAULT_START); writeFields('finish', DEFAULT_FINISH); previewSettings(); });
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
