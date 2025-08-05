let userChoice = null;
let chart;
let intervalId;
let intervaloActual = '1m';   // Intervalo inicial
let tokenActual = 'BTCUSDT';  // Token inicial
let saldoDemo = 10000;        // Saldo inicial demo

// Mostrar saldo en la interfaz
function mostrarSaldo() {
  const saldoElement = document.getElementById('saldoDemo');
  if(saldoElement){
    saldoElement.textContent = `Saldo Demo: $${saldoDemo.toLocaleString('es-CO')}`;
  }
}

// Obtener apuesta desde input, validando límites
function obtenerApuesta(){
  const input = document.getElementById('inputApuesta');
  let valor = parseInt(input.value, 10);

  if(isNaN(valor)) valor = 1000;

  if(valor > saldoDemo){
    valor = saldoDemo;
    input.value = valor;
  } else if (valor < 100) { // apuesta mínima 100
    valor = 100;
    input.value = valor;
  }
  return valor;
}

mostrarSaldo();

function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(660, ctx.currentTime);
  gainNode.gain.setValueAtTime(0.2, ctx.currentTime);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.2);
}

function fetchCandleData() {
  const url = `https://api.binance.com/api/v3/klines?symbol=${tokenActual}&interval=${intervaloActual}&limit=90`;
  return fetch(url)
    .then(res => res.json())
    .then(data =>
      data.map(d => ({
        x: new Date(d[0]),
        o: parseFloat(d[1]),
        h: parseFloat(d[2]),
        l: parseFloat(d[3]),
        c: parseFloat(d[4]),
      }))
    );
}

function renderChart(candles) {
  const ctx = document.getElementById('candlestickChart').getContext('2d');

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: 'candlestick',
    data: {
      datasets: [{
        label: tokenActual,
        data: candles,
        color: {
          up: 'rgba(56, 142, 60, 0.9)',
          down: 'rgba(211, 47, 47, 0.9)',
          unchanged: '#999'
        },
        borderColor: '#000',
        borderWidth: 1,
        barPercentage: 0.08,
        categoryPercentage: 0.1,
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
          offset: true,
          time: {
            unit: 'minute',
            tooltipFormat: 'HH:mm'
          },
          ticks: { color: '#ccc' },
          grid: { color: 'rgba(255,255,255,0.07)' },
          min: new Date(candles[0].x.getTime() - 30 * 1000),
          max: new Date(candles[candles.length - 1].x.getTime() + 30 * 1000),
        },
        y: {
          position: 'right',
          ticks: { color: '#ccc' },
          grid: { color: 'rgba(255,255,255,0.07)' }
        }
      }
    }
  });
}

function analizarMovimiento(candles) {
  const prev = candles[candles.length - 2];
  const actual = candles[candles.length - 1];

  if (!prev || !actual) return 'neutro';

  if (actual.c > prev.c) return 'alcista';
  if (actual.c < prev.c) return 'bajista';
  return 'neutro';
}

function iniciarJuego() {
  fetchCandleData().then(candles => {
    renderChart(candles);

    const resultadoReal = analizarMovimiento(candles);

    if (userChoice) {
      const apuesta = obtenerApuesta();
      const acerto = (userChoice === resultadoReal);

      if(acerto){
        saldoDemo += apuesta;  // gana la apuesta
      } else {
        saldoDemo -= apuesta;  // pierde la apuesta
      }
      
      mostrarSaldo();

      const resultado = acerto
        ? `✅ Correcto: era ${resultadoReal.toUpperCase()}`
        : `❌ Incorrecto: era ${resultadoReal.toUpperCase()}`;
      document.getElementById('resultado').textContent = resultado;
    } else {
      document.getElementById('resultado').textContent = '';
    }

    userChoice = null;
  });
}

function iniciarTemporizador() {
  let segundos = 60;
  const tiempoRestante = document.getElementById('tiempoRestante');

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

// Eventos botones
document.getElementById('alcistaBtn').addEventListener('click', () => {
  userChoice = 'alcista';
  document.getElementById('resultado').textContent = '📈 Elegiste ALCISTA';
});

document.getElementById('bajistaBtn').addEventListener('click', () => {
  userChoice = 'bajista';
  document.getElementById('resultado').textContent = '📉 Elegiste BAJISTA';
});

// Evento cambio intervalo
document.getElementById('intervalo').addEventListener('change', (e) => {
  intervaloActual = e.target.value;
  clearInterval(intervalId);
  iniciarJuego();
  iniciarTemporizador();
});

// Evento cambio token
document.getElementById('token').addEventListener('change', (e) => {
  tokenActual = e.target.value;
  clearInterval(intervalId);
  iniciarJuego();
  iniciarTemporizador();
});

// Inicializar juego y temporizador
iniciarJuego();
iniciarTemporizador();
