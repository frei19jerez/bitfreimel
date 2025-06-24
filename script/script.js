document.addEventListener("DOMContentLoaded", function () {
  // Funcionalidad del menú hamburguesa
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // Iniciar carga del precio de Bitcoin
  fetchBTCPriceIA();
  setInterval(fetchBTCPriceIA, 60000);
});

// --- Funciones para Bitcoin ---

const API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
let previousPrice = null;
let timerInterval;
let priceTimerInterval;

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
