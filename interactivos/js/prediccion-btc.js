let precio = 50000;

function predecir(eleccion) {
  const cambio = Math.random() < 0.5 ? -1 : 1;
  const variacion = Math.floor(Math.random() * 1000) * cambio;
  const nuevoPrecio = precio + variacion;

  const subio = nuevoPrecio > precio;
  const acertaste = (eleccion === 'sube' && subio) || (eleccion === 'baja' && !subio);

  document.getElementById('resultado').innerText = acertaste
    ? `✅ ¡Correcto! El precio fue a $${nuevoPrecio}`
    : `❌ Fallaste. El precio fue a $${nuevoPrecio}`;

  precio = nuevoPrecio;
  document.getElementById('precio').innerText = precio;
}
