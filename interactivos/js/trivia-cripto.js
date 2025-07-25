const preguntas = [
  {
    texto: "¿Qué es Bitcoin?",
    opciones: ["Una red social", "Una criptomoneda", "Un videojuego"],
    correcta: 1
  },
  {
    texto: "¿Qué hace la inteligencia artificial en trading?",
    opciones: ["Ignora datos", "Adivina al azar", "Analiza patrones de mercado"],
    correcta: 2
  }
];

let preguntaActual = 0;

function mostrarPregunta() {
  const pregunta = preguntas[preguntaActual];
  document.getElementById('pregunta').innerText = pregunta.texto;
  const respuestasDiv = document.getElementById('respuestas');
  respuestasDiv.innerHTML = "";

  pregunta.opciones.forEach((opcion, index) => {
    const btn = document.createElement("button");
    btn.innerText = opcion;
    btn.onclick = () => verificarRespuesta(index);
    respuestasDiv.appendChild(btn);
  });
}

function verificarRespuesta(index) {
  const resultado = document.getElementById('resultado');
  if (index === preguntas[preguntaActual].correcta) {
    resultado.innerText = "✅ ¡Correcto!";
  } else {
    resultado.innerText = "❌ Incorrecto. Intenta otra vez.";
  }
  setTimeout(() => {
    preguntaActual = (preguntaActual + 1) % preguntas.length;
    resultado.innerText = "";
    mostrarPregunta();
  }, 1500);
}

window.onload = mostrarPregunta;
