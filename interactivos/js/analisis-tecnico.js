"use strict";
// ============================
// Simulador de Análisis Técnico (pro-AdSense + toggle sonido)
// ============================

// Estado base
let userChoice = null;
let chart;
let intervalId;
let intervaloActual = '1m';      // Intervalo inicial
let tokenActual = 'BTCUSDT';     // Token inicial
let saldoDemo = 10000;           // Saldo inicial demo

// Audio: permitir solo tras interacción + preferencia del usuario
let canBeep = false;
const LS_SOUND = 'simAT_sound_enabled_v1';
let soundEnabled = false;
try { soundEnabled = JSON.parse(localStorage.getItem(LS_SOUND) || 'false'); } catch { soundEnabled = false; }

// ============================
// UI helpers
// ============================
function mostrarSaldo() {
  const saldoElement = document.getElementById('saldoDemo');
  if (saldoElement) {
    saldoElement.textContent = `Saldo Demo: $${saldoDemo.toLocaleString('es-CO')}`;
  }
}

function obtenerApuesta() {
  const input = document.getElementById('inputApuesta');
  let valor = parseInt(input?.value ?? '1000', 10);
  if (isNaN(valor)) valor = 1000;
  if (valor > saldoDemo) { valor = saldoDemo; if (input) input.value = valor; }
  else if (valor < 100)   { valor = 100;     if (input) input.value = valor; }
  return valor;
}

function setResultado(texto, color) {
  const el = document.getElementById('resultado');
  if (!el) return;
  el.textContent = texto || '';
  el.style.color = color || '';
}

function playBeep() {
  // Solo si el usuario habilitó sonido, ya interactuó y la pestaña está visible
  if (!soundEnabled || !canBeep || document.hidden) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch { /* noop */ }
}

// ============================
// Datos (Binance REST)
// ============================
async function fetchCandleData() {
  const url = `https://api.binance.com/api/v3/klines?symbol=${tokenActual}&interval=${intervaloActual}&limit=120`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  return raw.map(d => ({
    x: new Date(d[0]),
    o: +d[1], h: +d[2], l: +d[3], c: +d[4],
  }));
}

// ============================
// Chart (Chart.js financial)
// ============================
function renderChart(candles) {
  const canvas = document.getElementById('candlestickChart');
  if (!canvas || !candles?.length) return;
  const ctx = canvas.getContext('2d');
  if (chart) chart.destroy();

  const lastT = candles[candles.length - 1].x.getTime();
  const prevT = candles[candles.length - 2]?.x.getTime() ?? lastT - 60_000;
  const dt = Math.max(10_000, lastT - prevT); // mínimo 10s

  chart = new Chart(ctx, {
    type: 'candlestick',
    data: { datasets: [{
      label: tokenActual,
      data: candles,
      upColor: '#22c55e',
      downColor: '#ef4444',
      unchangedColor: '#9ca3af',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      borderUnchangedColor: '#9ca3af',
      barThickness: 6,
      borderWidth: 1
    }]},
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false } },
      layout: { padding: { left: 12, right: 24 } },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'minute', tooltipFormat: 'HH:mm' },
          bounds: 'ticks', offset: false,
          ticks: { color: '#ccc', padding: 4 },
          grid: { color: 'rgba(255,255,255,0.07)' },
          min: new Date(candles[0].x.getTime() - dt * 0.20),
          max: new Date(lastT + dt * 0.80),
        },
        y: {
          position: 'right',
          ticks: {
            color: '#ccc', padding: 8,
            callback: v => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })
          },
          grid: { color: 'rgba(255,255,255,0.07)' },
          afterFit: (scale) => { scale.width += 8; }
        }
      }
    }
  });
}

// ============================
// Lógica ALCISTA/BAJISTA/NEUTRO
// ============================
function neutralEpsilon(basePrice, interval) {
  switch (interval) {
    case '1m':  return Math.max(0.8,  basePrice * 0.0001); // ~0.01% o 0.8 USD
    case '5m':  return Math.max(1.5,  basePrice * 0.0002); // ~0.02% o 1.5 USD
    case '15m': return Math.max(3.0,  basePrice * 0.0004); // ~0.04% o 3 USD
    case '30m': return Math.max(5.0,  basePrice * 0.0007); // ~0.07% o 5 USD
    default:    return Math.max(1.0,  basePrice * 0.0002);
  }
}

