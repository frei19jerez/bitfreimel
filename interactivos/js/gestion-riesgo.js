// ===================================================
// ESTADO DEL JUEGO (persistente) + helpers de UI
// ===================================================
let rondas = +localStorage.getItem('gr_rondas') || 0;
let puntos = +localStorage.getItem('gr_puntos') || 0;
let racha  = +localStorage.getItem('gr_racha')  || 0;
let mejor  = +localStorage.getItem('gr_mejor')  || 0;

// Contadores de resultados agregados
let wins     = +localStorage.getItem('gr_wins')     || 0;
let losses   = +localStorage.getItem('gr_losses')   || 0;
let neutrals = +localStorage.getItem('gr_neutrals') || 0;

const $ = (id) => document.getElementById(id);
const elEscenario   = $('escenario');
const elSalida      = $('salida');
const elSaldoActual = $('saldoActual');
const elTradeRes    = $('tradeResumen');

function guardar() {
  localStorage.setItem('gr_rondas',  rondas);
  localStorage.setItem('gr_puntos',  puntos);
  localStorage.setItem('gr_racha',   racha);
  localStorage.setItem('gr_mejor',   mejor);
  localStorage.setItem('gr_wins',    wins);
  localStorage.setItem('gr_losses',  losses);
  localStorage.setItem('gr_neutrals',neutrals);
}
function winRate() {
  const t = wins + losses + neutrals;
  return t ? ((wins / t) * 100).toFixed(1) + '%' : '—';
}
function pintarStats() {
  $('stRondas')   && ( $('stRondas').textContent   = rondas );
  $('stPuntos')   && ( $('stPuntos').textContent   = puntos );
  $('stRacha')    && ( $('stRacha').textContent    = racha  );
  $('stMejor')    && ( $('stMejor').textContent    = mejor  );
  $('stWins')     && ( $('stWins').textContent     = wins   );
  $('stLosses')   && ( $('stLosses').textContent   = losses );
  $('stNeutrals') && ( $('stNeutrals').textContent = neutrals );
  $('stWinRate')  && ( $('stWinRate').textContent  = winRate() );
}

// --- Estilos para el badge/toast de resultado ---
(function injectBadgeStyles(){
  if (document.getElementById('gr-badge-styles')) return;
  const css = `
  .resultado-badge{
    position: fixed; top: 16px; right: 16px; z-index: 9999;
    padding: 10px 14px; border-radius: 12px; color: #fff;
    font-weight: 700; box-shadow: 0 8px 24px rgba(0,0,0,.35);
    opacity: 0; transform: translateY(-10px);
    animation: gr-badge-in .18s ease-out forwards, gr-badge-out .25s ease-in 1.2s forwards;
    pointer-events: none;
  }
  .resultado-badge.win{ background:#16a34a; }
  .resultado-badge.lose{ background:#dc2626; }
  .resultado-badge.neutral{ background:#334155; }
  @keyframes gr-badge-in { to { opacity: 1; transform: translateY(0); } }
  @keyframes gr-badge-out { to { opacity: 0; transform: translateY(-10px); } }
  `;
  const style = document.createElement('style');
  style.id = 'gr-badge-styles';
  style.textContent = css;
  document.head.appendChild(style);
})();

// ===================================================
// CONFIG principal
// ===================================================
const SYMBOL = 'BTCUSDT';

// Intervalo y límite de velas
let INTERVAL = '1m';
let LIMIT    = 150;

const HISTORY = 110; // visibles al inicio
const FUTURE  = 40;  // futuras (HISTORY + FUTURE ≈ LIMIT)

// Unidad del eje X según intervalo
const TIME_UNIT_BY_INTERVAL = {
  '1m':'minute','2m':'minute','3m':'minute','5m':'minute',
  '15m':'minute','30m':'minute','1h':'hour'
};
// Límite recomendado según intervalo
const LIMIT_BY_INTERVAL = {
  '1m':150,'2m':150,'3m':150,'5m':150,
  '15m':200,'30m':200,'1h':200
};
// Refresco recomendado (ms)
const REFRESH_MS_BY_INTERVAL = {
  '1m': 60_000, '2m': 90_000, '3m': 120_000, '5m': 180_000,
  '15m': 240_000, '30m': 300_000, '1h': 420_000
};

// ===================================================
// GRÁFICO
// ===================================================
let velaChart = null;
let candlesAll = [];      // todas
let historyCandles = [];  // pasadas
let futureCandles  = [];  // futuras

