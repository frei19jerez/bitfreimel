// =======================================
// Trivia Cripto — Carga masiva y no repetición
// =======================================

// Config
const DATA_URL   = "/interactivos/data/trivia-cripto.json"; // banco grande
const QUIZ_SIZE  = 15;  // preguntas por partida (sube/baja a gusto)
const LS_SEEN    = "trivia_seen_ids_v1"; // ids ya mostradas historicamente
const LS_BEST    = "trivia_best_score_v1";

const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// Utilidades
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

function getSeenSet() {
  try {
    const raw = localStorage.getItem(LS_SEEN);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(arr);
  } catch { return new Set(); }
}
function saveSeen(set) {
  localStorage.setItem(LS_SEEN, JSON.stringify([...set]));
}
function getBest() {
  return parseInt(localStorage.getItem(LS_BEST) || "0", 10);
}
function setBest(v) {
  localStorage.setItem(LS_BEST, String(v));
}
function pintarBest() {
  $("#mejorPuntaje").textContent = `Mejor puntaje histórico: ${getBest()}`;
}

// Carga banco grande
async function loadBank() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar el banco de preguntas");
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Formato JSON inválido");
  return data;
}

// Selecciona N preguntas sin repetir (históricamente)
function pickUniqueQuestions(bank, n) {
  const seen = getSeenSet();

  // candidatas no vistas
  const fresh = bank.filter(q => !seen.has(q.id));

  // si ya no quedan suficientes nuevas, resetea el ciclo
  let base = fresh;
  if (fresh.length < n) {
    // reset y usa el banco completo
    saveSeen(new Set());
    base = bank.slice();
  }

  shuffle(base);
  const picked = base.slice(0, n);

  // marca como vistas
  const newSeen = getSeenSet();
  picked.forEach(q => newSeen.add(q.id));
  saveSeen(newSeen);

  return picked;
}

// Render dinámico con mezcla de opciones
function renderQuestions(list) {
  const form = $("#contenedorTrivia");
  form.innerHTML = "";

  list.forEach((q, idx) => {
    // empaqueta opciones con marca de correcto, luego baraja
    const opts = q.options.map((text, i) => ({ text, correct: i === q.answer }));
    shuffle(opts);

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
      // Guardamos en el value si esa opción es correcta (1/0)
      input.value = opt.correct ? "1" : "0";

      label.appendChild(input);
      label.insertAdjacentHTML("beforeend", " " + opt.text);
      card.appendChild(label);
    });

    const exp = document.createElement("div");
    exp.className = "exp";
    exp.hidden = true;
    // guardamos la explicación original para cuando corrijamos
    exp.dataset.explain = q.explain;
    // y el texto de la opción correcta original para mostrar en revisión:
    exp.dataset.correctText = q.options[q.answer];
    card.appendChild(exp);

    form.appendChild(card);
  });
}

// Progreso
function updateProgress() {
  const total = $$(".pregunta").length;
  const answered = $$(".pregunta").filter(p => $(`input[name="${p.dataset.qid}"]:checked`, p)).length;
  const pct = total ? Math.round(answered * 100 / total) : 0;
  $("#progresoBarra").style.width = `${pct}%`;
  $("#progreso").setAttribute("aria-label", `Progreso: ${pct}% (${answered} de ${total})`);
}

// Corrección
function corregir() {
  const preguntas = $$(".pregunta");
  let correctas = 0;

  // reset revisión
  const ol = $("#revision");
  ol.innerHTML = "";
  preguntas.forEach(p => p.classList.remove("correcta","incorrecta"));

  preguntas.forEach((p, i) => {
    const checked = $(`input[name="${p.dataset.qid}"]:checked`, p);
    const ok = checked ? checked.value === "1" : false;

    const exp = $(".exp", p);
    const textoCorrecto = exp.dataset.correctText || "(desconocida)";
    const explicacion = exp.dataset.explain || "";

    if (ok) {
      p.classList.add("correcta");
      exp.innerHTML = "✅ ¡Correcto!";
      correctas++;
    } else {
      p.classList.add("incorrecta");
      exp.innerHTML = `❌ Correcta: <strong>${textoCorrecto}</strong>. ${explicacion}`;
    }
    exp.hidden = false;

    const li = document.createElement("li");
    li.innerHTML = ok
      ? `✅ <strong>P${i+1}</strong> correcta.`
      : `❌ <strong>P${i+1}</strong> — Correcta: <em>${textoCorrecto}</em>. ${explicacion}`;
    ol.appendChild(li);

    // Bloquea los radios tras corregir
    $$(`input[name="${p.dataset.qid}"]`, p).forEach(r => r.disabled = true);
  });

  const total = preguntas.length;
  const pct = total ? Math.round(correctas * 100 / total) : 0;
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
  $$("input[type=radio]").forEach(r => { r.checked = false; r.disabled = false; });
  $$(".pregunta .exp").forEach(e => { e.hidden = true; e.innerHTML = ""; });
  $$(".pregunta").forEach(p => p.classList.remove("correcta","incorrecta"));
  $("#revision").innerHTML = "";
  $("#resultadoFinal").innerHTML = "";
  $("#botonReiniciar").hidden = true;
  updateProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  pintarBest();

  try {
    const bank = await loadBank();

    // (Opcional) filtra por etiquetas/dificultad aquí si quieres:
    // const bankFiltered = bank.filter(q => q.tags?.includes("bitcoin"));

    const selected = pickUniqueQuestions(bank, QUIZ_SIZE);
    renderQuestions(selected);

    // eventos
    $("#contenedorTrivia").addEventListener("change", e => {
      if (e.target.matches('input[type="radio"]')) updateProgress();
    });
    updateProgress();

    $("#botonResultado").addEventListener("click", () => {
      const total = $$(".pregunta").length;
      const answered = $$(".pregunta").filter(p => $(`input[name="${p.dataset.qid}"]:checked`, p)).length;
      if (answered < total) {
        if (!confirm(`Te faltan ${total - answered} pregunta(s). ¿Corregir de todos modos?`)) return;
      }
      corregir();
      $("#revision").closest(".revision-wrap")?.scrollIntoView({ behavior: "smooth" });
    });

    $("#botonLimpiar").addEventListener("click", limpiarSeleccion);
    $("#botonReiniciar").addEventListener("click", () => {
      // nueva partida con NUEVAS preguntas si hay disponibles
      limpiarSeleccion();
      const freshSelected = pickUniqueQuestions(bank, QUIZ_SIZE);
      renderQuestions(freshSelected);
      updateProgress();
    });

  } catch (e) {
    console.error(e);
    $("#contenedorTrivia").innerHTML = `<div class="resultado">No se pudo cargar la trivia. Inténtalo más tarde.</div>`;
  }
});
