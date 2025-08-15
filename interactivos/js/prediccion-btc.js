// ===============================
// Juego DEMO: ¿Sube o Baja el Bitcoin?
// ===============================
const BINANCE = "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT";
const COINGECKO = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

const $ = (id) => document.getElementById(id);

// UI
const elPrecio = $("precio");
const elVariacion = $("variacion");
const elEstado = $("estado");
const elContador = $("contador");
const elIntervalo = $("intervalo");
const elHistorial = $("historial");
const elRondas = $("rondas");
const elAciertos = $("aciertos");
const elPrecision = $("precision");
const elRacha = $("racha");
const elMejorRacha = $("mejorRacha");

const btnSube = $("btnSube");
const btnBaja = $("btnBaja");
const btnCancelar = $("btnCancelar");
const btnActualizar = $("btnActualizar");
const btnReiniciar = $("btnReiniciar");

// Banca
const elSaldo = $("saldo");
const elApuesta = $("apuesta");
const btnMasApuesta = $("masApuesta");
const btnMenosApuesta = $("menosApuesta");
const btnRecargar = $("btnRecargar");

// Riesgo
const elRiesgo = $("riesgo");

// Modal
const modalOverlay = $("modalOverlay");
const modalRecargar = $("modalRecargar");
const modalCerrar = $("modalCerrar");

// Estado
let precioActual = null;
let precioInicialRonda = null;
let prediccion = null;
let temporizador = null;
let segundosRestantes = 0;
let preciosSpark = [];
let rondaEnCurso = false;

// Stats
let rondas = parseInt(localStorage.getItem("sb_rondas") || "0", 10);
let aciertos = parseInt(localStorage.getItem("sb_aciertos") || "0", 10);
let racha = parseInt(localStorage.getItem("sb_racha") || "0", 10);
let mejorRacha = parseInt(localStorage.getItem("sb_mejor_racha") || "0", 10);

// Banca
const SALDO_INICIAL = 1000;
const APUESTA_MAX = 500;

function safeInt(v, def) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def; }
let saldo = safeInt(localStorage.getItem("sb_saldo"), SALDO_INICIAL);
let apuesta = safeInt(localStorage.getItem("sb_apuesta"), 10);
if (saldo < 0) saldo = SALDO_INICIAL;
if (apuesta < 1) apuesta = 10;
if (apuesta > APUESTA_MAX) apuesta = APUESTA_MAX;

function getMultiplier() { return parseFloat(elRiesgo?.value || "1.5"); }
function getStreakBonus() { return Math.min(0.5, racha * 0.05); }

const fmt = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
const porcentaje = (a, b) => (b ? Math.round((a / b) * 100) : 0) + "%";

function guardarStats() {
  localStorage.setItem("sb_rondas", String(rondas));
  localStorage.setItem("sb_aciertos", String(aciertos));
  localStorage.setItem("sb_racha", String(racha));
  localStorage.setItem("sb_mejor_racha", String(mejorRacha));
}
function pintarStats() {
  if (!elRondas) return; // por si este JS se usa en otra vista
  elRondas.textContent = rondas;
  elAciertos.textContent = aciertos;
  elPrecision.textContent = porcentaje(aciertos, rondas);
  elRacha.textContent = racha;
  elMejorRacha.textContent = mejorRacha;
}
function guardarBanca() {
  localStorage.setItem("sb_saldo", String(saldo));
  localStorage.setItem("sb_apuesta", String(apuesta));
}
function pintarBanca() {
  if (!elSaldo) return;
  elSaldo.textContent = saldo.toLocaleString("en-US");
  elApuesta.value = apuesta;
  const sinSaldo = saldo <= 0;
  if (btnSube) btnSube.disabled = sinSaldo;
  if (btnBaja) btnBaja.disabled = sinSaldo;
  if (saldo < apuesta && elEstado) {
    elEstado.textContent = "Saldo insuficiente: baja la apuesta o recarga.";
  }
}