// ===================================================
// CUENTA / SALDO
// ===================================================
const FEE_BPS      = 4;        // 0.04% ida+vuelta
const QTY_PREC     = 6;        // decimales tamaño (BTC)
const MAX_NOTIONAL = 10_000;   // nocional máx USD (demo)

let saldo = +(localStorage.getItem('gr_saldo') || '1000');
function setSaldo(v){
  saldo = Math.max(0, +v);
  localStorage.setItem('gr_saldo', String(saldo));
  if (elSaldoActual) {
    elSaldoActual.textContent = `$${saldo.toLocaleString('en-US', {
      minimumFractionDigits:2, maximumFractionDigits:2
    })}`;
  }
}
setSaldo(saldo);

// ===================================================
// LADO (Long/Short) con persistencia
// ===================================================
const sideLongEl   = document.getElementById('sideLong');
const sideShortEl  = document.getElementById('sideShort');
const sideGuardado = localStorage.getItem('gr_side') || 'long';
if (sideLongEl && sideShortEl) {
  sideLongEl.checked  = sideGuardado === 'long';
  sideShortEl.checked = sideGuardado === 'short';
  sideLongEl.addEventListener('change', () => localStorage.setItem('gr_side', 'long'));
  sideShortEl.addEventListener('change', () => localStorage.setItem('gr_side', 'short'));
}
function getSide() {
  return (sideLongEl && sideLongEl.checked) ? 'long' : 'short';
}

// ===================================================
// BINANCE KLINES
// ===================================================
async function fetchKlines(symbol = SYMBOL, interval = INTERVAL, limit = LIMIT) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  // Reintentos simples
  let espera = 300;
  for (let i=0;i<3;i++){
    try {
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), 7000);
      const res = await fetch(url, { cache:'no-store', signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error('HTTP '+res.status);
      const data = await res.json();
      return data.map(d => ({ x:new Date(d[0]), o:+d[1], h:+d[2], l:+d[3], c:+d[4] }));
    } catch(e) {
      if (i===2) throw e;
      await new Promise(r=>setTimeout(r, espera));
      espera *= 2;
    }
  }
}

// ATR aprox en %
function aproxATRpct(candles, len = 14) {
  if (candles.length < len + 1) return 1.0;
  let sum = 0;
  for (let i = candles.length - len; i < candles.length; i++) {
    const c = candles[i], prev = candles[i - 1];
    const tr = Math.max(c.h - c.l, Math.abs(c.h - prev.c), Math.abs(c.l - prev.c));
    sum += tr / c.c;
  }
  return +(((sum / len) * 100).toFixed(2));
}

// Dataset para líneas TP/SL
function lineDataset(y, x0, x1, color, label, dash = [6, 6]) {
  return {
    type: 'line',
    label, parsing: false,
    data: [{ x: x0, y }, { x: x1, y }],
    borderColor: color, borderWidth: 1.5, borderDash: dash,
    pointRadius: 0, hitRadius: 0
  };
}

// Helpers de rango Y
function calcYRange(candles, extra = []) {
  let min = Infinity, max = -Infinity;
  for (const c of candles) { if (c.l < min) min = c.l; if (c.h > max) max = c.h; }
  for (const v of extra)   { if (v < min)  min = v;   if (v > max)   max = v;   }
  const pad = (max - min) * 0.15 || (min * 0.003);
  return { min: min - pad, max: max + pad };
}

