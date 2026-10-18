const DEFAULT_MS = 1314 * 3600000 + 52 * 60000;
let running = false;
let startedAt = 0;
let elapsedBeforeStart = DEFAULT_MS;
let lastLapTotal = DEFAULT_MS;
let timerId = null;
let laps = [];

const timeEl = document.querySelector('#time');
const statusEl = document.querySelector('#status');
const startBtn = document.querySelector('#start');
const lapBtn = document.querySelector('#lap');
const stopBtn = document.querySelector('#stop');
const resetBtn = document.querySelector('#reset');
const clearLapsBtn = document.querySelector('#clearLaps');
const lapsEl = document.querySelector('#laps');

function nowTotal(){ return running ? elapsedBeforeStart + (performance.now() - startedAt) : elapsedBeforeStart; }
function format(ms){
  ms = Math.max(0, Math.floor(ms));
  const centis = Math.floor((ms % 1000) / 10);
  const sec = Math.floor(ms / 1000) % 60;
  const min = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000);
  return `${String(hours).padStart(4,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(centis).padStart(2,'0')}`;
}
function render(){
  timeEl.textContent = format(nowTotal());
  startBtn.disabled = running;
  lapBtn.disabled = !running;
  stopBtn.disabled = !running;
  statusEl.textContent = running ? '計時中' : (laps.length ? '已停止' : '準備開始');
}
function tick(){ render(); if(running) timerId = requestAnimationFrame(tick); }
function start(){
  if(running) return;
  running = true; startedAt = performance.now();
  tick();
}
function stop(){
  if(!running) return;
  elapsedBeforeStart = nowTotal(); running = false; cancelAnimationFrame(timerId); render();
}
function addLap(){
  if(!running) return;
  const total = nowTotal();
  const lap = { number: laps.length + 1, split: total - lastLapTotal, total };
  laps.unshift(lap); lastLapTotal = total; renderLaps(); render();
}
function reset(){
  running = false; cancelAnimationFrame(timerId); elapsedBeforeStart = DEFAULT_MS; lastLapTotal = DEFAULT_MS; laps = []; renderLaps(); render();
}
function renderLaps(){
  lapsEl.innerHTML = laps.length ? laps.map(x => `<li><span class="label">#${x.number}</span><span class="lap-time">${format(x.split)}</span><span class="total-time">${format(x.total)}</span></li>`).join('') : '<li class="empty">尚無分圈記錄</li>';
}
startBtn.addEventListener('click', start); stopBtn.addEventListener('click', stop); lapBtn.addEventListener('click', addLap); resetBtn.addEventListener('click', reset); clearLapsBtn.addEventListener('click', () => { laps = []; lastLapTotal = nowTotal(); renderLaps(); });
render();
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
