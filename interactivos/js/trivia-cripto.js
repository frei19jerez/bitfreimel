// =======================================
// Trivia Cripto — Juego educativo sin repeticiones
// =======================================

const DATA_URL = "/interactivos/data/trivia-cripto.json";
const QUIZ_SIZE = 15;
const LS_SEEN = "trivia_seen_ids_v1";
const LS_BEST = "trivia_best_score_v1";

// Utils
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const shuffle = arr => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

function getSeenSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_SEEN)) || []);
  } catch {
    return new Set();
  }
}
function saveSeen(set) {
  localStorage.setItem(LS_SEEN, JSON.stringify([...set]));
}
function getBest() {
  return parseInt(localStorage.getItem(LS_BEST) || "0", 10);
}
function setBest(score) {
  localStorage.setItem(LS_BEST, String(score));
}
function pintarBest() {
  $("#mejorPuntaje").textContent = `Mejor puntaje histórico: ${getBest()}`;
}

async function loadBank() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar el banco de preguntas");
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Formato JSON inválido");
  return data;
}

function pickUniqueQuestions(bank, n) {
  const seen = getSeenSet();
  let fresh = bank.filter(q => !seen.has(q.id));

  if (fresh.length < n) {
    saveSeen(new Set());
    fresh = bank.slice();
  }

  shuffle(fresh);
  const picked = fresh.slice(0, n);
  const updatedSeen = getSeenSet();
  picked.forEach(q => updatedSeen.add(q.id));
  saveSeen(updatedSeen);
  return picked;
}

function renderQuestions(list) {
  const form = $("#contenedorTrivia");
  form.innerHTML = "";

  list.forEach((q, idx) => {
    const opts = shuffle(q.options.map((text, i) => ({ text, correct: i === q.answer })));

    const card = document.createElement("section");
    card.className = "pregunta";
    card.dataset.qid = q.id;

    const h = document.createElement("h3");
    h.textContent = `${idx + 1}. ${q.q}`;
    card.appendChild(h);

    opts.forEach((opt, i) => {
      const id = `${q.id}_${i}`;
      const label = document.createElement("label");
      label.className = "op";
      label.setAttribute("for", id);

      const input = document.createElement("input");
      input.type = "radio";
      input.id = id;
      input.name = q.id;
      input.value = opt.correct ? "1" : "0";

      label.appendChild(input);
      label.insertAdjacentHTML("beforeend", " " + opt.text);
      card.appendChild(label);
    });

    const exp = document.createElement("div");
    exp.className = "exp";
    exp.hidden = true;
    exp.dataset.explain = q.explain || "";
    exp.dataset.correctText = q.options[q.answer];
    card.appendChild(exp);

    form.appendChild(card);
  });
}

function updateProgress() {
  const total = $$(".pregunta").length;
  const answered = $$(".pregunta").filter(p => $(`input[name="${p.dataset.qid}"]:checked`, p)).length;
  const pct = total ? Math.round((answered * 100) / total) : 0;
  $("#progresoBarra").style.width = `${pct}%`;
  $("#progreso").setAttribute("aria-label", `Progreso: ${pct}% (${answered} de ${total})`);
}

function corregir() {
  const preguntas = $$(".pregunta");
  let correctas = 0;
  const ol = $("#revision");
  ol.innerHTML = "";

  preguntas.forEach(p => p.classList.remove("correcta", "incorrecta"));

  preguntas.forEach((p, i) => {
    const checked = $(`input[name="${p.dataset.qid}"]:checked`, p);
    const esCorrecta = checked?.value === "1";
    const exp = $(".exp", p);
    const textoCorrecto = exp.dataset.correctText;
    const explicacion = exp.dataset.explain;

    if (esCorrecta) {
      p.classList.add("correcta");
      exp.innerHTML = "✅ ¡Correcto!";
      correctas++;
    } else {
      p.classList.add("incorrecta");
      exp.innerHTML = `❌ Correcta: <strong>${textoCorrecto}</strong>. ${explicacion}`;
    }
    exp.hidden = false;

    const li = document.createElement("li");
    li.innerHTML = esCorrecta
      ? `✅ <strong>P${i + 1}</strong> correcta.`
      : `❌ <strong>P${i + 1}</strong> — Correcta: <em>${textoCorrecto}</em>. ${explicacion}`;
    ol.appendChild(li);

    $$(`input[name="${p.dataset.qid}"]`, p).forEach(r => (r.disabled = true));
  });

  const total = preguntas.length;
  const pct = total ? Math.round((correctas * 100) / total) : 0;
  $("#resultadoFinal").innerHTML = `
    <div class="punt">Tu puntaje: ${correctas}/${total} (${pct}%)</div>
    <p>¡Buen trabajo! Revisa las explicaciones para reforzar tu aprendizaje.</p>
  `;

  const best = Math.max(getBest(), correctas);
  setBest(best);
  pintarBest();
  $("#botonReiniciar").hidden = false;
}

function limpiarSeleccion() {
  $$("input[type=radio]").forEach(r => {
    r.checked = false;
    r.disabled = false;
  });
  $$(".pregunta").forEach(p => p.classList.remove("correcta", "incorrecta"));
  $$(".exp").forEach(e => {
    e.innerHTML = "";
    e.hidden = true;
  });
  $("#revision").innerHTML = "";
  $("#resultadoFinal").innerHTML = "";
  $("#botonReiniciar").hidden = true;
  updateProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", async () => {
  pintarBest();

  try {
    const bank = await loadBank();
    const selected = pickUniqueQuestions(bank, QUIZ_SIZE);
    renderQuestions(selected);
    updateProgress();

    $("#contenedorTrivia").addEventListener("change", e => {
      if (e.target.matches('input[type="radio"]')) updateProgress();
    });

    $("#botonResultado").addEventListener("click", () => {
      const total = $$(".pregunta").length;
      const answered = $$(".pregunta").filter(p => $(`input[name="${p.dataset.qid}"]:checked`, p)).length;
      if (answered < total && !confirm(`Te faltan ${total - answered} pregunta(s). ¿Corregir de todos modos?`)) return;
      corregir();
      $("#revision").closest(".revision-wrap")?.scrollIntoView({ behavior: "smooth" });
    });

    $("#botonLimpiar").addEventListener("click", limpiarSeleccion);

    $("#botonReiniciar").addEventListener("click", () => {
      limpiarSeleccion();
      const nuevas = pickUniqueQuestions(bank, QUIZ_SIZE);
      renderQuestions(nuevas);
      updateProgress();
    });

  } catch (err) {
    console.error(err);
    $("#contenedorTrivia").innerHTML = `<div class="resultado">❌ No se pudo cargar la trivia. Intenta más tarde.</div>`;
  }
});

