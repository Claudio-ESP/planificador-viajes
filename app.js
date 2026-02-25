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

// Renderizar vuelos con formato profesional
function renderFlights(flights, isOneWay = false) {
  if (!Array.isArray(flights) || flights.length === 0) {
    return `
      <div class="result-card">
        <h3>✈️ Vuelos</h3>
        <p style="color: var(--color-text-secondary); font-style: italic;">No se encontraron vuelos disponibles.</p>
      </div>
    `;
  }

  const flightsHtml = flights
    .map((flight) => {
      if (typeof flight === "string") {
        return `<li class="result-item">${escapeHtml(flight)}</li>`;
      }

      if (flight && typeof flight === "object") {
        const title = flight.title || flight.name || flight.airline || "Vuelo";
        const price = flight.price || flight.cost || "";
        
        // Detectar los 3 tipos de links
        const linkGoogle1 = flight.linkGoogle1 || flight.link_google1 || "";
        const linkGoogle2 = flight.linkGoogle2 || flight.link_google2 || "";
        const linkSkyscanner = flight.linkSkyscanner || flight.link_skyscanner || "";
        
        const details = [];

        // Añadir badge "Solo ida" si es relevante
        if (isOneWay) {
          details.push(`<span style="background: var(--color-warning); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">➡️ Solo ida</span>`);
        }

        // Añadir detalles adicionales si existen
        if (flight.departure) details.push(`🛫 ${escapeHtml(flight.departure)}`);
        if (flight.arrival) details.push(`🛬 ${escapeHtml(flight.arrival)}`);
        if (flight.duration) details.push(`⏱️ ${escapeHtml(flight.duration)}`);
        if (flight.stops !== undefined) {
          const stopsText = flight.stops == 0 ? "Directo" : `${flight.stops} escala${flight.stops > 1 ? 's' : ''}`;
          details.push(`🔄 ${stopsText}`);
        }

        // Construir botones de enlaces
        const buttons = [];
        if (linkGoogle1) {
          buttons.push(`<a href="${escapeHtml(linkGoogle1)}" target="_blank" rel="noopener noreferrer" class="btn-view btn-google">Google (1)</a>`);
        }
        if (linkGoogle2) {
          buttons.push(`<a href="${escapeHtml(linkGoogle2)}" target="_blank" rel="noopener noreferrer" class="btn-view btn-google">Google (2)</a>`);
        }
        if (linkSkyscanner) {
          buttons.push(`<a href="${escapeHtml(linkSkyscanner)}" target="_blank" rel="noopener noreferrer" class="btn-view btn-skyscanner">Skyscanner</a>`);
        }

        return `
          <li class="result-item">
            <div style="margin-bottom: 0.75rem;">
              <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--color-primary);">${escapeHtml(title)}</h4>
              ${price ? `<div style="font-size: 1.25rem; font-weight: 600; color: var(--color-success); margin-bottom: 0.5rem;">💶 ${escapeHtml(price)}</div>` : ''}
              ${details.length > 0 ? `<div style="margin-bottom: 0.75rem; color: var(--color-text-secondary); display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">${details.join(' • ')}</div>` : ''}
            </div>
            ${buttons.length > 0 ? `<div class="flight-buttons">${buttons.join('')}</div>` : '<p style="color: var(--color-text-tertiary); font-size: 0.875rem; font-style: italic;">No hay enlaces disponibles</p>'}
          </li>
        `;
      }

      return `<li class="result-item">${escapeHtml(flight)}</li>`;
    })
    .join("");

  return `
    <div class="result-card">
      <h3>✈️ Vuelos${isOneWay ? ' <span style="font-size: 0.875rem; color: var(--color-warning); font-weight: normal;">(➡️ Solo ida)</span>' : ''}</h3>
      <ul class="result-list">${flightsHtml}</ul>
    </div>
  `;
}

