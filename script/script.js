document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  const tokenSelect = document.getElementById("token");
  const updateBtn = document.getElementById("updateBtn");

  initChart();
  let selectedToken = tokenSelect?.value || 'BTCUSDT';
  fetchBTCPriceIA(selectedToken);
  setInterval(() => fetchBTCPriceIA(selectedToken), 60000);

  tokenSelect?.addEventListener("change", () => {
    selectedToken = tokenSelect.value;
    document.getElementById("token-label").textContent = tokenSelect.options[tokenSelect.selectedIndex].text;
    fetchBTCPriceIA(selectedToken);
  });

  // PWA instalación
  let deferredPrompt;
  const installBtn = document.getElementById('installBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-block';
  });
  installBtn?.addEventListener('click', () => {
    deferredPrompt?.prompt();
    deferredPrompt?.userChoice.then(() => {
      deferredPrompt = null;
      document.getElementById("mensajeInstalacion")?.classList.remove("oculto");
    });
  });
});

// --- Variables ---
const chartLabels = [], chartData = [];
let btcChart = null;
let previousPrice = null;
let timerInterval, priceTimerInterval;

function getAPIUrl(token) {
  const map = {
    'BTCUSDT': 'bitcoin',
    'ETHUSDT': 'ethereum',
    'ETCUSDT': 'ethereum-classic',
    'SOLUSDT': 'solana'
  };
  return `https://api.coingecko.com/api/v3/simple/price?ids=${map[token]}&vs_currencies=usd`;
}

async function fetchBTCPriceIA(token = 'BTCUSDT') {
  try {
    const response = await fetch(getAPIUrl(token));
    const data = await response.json();
    const name = getAPIUrl(token).split('=')[1].split('&')[0];
    const price = data[name]?.usd;
    if (price === undefined) throw new Error('Datos no disponibles');

    const priceElement = document.getElementById('btc-price');
    const trendElement = document.getElementById('trend-indicator');
    const futureElement = document.getElementById('future-price');

    if (priceElement) {
      priceElement.textContent = `$${price.toFixed(2)}`;
      if (previousPrice !== null) {
        const arrow = price > previousPrice ? '🔼' : (price < previousPrice ? '🔽' : '➡️');
        priceElement.textContent += ` ${arrow}`;
        priceElement.style.color = price > previousPrice ? 'lime' : (price < previousPrice ? 'red' : 'gray');
        trendElement.textContent = price > previousPrice
          ? 'IA: Vela Alta 🔼' : price < previousPrice
          ? 'IA: Vela Baja 🔽' : 'IA: Tendencia Estable ➡️';
      }
    }

    if (futureElement) {
      const futureChange = price * (Math.random() * 0.1 - 0.05);
      const future = price + futureChange;
      futureElement.textContent = `IA: Precio Futuro (estimado): $${future.toFixed(2)} ${futureChange >= 0 ? '🔼' : '🔽'}`;
    }

    previousPrice = price;
    resetTimer();
    resetPriceTimer();

    const now = new Date().toLocaleTimeString();
    chartLabels.push(now);
    chartData.push(price);
    if (chartLabels.length > 20) {
      chartLabels.shift();
      chartData.shift();
    }
    btcChart?.update();
    if (navigator.vibrate) navigator.vibrate(100);

  } catch (error) {
    console.error('Error al obtener precio:', error);
    document.getElementById('btc-price').textContent = 'Error.';
    document.getElementById('future-price').textContent = 'Error predicción.';
  }
}

function obtenerDatos() {
  const btn = document.getElementById("updateBtn");
  const token = document.getElementById("token")?.value || 'BTCUSDT';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Cargando...';
    fetchBTCPriceIA(token).finally(() => {
      btn.disabled = false;
      btn.textContent = '🔄 Actualizar';
    });
  }
}

function resetTimer() {
  let seconds = 0;
  const timer = document.getElementById("timer");
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    seconds++;
    timer.textContent = `IA: Tiempo desde la última actualización: ${seconds} segundos`;
  }, 1000);
}

function resetPriceTimer() {
  let seconds = 0;
  const timer = document.getElementById("btc-price-timer");
  clearInterval(priceTimerInterval);
  priceTimerInterval = setInterval(() => {
    seconds++;
    timer.textContent = `IA: Tiempo desde la última actualización de BTC: ${seconds} segundos`;
  }, 1000);
}

function initChart() {
  const ctx = document.getElementById('btcChart').getContext('2d');
  btcChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [{
        label: 'Precio USD',
        data: chartData,
        borderWidth: 2,
        borderColor: 'lime',
        fill: false,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: 'white' } }
      },
      scales: {
        x: { ticks: { color: 'white' }, title: { display: true, text: 'Hora', color: 'white' } },
        y: { ticks: { color: 'white' }, title: { display: true, text: 'Precio (USD)', color: 'white' } }
      }
    }
  });
}
