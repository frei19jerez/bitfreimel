document.addEventListener("DOMContentLoaded", () => {
  // Menú hamburguesa accesible
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      const expanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!expanded));
    });
  }

  // PWA instalación
  let deferredPrompt;
  const installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = "inline-block";
  });
  installBtn?.addEventListener("click", () => {
    deferredPrompt?.prompt();
    deferredPrompt?.userChoice.then(() => {
      deferredPrompt = null;
      document.getElementById("mensajeInstalacion")?.classList.remove("oculto");
    });
  });

  // Comprobar que existe el canvas para el gráfico
  if (document.getElementById("btcChart")) {
    const tokenSelect = document.getElementById("token");
    const intervaloSelect = document.getElementById("intervalo");
    const updateBtn = document.getElementById("updateBtn");

    // Función para actualizar datos y gráfico
    async function actualizarDatos() {
      const token = tokenSelect.value;
      const intervalo = intervaloSelect.value;
      await renderCandleChart(token, intervalo);
      await fetchBinancePriceUI(token);
    }

    // Ejecutar la primera carga de datos
    actualizarDatos();

    // Evitar múltiples intervalos, limpiar si ya hay uno
    if (window.actualizarIntervalo) clearInterval(window.actualizarIntervalo);
    window.actualizarIntervalo = setInterval(actualizarDatos, 60000);

    // Eventos para actualizar al cambiar selección o click en botón
    tokenSelect.addEventListener("change", actualizarDatos);
    intervaloSelect.addEventListener("change", actualizarDatos);
    updateBtn.addEventListener("click", actualizarDatos);
  }
});

// Variables globales para gráfico y estados
let candleChart = null;
let previousPrice = null;
let timerInterval, priceTimerInterval;

// Obtener velas OHLC desde Binance con manejo de errores
async function fetchCandles(symbol = "BTCUSDT", interval = "1m", limit = 50) {
  try {
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Error API Binance OHLC");
    const data = await response.json();
    return data.map(candle => ({
      x: new Date(candle[0]),
      o: parseFloat(candle[1]),
      h: parseFloat(candle[2]),
      l: parseFloat(candle[3]),
      c: parseFloat(candle[4]),
    }));
  } catch (error) {
    console.error("Error obteniendo velas:", error);
    return [];
  }
}

// Renderizar gráfico de velas con Chart.js
async function renderCandleChart(symbol, interval) {
  const candles = await fetchCandles(symbol, interval);

  if (!candles.length) {
    console.warn("No hay datos de velas para mostrar");
    return;
  }

  const ctx = document.getElementById("btcChart").getContext("2d");

  if (candleChart) {
    candleChart.destroy();
  }

  candleChart = new Chart(ctx, {
    type: "candlestick",
    data: {
      datasets: [{
        label: symbol,
        data: candles,
        borderColor: "#00ff00",
        borderWidth: 1,
        color: {
          up: "#4caf50",
          down: "#f44336",
          unchanged: "#999"
        },
        barPercentage: 0.2,
        categoryPercentage: 0.1,
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: "time",
          time: { unit: "minute" },
          ticks: { color: "white" },
          grid: { color: "rgba(255,255,255,0.1)" },
          min: new Date(candles[0].x.getTime() - 60000),
          max: new Date(candles[candles.length - 1].x.getTime() + 60000),
        },
        y: {
          position: 'right', // Precios a la derecha
          offset: true,      // Esto añade espacio para separar los números del borde
          ticks: { 
            color: "white",
            padding: 10      // Espacio extra a la derecha de las etiquetas
          },
          grid: { color: "rgba(255,255,255,0.1)" }
        }
      },
      plugins: {
        legend: { labels: { color: "white" } }
      }
    }
  });
}

// Obtener precio actual y actualizar UI
async function fetchBinancePriceUI(symbol = "BTCUSDT") {
  try {
    const url = `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("API Binance fallo");
    const data = await response.json();
    const price = parseFloat(data.price);

    const priceEl = document.getElementById("btc-price");
    const trendEl = document.getElementById("trend-indicator");
    const futureEl = document.getElementById("future-price");

    if (priceEl) {
      const arrow = previousPrice !== null
        ? (price > previousPrice ? "🔼" : price < previousPrice ? "🔽" : "➡️")
        : "";
      priceEl.textContent = `$${price.toFixed(2)} ${arrow}`;
      priceEl.style.color = price > previousPrice ? "lime" : price < previousPrice ? "red" : "gray";
      trendEl.textContent = price > previousPrice ? "IA: Vela Alta 🔼" : price < previousPrice ? "IA: Vela Baja 🔽" : "IA: Tendencia Estable ➡️";
      previousPrice = price;
    }

    if (futureEl) {
      const change = price * (Math.random() * 0.1 - 0.05);
      const future = price + change;
      futureEl.textContent = `IA: Precio Futuro (estimado): $${future.toFixed(2)} ${change >= 0 ? "🔼" : "🔽"}`;
    }

    resetTimer();
    resetPriceTimer();

  } catch (e) {
    console.error("Error obteniendo precio Binance:", e);
    document.getElementById("btc-price").textContent = "Error.";
    document.getElementById("future-price").textContent = "Error predicción.";
  }
}

// Cronómetros para tiempo desde última actualización
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
