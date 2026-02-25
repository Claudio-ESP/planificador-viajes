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

  // Debug: ver estructura del primer vuelo
  console.log('🔍 DEBUG - Estructura de flights[0]:', flights[0]);

  // Etiquetas para cada opción
  const badges = [
    { text: "👍 Más barata", color: "#28a745" },
    { text: "⭐ Mejor opción", color: "#0066cc" },
    { text: "🔄 Más flexible", color: "#ff9800" }
  ];

  // Mapeo de nombres de propiedades a labels bonitos
  const urlLabels = {
    skyscannerUrl: { label: 'Skyscanner', class: 'btn-skyscanner' },
    skyscanner_url: { label: 'Skyscanner', class: 'btn-skyscanner' },
    kayakUrl: { label: 'KAYAK', class: 'btn-kayak' },
    kayak_url: { label: 'KAYAK', class: 'btn-kayak' },
    momondoUrl: { label: 'Momondo', class: 'btn-momondo' },
    momondo_url: { label: 'Momondo', class: 'btn-momondo' },
    googleUrl: { label: 'Google Flights', class: 'btn-google' },
    google_url: { label: 'Google Flights', class: 'btn-google' },
    link: { label: 'Ver vuelo', class: 'btn-view' },
    url: { label: 'Ver vuelo', class: 'btn-view' }
  };

  const flightsHtml = flights
    .map((flight, index) => {
      if (typeof flight === "string") {
        return `<li class="result-item">${escapeHtml(flight)}</li>`;
      }

      if (flight && typeof flight === "object") {
        const title = flight.title || flight.name || flight.airline || "Vuelo";
        const price = flight.price || flight.cost || "";
        
        // Crear array dinámico de enlaces disponibles
        const flightLinks = [];
        
        // Buscar todas las propiedades que contengan URLs
        Object.keys(flight).forEach(key => {
          const value = flight[key];
          // Verificar si es una URL (string que empieza con http)
          if (typeof value === 'string' && value.startsWith('http')) {
            const config = urlLabels[key] || { 
              label: key.replace(/url|Url|_url/gi, '').charAt(0).toUpperCase() + key.replace(/url|Url|_url/gi, '').slice(1),
              class: 'btn-view'
            };
            
            flightLinks.push({
              label: config.label,
              url: value,
              cssClass: config.class
            });
          }
        });
        
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

        // Badge de opción (Más barata, Mejor opción, etc.)
        const badge = badges[index] || null;
        const badgeHtml = badge ? `<span class="option-badge" style="background: ${badge.color};">${badge.text}</span>` : '';

        // Construir botones de enlaces dinámicamente
        const buttonsHtml = flightLinks.length > 0 
          ? flightLinks.map(link => 
              `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="btn-view ${link.cssClass}">${escapeHtml(link.label)}</a>`
            ).join('')
          : '<p style="color: var(--color-text-tertiary); font-size: 0.875rem; font-style: italic;">No hay enlaces disponibles</p>';

        return `
          <li class="result-item">
            ${badgeHtml}
            <div style="margin-bottom: 0.75rem;">
              <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--color-primary);">${escapeHtml(title)}</h4>
              ${price ? `<div style="font-size: 1.25rem; font-weight: 600; color: var(--color-success); margin-bottom: 0.5rem;">💶 ${escapeHtml(price)} €</div>` : ''}
              ${details.length > 0 ? `<div style="margin-bottom: 0.75rem; color: var(--color-text-secondary); display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">${details.join(' • ')}</div>` : ''}
            </div>
            <div class="flight-buttons">${buttonsHtml}</div>
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

  // Etiquetas para cada opción
  const badges = [
    { text: "💰 Económico", color: "#28a745" },
    { text: "⭐ Mejor valorado", color: "#0066cc" },
    { text: "💎 Premium", color: "#9c27b0" }
  ];

  const hotelsHtml = hotels
    .map((hotel, index) => {
      if (typeof hotel === "string") {
        return `<li class="result-item">${escapeHtml(hotel)}</li>`;
      }

      if (hotel && typeof hotel === "object") {
        const name = hotel.name || hotel.title || hotel.hotelName || "Hotel";
        const price = hotel.price || hotel.pricePerNight || hotel.cost || "";
        
        // Detectar los enlaces de Booking, Airbnb y Hotels.com
        const bookingUrl = hotel.bookingUrl || hotel.booking_url || "";
        const airbnbUrl = hotel.airbnbUrl || hotel.airbnb_url || "";
        const hotelsUrl = hotel.hotelsUrl || hotel.hotels_url || "";
        
        const details = [];

        // Añadir detalles adicionales si existen
        if (hotel.rating) details.push(`⭐ ${escapeHtml(hotel.rating)}`);
        if (hotel.distance) details.push(`📍 ${escapeHtml(hotel.distance)}`);
        if (hotel.address) details.push(`📍 ${escapeHtml(hotel.address)}`);
        if (hotel.stars) details.push(`${'⭐'.repeat(parseInt(hotel.stars))}`);

        // Badge de opción (Económico, Mejor valorado, etc.)
        const badge = badges[index] || null;
        const badgeHtml = badge ? `<span class="option-badge" style="background: ${badge.color};">${badge.text}</span>` : '';

        // Construir botones de enlaces
        const buttons = [];
        if (bookingUrl) {
          buttons.push(`<a href="${escapeHtml(bookingUrl)}" target="_blank" rel="noopener noreferrer" class="btn-view btn-booking">Booking</a>`);
        }
        if (airbnbUrl) {
          buttons.push(`<a href="${escapeHtml(airbnbUrl)}" target="_blank" rel="noopener noreferrer" class="btn-view btn-airbnb">Airbnb</a>`);
        }
        if (hotelsUrl) {
          buttons.push(`<a href="${escapeHtml(hotelsUrl)}" target="_blank" rel="noopener noreferrer" class="btn-view btn-hotels">Hotels.com</a>`);
        }

        return `
          <li class="result-item">
            ${badgeHtml}
            <div style="margin-bottom: 0.75rem;">
              <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--color-primary);">${escapeHtml(name)}</h4>
              ${price ? `<div style="font-size: 1.25rem; font-weight: 600; color: var(--color-success); margin-bottom: 0.5rem;">💶 ${escapeHtml(price)} € / noche</div>` : ''}
              ${details.length > 0 ? `<div style="margin-bottom: 0.75rem; color: var(--color-text-secondary);">${details.join(' • ')}</div>` : ''}
            </div>
            ${buttons.length > 0 ? `<div class="flight-buttons">${buttons.join('')}</div>` : '<p style="color: var(--color-text-tertiary); font-size: 0.875rem; font-style: italic;">No hay enlaces disponibles</p>'}
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