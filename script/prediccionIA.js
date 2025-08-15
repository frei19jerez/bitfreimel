let ultimoPrecio = null;
let puedeReproducir = true;
const audioAlerta = new Audio("https://assets.mixkit.co/sfx/preview/mixkit-digital-clock-beep-989.mp3");

async function obtenerPrediccionIA() {
  const box = document.getElementById("prediccionBox");
  const tendencia = document.getElementById("tendenciaTexto");
  const horaActual = document.getElementById("horaActual");

  if (!box || !tendencia || !horaActual) return;

  box.classList.add("actualizando");

  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const data = await res.json();

    const precioActual = parseFloat(data.price);
    const precioFuturo = precioActual * 1.037;

    document.getElementById('precioFuturoIA').textContent = `$${precioFuturo.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    document.getElementById('prediccionCorto').textContent = `Entre $${(precioActual * 0.98).toLocaleString()} y $${(precioActual * 1.02).toLocaleString()}`;
    document.getElementById('prediccionSemana').textContent = `Entre $${(precioActual * 1.03).toLocaleString()} y $${(precioActual * 1.06).toLocaleString()}`;
    document.getElementById('prediccionMes').textContent = `Proyección hacia $${(precioActual * 1.1).toLocaleString()}`;
    horaActual.textContent = new Date().toLocaleTimeString("es-CO");

    if (ultimoPrecio !== null) {
      if (precioActual > ultimoPrecio) {
        tendencia.textContent = "Tendencia Alcista 📈";
        tendencia.style.color = "#0f0";
      } else if (precioActual < ultimoPrecio) {
        tendencia.textContent = "Tendencia Bajista 📉";
        tendencia.style.color = "red";
      } else {
        tendencia.textContent = "Sin cambios ⏸️";
        tendencia.style.color = "gray";
      }

      if ((precioActual - ultimoPrecio) > 1000 && puedeReproducir) {
        audioAlerta.play();
        puedeReproducir = false;
        setTimeout(() => puedeReproducir = true, 5000);
      }
    }

    if (precioActual > 130000) {
      box.style.backgroundColor = "#000d00";
      box.style.border = "2px solid #00ff00";
      box.style.boxShadow = "0 0 20px #00ff00";
    } else {
      box.style.backgroundColor = "#111";
      box.style.border = "2px solid limegreen";
      box.style.boxShadow = "0 0 10px limegreen";
    }

    actualizarGrafico(precioActual);
    ultimoPrecio = precioActual;

  } catch (error) {
    console.error("❌ Error al obtener el precio:", error);
    tendencia.textContent = "⚠️ Error al obtener datos";
    tendencia.style.color = "orange";
  } finally {
    setTimeout(() => box.classList.remove("actualizando"), 300);
  }
}

setInterval(obtenerPrediccionIA, 60000);
obtenerPrediccionIA();

// === Gráfico Línea ===
let grafico = null;
function actualizarGrafico(precio) {
  const ahora = new Date().toLocaleTimeString("es-CO");
  const canvas = document.getElementById("graficoBTC");
  if (!canvas) return;

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
          backgroundColor: "rgba(0,255,0,0.2)",
          pointRadius: 3,
        }]
      },
      options: {
        scales: {
          y: { ticks: { color: "#0f0" } },
          x: { ticks: { color: "#0f0" } }
        },
        plugins: {
          legend: { labels: { color: "#0f0" } }
        }
      }
    });
  } else {
    if (grafico.data.labels.length > 10) {
      grafico.data.labels.shift();
      grafico.data.datasets[0].data.shift();
    }
    grafico.data.labels.push(ahora);
    grafico.data.datasets[0].data.push(precio);
    grafico.update();
  }
}

// === Velas Japonesas ===
async function cargarVelasBTC() {
  const canvas = document.getElementById("velasBTC");
  if (!canvas) return;

  try {
    const res = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=50');
    const raw = await res.json();

    const datosVelas = raw.map(d => ({
      x: new Date(d[0]),
      o: parseFloat(d[1]),
      h: parseFloat(d[2]),
      l: parseFloat(d[3]),
      c: parseFloat(d[4])
    }));

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: 'candlestick',
      data: {
        datasets: [{
          label: 'BTC/USDT (1m)',
          data: datosVelas,
          borderColor: 'lime',
          upColor: 'green',
          downColor: 'red'
        }]
      },
      options: {
        scales: {
          x: {
            type: 'time',
            time: { tooltipFormat: 'HH:mm', unit: 'minute' },
            ticks: { color: '#0f0' }
          },
          y: {
            ticks: { color: '#0f0' }
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

cargarVelasBTC();

// === Compartir en redes ===
document.addEventListener("DOMContentLoaded", () => {
  const currentUrl = window.location.href;
  const mensaje = encodeURIComponent("📈 Mira esta predicción de Bitcoin generada por IA en BitFreimel 👇");

  const w = document.getElementById("share-whatsapp");
  const f = document.getElementById("share-facebook");
  const x = document.getElementById("share-twitter");
  const t = document.getElementById("share-telegram");
  const copy = document.getElementById("share-copy");
  const copiado = document.getElementById("copiado");

  if (w) w.href = `https://wa.me/?text=${mensaje}%0A${currentUrl}`;
  if (f) f.href = `https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`;
  if (x) x.href = `https://twitter.com/intent/tweet?text=${mensaje}&url=${currentUrl}`;
  if (t) t.href = `https://t.me/share/url?url=${currentUrl}&text=${mensaje}`;
  if (copy) {
    copy.addEventListener("click", () => {
      navigator.clipboard.writeText(currentUrl).then(() => {
        if (copiado) {
          copiado.style.display = "block";
          setTimeout(() => copiado.style.display = "none", 3000);
        } 
      });
    });
  }
});