// Render inicial (solo pasado + TP/SL)
function renderVelasInicial(candles, tpPrice, slPrice) {
  const cv = $('chartVelas');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  const lastTs = candles[candles.length - 1].x.getTime();
  const prevTs = candles[candles.length - 2]?.x.getTime() ?? (lastTs - 60_000);
  const dt = Math.max(10_000, lastTs - prevTs);

  const barThickness = Math.max(7, Math.floor((cv.clientWidth / candles.length) * 0.70));

  if (velaChart) { velaChart.destroy(); velaChart = null; }

  const yRange = calcYRange(candles, [tpPrice, slPrice]);

  velaChart = new Chart(ctx, {
    type: 'candlestick',
    data: {
      datasets: [
        {
          label: '',
          data: candles,
          upColor: '#22c55e',
          downColor: '#ef4444',
          unchangedColor: '#9ca3af',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          borderUnchangedColor: '#9ca3af',
          barThickness,
          borderWidth: 1
        },
        lineDataset(tpPrice, candles[0].x, new Date(lastTs + dt * 0.9), '#22c55e', 'TP'),
        lineDataset(slPrice, candles[0].x, new Date(lastTs + dt * 0.9), '#ef4444', 'SL')
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false } },
      layout: { padding: { top: 6, right: 56, bottom: 8, left: 8 } },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: TIME_UNIT_BY_INTERVAL[INTERVAL] || 'minute',
            tooltipFormat: (INTERVAL === '1h' ? 'MMM dd HH:mm' : 'HH:mm')
          },
          bounds: 'ticks',
          offset: false,
          ticks: { color: '#cbd5e1', padding: 4, maxRotation: 0 },
          grid: { color: 'rgba(255,255,255,0.07)' },
          min: new Date(candles[0].x.getTime() - dt * 0.25),
          max: new Date(lastTs + dt * 0.9),
        },
        y: {
          position: 'right',
          min: yRange.min,
          max: yRange.max,
          ticks: {
            color: '#cbd5e1',
            padding: 8,
            callback: (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })
          },
          grid: { color: 'rgba(255,255,255,0.07)' },
          afterFit: (scale) => { scale.width += 16; }
        }
      }
    }
  });
}

// Revelar futuro + re-zoom
function revelarFuturoEnGrafico(tp, sl) {
  if (!velaChart) return;
  velaChart.data.datasets[0].data = candlesAll;

  const yRange = calcYRange(candlesAll, [tp, sl]);
  const y = velaChart.options.scales.y;
  y.min = yRange.min; y.max = yRange.max;

  velaChart.update();
}

// ===================================================
// Escenario desde velas reales (depende del lado)
// ===================================================
let escenarioActual = null; // {precio, stopP, tpP, atrP, entry, tpPrice, slPrice, side}

function generarEscenarioDesdeVelas(candles, side='long') {
  const precio = +candles[candles.length - 1].c.toFixed(2);
  const atrP   = aproxATRpct(candles);

  const stopP = atrP < 0.8 ? 1.5 : atrP < 1.2 ? 2 : 3;  // SL educativo
  const tpP   = stopP * (1.5 + Math.random());          // R:R ~ 1.5–2.5

  const entry   = precio;
  const tpPrice = side === 'long'
    ? +(entry * (1 + tpP / 100)).toFixed(2)
    : +(entry * (1 - tpP / 100)).toFixed(2);
  const slPrice = side === 'long'
    ? +(entry * (1 - stopP / 100)).toFixed(2)
    : +(entry * (1 + stopP / 100)).toFixed(2);

  return { precio, stopP, tpP, atrP, entry, tpPrice, slPrice, side };
}

function pintarEscenario(e) {
  if (!elEscenario) return;
  elEscenario.innerHTML = `
    <div><strong>Precio:</strong> $${e.precio.toLocaleString('en-US')}</div>
    <div><strong>Objetivo (TP):</strong> ${e.tpP.toFixed(2)}%</div>
    <div><strong>Stop Loss:</strong> ${e.stopP.toFixed(2)}%</div>
    <div><strong>Volatilidad (ATR):</strong> ${e.atrP}%</div>
    <div><strong>Relación R:R:</strong> ${(e.tpP / e.stopP).toFixed(2)} : 1</div>
    <div><small>Operación: <strong>${e.side.toUpperCase()}</strong></small></div>
  `;
}

// ===================================================
// EVALUACIÓN + EJECUCIÓN (saldo realista)
// ===================================================
const btnEval = $('btnEvaluar');
function bloquearEval(ms=900){
  if(!btnEval) return;
  btnEval.disabled = true;
  setTimeout(()=>btnEval.disabled=false, ms);
}

// Notificación visible + vibración + beep
function marcarResultado(outcome, net) {
  let clase = 'neutral', titulo = 'RESULTADO';
  if (outcome === 'tp' || net > 0) { clase = 'win';  titulo = '¡GANASTE!'; }
  else if (outcome === 'sl' || net < 0) { clase = 'lose'; titulo = 'PERDISTE'; }
  else if (outcome === 'ambigua') { clase = 'neutral'; titulo = 'AMBIGUA'; }

  const badge = document.createElement('div');
  badge.className = `resultado-badge ${clase}`;
  const pnlStr = (net>=0?'+':'')+'$'+Math.abs(+net).toFixed(2);
  badge.textContent = `${titulo}  ·  P&L: ${pnlStr}`;
  document.body.appendChild(badge);

  try { if (navigator.vibrate) navigator.vibrate(clase==='lose' ? [60,60,60] : [40,40]); } catch {}

  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = clase==='lose' ? 240 : clase==='win' ? 880 : 440;
    gain.gain.value = 0.08;
    osc.start(); osc.stop(ctx.currentTime + 0.22);
  } catch {}

  setTimeout(() => { badge.remove(); }, 1800);
}

