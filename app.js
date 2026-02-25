const N8N_WEBHOOK_URL =
  "https://divisual-project-n8n.gsgdq4.easypanel.host/webhook/planificador-viajes";
const form = document.getElementById("tripForm");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const resultsEl = document.getElementById("results");

function setLoading(isLoading) {
  if (!loadingEl) return;
  loadingEl.hidden = !isLoading;
}

function setError(message = "") {
  if (!errorEl) return;
  const errorContent = document.getElementById("error-content");
  if (errorContent) {
    errorContent.textContent = message;
  } else {
    errorEl.textContent = message;
  }
  errorEl.hidden = !message;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function asLink(url) {
  const safe = escapeHtml(url);
  return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
}

function renderList(title, items) {
  if (!Array.isArray(items) || items.length === 0) {
    return `
      <div class="result-card">
        <h3>${escapeHtml(title)}</h3>
        <p style="color: var(--color-text-secondary); font-style: italic;">Sin datos disponibles.</p>
      </div>
    `;
  }

  const listHtml = items
    .map((item) => {
      if (typeof item === "string") {
        return `<li class="result-item">${escapeHtml(item)}</li>`;
      }

      if (item && typeof item === "object") {
        const lines = Object.entries(item).map(([k, v]) => {
          const isUrl = typeof v === "string" && /^https?:\/\//i.test(v);
          const valueHtml = isUrl 
            ? `<a href="${escapeHtml(v)}" target="_blank" rel="noopener noreferrer">🔗 Ver enlace</a>`
            : `<span>${escapeHtml(v)}</span>`;
          return `<div style="margin-bottom: 0.5rem;"><strong>${escapeHtml(k)}:</strong> ${valueHtml}</div>`;
        });
        return `<li class="result-item">${lines.join("")}</li>`;
      }

      return `<li class="result-item">${escapeHtml(item)}</li>`;
    })
    .join("");

  return `
    <div class="result-card">
      <h3>${escapeHtml(title)}</h3>
      <ul class="result-list">${listHtml}</ul>
    </div>
  `;
}

function renderResponse(data) {
  if (!resultsEl) return;

  const summary = data?.summary ?? "Sin resumen disponible.";
  const flights = data?.flights ?? [];
  const hotels = data?.hotels ?? [];
  const itinerary = data?.itinerary ?? [];

  resultsEl.innerHTML = `
    <div class="result-card" style="animation-delay: 0ms;">
      <h3>📋 Resumen</h3>
      <div class="result-summary">${escapeHtml(summary)}</div>
    </div>
    ${renderList("✈️ Vuelos", flights)}
    ${renderList("🏨 Hoteles", hotels)}
    ${renderList("🗺️ Itinerario", itinerary)}
  `;

  // Añadir animación staggered a los cards de resultados
  const resultCards = resultsEl.querySelectorAll(".result-card");
  resultCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 100}ms`;
  });
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  setError("");
  if (resultsEl) resultsEl.innerHTML = "";

  const origen = document.getElementById("origen")?.value.trim() ?? "";
  const destino = document.getElementById("destino")?.value.trim() ?? "";
  const fechaSalida = document.getElementById("fechaSalida")?.value ?? "";
  const fechaVuelta = document.getElementById("fechaVuelta")?.value ?? "";
  const presupuestoRaw = document.getElementById("presupuestoMax")?.value ?? "";
  const presupuestoMax = presupuestoRaw === "" ? null : Number(presupuestoRaw);
  const estilo = document.getElementById("estilo")?.value ?? "";
  const preferencias = Array.from(
    document.querySelectorAll('input[name="preferencias"]:checked')
  ).map((el) => el.value);
  const radioCentroKm = document.getElementById("radioCentroKm")?.value ?? "";

  // Validación obligatorios
  if (!origen || !destino || !fechaSalida) {
    setError("Completa origen, destino y fecha de salida.");
    return;
  }

  // JSON EXACTO requerido (mismas claves, sin extras)
  const payload = {
    origen,
    destino,
    fechaSalida,
    fechaVuelta,
    presupuestoMax,
    estilo,
    preferencias,
    radioCentroKm,
  };

  setLoading(true);

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }

    const data = await response.json();
    renderResponse(data);
  } catch (err) {
    setError("No se pudo obtener el plan. Intenta nuevamente.");
  } finally {
    setLoading(false);
  }
});