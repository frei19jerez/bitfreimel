function calcularRiesgo() {
  const capital = parseFloat(document.getElementById("capital").value);
  const riesgo = parseFloat(document.getElementById("riesgo").value);
  const resultado = document.getElementById("resultado");

  if (isNaN(capital) || isNaN(riesgo) || capital <= 0 || riesgo <= 0) {
    resultado.textContent = "❌ Ingresa valores válidos.";
    return;
  }

  const riesgoUSD = (capital * riesgo) / 100;
  resultado.textContent = `Puedes arriesgar hasta: $${riesgoUSD.toFixed(2)} USD en esta operación.`;
}
