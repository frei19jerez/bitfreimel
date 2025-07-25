const canvas = document.getElementById('chartCanvas');
const ctx = canvas.getContext('2d');

function dibujarVelas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 10; i++) {
    let x = 50 + i * 50;
    let alto = Math.floor(Math.random() * 150 + 50);
    let bajo = alto + Math.floor(Math.random() * 50);
    let apertura = alto + Math.floor(Math.random() * (bajo - alto));
    let cierre = alto + Math.floor(Math.random() * (bajo - alto));
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x, alto);
    ctx.lineTo(x, bajo);
    ctx.stroke();
    ctx.fillStyle = cierre > apertura ? '#00ff00' : '#ff0000';
    ctx.fillRect(x - 5, Math.min(apertura, cierre), 10, Math.abs(cierre - apertura));
  }
}

dibujarVelas();
