// ============================
// BitFreimel · Predicción IA
// ============================

const API_TICKER = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
const API_KLINES = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=100';

// Formateadores
const nfUSD = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const nfPlain = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

// Estado
let ultimoPrecio = null;
let puedeReproducir = true;
let timerPrediccion = null;
let fetchController = null; // para abortar requests activos

// Audio (autoplay seguro)
const audioAlerta = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-digital-clock-beep-989.mp3");
audioAlerta.preload = 'none';
window.addEventListener('pointerdown', () => { audioAlerta.load(); }, { once: true });

// ---------------------------------
// Utilidades DOM
// ---------------------------------
function $(id){ return document.getElementById(id); }
function setText(id, text) { const el = $(id); if (el) el.textContent = text; }
function setHref(id, href) { const el = $(id); if (el) el.href = href; }

// ============================
// Predicción / precio en vivo
// ============================
async function obtenerPrediccionIA(signal) {
  const box        = $("prediccionBox");
  const tendencia  = $("tendenciaTexto");
  const horaActual = $("horaActual");
  if (!box || !tendencia || !horaActual) return;

  box.classList.add("actualizando");

  try {
    const res = await fetch(API_TICKER, { cache: 'no-store', signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const precioActual = Number.parseFloat(data.price);
    if (!Number.isFinite(precioActual)) throw new Error('Precio inválido');

    // Predicciones simples (placeholder)
    const precioFuturo = precioActual * 1.037;

    setText('precioFuturoIA', nfUSD.format(precioFuturo));
    setText('prediccionCorto',  `Entre ${nfUSD.format(precioActual * 0.98)} y ${nfUSD.format(precioActual * 1.02)}`);
    setText('prediccionSemana', `Entre ${nfUSD.format(precioActual * 1.03)} y ${nfUSD.format(precioActual * 1.06)}`);
    setText('prediccionMes',    `Proyección hacia ${nfUSD.format(precioActual * 1.10)}`);
    horaActual.textContent = new Date().toLocaleTimeString("es-CO");

    // Tendencia y alerta por % de cambio
    if (ultimoPrecio !== null) {
      const diff = precioActual - ultimoPrecio;
      const pct  = (diff / ultimoPrecio) * 100;

      if (diff > 0) {
        tendencia.textContent = `Tendencia Alcista 📈 (+${nfPlain.format(pct)}%)`;
        tendencia.style.color = "#00ff88";
      } else if (diff < 0) {
        tendencia.textContent = `Tendencia Bajista 📉 (${nfPlain.format(pct)}%)`;
        tendencia.style.color = "#ff5b5b";
      } else {
        tendencia.textContent = "Sin cambios ⏸️";
        tendencia.style.color = "gray";
      }

      // Alerta si cambio brusco: |pct| >= 0.7%
      if (Math.abs(pct) >= 0.7 && puedeReproducir) {
        try { await audioAlerta.play(); } catch {}
        puedeReproducir = false;
        setTimeout(() => (puedeReproducir = true), 5000);
      }
    } else {
      tendencia.textContent = "Calculando…";
      tendencia.style.color = "#aaa";
    }

    // Estilos según umbral (opcional)
    if (precioActual > 130000) {
      box.style.backgroundColor = "#000d00";
      box.style.border = "2px solid #00ff00";
      box.style.boxShadow = "0 0 20px #00ff00";
    } else {
      box.style.backgroundColor = "#111";
      box.style.border = "2px solid limegreen";
      box.style.boxShadow = "0 0 10px limegreen";
    }

    actualizarGrafico(precioActual); // si existe #graficoBTC
    ultimoPrecio = precioActual;

  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error("❌ Error al obtener el precio:", error);
      if (tendencia) {
        tendencia.textContent = "⚠️ Error al obtener datos";
        tendencia.style.color = "orange";
      }
    }
  } finally {
    setTimeout(() => box.classList.remove("actualizando"), 200);
  }
}

// ============================
// Loop con control de visibilidad
// ============================
function startPrediccionLoop() {
  stopPrediccionLoop();
  fetchController = new AbortController();

  const tick = async () => {
    if (document.hidden) return; // ahorra recursos si la pestaña no está visible
    await obtenerPrediccionIA(fetchController.signal);
  };

  tick(); // primera ejecución inmediata
  timerPrediccion = setInterval(tick, 60_000);
}

function stopPrediccionLoop() {
  if (timerPrediccion) {
    clearInterval(timerPrediccion);
    timerPrediccion = null;
  }
  if (fetchController) {
    try { fetchController.abort(); } catch {}
    fetchController = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopPrediccionLoop();
  } else if (!timerPrediccion) {
    startPrediccionLoop();
  }
});