// === Historial de jugadas ===
const HIST_KEY = 'gr_historial_v1';
function cargarHistorial(){ try { return JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch { return []; } }
function guardarHistorial(arr){ localStorage.setItem(HIST_KEY, JSON.stringify(arr.slice(-200))); } // máx 200
let historial = cargarHistorial();

// inicio/fin de cada ronda
let rondaTsStart = null; // Date.now() al crear escenario

const nf2 = new Intl.NumberFormat('en-US',{minimumFractionDigits:2, maximumFractionDigits:2});

function outcomeTexto(o){ return o==='tp' ? 'GANÓ' : o==='sl' ? 'PERDIÓ' : o==='ambigua' ? 'Ambigua' : 'Inconclusa'; }
function outcomeClase(o){ return o==='tp' ? 'good' : o==='sl' ? 'bad' : 'warn'; }

function renderHistorial(){
  const tbody = document.getElementById('histBody');
  if (!tbody) return;
  if (!historial.length) { tbody.innerHTML = ''; return; }
  const rows = historial.slice().reverse().map(h=>{
    const fecha = new Date(h.finishedAt ?? h.startedAt);
    const fstr  = fecha.toLocaleString();
    const rrStr = h.rr!=null ? nf2.format(h.rr) : '—';
    const riesgoStr = h.riesgoSel!=null ? nf2.format(h.riesgoSel)+'%' : '—';
    const pnlStr = (h.net>=0?'+':'') + '$' + nf2.format(h.net);
    const tpSl = `$${nf2.format(h.tpPrice)} / $${nf2.format(h.slPrice)}`;
    return `<tr>
      <td style="padding:6px 8px; border-bottom:1px solid #232323">${fstr}</td>
      <td style="padding:6px 8px; text-align:center; border-bottom:1px solid #232323">${h.interval}</td>
      <td style="padding:6px 8px; text-align:center; border-bottom:1px solid #232323">${h.side.toUpperCase()}</td>
      <td style="padding:6px 8px; text-align:right; border-bottom:1px solid #232323">$${nf2.format(h.entry)}</td>
      <td style="padding:6px 8px; text-align:right; border-bottom:1px solid #232323">${tpSl}</td>
      <td style="padding:6px 8px; text-align:center; border-bottom:1px solid #232323">${rrStr}</td>
      <td style="padding:6px 8px; text-align:right; border-bottom:1px solid #232323">${h.qty}</td>
      <td style="padding:6px 8px; text-align:right; border-bottom:1px solid #232323">${riesgoStr}</td>
      <td style="padding:6px 8px; text-align:center; border-bottom:1px solid #232323" class="${outcomeClase(h.outcome)}">${outcomeTexto(h.outcome)}</td>
      <td style="padding:6px 8px; text-align:right; border-bottom:1px solid #232323" class="${h.net>=0?'good':'bad'}">${pnlStr}</td>
    </tr>`;
  });
  tbody.innerHTML = rows.join('');
}

function guardarJugada({outcome, net, fees, e, qty, riesgoSel, rr, saldoAntes, saldoDespues}){
  const rec = {
    startedAt: rondaTsStart ?? Date.now(),
    finishedAt: Date.now(),
    durationSec: rondaTsStart ? Math.round((Date.now()-rondaTsStart)/1000) : null,
    symbol: SYMBOL,
    interval: INTERVAL,
    side: e.side,
    entry: e.entry,
    tpPrice: e.tpPrice,
    slPrice: e.slPrice,
    rr: +rr.toFixed(2),
    atrP: e.atrP,
    riesgoSel: +(+riesgoSel).toFixed(2),
    qty,
    outcome,              // 'tp' | 'sl' | 'ambigua' | 'inconcluso'
    net: +(+net).toFixed(2),
    fees: +(+fees).toFixed(2),
    saldoAntes: +(+saldoAntes).toFixed(2),
    saldoDespues: +(+saldoDespues).toFixed(2)
  };
  historial.push(rec);
  guardarHistorial(historial);
  renderHistorial();
}

document.getElementById('btnClearHist')?.addEventListener('click', ()=>{
  if (!confirm('¿Borrar todo el historial de jugadas?')) return;
  historial = [];
  guardarHistorial(historial);
  renderHistorial();
});

document.getElementById('btnExportHist')?.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(historial, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `historial_${SYMBOL}_${INTERVAL}.json`;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
});

