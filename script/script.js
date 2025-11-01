/* =========================================================
   FreimelJerez - JS Global (navbar, PWA, Gráfico, WhatsApp, Cookies)
   ========================================================= */
(() => {
  "use strict";

  /* ---------------------------
     Utilidades generales
  --------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);

  // Manejador de intervalos centralizado
  const Intervals = (() => {
    const map = new Map();
    return {
      set(name, fn, ms) {
        if (map.has(name)) clearInterval(map.get(name));
        const id = setInterval(fn, ms);
        map.set(name, id);
        return id;
      },
      clear(name) {
        if (map.has(name)) {
          clearInterval(map.get(name));
          map.delete(name);
        }
      },
      clearAll() {
        for (const id of map.values()) clearInterval(id);
        map.clear();
      }
    };
  })();

  // Fetch con timeout
  async function fetchWithTimeout(url, ms = 10000, init = {}) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    /* ---------------------------
       Menú hamburguesa accesible
    --------------------------- */
    const hamburger = $("#hamburger");
    const navLinks  = $("#nav-links");
    on(hamburger, "click", () => {
      navLinks?.classList.toggle("active");
      const expanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!expanded));
    });

    /* ---------------------------
       PWA instalación
    --------------------------- */
    let deferredPrompt;
    const installBtn = $("#installBtn");
    on(window, "beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.style.display = "inline-block";
    });
    on(installBtn, "click", async () => {
      try {
        await deferredPrompt?.prompt();
        await deferredPrompt?.userChoice;
        deferredPrompt = null;
        $("#mensajeInstalacion")?.classList.remove("oculto");
      } catch { /* usuario canceló */ }
    });

    /* ---------------------------
       Gráfico de velas + precio
    --------------------------- */
    const canvas = /** @type {HTMLCanvasElement|null} */ ($("#btcChart"));
    const tokenSelect = $("#token");
    const intervaloSelect = $("#intervalo");
    const updateBtn = $("#updateBtn");

    const priceEl  = $("#btc-price");
    const trendEl  = $("#trend-indicator");
    const futureEl = $("#future-price");
    const timerEl  = $("#timer");
    const priceTimerEl = $("#btc-price-timer");

    let candleChart = null;
    let previousPrice = null;

    function chartDepsOk() {
      const hasChart = typeof window.Chart !== "undefined";
      const hasTimeScale =
        hasChart &&
        window.Chart.registry &&
        (window.Chart.registry.getScale("time") || window.Chart.registry.getScale("timeseries"));
      const hasFinancial =
        hasChart &&
        (window.Chart.FinancialController ||
         (window.Chart.registry && window.Chart.registry.getController && window.Chart.registry.getController("candlestick")));
      return { hasChart, hasFinancial, hasTimeScale };
    }

    function startCounter(el, label) {
      if (!el) return null;
      let s = 0;
      el.textContent = `${label}: 0 segundos`;
      return setInterval(() => {
        s += 1;
        el.textContent = `${label}: ${s} segundos`;
      }, 1000);
    }

    async function fetchCandles(symbol = "BTCUSDT", interval = "1m", limit = 50) {
      try {
        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const res = await fetchWithTimeout(url, 12000);
        if (!res.ok) throw new Error("Error API Binance OHLC");
        const raw = await res.json();
        return raw.map((c) => ({
          x: new Date(c[0]),
          o: Number(c[1]),
          h: Number(c[2]),
          l: Number(c[3]),
          c: Number(c[4]),
        }));
      } catch (err) {
        console.error("Error obteniendo velas:", err);
        return [];
      }
    }

    async function renderCandleChart(symbol, interval) {
      if (!canvas) return;

      const { hasChart, hasFinancial, hasTimeScale } = chartDepsOk();
      if (!hasChart || !hasFinancial || !hasTimeScale) {
        console.warn("Falta Chart.js o plugins necesarios.");
        return;
      }

      const candles = await fetchCandles(symbol, interval);
      if (!candles.length) {
        console.warn("Sin datos OHLC para mostrar.");
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (candleChart) {
        candleChart.destroy();
        candleChart = null;
      }

      candleChart = new Chart(ctx, {
        type: "candlestick",
        data: {
          datasets: [{
            label: symbol,
            data: candles,
            borderColor: "#00ff00",
            borderWidth: 1,
            color: { up: "#00c087", down: "#f6465d", unchanged: "#999" },
            barPercentage: 0.2,
            categoryPercentage: 0.1,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          parsing: false,
          scales: {
            x: {
              type: "time",
              time: { unit: "minute", tooltipFormat: "PPpp" },
              ticks: { color: "#fff" },
              grid: { color: "rgba(255,255,255,0.1)" }
            },
            y: {
              position: "right",
              ticks: { color: "#fff" },
              grid: { color: "rgba(255,255,255,0.1)" }
            }
          },
          plugins: {
            legend: { labels: { color: "#fff" } }
          }
        }
      });
    }

    async function fetchBinancePriceUI(symbol = "BTCUSDT") {
      try {
        const url = `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`;
        const res = await fetchWithTimeout(url, 10000);
        if (!res.ok) throw new Error("API Binance fallo");
        const data = await res.json();
        const price = Number(data.price);

        if (Number.isFinite(price) && priceEl) {
          const arrow = previousPrice !== null
            ? (price > previousPrice ? "🔼" : price < previousPrice ? "🔽" : "➡️")
            : "";
          priceEl.textContent = `$${price.toFixed(2)} ${arrow}`;
          priceEl.style.color =
            previousPrice === null ? "#0f0" :
            price > previousPrice ? "lime" :
            price < previousPrice ? "red" : "gray";

          trendEl && (trendEl.textContent =
            price > previousPrice ? "IA: Vela Alta 🔼" :
            price < previousPrice ? "IA: Vela Baja 🔽" :
            "IA: Tendencia Estable ➡️");

          previousPrice = price;
        }

        if (futureEl && Number.isFinite(previousPrice)) {
          const change = price * (Math.random() * 0.1 - 0.05);
          const future = price + change;
          futureEl.textContent =
            `IA: Precio Futuro (estimado): $${future.toFixed(2)} ${change >= 0 ? "🔼" : "🔽"}`;
        }

        clearInterval(window.__timerInterval);
        window.__timerInterval = startCounter(timerEl, "IA: Tiempo desde actualización");

        clearInterval(window.__priceTimerInterval);
        window.__priceTimerInterval = startCounter(priceTimerEl, "IA: Última actualización de BTC");

      } catch (e) {
        console.error("Error obteniendo precio Binance:", e);
        priceEl && (priceEl.textContent = "Error.");
        futureEl && (futureEl.textContent = "Error predicción.");
      }
    }

    async function actualizarDatos() {
      const symbol = (tokenSelect?.value || "BTCUSDT").toUpperCase();
      const intervalo = (intervaloSelect?.value || "1m");
      await Promise.all([ renderCandleChart(symbol, intervalo), fetchBinancePriceUI(symbol) ]);
    }

    if (canvas) {
      actualizarDatos().catch(console.error);
      Intervals.set("actualizarDatos", actualizarDatos, 60000);
      on(tokenSelect, "change", actualizarDatos);
      on(intervaloSelect, "change", actualizarDatos);
      on(updateBtn, "click", actualizarDatos);

      on(document, "visibilitychange", () => {
        if (document.hidden) {
          Intervals.clear("actualizarDatos");
        } else {
          actualizarDatos().catch(console.error);
          Intervals.set("actualizarDatos", actualizarDatos, 60000);
        }
      });

      on(window, "beforeunload", () => {
        Intervals.clearAll();
        candleChart && candleChart.destroy();
      });
    }

    /* ---------------------------
       WhatsApp (form + FAB)
    --------------------------- */
    const form  = $("#contact-form");
    const btnWA = $("#send-whatsapp");
    const fabWA = $("#wa-fab-link");

    const buildWAText = () => {
      const name = ($("#name")?.value || "").trim();
      const email = ($("#email")?.value || "").trim();
      const subject = ($("#subject")?.value || "Sin asunto").trim();
      const message = ($("#message")?.value || "").trim();
      return [
        `*Nuevo mensaje desde freimeljerezcom.online*`,
        `*Nombre:* ${name}`,
        `*Email:* ${email}`,
        subject ? `*Asunto:* ${subject}` : null,
        `*Mensaje:*`, message, "",
        `Página: ${location.href}`,
        `Fecha: ${new Date().toLocaleString()}`
      ].filter(Boolean).join("\n");
    };

    const buildWAUrl = (text, wa) => `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;

    if (form) {
      const waNumber = (form.dataset.waNumber || "573206780200").replace(/\D/g, "");
      on(btnWA, "click", (e) => {
        e.preventDefault();
        if (!form.checkValidity()) return form.reportValidity();
        const url = buildWAUrl(buildWAText(), waNumber);
        window.open(url, "_blank", "noopener,noreferrer");
      });
      on(fabWA, "click", (e) => {
        e.preventDefault();
        const saludo = encodeURIComponent("Hola Freimel, vengo desde freimeljerezcom.online 👋");
        window.open(`https://wa.me/${waNumber}?text=${saludo}`, "_blank", "noopener,noreferrer");
      });
      on(form, "submit", (e) => {
        if (!form.checkValidity()) {
          e.preventDefault();
          return form.reportValidity();
        }
        const url = buildWAUrl(buildWAText(), waNumber);
        window.open(url, "_blank", "noopener,noreferrer");
      });
    }

    /* ---------------------------
       Banner de cookies (Aceptar / Rechazar)
    --------------------------- */
    const cookieBanner = document.getElementById("cookieBanner");
    const acceptBtn = document.getElementById("acceptCookiesBtn");
    const rejectBtn = document.getElementById("rejectCookiesBtn");

    const cookieChoice = localStorage.getItem("cookieChoice");

    if (!cookieChoice && cookieBanner) {
      cookieBanner.style.display = "block";
    }

    if (acceptBtn) {
      acceptBtn.addEventListener("click", () => {
        localStorage.setItem("cookieChoice", "accepted");
        cookieBanner.style.display = "none";
        console.log("🍪 Cookies aceptadas");
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener("click", () => {
        localStorage.setItem("cookieChoice", "rejected");
        cookieBanner.style.display = "none";
        console.log("🚫 Cookies rechazadas");
      });
    }
  });
})();