// =============
// Gráfico línea (opcional: si tienes <canvas id="graficoBTC">)
// =============
let grafico = null;
function actualizarGrafico(precio) {
  const canvas = $("graficoBTC");
  if (!canvas || typeof Chart === 'undefined') return;

  const ahora = new Date().toLocaleTimeString("es-CO");

  if (!grafico) {
    const ctx = canvas.getContext("2d");
    grafico = new Chart(ctx, {
      type: "line",
      data: {
        labels: [ahora],
        datasets: [{
          label: "Precio BTC",
          data: [precio],
          borderWidth: 2,
          borderColor: "lime",
          backgroundColor: "rgba(0,255,0,0.15)",
          pointRadius: 2.5,
          tension: 0.25
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { ticks: { color: "#0f0" }, grid: { color: "rgba(0,255,0,0.1)" } },
          x: { ticks: { color: "#0f0" }, grid: { display: false } }
        },
        plugins: {
          legend: { labels: { color: "#0f0" } },
          tooltip: { mode: 'index', intersect: false }
        }
      }
    });
  } else {
    if (grafico.data.labels.length > 60) {
      grafico.data.labels.shift();
      grafico.data.datasets[0].data.shift();
    }
    grafico.data.labels.push(ahora);
    grafico.data.datasets[0].data.push(precio);
    grafico.update();
  }
}

// ==================
// Velas japonesas (usa <canvas id="velasBTC"> en tu HTML)
// ==================
async function cargarVelasBTC() {
  const canvas = $("velasBTC");
  if (!canvas || typeof Chart === 'undefined') return;

  try {
    const res = await fetch(API_KLINES, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    const datosVelas = raw.map(d => ({
      x: new Date(d[0]),
      o: Number.parseFloat(d[1]),
      h: Number.parseFloat(d[2]),
      l: Number.parseFloat(d[3]),
      c: Number.parseFloat(d[4])
    }));

    // 👉 espacio real extra a la derecha (gutter)
    const lastTs   = datosVelas[datosVelas.length - 1].x.getTime();
    const gutterMs = 2 * 60 * 1000; // 2 minutos

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'candlestick',
      data: {
        datasets: [{
          label: 'BTC/USDT (1m)',
          data: datosVelas,

          // Colores
          upColor: '#1ecb71',
          downColor: '#ff5b5b',
          borderColor: '#00ffaa',
          borderWidth: 1,

          // 🔹 Más separación entre velas
          barThickness: 3,          // 2–3 queda fino
          barPercentage: 0.9,       // reduce ancho relativo
          categoryPercentage: 0.9    // deja aire en la categoría
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,

        // 🔹 aire visual al borde derecho del canvas
        layout: { padding: { right: 28 } },

        scales: {
          x: {
            type: 'time',
            // 🔹 ampliamos el rango para que la última vela no toque el borde
            min: datosVelas[0].x,
            max: new Date(lastTs + gutterMs),

            offset: true, // aire automático en extremos
            time: { tooltipFormat: 'HH:mm', unit: 'minute' },
            ticks: { color: '#0f0', padding: 6 },
            grid:  { color: 'rgba(0,255,0,0.08)', drawBorder: false }
          },
          y: {
            position: 'right', // coordenadas a la derecha
            ticks: { color: '#0f0', padding: 6 },
            grid:  { color: 'rgba(0,255,0,0.08)', drawBorder: false }
          }
        },
        plugins: {
          legend: { labels: { color: '#0f0' } }
        }
      }
    });

  } catch (err) {
    console.error("❌ Error al cargar velas:", err);
  }
}

// ==============
// Descargar imagen del panel
// ==============
function setupDescarga() {
  const btn = $('descargarImagen');
  if (!btn) return;

  if (typeof html2canvas === 'undefined') {
    console.warn('html2canvas no está cargado.');
    return;
  }

  btn.addEventListener('click', async () => {
    try {
      const target = $('prediccionBox'); 
      if (!target) {
        alert('No se encontró el panel a capturar.');
        return;
      }

      const canvas = await html2canvas(target, {
        backgroundColor: '#111',
        scale: 2,
        useCORS: true,
        logging: false
      });

      const link = document.createElement('a');
      const ts = new Date().toISOString().slice(0,19).replace(/[-:T]/g, '');
      link.download = `prediccion_bitfreimel_${ts}.png`;
      link.href = canvas.toDataURL('image/png');

      // fallback iOS
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.open(link.href, '_blank');
      } else {
        link.click();
      }
    } catch (e) {
      console.error('Error generando la imagen:', e);
      alert('No se pudo generar la imagen. Intenta nuevamente.');
    }
  });
}

// ==================
// Compartir redes
// ==================
function setupShare() {
  const currentUrl = window.location.href;
  const mensaje = encodeURIComponent("📈 Mira esta predicción de Bitcoin generada por IA en BitFreimel 👇");

  setHref("share-whatsapp", `https://wa.me/?text=${mensaje}%0A${currentUrl}`);
  setHref("share-facebook", `https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`);
  setHref("share-twitter",  `https://twitter.com/intent/tweet?text=${mensaje}&url=${currentUrl}`);
  setHref("share-telegram", `https://t.me/share/url?url=${currentUrl}&text=${mensaje}`);

  const copy = $("share-copy");
  const copiado = $("copiado");
  if (copy) {
    copy.addEventListener("click", () => {
      navigator.clipboard.writeText(currentUrl).then(() => {
        if (copiado) {
          copiado.style.display = "block";
          setTimeout(() => (copiado.style.display = "none"), 3000);
        }
      });
    });
  }
}

// ===== MENU HAMBURGUESA =====
function setupHamburguesa() {
  const btn = $("hamburger");
  const menu = $("nav-links");
  if (!btn || !menu) return;

  function openMenu() {
    menu.classList.add("open");
    btn.classList.add("is-active");
    btn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden"; // bloquear scroll
  }
  function closeMenu() {
    menu.classList.remove("open");
    btn.classList.remove("is-active");
    btn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  btn.addEventListener("click", () => {
    const isOpen = menu.classList.contains("open");
    isOpen ? closeMenu() : openMenu();
  });

  // Cerrar al hacer clic en un enlace
  menu.addEventListener("click", (e) => {
    if (e.target.tagName === "A") closeMenu();
  });

  // Cerrar con Escape
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  // Reajustar al cambiar a desktop
  window.addEventListener("resize", () => { if (window.innerWidth > 960) closeMenu(); });
}

// ==================
// Bootstrap de la página
// ==================
document.addEventListener("DOMContentLoaded", () => {
  // Arranques
  setupHamburguesa();
  setupShare();
  setupDescarga();
  startPrediccionLoop();  // precio + predicción en vivo
  cargarVelasBTC();       // velas si existe el canvas
});