async function fetchConFallback() {
  const intento = async (url, parseFn, reintentos = 2) => {
    let espera = 300;
    for (let i = 0; i <= reintentos; i++) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        return parseFn(data);
      } catch (e) {
        if (i === reintentos) throw e;
        await new Promise(r => setTimeout(r, espera));
        espera *= 2;
      }
    }
  };
  try {
    return await intento(BINANCE, d => parseFloat(d.price), 2);
  } catch (_) {
    return await intento(COINGECKO, d => parseFloat(d.bitcoin.usd), 1);
  }
}

async function fetchPrecio() {
  try {
    const p = await fetchConFallback();
    actualizarPrecio(p);
    if (elVariacion) elVariacion.style.color = "";
  } catch (e) {
    if (elVariacion) {
      elVariacion.textContent = "No se pudo obtener precio.";
      elVariacion.style.color = "#ff6b6b";
    }
  }
}

function actualizarPrecio(p) {
  const anterior = precioActual;
  precioActual = p;
  if (elPrecio) elPrecio.textContent = "$ " + fmt(precioActual);
  if (anterior != null && elVariacion) {
    const diff = precioActual - anterior;
    const sign = diff === 0 ? "" : diff > 0 ? "↑" : "↓";
    const pct = (diff / (anterior || 1)) * 100;
    elVariacion.textContent = `${sign} ${diff > 0 ? "+" : ""}${pct.toFixed(3)}%`;
    elVariacion.style.color = diff >= 0 ? "#7aff7a" : "#ff6b6b";
  } else if (elVariacion) {
    elVariacion.textContent = "Esperando siguiente tick…";
    elVariacion.style.color = "#bdbdbd";
  }
  preciosSpark.push(precioActual);
  if (preciosSpark.length > 10) preciosSpark.shift();
  dibujarSparkline();
}

function dibujarSparkline() {
  const c = $("sparkline");
  if (!c) return;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  if (preciosSpark.length < 2) return;

  const min = Math.min(...preciosSpark);
  const max = Math.max(...preciosSpark);
  const pad = 8;
  const w = c.width, h = c.height;
  const xStep = (w - pad * 2) / (preciosSpark.length - 1);

  ctx.beginPath();
  preciosSpark.forEach((val, i) => {
    const x = pad + i * xStep;
    const y = pad + (1 - (val - min) / (max - min || 1)) * (h - pad * 2);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#7aff7a";
  ctx.stroke();
}

function iniciarRonda(sentido) {
  if (rondaEnCurso) return;
  if (precioActual == null) {
    if (elEstado) elEstado.textContent = "Esperando precio inicial…";
    return;
  }
  if (apuesta > saldo) {
    if (elEstado) elEstado.textContent = "Apuesta mayor al saldo.";
    return;
  }

  prediccion = sentido;
  precioInicialRonda = precioActual;
  segundosRestantes = parseInt(elIntervalo?.value || "60", 10);
  if (elContador) elContador.style.display = "block";
  if (elEstado) elEstado.innerHTML = `Predicción: <strong>${sentido.toUpperCase()}</strong> a $${fmt(precioInicialRonda)}.`;
  if (btnSube) btnSube.disabled = true;
  if (btnBaja) btnBaja.disabled = true;
  if (btnCancelar) btnCancelar.disabled = false;
  rondaEnCurso = true;

  tickTemporizador();
  temporizador = setInterval(tickTemporizador, 1000);
}

function tickTemporizador() {
  const m = String(Math.floor(segundosRestantes / 60)).padStart(2, "0");
  const s = String(segundosRestantes % 60).padStart(2, "0");
  if (elContador) elContador.textContent = `${m}:${s}`;
  if (segundosRestantes <= 0) finalizarRonda();
  segundosRestantes--;
}

function cancelarRonda() {
  clearInterval(temporizador);
  if (elContador) elContador.style.display = "none";
  if (elEstado) elEstado.textContent = "Ronda cancelada.";
  if (btnSube) btnSube.disabled = false;
  if (btnBaja) btnBaja.disabled = false;
  if (btnCancelar) btnCancelar.disabled = true;
  rondaEnCurso = false;
  prediccion = null;
}

async function finalizarRonda() {
  clearInterval(temporizador);
  if (elContador) elContador.style.display = "none";

  let final = precioActual;
  if (final == null) try { await fetchPrecio(); final = precioActual; } catch {}

  const subio = final > precioInicialRonda;
  const bajo = final < precioInicialRonda;
  const acierto = (prediccion === "sube" && subio) || (prediccion === "baja" && bajo);

  rondas++;
  if (acierto) { aciertos++; racha++; mejorRacha = Math.max(racha, mejorRacha); }
  else { racha = 0; }

  const mult = getMultiplier();
  const bonus = getStreakBonus();
  const ganancia = Math.round(apuesta * mult * (1 + bonus));

  if (acierto) {
    saldo += ganancia;
    reproducirAlertaIA();
  } else {
    saldo = Math.max(0, saldo - apuesta);
  }

  guardarStats(); pintarStats();
  guardarBanca(); pintarBanca();

  if (elHistorial) {
    const li = document.createElement("li");
    li.className = acierto ? "win" : "lose";
    const flecha = subio ? "↑" : bajo ? "↓" : "→";
    li.textContent = `${acierto ? "✅" : "❌"} ${prediccion.toUpperCase()} | $${fmt(precioInicialRonda)} → $${fmt(final)} (${flecha})`;
    elHistorial.prepend(li);
    if (elHistorial.children.length > 8) elHistorial.removeChild(elHistorial.lastChild);
  }

  if (elEstado) {
    elEstado.innerHTML = acierto
      ? `🎉 ¡Ganaste! Ganancia: $${ganancia}`
      : `😓 Fallaste. Pérdida: $${apuesta}`;
  }

  rondaEnCurso = false;
  prediccion = null;
  precioInicialRonda = null;
  if (btnSube) btnSube.disabled = false;
  if (btnBaja) btnBaja.disabled = false;
  if (btnCancelar) btnCancelar.disabled = true;
}

function abrirModal() { if (modalOverlay) { modalOverlay.hidden = false; setTimeout(() => modalRecargar?.focus(), 0); } }
function cerrarModal() { if (modalOverlay) modalOverlay.hidden = true; }

document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarModal(); });
modalOverlay?.addEventListener("click", (e) => { if (e.target === modalOverlay) cerrarModal(); });

