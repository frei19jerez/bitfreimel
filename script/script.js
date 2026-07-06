/* =========================================================
   Freimel Jerez IA - JS Global
   Navbar, PWA, Bitcoin IA, Gráfico, WhatsApp, Música y Cookies
   ========================================================= */

(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);

  const on = (element, event, callback, options) => {
    if (element) {
      element.addEventListener(event, callback, options);
    }
  };

  const Intervals = (() => {
    const map = new Map();

    return {
      set(name, callback, ms) {
        if (map.has(name)) {
          clearInterval(map.get(name));
        }

        const id = setInterval(callback, ms);
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
        for (const id of map.values()) {
          clearInterval(id);
        }

        map.clear();
      }
    };
  })();

  async function fetchWithTimeout(url, ms = 10000, init = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ms);

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function tiempoHumano(segundos) {
    if (segundos < 60) {
      return `hace ${segundos} segundo${segundos === 1 ? "" : "s"}`;
    }

    const minutos = Math.floor(segundos / 60);

    if (minutos < 60) {
      return `hace ${minutos} minuto${minutos === 1 ? "" : "s"}`;
    }

    const horas = Math.floor(minutos / 60);
    return `hace ${horas} hora${horas === 1 ? "" : "s"}`;
  }

  function startCounter(element, label) {
    if (!element) return null;

    let seconds = 0;
    element.textContent = `${label}: hace 0 segundos`;

    return setInterval(() => {
      seconds++;
      element.textContent = `${label}: ${tiempoHumano(seconds)}`;
    }, 1000);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const hamburger = $("#hamburger");
    const navLinks = $("#nav-links");

    on(hamburger, "click", () => {
      navLinks?.classList.toggle("active");

      const expanded = hamburger.getAttribute("aria-expanded") === "true";
      hamburger.setAttribute("aria-expanded", String(!expanded));
    });

    on(document, "click", (event) => {
      if (!hamburger || !navLinks) return;

      const clickedInsideMenu = navLinks.contains(event.target);
      const clickedButton = hamburger.contains(event.target);

      if (!clickedInsideMenu && !clickedButton && navLinks.classList.contains("active")) {
        navLinks.classList.remove("active");
        hamburger.setAttribute("aria-expanded", "false");
      }
    });

    const navItems = document.querySelectorAll("#nav-links a");

    navItems.forEach((link) => {
      on(link, "click", () => {
        navLinks?.classList.remove("active");
        hamburger?.setAttribute("aria-expanded", "false");
      });
    });

    let deferredPrompt = null;
    const installBtn = $("#installBtn");
    const mensajeInstalacion = $("#mensajeInstalacion");
    const mensajeGracias = $("#mensajeGracias");

    if (installBtn) {
      installBtn.classList.add("oculto");
    }

    on(window, "beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;

      if (installBtn) {
        installBtn.classList.remove("oculto");
      }
    });

    on(installBtn, "click", async () => {
      if (!deferredPrompt) return;

      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;

        deferredPrompt = null;

        if (choiceResult.outcome === "accepted") {
          mensajeInstalacion?.classList.remove("oculto");
          mensajeGracias?.classList.remove("oculto");
        }

        installBtn.classList.add("oculto");
      } catch (error) {
        console.error("Error instalando PWA:", error);
      }
    });

    on(window, "appinstalled", () => {
      deferredPrompt = null;
      installBtn?.classList.add("oculto");
      mensajeInstalacion?.classList.remove("oculto");
      mensajeGracias?.classList.remove("oculto");
    });

    const canvas = $("#btcChart");
    const tokenSelect = $("#token");
    const intervaloSelect = $("#intervalo");
    const updateBtn = $("#updateBtn");

    const tokenLabel = $("#token-label");
    const priceEl = $("#btc-price");
    const trendEl = $("#trend-indicator");
    const futureEl = $("#future-price");
    const timerEl = $("#timer");
    const priceTimerEl = $("#btc-price-timer");

    let candleChart = null;
    let previousPrice = null;

    function chartDepsOk() {
      const hasChart = typeof window.Chart !== "undefined";

      const hasTimeScale =
        hasChart &&
        window.Chart.registry &&
        (
          window.Chart.registry.getScale("time") ||
          window.Chart.registry.getScale("timeseries")
        );

      const hasFinancial =
        hasChart &&
        (
          window.Chart.FinancialController ||
          (
            window.Chart.registry &&
            window.Chart.registry.getController &&
            window.Chart.registry.getController("candlestick")
          )
        );

      return {
        hasChart,
        hasFinancial,
        hasTimeScale
      };
    }

    async function fetchCandles(symbol = "BTCUSDT", interval = "1m", limit = 50) {
      try {
        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const response = await fetchWithTimeout(url, 12000);

        if (!response.ok) {
          throw new Error("Error API Binance OHLC");
        }

        const raw = await response.json();

        return raw.map((candle) => ({
          x: new Date(candle[0]),
          o: Number(candle[1]),
          h: Number(candle[2]),
          l: Number(candle[3]),
          c: Number(candle[4])
        }));
      } catch (error) {
        console.error("Error obteniendo velas:", error);
        return [];
      }
    }

    async function renderCandleChart(symbol, interval) {
      if (!canvas) return;

      const deps = chartDepsOk();

      if (!deps.hasChart || !deps.hasFinancial || !deps.hasTimeScale) {
        console.warn("Chart.js financiero no está listo.");
        return;
      }

      const candles = await fetchCandles(symbol, interval);

      if (!candles.length) {
        return;
      }

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      if (candleChart) {
        candleChart.destroy();
        candleChart = null;
      }

      candleChart = new Chart(ctx, {
        type: "candlestick",
        data: {
          datasets: [
            {
              label: symbol,
              data: candles,
              borderColor: "#00ff88",
              borderWidth: 1,
              color: {
                up: "#00c087",
                down: "#f6465d",
                unchanged: "#94a3b8"
              },
              barPercentage: 0.2,
              categoryPercentage: 0.1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          parsing: false,
          scales: {
            x: {
              type: "time",
              time: {
                unit: interval === "1h" ? "hour" : "minute",
                tooltipFormat: "PPpp"
              },
              ticks: {
                color: "#f8fafc"
              },
              grid: {
                color: "rgba(255,255,255,0.08)"
              }
            },
            y: {
              position: "right",
              ticks: {
                color: "#f8fafc"
              },
              grid: {
                color: "rgba(255,255,255,0.08)"
              }
            }
          },
          plugins: {
            legend: {
              labels: {
                color: "#f8fafc"
              }
            },
            tooltip: {
              callbacks: {
                label(context) {
                  const item = context.raw;

                  if (!item) {
                    return "";
                  }

                  return [
                    `Apertura: $${item.o.toFixed(2)}`,
                    `Máximo: $${item.h.toFixed(2)}`,
                    `Mínimo: $${item.l.toFixed(2)}`,
                    `Cierre: $${item.c.toFixed(2)}`
                  ];
                }
              }
            }
          }
        }
      });
    }

    function calcularPrediccionEducativa(price) {
      const variation = price * (Math.random() * 0.06 - 0.03);
      const estimated = price + variation;

      return {
        estimated,
        variation
      };
    }

    function actualizarTendencia(price) {
      if (!trendEl) return;

      if (previousPrice === null) {
        trendEl.textContent = "IA: Tendencia inicializando datos...";
        return;
      }

      if (price > previousPrice) {
        trendEl.textContent = "IA: Tendencia alcista educativa 🔼";
        trendEl.classList.remove("text-danger", "text-secondary");
        trendEl.classList.add("text-success");
        return;
      }

      if (price < previousPrice) {
        trendEl.textContent = "IA: Tendencia bajista educativa 🔽";
        trendEl.classList.remove("text-success", "text-secondary");
        trendEl.classList.add("text-danger");
        return;
      }

      trendEl.textContent = "IA: Tendencia estable ➡️";
      trendEl.classList.remove("text-success", "text-danger");
      trendEl.classList.add("text-secondary");
    }

    async function fetchBinancePriceUI(symbol = "BTCUSDT") {
      try {
        const url = `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`;
        const response = await fetchWithTimeout(url, 10000);

        if (!response.ok) {
          throw new Error("API Binance falló");
        }

        const data = await response.json();
        const price = Number(data.price);

        if (!Number.isFinite(price)) {
          throw new Error("Precio no válido");
        }

        if (tokenLabel) {
          tokenLabel.textContent = symbol;
        }

        if (priceEl) {
          const arrow =
            previousPrice === null
              ? "➡️"
              : price > previousPrice
                ? "🔼"
                : price < previousPrice
                  ? "🔽"
                  : "➡️";

          priceEl.textContent = `$${price.toFixed(2)} ${arrow}`;

          priceEl.classList.remove("text-success", "text-danger", "text-secondary");

          if (previousPrice === null) {
            priceEl.classList.add("text-secondary");
          } else if (price > previousPrice) {
            priceEl.classList.add("text-success");
          } else if (price < previousPrice) {
            priceEl.classList.add("text-danger");
          } else {
            priceEl.classList.add("text-secondary");
          }
        }

        actualizarTendencia(price);

        if (futureEl) {
          const prediction = calcularPrediccionEducativa(price);

          futureEl.textContent =
            `IA: Precio futuro estimado educativo: $${prediction.estimated.toFixed(2)} ${
              prediction.variation >= 0 ? "🔼" : "🔽"
            }`;
        }

        previousPrice = price;

        if (!window.__timerInterval) {
          window.__timerInterval = startCounter(timerEl, "IA: Tiempo desde actualización");
        }

        if (!window.__priceTimerInterval) {
          window.__priceTimerInterval = startCounter(priceTimerEl, "IA: Última actualización");
        }

        if (priceTimerEl) {
          const now = new Date();
          const hour = now.getHours().toString().padStart(2, "0");
          const minute = now.getMinutes().toString().padStart(2, "0");
          const second = now.getSeconds().toString().padStart(2, "0");

          priceTimerEl.textContent = `IA: Última actualización: ${hour}:${minute}:${second}`;
        }
      } catch (error) {
        console.error("Error obteniendo precio Binance:", error);

        if (priceEl) {
          priceEl.textContent = "Error cargando precio.";
        }

        if (futureEl) {
          futureEl.textContent = "IA: No se pudo calcular la estimación.";
        }

        if (trendEl) {
          trendEl.textContent = "IA: Sin datos suficientes en este momento.";
        }
      }
    }

    async function actualizarDatos() {
      const symbol = (tokenSelect?.value || "BTCUSDT").toUpperCase();
      const interval = intervaloSelect?.value || "1m";

      if (updateBtn) {
        updateBtn.classList.add("actualizando");
        updateBtn.textContent = "Actualizando...";
      }

      await Promise.all([
        renderCandleChart(symbol, interval),
        fetchBinancePriceUI(symbol)
      ]);

      if (updateBtn) {
        updateBtn.classList.remove("actualizando");
        updateBtn.textContent = "🔄 Actualizar";
      }
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

        if (window.__timerInterval) {
          clearInterval(window.__timerInterval);
        }

        if (window.__priceTimerInterval) {
          clearInterval(window.__priceTimerInterval);
        }

        candleChart?.destroy();
      });
    }

    const contactForm = $("#contact-form");

    if (contactForm) {
      const btnWhatsApp = $("#send-whatsapp");
      const fabWhatsApp = $("#wa-fab-link");
      const whatsappNumber = (contactForm.dataset.waNumber || "573206780200").replace(/\D/g, "");

      const buildWhatsAppText = () => {
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

      const openWhatsApp = (text) => {
        window.open(
          `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`,
          "_blank",
          "noopener,noreferrer"
        );
      };

      const sendToWhatsApp = (event) => {
        event.preventDefault();

        if (!contactForm.checkValidity()) {
          contactForm.reportValidity();
          return;
        }

        openWhatsApp(buildWhatsAppText());
      };

      on(btnWhatsApp, "click", sendToWhatsApp);
      on(contactForm, "submit", sendToWhatsApp);

      on(fabWhatsApp, "click", (event) => {
        event.preventDefault();
        openWhatsApp("Hola Freimel, vengo desde freimeljerezcom.online 👋");
      });
    }

    const btnMusicaIA = $("#btnMusicaIA");
    const musicaIA = $("#musicaIA");

    if (btnMusicaIA && musicaIA) {
      musicaIA.volume = 0.35;
      btnMusicaIA.textContent = "🎵 Activar música IA";
      btnMusicaIA.classList.add("musica-activa-btn");

      on(btnMusicaIA, "click", async () => {
        try {
          if (musicaIA.paused) {
            await musicaIA.play();

            btnMusicaIA.textContent = "🔇 Pausar música IA";
            btnMusicaIA.classList.remove("musica-activa-btn");
            btnMusicaIA.classList.add("musica-pausa-btn");
          } else {
            musicaIA.pause();

            btnMusicaIA.textContent = "🎵 Activar música IA";
            btnMusicaIA.classList.remove("musica-pausa-btn");
            btnMusicaIA.classList.add("musica-activa-btn");
          }
        } catch (error) {
          console.error("Error reproduciendo música:", error);
        }
      });
    }

    const cookieBanner = $("#cookieBanner");
    const acceptCookiesBtn = $("#acceptCookiesBtn");
    const rejectCookiesBtn = $("#rejectCookiesBtn");

    if (!localStorage.getItem("cookieChoice") && cookieBanner) {
      cookieBanner.style.display = "block";
    }

    on(acceptCookiesBtn, "click", () => {
      localStorage.setItem("cookieChoice", "accepted");

      if (cookieBanner) {
        cookieBanner.style.display = "none";
      }
    });

    on(rejectCookiesBtn, "click", () => {
      localStorage.setItem("cookieChoice", "rejected");

      if (cookieBanner) {
        cookieBanner.style.display = "none";
      }
    });
  });
})();