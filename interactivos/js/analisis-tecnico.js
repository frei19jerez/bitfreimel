let userChoice = null;
let chart;
let intervalId;
let intervaloActual = '1m';   // Intervalo inicial
let tokenActual = 'BTCUSDT';  // Token inicial
let saldoDemo = 10000;        // Saldo inicial demo

// ===== UI helpers
function mostrarSaldo() {
  const saldoElement = document.getElementById('saldoDemo');
  if (saldoElement) {
    saldoElement.textContent = `Saldo Demo: $${saldoDemo.toLocaleString('es-CO')}`;
  }
}
function obtenerApuesta() {
  const input = document.getElementById('inputApuesta');
  let valor = parseInt(input.value, 10);
  if (isNaN(valor)) valor = 1000;
  if (valor > saldoDemo) { valor = saldoDemo; input.value = valor; }
  else if (valor < 100) { valor = 100; input.value = valor; }
  return valor;
}
mostrarSaldo();

function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'sine'; osc.frequency.setValueAtTime(660, ctx.currentTime);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  osc.start(); osc.stop(ctx.currentTime + 0.2);
}

// ===== Data
function fetchCandleData() {
  const url = `https://api.binance.com/api/v3/klines?symbol=${tokenActual}&interval=${intervaloActual}&limit=90`;
  return fetch(url)
    .then(res => res.json())
    .then(data => data.map(d => ({
      x: new Date(d[0]),
      o: +d[1], h: +d[2], l: +d[3], c: +d[4],
    })));
}

// ===== Chart
function renderChart(candles) {
  const ctx = document.getElementById('candlestickChart').getContext('2d');
  if (chart) chart.destroy();

  // aire a la derecha para que no se pegue la última vela
  const last = candles[candles.length - 1].x.getTime();
  const prev = candles[candles.length - 2]?.x.getTime() ?? (last - 60_000);
  const dt = Math.max(10_000, last - prev);

  chart = new Chart(ctx, {
    type: 'candlestick',
    data: {
      datasets: [{
        label: tokenActual,
        data: candles,
        // Colores compatibles con el plugin financial (evita el aguamarina)
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
      plugins: { legend: { display: false } },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'minute', tooltipFormat: 'HH:mm' },
          offset: false,
          bounds: 'ticks',
          ticks: { color: '#ccc', padding: 4 },
          grid: { color: 'rgba(255,255,255,0.07)' },
          min: new Date(candles[0].x.getTime() - dt * 0.2),
          max: new Date(last + dt * 0.8),
        },
        y: {
          position: 'right',
          ticks: {
            color: '#ccc',
            padding: 8,
            callback: (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })
          },
          grid: { color: 'rgba(255,255,255,0.07)' },
          afterFit: (scale) => { scale.width += 8; }
        }
      }
    }
  });
}

// ===== Lógica Alcista/Bajista/Neutro
// margen neutro dinámico: 0.05% del precio o mínimo 0.5 USD
function neutralEpsilon(basePrice) {
  return Math.max(0.5, basePrice * 0.0005);
}

function analizarMovimiento(candles) {
  const prev = candles[candles.length - 2];
  const actual = candles[candles.length - 1];
  if (!prev || !actual) return 'neutro';

  const diff = actual.c - prev.c;
  const eps = neutralEpsilon(prev.c);

  if (diff > eps)  return 'alcista';
  if (diff < -eps) return 'bajista';
  return 'neutro';
}

// ===== Ronda
function iniciarJuego() {
  fetchCandleData().then(candles => {
    renderChart(candles);
    const resultadoReal = analizarMovimiento(candles);

    const resEl = document.getElementById('resultado');
    if (userChoice) {
      const apuesta = obtenerApuesta();
      const acerto = (userChoice === resultadoReal);

      if (acerto) saldoDemo += apuesta;
      else saldoDemo = Math.max(0, saldoDemo - apuesta);

      mostrarSaldo();

      if (acerto) {
        resEl.textContent = `✅ Correcto: era ${resultadoReal.toUpperCase()}`;
        resEl.style.color = '#22c55e';
      } else {
        resEl.textContent = `❌ Incorrecto: era ${resultadoReal.toUpperCase()}`;
        resEl.style.color = '#ef4444';
      }
    } else {
      resEl.textContent = '';
    }

    userChoice = null;
  });
}

function iniciarTemporizador() {
  let segundos = 60;
  const tiempoRestante = document.getElementById('tiempoRestante');

  clearInterval(intervalId);
  intervalId = setInterval(() => {
    segundos--;
    tiempoRestante.textContent = segundos;

    if (segundos === 0) {
      playBeep();
      iniciarJuego();
      segundos = 60;
    }
  }, 1000);
}

// ===== Eventos
document.getElementById('alcistaBtn')?.addEventListener('click', () => {
  userChoice = 'alcista';
  const el = document.getElementById('resultado');
  el.textContent = '📈 Elegiste ALCISTA';
  el.style.color = '#22c55e';
});
document.getElementById('bajistaBtn')?.addEventListener('click', () => {
  userChoice = 'bajista';
  const el = document.getElementById('resultado');
  el.textContent = '📉 Elegiste BAJISTA';
  el.style.color = '#ef4444';
});
// 👇 NUEVO: botón NEUTRO (asegúrate de tenerlo en el HTML)
document.getElementById('neutroBtn')?.addEventListener('click', () => {
  userChoice = 'neutro';
  const el = document.getElementById('resultado');
  el.textContent = '➖ Elegiste NEUTRO';
  el.style.color = '#cbd5e1';
});

// Cambio de intervalo
document.getElementById('intervalo')?.addEventListener('change', (e) => {
  intervaloActual = e.target.value;
  iniciarJuego();
  iniciarTemporizador();
});

// Cambio de token
document.getElementById('token')?.addEventListener('change', (e) => {
  tokenActual = e.target.value;
  iniciarJuego();
  iniciarTemporizador();
});

// Inicio
iniciarJuego();
iniciarTemporizador();