function sugerenciaIA() {
  if (preciosSpark.length < 3) return;
  const diffs = [];
  for (let i = 1; i < preciosSpark.length; i++) diffs.push(preciosSpark[i] - preciosSpark[i - 1]);
  const subidas = diffs.filter(d => d > 0).length;
  const bajadas = diffs.filter(d => d < 0).length;
  const elSugerencia = $("sugerenciaIA");

  if (subidas > bajadas) {
    elSugerencia.innerText = "🤖 Sugerencia IA: Probablemente SUBA";
    elSugerencia.style.color = "#00ff00";
    reproducirAlertaIA();
  } else if (bajadas > subidas) {
    elSugerencia.innerText = "🤖 Sugerencia IA: Probablemente BAJE";
    elSugerencia.style.color = "#ff4444";
    reproducirAlertaIA();
  } else {
    elSugerencia.innerText = "🤖 Sugerencia IA: Mercado Estable";
    elSugerencia.style.color = "#ffff00";
  }
}

function reproducirAlertaIA() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.25);
}

// ========= NUEVO: VELAS JAPONESAS (Chart.js Financial) =========
let miniCandleChart = null;

async function cargarVelas() {
  const url = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=10';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Error klines ' + res.status);
  const data = await res.json();

  const velas = data.map(d => ({
    x: new Date(d[0]),
    o: +d[1],
    h: +d[2],
    l: +d[3],
    c: +d[4],
  }));

  renderizarVelas(velas);
}

