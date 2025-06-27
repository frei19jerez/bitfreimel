document.addEventListener("DOMContentLoaded", function () {
  // Menú hamburguesa
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // Iniciar la gráfica
  initChart();

  // Cargar precio inicial y actualizar cada minuto
  fetchBTCPriceIA();
  setInterval(fetchBTCPriceIA, 60000);

  // Botón de instalación de la PWA
  let deferredPrompt;
  const installBtn = document.getElementById('installBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'inline-block';
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          deferredPrompt = null;
        });
      }
    });
  }
});

// --- Variables globales ---
const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
let previousPrice = null;
let timerInterval;
let priceTimerInterval;

// --- Obtener el precio de BTC y actualizar UI ---
async function fetchBTCPriceIA() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Error en la respuesta: ${response.statusText}`);

    const data = await response.json();
    const price = data.bitcoin?.usd;
    if (price === undefined) throw new Error('Datos no disponibles');

    // Mostrar precio actual
    const priceElement = document.getElementById('btc-price');
    if (priceElement) {
      priceElement.textContent = `$${price.toFixed(2)}`;

      if (previousPrice !== null) {
        const arrow = price > previousPrice ? '🔼' : (price < previousPrice ? '🔽' : '➡️');
        priceElement.textContent += ` ${arrow}`;

        const trendElement = document.getElementById('trend-indicator');
        if (trendElement) {
          trendElement.textContent = price > previousPrice
            ? 'IA: Vela Alta 🔼'
            : (price < previousPrice ? 'IA: Vela Baja 🔽' : 'IA: Tendencia Estable ➡️');
        }
      }

      const futurePriceElement = document.getElementById('future-price');
      if (futurePriceElement) {
        const futurePriceChange = price * (Math.random() * 0.1 - 0.05); // ±5%
        const futurePrice = price + futurePriceChange;
        const futureArrow = futurePriceChange >= 0 ? '🔼' : '🔽';
        futurePriceElement.textContent = `IA: Precio Futuro (estimado): $${futurePrice.toFixed(2)} ${futureArrow}`;
      }
    }

    previousPrice = price;

    resetTimer();
    resetPriceTimer();

    // Actualizar gráfica
    const now = new Date().toLocaleTimeString();
    chartLabels.push(now);
    chartData.push(price);
    if (chartLabels.length > 20) {
      chartLabels.shift();
      chartData.shift();
    }

    if (btcChart) btcChart.update();

  } catch (error) {
    console.error('Error al obtener los datos:', error);
    const priceElement = document.getElementById('btc-price');
    if (priceElement) priceElement.textContent = 'Error al obtener el precio.';
    const futureElement = document.getElementById('future-price');
    if (futureElement) futureElement.textContent = 'Error en predicción.';
  }
}

// --- Cronómetros de actualización ---
function resetTimer() {
  let seconds = 0;
  const timerElement = document.getElementById('timer');
  if (timerElement) {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      seconds++;
      timerElement.textContent = `IA: Tiempo desde la última actualización: ${seconds} segundos`;
    }, 1000);
  }
}

function resetPriceTimer() {
  let priceSeconds = 0;
  const priceTimerElement = document.getElementById('btc-price-timer');
  if (priceTimerElement) {
    if (priceTimerInterval) clearInterval(priceTimerInterval);
    priceTimerInterval = setInterval(() => {
      priceSeconds++;
      priceTimerElement.textContent = `IA: Tiempo desde la última actualización de BTC: ${priceSeconds} segundos`;
    }, 1000);
  }
}

// --- Service Worker para PWA ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/script/service-worker.js')
    .then(() => console.log('✅ Service Worker registrado.'))
    .catch((error) => console.error('❌ Error registrando Service Worker:', error));
}

// --- Gráfica en vivo con Chart.js ---
const chartLabels = [];
const chartData = [];
let btcChart = null;

function initChart() {
  const ctx = document.getElementById('btcChart').getContext('2d');
  btcChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Precio BTC en USD',
        data: chartData,
        borderWidth: 2,
        fill: false,
        borderColor: 'rgb(0, 255, 0)',
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: { color: 'white' }
        }
      },
      scales: {
        x: {
          ticks: { color: 'white' },
          title: {
            display: true,
            text: 'Hora',
            color: 'white'
          }
        },
        y: {
          ticks: { color: 'white' },
          title: {
            display: true,
            text: 'Precio (USD)',
            color: 'white'
          }
        }
      }
    }
  });
}