function evaluarDecision() {
  bloquearEval(900);

  const capital = saldo;
  const riesgoSel = Math.max(0.1, +($('riesgo')?.value || 2)); // %
  const e = escenarioActual;
  if (!e) return;
  const side = e.side;

  // 1) Calidad educativa
  const rr = e.tpP / e.stopP;
  const riesgoMin = 0.5;
  let riesgoMax = 2;
  if (e.atrP >= 1.2) riesgoMax = 1.5;

  const riesgoUSD = capital * (riesgoSel / 100);

  let msg = [];
  let ok = true;
  if (rr < 1.5) { ok = false; msg.push(`<span class="bad">R:R bajo (${rr.toFixed(2)}). Busca ≥ 1.5</span>`); }
  if (riesgoSel > 3) { ok = false; msg.push(`<span class="bad">Riesgo muy alto (${riesgoSel}%).</span>`); }
  if (riesgoSel < riesgoMin) msg.push(`<span class="warn">Riesgo muy bajo (${riesgoSel}%).</span>`);
  if (riesgoSel > riesgoMax) msg.push(`<span class="warn">Por volatilidad (${e.atrP}%), prefiere ≤ ${riesgoMax}%.</span>`);

  // 2) Tamaño por riesgo
  const stopDist = Math.abs(e.entry - e.slPrice);
  let qty = stopDist > 0 ? (riesgoUSD / stopDist) : 0;
  qty = Math.max(0, +qty.toFixed(QTY_PREC));
  // Cap nocional
  const notional = e.entry * qty;
  if (notional > MAX_NOTIONAL) {
    qty = +(MAX_NOTIONAL / e.entry).toFixed(QTY_PREC);
  }

  // 3) Resultado: ¿qué tocó primero?
  let outcome = 'inconcluso'; // 'tp' | 'sl' | 'ambigua' | 'inconcluso'
  for (const c of futureCandles) {
    const hitTP = side === 'long' ? c.h >= e.tpPrice : c.l <= e.tpPrice;
    const hitSL = side === 'long' ? c.l <= e.slPrice : c.h >= e.slPrice;
    if (hitTP && hitSL) { outcome = 'ambigua'; break; }
    if (hitTP) { outcome = 'tp'; break; }
    if (hitSL) { outcome = 'sl'; break; }
  }

  // Revela el futuro con re-zoom
  revelarFuturoEnGrafico(e.tpPrice, e.slPrice);

  // 4) P&L con comisiones
  const feeRate = FEE_BPS / 10_000; // 0.0004
  let exitPrice =
    outcome === 'tp' ? e.tpPrice :
    outcome === 'sl' ? e.slPrice :
    e.entry; // flat

  const gross = side === 'long'
    ? (exitPrice - e.entry) * qty
    : (e.entry - exitPrice) * qty;

  const fees = (e.entry + exitPrice) * qty * feeRate;
  const net = gross - fees;

  // Actualiza saldo demo
  const saldoAntes = saldo;
  setSaldo(saldo + net);

  // 5) Puntaje + racha + contadores de resultado
  rondas++;
  let delta = 0;
  if (ok && riesgoSel >= riesgoMin && riesgoSel <= riesgoMax) {
    if (outcome === 'tp')      { delta = 12; racha++; }
    else if (outcome === 'sl') { delta = 6;  racha = 0; }
    else if (outcome === 'ambigua') { delta = 8; racha++; }
    else { delta = 8; racha++; }
    msg.unshift(`<span class="good">✅ Decisión sólida.</span>`);
  } else if (ok) {
    if (outcome === 'tp')      { delta = 8;  racha++; }
    else if (outcome === 'sl') { delta = 3;  racha = 0; }
    else if (outcome === 'ambigua') { delta = 5; racha = 0; }
    else { delta = 5; racha = 0; }
    msg.unshift(`<span class="good">🟢 Aceptable, ajusta el % de riesgo.</span>`);
  } else {
    if (outcome === 'tp')      { delta = 2;  racha = 0; }
    else { delta = -5; racha = 0; }
    msg.unshift(`<span class="bad">❌ Riesgo/beneficio desfavorable.</span>`);
  }
  puntos = Math.max(0, puntos + delta);
  mejor = Math.max(mejor, racha);

  // Contabiliza resultado agregado
  if (outcome === 'tp' || net > 0)      wins++;
  else if (outcome === 'sl' || net < 0) losses++;
  else                                   neutrals++;

  guardar(); pintarStats();

  const outcomeTxt =
    outcome === 'tp'       ? 'TP alcanzado primero ✅'
  : outcome === 'sl'       ? 'SL alcanzado primero ❌'
  : outcome === 'ambigua'  ? '⚠️ Ambiguo: tocó TP y SL en la misma vela'
                           : '⏱ No tocó TP/SL en el horizonte simulado';

  if (elSalida) {
    elSalida.innerHTML = `
      ${msg.join('<br>')}
      <div style="margin-top:8px">
        Lado: <strong>${side.toUpperCase()}</strong> ·
        Entrada: <strong>$${e.entry.toLocaleString('en-US')}</strong> ·
        TP: <strong>$${e.tpPrice.toLocaleString('en-US')}</strong> ·
        SL: <strong>$${e.slPrice.toLocaleString('en-US')}</strong>
      </div>
      <div>${outcomeTxt}</div>
      <div>Riesgo: <strong>${riesgoSel}%</strong> ($${(capital * (riesgoSel/100)).toLocaleString('en-US')})
        · Tamaño: <strong>${qty}</strong> BTC
      </div>
      <div>Puntaje de esta ronda: <strong>${delta > 0 ? '+' : ''}${delta}</strong></div>
    `;
  }

  if (elTradeRes) {
    elTradeRes.innerHTML = `
      <div><strong>P&L</strong> (neto): <strong style="color:${net>=0?'#22c55e':'#ef4444'};">
        ${net>=0?'+':''}$${net.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2})}
      </strong> (comisiones: $${fees.toFixed(2)})</div>
      <div>Saldo nuevo: <strong>$${saldo.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2})}</strong></div>
    `;
  }

  // Guarda la jugada en historial
  guardarJugada({
    outcome,
    net,
    fees,
    e,
    qty,
    riesgoSel,
    rr,
    saldoAntes,
    saldoDespues: saldo
  });

  // Badge GANASTE/PERDISTE
  marcarResultado(outcome, net);
}

