/* =========================================================
   FreimelJerez - JS Global (navbar, PWA, Gráfico, WhatsApp)
   ========================================================= */
(() => {
  "use strict";

  /* ---------------------------
     Utilidades generales
  --------------------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);

  // Manejador de intervalos centralizado para limpiar fácil
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
       PWA: botón de instalación
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
      } catch {
        /* el usuario puede cancelar */
      }
    });

    /* ---------------------------
       Gráfico de velas + precio
    --------------------------- */
    const canvas = /** @type {HTMLCanvasElement|null} */ ($("#btcChart"));
    const tokenSelect = $("#token");
    const intervaloSelect = $("#intervalo");
    const updateBtn = $("#updateBtn");

    // Elementos UI precio/tendencia/tiempos (opcionales)
    const priceEl  = $("#btc-price");
    const trendEl  = $("#trend-indicator");
    const futureEl = $("#future-price");
    const timerEl  = $("#timer");
    const priceTimerEl = $("#btc-price-timer");

    // Estado
    let candleChart = null;
    let previousPrice = null;

    // Validar dependencias del gráfico
    function chartDepsOk() {
      const hasChart = typeof window.Chart !== "undefined";
      const hasFinancial =
        hasChart && window.Chart.registry && window.Chart.registry.getPlugin
          ? !!window.Chart.registry.getPlugin("financial")
          : // fallback: muchos builds registran Chart.FinancialController
            !!(window.Chart && (window.Chart.FinancialController || window.financial));
      const hasTimeScale =
        hasChart &&
        window.Chart.registry &&
        (window.Chart.registry.getScale("time") || window.Chart.registry.getScale("timeseries"));
      return { hasChart, hasFinancial, hasTimeScale };
    }

    // Adaptador de timers para los contadores
    function startCounter(el, label) {
      if (!el) return null;
      let s = 0;
      el.textContent = `${label}: 0 segundos`;
      return setInterval(() => {
        s += 1;
        el.textContent = `${label}: ${s} segundos`;
      }, 1000);
    }

    // Resetear contadores
    function resetTimer(labelEl, labelText, key) {
      Intervals.clear(key);
      const id = startCounter(labelEl, labelText);
      if (id) {
        // Guardar bajo el mismo nombre para poder limpiar luego
        Intervals.clear(key);
        // peq. wrapper para compatibilidad de API
        const intervalId = id;
        Intervals.set(key, () => {}, 1e9); // placeholder
        // hack para registrar el id real y que clearAll lo limpie
        // (clearAll limpiará el placeholder, limpiemos manualmente el real en visibilitychange)
        // Para simpleza, gestionamos manual con clearInterval en visibilitychange
        return intervalId;
      }
      return null;
    }

    // Obtener velas OHLC desde Binance
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

    // Renderizar gráfico de velas
    async function renderCandleChart(symbol, interval) {
      if (!canvas) return;

      const { hasChart, hasFinancial, hasTimeScale } = chartDepsOk();
      if (!hasChart || !hasFinancial || !hasTimeScale) {
        console.warn(
          "Falta Chart.js, el plugin financial o el adapter de tiempo. " +
          "Incluye: chart.js, chartjs-chart-financial y un time adapter (p.ej. chartjs-adapter-date-fns)."
        );
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

      // Colores coherentes con tu tema
      const upColor = "#00c087";   // verde
      const downColor = "#f6465d"; // rojo

      candleChart = new Chart(ctx, {
        type: "candlestick",
        data: {
          datasets: [{
            label: symbol,
            data: candles,
            borderColor: "#00ff00",
            borderWidth: 1,
            color: {
              up: upColor,
              down: downColor,
              unchanged: "#999"
            },
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
              time: {
                unit: "minute",
                tooltipFormat: "PPpp"
              },
              ticks: { color: "#ffffff" },
              grid: { color: "rgba(255,255,255,0.1)" },
              min: new Date(candles[0].x.getTime() - 60000),
              max: new Date(candles[candles.length - 1].x.getTime() + 60000),
            },
            y: {
              position: "right",
              offset: true,
              ticks: {
                color: "#ffffff",
                padding: 10
              },
              grid: { color: "rgba(255,255,255,0.1)" }
            }
          },
          plugins: {
            legend: {
              labels: { color: "#ffffff" }
            },
            tooltip: {
              mode: "index",
              intersect: false
            }
          },
          interaction: {
            mode: "nearest",
            intersect: false
          }
        }
      });
    }

    // Obtener precio actual y actualizar UI
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

          if (trendEl) {
            trendEl.textContent =
              previousPrice === null
                ? "IA: Analizando…"
                : price > previousPrice
                  ? "IA: Vela Alta 🔼"
                  : price < previousPrice
                    ? "IA: Vela Baja 🔽"
                    : "IA: Tendencia Estable ➡️";
          }

          previousPrice = price;
        }

        if (futureEl && Number.isFinite(previousPrice)) {
          // Demo/placeholder de “IA”: ±5% aleatorio
          const change = price * (Math.random() * 0.1 - 0.05);
          const future = price + change;
          futureEl.textContent =
            `IA: Precio Futuro (estimado): $${future.toFixed(2)} ${change >= 0 ? "🔼" : "🔽"}`;
        }

        // Reiniciar contadores
        if (timerEl) {
          clearInterval(window.__timerInterval);
          window.__timerInterval = startCounter(timerEl, "IA: Tiempo desde la última actualización");
        }
        if (priceTimerEl) {
          clearInterval(window.__priceTimerInterval);
          window.__priceTimerInterval = startCounter(priceTimerEl, "IA: Tiempo desde la última actualización de BTC");
        }

      } catch (e) {
        console.error("Error obteniendo precio Binance:", e);
        priceEl && (priceEl.textContent = "Error.");
        futureEl && (futureEl.textContent = "Error predicción.");
      }
    }

    // Actualizar todo
    async function actualizarDatos() {
      const symbol = (tokenSelect?.value || "BTCUSDT").toUpperCase();
      const intervalo = (intervaloSelect?.value || "1m");
      await Promise.all([
        renderCandleChart(symbol, intervalo),
        fetchBinancePriceUI(symbol),
      ]);
    }

    // Inicialización condicional (solo si existe el canvas)
    if (canvas) {
      // Primera carga segura
      actualizarDatos().catch(console.error);

      // Intervalo cada 60s
      Intervals.set("actualizarDatos", actualizarDatos, 60000);

      // Cambios por selector/botón
      on(tokenSelect, "change", actualizarDatos);
      on(intervaloSelect, "change", actualizarDatos);
      on(updateBtn, "click", actualizarDatos);

      // Pausar cuando la pestaña no está visible para ahorrar recursos
      on(document, "visibilitychange", () => {
        if (document.hidden) {
          Intervals.clear("actualizarDatos");
        } else {
          actualizarDatos().catch(console.error);
          Intervals.set("actualizarDatos", actualizarDatos, 60000);
        }
      });

      // Limpieza al salir
      on(window, "beforeunload", () => {
        Intervals.clearAll();
        if (candleChart) {
          candleChart.destroy();
          candleChart = null;
        }
        clearInterval(window.__timerInterval);
        clearInterval(window.__priceTimerInterval);
      });
    }

    /* ---------------------------
       WhatsApp (form + FAB)
    --------------------------- */
    const form  = /** @type {HTMLFormElement|null} */ ($("#contact-form"));
    const btnWA = $("#send-whatsapp");
    const fabWA = $("#wa-fab-link");

    if (form) {
      // Número destino en formato internacional sin "+"
      const waNumber = (form.dataset.waNumber || "57XXXXXXXXXX").replace(/\D/g, "");

      function buildWAText() {
        const name    = ($("#name")?.value || "").trim();
        const email   = ($("#email")?.value || "").trim();
        const subject = ($("#subject")?.value || "Sin asunto").trim();
        const message = ($("#message")?.value || "").trim();
        const consent = $("#consent")?.checked;

        if (!consent) { alert("Debes aceptar el tratamiento de datos para continuar."); return null; }
        if (name.length < 2 || !email || message.length < 10) {
          alert("Por favor completa Nombre, Email y un Mensaje de al menos 10 caracteres.");
          return null;
        }

        const meta = [
          `Página: ${location.href}`,
          `Fecha: ${new Date().toLocaleString()}`
        ].join("\n");

        const lines = [
          `*Nuevo mensaje desde freimeljerezcom.online*`,
          `*Nombre:* ${name}`,
          `*Email:* ${email}`,
          subject ? `*Asunto:* ${subject}` : null,
          `*Mensaje:*`,
          message,
          "",
          meta
        ].filter(Boolean);

        return lines.join("\n");
      }

      function buildWAUrl(text) {
        const encoded = encodeURIComponent(text);
        return `https://wa.me/${waNumber}?text=${encoded}`;
      }

      function openWA(prefillText) {
        const text = prefillText ?? buildWAText();
        if (!text) return;
        const url = buildWAUrl(text);
        window.open(url, "_blank", "noopener,noreferrer");
      }

      // Botón “Enviar por WhatsApp”
      on(btnWA, "click", (e) => {
        e.preventDefault();
        openWA();
      });

      // FAB flotante (saludo rápido, sin validar formulario)
      on(fabWA, "click", (e) => {
        e.preventDefault();
        const saludo = encodeURIComponent("Hola Freimel, vengo desde freimeljerezcom.online 👋");
        const url = `https://wa.me/${waNumber}?text=${saludo}`;
        window.open(url, "_blank", "noopener,noreferrer");
      });

      // (Opcional) Si quieres que el submit también dispare WhatsApp, descomenta:
      /*
      on(form, "submit", (e) => {
        const text = buildWAText();
        if (!text) { e.preventDefault(); return; }
        const url = buildWAUrl(text);
        window.open(url, "_blank", "noopener,noreferrer");
        // No prevenimos el submit: se envía a FormSubmit normal
      });
      */
    }
  });
})();
