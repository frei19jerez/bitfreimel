document.addEventListener("DOMContentLoaded", () => {
  // === LÓGICA GLOBAL (todo OK en todas las páginas) ===
  const hamburger = document.getElementById("hamburger");
  const navLinks  = document.getElementById("nav-links");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });
  }

  // PWA instalación (global)
  let deferredPrompt;
  const installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn?.style && (installBtn.style.display = "inline-block");
  });
  installBtn?.addEventListener("click", () => {
    deferredPrompt?.prompt();
    deferredPrompt?.userChoice.then(() => {
      deferredPrompt = null;
      document.getElementById("mensajeInstalacion")?.classList.remove("oculto");
    });
  });

  // === LÓGICA ESPECÍFICA DE PÁGINA (solo si existe #btcChart) ===
  if (document.getElementById("btcChart")) {
    const tokenSelect = document.getElementById("token");
    const updateBtn   = document.getElementById("updateBtn");

    initChart();
    let selectedToken = tokenSelect?.value || "BTCUSDT";
    fetchBTCPriceIA(selectedToken);
    setInterval(() => fetchBTCPriceIA(selectedToken), 60000);

    tokenSelect?.addEventListener("change", () => {
      selectedToken = tokenSelect.value;
      document.getElementById("token-label").textContent =
        tokenSelect.options[tokenSelect.selectedIndex].text;
      fetchBTCPriceIA(selectedToken);
    });
  }
});

// --- VARIABLES GLOBALES PARA GRÁFICA ---
const chartLabels = [],
  chartData = [];
let btcChart = null;
let previousPrice = null;
let timerInterval,
  priceTimerInterval;

// --- UTIL: Mapea símbolo a Coingecko ---
function getAPIUrl(token) {
  const map = {
    BTCUSDT: "bitcoin",
    ETHUSDT: "ethereum",
    ETCUSDT: "ethereum-classic",
    SOLUSDT: "solana",
  };
  return `https://api.coingecko.com/api/v3/simple/price?ids=${map[token]}&vs_currencies=usd`;
}

// --- FETCH + ACTUALIZACIÓN UI ---
async function fetchBTCPriceIA(token = "BTCUSDT") {
  try {
    const response = await fetch(getAPIUrl(token));
    const data = await response.json();
    const name = getAPIUrl(token).split("=")[1].split("&")[0];
    const price = data[name]?.usd;
    if (price === undefined) throw new Error("Datos no disponibles");

    const priceEl = document.getElementById("btc-price");
    const trendEl = document.getElementById("trend-indicator");
    const futureEl = document.getElementById("future-price");

    if (priceEl) {
      priceEl.textContent = `$${price.toFixed(2)}`;
      if (previousPrice !== null) {
        const arrow =
          price > previousPrice
            ? "🔼"
            : price < previousPrice
            ? "🔽"
            : "➡️";
        priceEl.textContent += ` ${arrow}`;
        priceEl.style.color =
          price > previousPrice ? "lime" : price < previousPrice ? "red" : "gray";
        trendEl.textContent =
          price > previousPrice
            ? "IA: Vela Alta 🔼"
            : price < previousPrice
            ? "IA: Vela Baja 🔽"
            : "IA: Tendencia Estable ➡️";
      }
    }

    if (futureEl) {
      const change = price * (Math.random() * 0.1 - 0.05);
      const future = price + change;
      futureEl.textContent = `IA: Precio Futuro (estimado): $${future.toFixed(
        2
      )} ${change >= 0 ? "🔼" : "🔽"}`;
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
  } catch (err) {
    console.error("Error al obtener precio:", err);
    document.getElementById("btc-price").textContent = "Error.";
    document.getElementById("future-price").textContent = "Error predicción.";
  }
}

// --- BOTÓN “Actualizar” ---
function obtenerDatos() {
  const btn = document.getElementById("updateBtn");
  const token = document.getElementById("token")?.value || "BTCUSDT";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Cargando...";
    fetchBTCPriceIA(token).finally(() => {
      btn.disabled = false;
      btn.textContent = "🔄 Actualizar";
    });
  }
}

// --- CRONÓMETROS ---
function resetTimer() {
  let s = 0;
  const el = document.getElementById("timer");
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    s++;
    el.textContent = `IA: Tiempo desde la última actualización: ${s} segundos`;
  }, 1000);
}
function resetPriceTimer() {
  let s = 0;
  const el = document.getElementById("btc-price-timer");
  clearInterval(priceTimerInterval);
  priceTimerInterval = setInterval(() => {
    s++;
    el.textContent = `IA: Tiempo desde la última actualización de BTC: ${s} segundos`;
  }, 1000);
}

// --- INICIALIZA GRÁFICA LINEAL ---
function initChart() {
  const ctx = document.getElementById("btcChart").getContext("2d");
  btcChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: "Precio USD",
          data: chartData,
          borderWidth: 2,
          borderColor: "lime",
          fill: false,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: "white" } } },
      scales: {
        x: { ticks: { color: "white" }, title: { display: true, text: "Hora", color: "white" } },
        y: { ticks: { color: "white" }, title: { display: true, text: "Precio (USD)", color: "white" } },
      },
    },
  });
}
