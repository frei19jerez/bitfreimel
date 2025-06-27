document.addEventListener("DOMContentLoaded", function () {
  // Funcionalidad del menú hamburguesa
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // Iniciar el gráfico
  initChart();

  // Iniciar carga del precio de Bitcoin
  fetchBTCPriceIA();
  setInterval(fetchBTCPriceIA, 60000);
});

// --- Variables globales ---
const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
let previousPrice = null;
let timerInterval;
let priceTimerInterval;

// --- Función principal que obtiene el precio y actualiza todo ---
async function fetchBTCPriceIA() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Error en la respuesta: ${response.statusText}`);
    }

    const data = await response.json();
    const price = data.bitcoin?.usd;

    if (price === undefined) {
      throw new Error('Datos no disponibles para el precio de Bitcoin.');
    }

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
        const futurePriceChange = price * (Math.random() * 0.1 - 0.05);
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

    if (btcChart) {
      btcChart.update();
    }

  } catch (error) {
    console.error('Error al obtener los datos:', error);

    const errorPriceElement = document.getElementById('btc-price');
    if (errorPriceElement) {
      errorPriceElement.textContent = 'Error al obtener el precio.';
    }

    const errorPredictionElement = document.getElementById('btc-prediction');
    if (errorPredictionElement) {
      errorPredictionElement.textContent = 'Error en predicción.';
    }
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

// --- Chart.js: Inicialización de la gráfica en vivo ---
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
          labels: {
            color: 'white'
          }
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
