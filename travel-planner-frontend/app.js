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
  errorEl.textContent = message;
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
      <section class="card">
        <h3>${escapeHtml(title)}</h3>
        <p class="muted">Sin datos.</p>
      </section>
    `;
  }

  const listHtml = items
    .map((item) => {
      if (typeof item === "string") return `<li>${escapeHtml(item)}</li>`;

      if (item && typeof item === "object") {
        const lines = Object.entries(item).map(([k, v]) => {
          const isUrl = typeof v === "string" && /^https?:\/\//i.test(v);
          return `<div><strong>${escapeHtml(k)}:</strong> ${
            isUrl ? asLink(v) : escapeHtml(v)
          }</div>`;
        });
        return `<li>${lines.join("")}</li>`;
      }

      return `<li>${escapeHtml(item)}</li>`;
    })
    .join("");

  return `
    <section class="card">
      <h3>${escapeHtml(title)}</h3>
      <ul>${listHtml}</ul>
    </section>
  `;
}

function renderResponse(data) {
  if (!resultsEl) return;

  const summary = data?.summary ?? "Sin resumen.";
  const flights = data?.flights ?? [];
  const hotels = data?.hotels ?? [];
  const itinerary = data?.itinerary ?? [];

  resultsEl.innerHTML = `
    <section class="card">
      <h3>Resumen</h3>
      <p>${escapeHtml(summary)}</p>
    </section>
    ${renderList("Vuelos", flights)}
    ${renderList("Hoteles", hotels)}
    ${renderList("Itinerario", itinerary)}
  `;
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