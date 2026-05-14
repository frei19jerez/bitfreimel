/* =========================================================
   FreimelJerez - JS Global (navbar, PWA, Gráfico, WhatsApp, Cookies)
   ========================================================= */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);

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

  async function fetchWithTimeout(url, ms = 10000, init = {}) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(id);
    }
  }

  function tiempoHumano(segundos) {
    if (segundos < 60) return `hace ${segundos} segundo${segundos === 1 ? "" : "s"}`;
    const minutos = Math.floor(segundos / 60);
    if (minutos < 60) return `hace ${minutos} minuto${minutos === 1 ? "" : "s"}`;
    const horas = Math.floor(minutos / 60);
    return `hace ${horas} hora${horas === 1 ? "" : "s"}`;
  }

  function startCounter(el, label) {
    if (!el) return null;
    let s = 0;
    el.textContent = `${label}: hace 0 segundos`;

    return setInterval(() => {
      s++;
      el.textContent = `${label}: ${tiempoHumano(s)}`;
    }, 1000);
  }

  document.addEventListener("DOMContentLoaded", () => {

    const hamburger = $("#hamburger");
    const navLinks  = $("#nav-links");

    on(hamburger, "click", () => {
      navLinks?.classList.toggle("active");
      const expanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!expanded));
    });

    let deferredPrompt = null;
    const installBtn = $("#installBtn");

    on(window, "beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      installBtn && (installBtn.style.display = "inline-block");
    });

    on(installBtn, "click", async () => {
      try {
        await deferredPrompt?.prompt();
        await deferredPrompt?.userChoice;
        deferredPrompt = null;
        $("#mensajeInstalacion")?.classList.remove("oculto");
      } catch {}
    });

    /* ---------------------------
       ⭐ Gráfico de velas + precio
       ⭐ ESTA SECCIÓN NO SE TOCA ⭐
    --------------------------- */

    const canvas = $("#btcChart");
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
          (window.Chart.registry &&
           window.Chart.registry.getController &&
           window.Chart.registry.getController("candlestick")));
      return { hasChart, hasFinancial, hasTimeScale };
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
      if (!hasChart || !hasFinancial || !hasTimeScale) return;

      const candles = await fetchCandles(symbol, interval);
      if (!candles.length) return;

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

        const { price } = await res.json();
        const p = Number(price);

        if (Number.isFinite(p) && priceEl) {
          const arrow =
            previousPrice == null ? "" :
            p > previousPrice ? "🔼" :
            p < previousPrice ? "🔽" : "➡️";

          priceEl.textContent = `$${p.toFixed(2)} ${arrow}`;
          priceEl.style.color =
            previousPrice == null ? "#0f0" :
            p > previousPrice ? "lime" :
            p < previousPrice ? "red" : "gray";

          trendEl && (trendEl.textContent =
            p > previousPrice ? "IA: Vela Alta 🔼" :
            p < previousPrice ? "IA: Vela Baja 🔽" :
            "IA: Tendencia Estable ➡️");

          previousPrice = p;
        }

        if (futureEl) {
          const change = p * (Math.random() * 0.1 - 0.05);
          futureEl.textContent =
            `IA: Precio Futuro (estimado): $${(p + change).toFixed(2)} ${
              change >= 0 ? "🔼" : "🔽"
            }`;
        }

        if (!window.__timerInterval) {
          window.__timerInterval = startCounter(timerEl, "IA: Tiempo desde actualización");
        }

        if (!window.__priceTimerInterval) {
          window.__priceTimerInterval = startCounter(priceTimerEl, "IA: Última actualización de BTC");
        }

        if (priceTimerEl) {
          const ahora = new Date();
          const h = ahora.getHours().toString().padStart(2, "0");
          const m = ahora.getMinutes().toString().padStart(2, "0");
          const s = ahora.getSeconds().toString().padStart(2, "0");
          priceTimerEl.innerHTML += ` <br><small>Actualizado: ${h}:${m}:${s}</small>`;
        }

      } catch (e) {
        console.error("Error obteniendo precio Binance:", e);
        priceEl && (priceEl.textContent = "Error.");
        futureEl && (futureEl.textContent = "Error predicción.");
      }
    }

    async function actualizarDatos() {
      const symbol = (tokenSelect?.value || "BTCUSDT").toUpperCase();
      const intervalo = intervaloSelect?.value || "1m";
      await Promise.all([renderCandleChart(symbol, intervalo), fetchBinancePriceUI(symbol)]);
    }

    if (canvas) {
      actualizarDatos();
      Intervals.set("actualizarDatos", actualizarDatos, 60000);

      on(tokenSelect, "change", actualizarDatos);
      on(intervaloSelect, "change", actualizarDatos);
      on(updateBtn, "click", actualizarDatos);

      on(document, "visibilitychange", () => {
        if (document.hidden) {
          Intervals.clear("actualizarDatos");
        } else {
          actualizarDatos();
          Intervals.set("actualizarDatos", actualizarDatos, 60000);
        }
      });

      on(window, "beforeunload", () => {
        Intervals.clearAll();
        candleChart?.destroy();
      });
    }

    const form  = $("#contact-form");
    if (form) {
      const btnWA = $("#send-whatsapp");
      const fabWA = $("#wa-fab-link");

      const wa = (form.dataset.waNumber || "573206780200").replace(/\D/g, "");

      const buildWAText = () => {
        const name = ($("#name")?.value || "").trim();
        const email = ($("#email")?.value || "").trim();
        const subject = ($("#subject")?.value || "Sin asunto").trim();
        const message = ($("#message")?.value || "").trim();

        return [
          "*Nuevo mensaje desde freimeljerezcom.online*",
          `*Nombre:* ${name}`,
          `*Email:* ${email}`,
          subject ? `*Asunto:* ${subject}` : null,
          `*Mensaje:* ${message}`,
          "",
          `Página: ${location.href}`,
          `Fecha: ${new Date().toLocaleString()}`
        ].filter(Boolean).join("\n");
      };

      const openWA = (text) =>
        window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`,
          "_blank", "noopener,noreferrer");

      const enviar = (e) => {
        e.preventDefault();
        if (!form.checkValidity()) return form.reportValidity();
        openWA(buildWAText());
      };

      on(btnWA, "click", enviar);
      on(form, "submit", enviar);

      on(fabWA, "click", (e) => {
        e.preventDefault();
        openWA("Hola Freimel, vengo desde freimeljerezcom.online 👋");
      });
    }

    /* ---------------------------
       🎵 Música IA Futurista
    --------------------------- */

    const btnMusicaIA = $("#btnMusicaIA");
    const musicaIA = $("#musicaIA");

    if (btnMusicaIA && musicaIA) {
      musicaIA.volume = 0.35;

      btnMusicaIA.innerHTML = "🎵 Activar música IA";
      btnMusicaIA.style.background = "#00ff66";
      btnMusicaIA.style.color = "#000";
      btnMusicaIA.style.border = "none";
      btnMusicaIA.style.padding = "12px 20px";
      btnMusicaIA.style.borderRadius = "10px";
      btnMusicaIA.style.fontWeight = "bold";
      btnMusicaIA.style.cursor = "pointer";
      btnMusicaIA.style.boxShadow = "0 0 15px #00ff66";

      on(btnMusicaIA, "click", async () => {
        try {
          if (musicaIA.paused) {
            await musicaIA.play();

            btnMusicaIA.innerHTML = "🔇 Pausar música IA";
            btnMusicaIA.style.background = "#ff4444";
            btnMusicaIA.style.color = "#fff";
            btnMusicaIA.style.boxShadow = "0 0 15px #ff4444";
          } else {
            musicaIA.pause();

            btnMusicaIA.innerHTML = "🎵 Activar música IA";
            btnMusicaIA.style.background = "#00ff66";
            btnMusicaIA.style.color = "#000";
            btnMusicaIA.style.boxShadow = "0 0 15px #00ff66";
          }
        } catch (error) {
          console.log("Error reproduciendo música:", error);
        }
      });
    }

    const cookieBanner = $("#cookieBanner");
    const acceptBtn = $("#acceptCookiesBtn");
    const rejectBtn = $("#rejectCookiesBtn");

    if (!localStorage.getItem("cookieChoice") && cookieBanner) {
      cookieBanner.style.display = "block";
    }

    on(acceptBtn, "click", () => {
      localStorage.setItem("cookieChoice", "accepted");
      cookieBanner.style.display = "none";
    });

    on(rejectBtn, "click", () => {
      localStorage.setItem("cookieChoice", "rejected");
      cookieBanner.style.display = "none";
    });

  });
})();