function analizarMovimiento(candles) {
  const velaCerrada = candles[candles.length - 2];
  const velaPrev    = candles[candles.length - 3];
  if (!velaCerrada || !velaPrev) return 'neutro';

  const diff = velaCerrada.c - velaPrev.c;
  const eps  = neutralEpsilon(velaPrev.c, intervaloActual);

  if (diff >  eps) return 'alcista';
  if (diff < -eps) return 'bajista';
  return 'neutro';
}

// ============================
// Ronda
// ============================
async function iniciarJuego() {
  try {
    const candles = await fetchCandleData();
    renderChart(candles);

    const resultadoReal = analizarMovimiento(candles);

    if (userChoice) {
      const apuesta = obtenerApuesta();
      const acerto = (userChoice === resultadoReal);

      saldoDemo = acerto ? (saldoDemo + apuesta) : Math.max(0, saldoDemo - apuesta);
      mostrarSaldo();

      if (acerto) setResultado(`✅ Correcto: era ${resultadoReal.toUpperCase()}`, '#22c55e');
      else        setResultado(`❌ Incorrecto: era ${resultadoReal.toUpperCase()}`, '#ef4444');
    } else {
      setResultado('', '#ccc');
    }

    userChoice = null;
  } catch (err) {
    console.error('Error al obtener velas:', err);
    setResultado('⚠️ Error al obtener datos de mercado', 'orange');
  }
}

function iniciarTemporizador() {
  let segundos = 60;
  const tiempoRestante = document.getElementById('tiempoRestante');

  clearInterval(intervalId);
  if (tiempoRestante) tiempoRestante.textContent = segundos;

  intervalId = setInterval(() => {
    if (document.hidden) return; // no avanzar en 2º plano

    segundos--;
    if (tiempoRestante) tiempoRestante.textContent = segundos;

    if (segundos <= 0) {
      playBeep();
      iniciarJuego();
      segundos = 60;
    }
  }, 1000);
}

// ============================
// Eventos
// ============================
function wireEvents() {
  // Primer gesto del usuario -> permite sonido
  window.addEventListener('pointerdown', () => { canBeep = true; }, { once: true });

  document.getElementById('alcistaBtn')?.addEventListener('click', () => {
    userChoice = 'alcista';
    setResultado('📈 Elegiste ALCISTA', '#22c55e');
  });

  document.getElementById('bajistaBtn')?.addEventListener('click', () => {
    userChoice = 'bajista';
    setResultado('📉 Elegiste BAJISTA', '#ef4444');
  });

  document.getElementById('neutroBtn')?.addEventListener('click', () => {
    userChoice = 'neutro';
    setResultado('➖ Elegiste NEUTRO', '#cbd5e1');
  });

  // Cambios de intervalo/token
  document.getElementById('intervalo')?.addEventListener('change', (e) => {
    intervaloActual = e.target.value;
    iniciarJuego();
    iniciarTemporizador();
  });

  document.getElementById('token')?.addEventListener('change', (e) => {
    tokenActual = e.target.value;
    iniciarJuego();
    iniciarTemporizador();
  });

  // Toggle de sonido (persistente)
  const toggle = document.getElementById('toggleSonido');
  if (toggle) {
    toggle.checked = !!soundEnabled;
    toggle.addEventListener('change', (e) => {
      soundEnabled = !!e.target.checked;
      try { localStorage.setItem(LS_SOUND, JSON.stringify(soundEnabled)); } catch {}
    });
  }

  // Pausar/reanudar si la pestaña se oculta/muestra
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(intervalId);
      setResultado('⏸ Pausado (pestaña en segundo plano)', '#cbd5e1');
    } else {
      iniciarJuego();
      iniciarTemporizador();
    }
  }, false);
}

// ============================
// Bootstrap seguro
// ============================
document.addEventListener('DOMContentLoaded', () => {
  mostrarSaldo();
  wireEvents();
  iniciarJuego();
  iniciarTemporizador();
});