function renderizarVelas(velas) {
  const cv = document.getElementById('miniCandlestick');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  // === Ajuste para aire a la derecha ===
  const firstT = +velas[0].x;                       
  const lastT  = +velas[velas.length - 1].x;
  const prevT  = velas.length > 1 ? +velas[velas.length - 2].x : lastT - 60_000;
  const dt     = Math.max(10_000, lastT - prevT);   
  const padX   = Math.round(dt * 0.8);              // más aire = valor mayor
  const xMin = new Date(firstT - dt * 0.2);         
  const xMax = new Date(lastT  + padX);             

  // calcular min/max con margen del 0.5% y redondeo
  const lows  = velas.map(v => +v.l);
  const highs = velas.map(v => +v.h);
  const minL  = Math.min(...lows);
  const maxH  = Math.max(...highs);
  const pad   = (maxH - minL) * 0.005;
  const minY = +(minL - pad).toFixed(2);
  const maxY = +(maxH + pad).toFixed(2);

  if (miniCandleChart) {
    miniCandleChart.destroy();
    miniCandleChart = null;
  }

  miniCandleChart = new Chart(ctx, {
    type: 'candlestick',
    data: {
      datasets: [{
        label: '',
        data: velas.map(v => ({
          ...v,
          o: +v.o.toFixed(2),
          h: +v.h.toFixed(2),
          l: +v.l.toFixed(2),
          c: +v.c.toFixed(2)
        })),
        upColor: '#22c55e',
        downColor: '#ef4444',
        unchangedColor: '#9ca3af',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        borderUnchangedColor: '#9ca3af',
        barThickness: 6,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: { top: 6, right: 36, bottom: 8, left: 8 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (ctx) => {
              const v = ctx.raw;
              return `O:${v.o}  H:${v.h}  L:${v.l}  C:${v.c}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'minute', tooltipFormat: 'HH:mm' },
          min: xMin,     // 👈 usamos el aire calculado
          max: xMax,     // 👈 usamos el aire calculado
          offset: false,
          bounds: 'ticks',
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#cbd5e1', padding: 4, maxRotation: 0, autoSkip: true }
        },
        y: {
          position: 'right',
          min: minY,
          max: maxY,
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: {
            color: '#cbd5e1',
            padding: 8,
            callback: (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2 })
          },
          afterFit: (scale) => { scale.width += 8; }
        }
      }
    }
  });
}



// Eventos
btnSube?.addEventListener("click", () => iniciarRonda("sube"));
btnBaja?.addEventListener("click", () => iniciarRonda("baja"));
btnCancelar?.addEventListener("click", cancelarRonda);
btnActualizar?.addEventListener("click", fetchPrecio);
btnReiniciar?.addEventListener("click", () => {
  if (confirm("¿Reiniciar estadísticas?")) {
    rondas = aciertos = racha = 0;
    guardarStats(); pintarStats(); elHistorial && (elHistorial.innerHTML = "");
  }
});
btnMasApuesta?.addEventListener("click", () => {
  apuesta = Math.min(APUESTA_MAX, apuesta + 5);
  guardarBanca(); pintarBanca();
});
btnMenosApuesta?.addEventListener("click", () => {
  apuesta = Math.max(1, apuesta - 5);
  guardarBanca(); pintarBanca();
});
elApuesta?.addEventListener("change", () => {
  apuesta = Math.min(APUESTA_MAX, Math.max(1, parseInt(elApuesta.value || "1", 10)));
  guardarBanca(); pintarBanca();
});
btnRecargar?.addEventListener("click", () => {
  if (confirm("¿Recargar saldo?")) {
    saldo = SALDO_INICIAL;
    guardarBanca(); pintarBanca();
  }
});
modalRecargar?.addEventListener("click", () => {
  saldo = SALDO_INICIAL; guardarBanca(); pintarBanca(); cerrarModal();
});
modalCerrar?.addEventListener("click", cerrarModal);
elRiesgo?.addEventListener("change", () => {
  if (elEstado) elEstado.innerHTML = `Riesgo: <strong>${parseFloat(elRiesgo.value).toFixed(1)}×</strong>. Bono racha: <strong>${Math.round(getStreakBonus()*100)}%</strong>.`;
});

document.addEventListener("DOMContentLoaded", () => {
  cerrarModal();
  pintarStats();
  pintarBanca();
  fetchPrecio();
  setInterval(fetchPrecio, 5000);

  // === Velas Mini: pintar al entrar y refrescar cada minuto ===
  cargarVelas();
  setInterval(cargarVelas, 60_000);
});