// ===================================================
// BOTONES
// ===================================================
$('btnEvaluar')?.addEventListener('click', evaluarDecision);
$('btnSiguiente')?.addEventListener('click', nuevaRonda);
$('btnReiniciar')?.addEventListener('click', () => {
  if (!confirm('¿Reiniciar estadísticas y saldo?')) return;
  rondas = puntos = racha = mejor = 0;
  wins = losses = neutrals = 0; // también resultados agregados
  guardar(); pintarStats();
  setSaldo(1000);
  elSalida && (elSalida.textContent = '');
  elTradeRes && (elTradeRes.textContent = '');
  nuevaRonda();
});

// ===================================================
// SELECTOR DE INTERVALO
// ===================================================
let refreshTimer = null;
function setAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  const ms = REFRESH_MS_BY_INTERVAL[INTERVAL] ?? 60_000;
  refreshTimer = setInterval(nuevaRonda, ms);
}

const intervalSelect = document.getElementById('intervalSelect');
if (intervalSelect) {
  const initial = intervalSelect.value || '1m';
  INTERVAL = initial;
  LIMIT    = LIMIT_BY_INTERVAL[INTERVAL] ?? 150;

  intervalSelect.addEventListener('change', async (e) => {
    INTERVAL = e.target.value;
    LIMIT    = LIMIT_BY_INTERVAL[INTERVAL] ?? 150;
    const label = document.getElementById('intervalLabel');
    if (label) label.textContent = INTERVAL;
    startTicker(SYMBOL);           // el stream de precio sigue igual (spot)
    await nuevaRonda();            // recarga velas con nuevo intervalo
    setAutoRefresh();
  });
}

// ===================================================
// TICKER EN VIVO (WebSocket + fallback)
// ===================================================
let wsTicker = null;
let tickerPollTimer = null;
let lastPrice = null;
const fmtUsd = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