// Renderizar hoteles con formato profesional
function renderHotels(hotels) {
  if (!Array.isArray(hotels) || hotels.length === 0) {
    return `
      <div class="result-card">
        <h3>🏨 Hoteles</h3>
        <p style="color: var(--color-text-secondary); font-style: italic;">No se encontraron hoteles disponibles.</p>
      </div>
    `;
  }

  const hotelsHtml = hotels
    .map((hotel) => {
      if (typeof hotel === "string") {
        return `<li class="result-item">${escapeHtml(hotel)}</li>`;
      }

      if (hotel && typeof hotel === "object") {
        const name = hotel.name || hotel.title || hotel.hotelName || "Hotel";
        const price = hotel.price || hotel.pricePerNight || hotel.cost || "";
        const link = hotel.link || hotel.url || "";
        const details = [];

        // Añadir detalles adicionales si existen
        if (hotel.rating) details.push(`⭐ ${escapeHtml(hotel.rating)}`);
        if (hotel.distance) details.push(`📍 ${escapeHtml(hotel.distance)}`);
        if (hotel.address) details.push(`📍 ${escapeHtml(hotel.address)}`);
        if (hotel.stars) details.push(`${'⭐'.repeat(parseInt(hotel.stars))}`);

        return `
          <li class="result-item">
            <div style="margin-bottom: 0.75rem;">
              <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--color-primary);">${escapeHtml(name)}</h4>
              ${price ? `<div style="font-size: 1.25rem; font-weight: 600; color: var(--color-success); margin-bottom: 0.5rem;">💶 ${escapeHtml(price)}/noche</div>` : ''}
              ${details.length > 0 ? `<div style="margin-bottom: 0.5rem; color: var(--color-text-secondary);">${details.join(' • ')}</div>` : ''}
            </div>
            ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="btn-view">🏨 Ver hotel</a>` : ''}
          </li>
        `;
      }

      return `<li class="result-item">${escapeHtml(hotel)}</li>`;
    })
    .join("");

  return `
    <div class="result-card">
      <h3>🏨 Hoteles</h3>
      <ul class="result-list">${hotelsHtml}</ul>
    </div>
  `;
}

// Renderizar itinerario con formato profesional tipo timeline
function renderItinerary(itinerary) {
  if (!Array.isArray(itinerary) || itinerary.length === 0) {
    return `
      <div class="result-card">
        <h3>🗺️ Itinerario</h3>
        <p style="color: var(--color-text-secondary); font-style: italic;">No se generó itinerario.</p>
      </div>
    `;
  }

  const itineraryHtml = itinerary
    .map((day, index) => {
      if (typeof day === "string") {
        return `<div class="timeline-item">
          <div class="timeline-marker"></div>
          <div class="timeline-content">${escapeHtml(day)}</div>
        </div>`;
      }

      if (day && typeof day === "object") {
        // Extraer campos del objeto
        const dayDate = day.day || "";
        const dayTitle = day.title || day.name || "";
        const dayDescription = day.description || day.desc || "";
        
        // Buscar actividades en múltiples campos posibles: items, activities, places, itinerary
        const activities = day.items || day.activities || day.places || day.itinerary || [];
        
        // Formatear fecha si existe
        let formattedDate = "";
        if (dayDate) {
          try {
            const dateObj = new Date(dayDate);
            const options = { day: 'numeric', month: 'short', year: 'numeric' };
            formattedDate = dateObj.toLocaleDateString('es-ES', options);
          } catch {
            formattedDate = dayDate;
          }
        }
        
        // Construir título del día
        let dayHeader = "";
        if (formattedDate && dayTitle) {
          dayHeader = `📅 ${escapeHtml(formattedDate)} - ${escapeHtml(dayTitle)}`;
        } else if (formattedDate) {
          dayHeader = `📅 ${escapeHtml(formattedDate)}`;
        } else if (dayTitle) {
          dayHeader = `📅 ${escapeHtml(dayTitle)}`;
        } else {
          dayHeader = `📅 Día ${index + 1}`;
        }
        
        // Renderizar actividades
        let activitiesHtml = "";
        if (Array.isArray(activities) && activities.length > 0) {
          activitiesHtml = `
            <ul class="timeline-activities">
              ${activities.map(act => `<li>${escapeHtml(act)}</li>`).join('')}
            </ul>
          `;
        } else if (typeof activities === "string") {
          activitiesHtml = `<div class="timeline-activities-text">${escapeHtml(activities)}</div>`;
        }

        return `
          <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <h4 class="timeline-title">${dayHeader}</h4>
              ${dayDescription ? `<p class="timeline-description">${escapeHtml(dayDescription)}</p>` : ''}
              ${activitiesHtml}
            </div>
          </div>
        `;
      }

      return `<div class="timeline-item">
        <div class="timeline-marker"></div>
        <div class="timeline-content">${escapeHtml(day)}</div>
      </div>`;
    })
    .join("");

  return `
    <div class="result-card">
      <h3>🗺️ Itinerario</h3>
      <div class="timeline">${itineraryHtml}</div>
    </div>
  `;
}

function renderResponse(data, isOneWay = false) {
  if (!resultsEl) return;

  const summary = data?.summary ?? "Sin resumen disponible.";
  const flights = data?.flights ?? [];
  const hotels = data?.hotels ?? [];
  const itinerary = data?.itinerary ?? [];

  // Añadir nota de "Solo ida" al resumen si aplica
  let summaryText = escapeHtml(summary);
  if (isOneWay && !summary.toLowerCase().includes('solo ida')) {
    summaryText += `<div style="margin-top: 0.75rem; padding: 0.5rem; background: var(--color-warning); color: white; border-radius: 6px; font-size: 0.875rem; font-weight: 600;">➡️ Viaje de solo ida</div>`;
  }

  resultsEl.innerHTML = `
    <div class="result-card" style="animation-delay: 0ms;">
      <h3>📋 Resumen</h3>
      <div class="result-summary">${summaryText}</div>
    </div>
    ${renderFlights(flights, isOneWay)}
    ${renderHotels(hotels)}
    ${renderItinerary(itinerary)}
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
    
    // Detectar si es viaje de solo ida
    const isOneWay = !fechaVuelta || fechaVuelta.trim() === "";
    
    renderResponse(data, isOneWay);
  } catch (err) {
    setError("No se pudo obtener el plan. Intenta nuevamente.");
  } finally {
    setLoading(false);
  }
});