function pintarTicker(p, changePct) {
  const precioEl = document.getElementById('precioSpot');
  const flechaEl = document.getElementById('flechaSpot');
  const cambioEl = document.getElementById('cambioSpot');
  if (!precioEl || !flechaEl || !cambioEl) return;

  // Dirección
  let clase = 't-flat', flecha = '•';
  if (lastPrice != null) {
    if (p > lastPrice) { clase = 't-up'; flecha = '↑'; }
    else if (p < lastPrice) { clase = 't-down'; flecha = '↓'; }
  }
  lastPrice = p;

  precioEl.textContent = `$${fmtUsd.format(p)}`;
  precioEl.className = 'ticker-price ' + clase + ' t-blink';
  flechaEl.textContent = flecha;
  flechaEl.className = 'ticker-arrow ' + clase + ' t-blink';

  const signed = (changePct>=0?'+':'') + changePct.toFixed(2) + '%';
  cambioEl.textContent = signed;
  cambioEl.className = 'ticker-change ' + (changePct>=0?'t-up':'t-down');

  setTimeout(() => {
    precioEl.classList.remove('t-blink');
    flechaEl.classList.remove('t-blink');
  }, 250);
}

function stopTicker() {
  if (wsTicker) { try { wsTicker.close(); } catch {} }
  wsTicker = null;
  if (tickerPollTimer) clearInterval(tickerPollTimer);
  tickerPollTimer = null;
}

function startTicker(symbol = SYMBOL) {
  stopTicker();
  lastPrice = null;

  const s = symbol.toLowerCase();
  const url = `wss://stream.binance.com:9443/stream?streams=${s}@trade/!miniTicker@arr`;
  wsTicker = new WebSocket(url);

  let lastPct = 0;

  wsTicker.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      const { stream } = data;

      // trade: último precio
      if (stream && stream.endsWith('@trade')) {
        const price = parseFloat(data.data.p);
        if (!isNaN(price)) pintarTicker(price, lastPct);
      }

      // miniTicker 24h array
      if (Array.isArray(data.data)) {
        const row = data.data.find(x => x.s === symbol.toUpperCase());
        if (row) {
          const pct = parseFloat(row.P);
          if (!isNaN(pct)) {
            lastPct = pct;
            if (lastPrice != null) pintarTicker(lastPrice, lastPct);
          }
        }
      }
    } catch {}
  };

  wsTicker.onerror = () => {
    // fallback polling
    stopTicker();
    startTickerPolling(symbol);
  };
}

function startTickerPolling(symbol = SYMBOL) {
  stopTicker();
  async function poll() {
    try {
      const r1 = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, { cache: 'no-store' });
      const j1 = await r1.json();
      const price = parseFloat(j1.price);

      const r2 = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, { cache: 'no-store' });
      const j2 = await r2.json();
      const pct = parseFloat(j2.priceChangePercent);

      if (!isNaN(price) && !isNaN(pct)) pintarTicker(price, pct);
    } catch {}
  }
  poll();
  tickerPollTimer = setInterval(poll, 2000);
}

// ===================================================
// FLUJO PRINCIPAL
// ===================================================
async function nuevaRonda() {
  const loader = document.getElementById('chartLoading');
  try {
    if (loader) loader.style.display = 'block';

    candlesAll = await fetchKlines(SYMBOL, INTERVAL, LIMIT);
    historyCandles = candlesAll.slice(0, HISTORY);
    futureCandles  = candlesAll.slice(HISTORY);

    const side = getSide();
    escenarioActual = generarEscenarioDesdeVelas(historyCandles, side);

    // marca cuándo “la pusiste”
    rondaTsStart = Date.now();

    pintarEscenario(escenarioActual);
    renderVelasInicial(historyCandles, escenarioActual.tpPrice, escenarioActual.slPrice);
    elSalida && (elSalida.textContent = '');
    elTradeRes && (elTradeRes.textContent = '');
  } catch (e) {
    console.error(e);
    elSalida && (elSalida.innerHTML = `<span class="bad">No se pudo cargar el gráfico. Intenta de nuevo.</span>`);
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

// Init
pintarStats();
renderHistorial();
(async () => {
  if (intervalSelect && intervalSelect.value) {
    INTERVAL = intervalSelect.value;
    LIMIT    = LIMIT_BY_INTERVAL[INTERVAL] ?? 150;
  }
  startTicker(SYMBOL);
  await nuevaRonda();
  setAutoRefresh();
})();

window.addEventListener('beforeunload', stopTicker);
