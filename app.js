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

// Extraer código IATA de "Ciudad (IATA)" o usar las primeras 3 letras
function extractIATA(text) {
  if (!text) return "";
  
  // Intentar extraer de paréntesis: "Madrid (MAD)" -> "MAD"
  const match = text.match(/\(([A-Z]{3})\)/i);
  if (match) {
    return match[1].toUpperCase();
  }
  
  // Fallback: primeras 3 letras en mayúsculas
  return text.trim().substring(0, 3).toUpperCase();
}

// Construir URL de Skyscanner
// Formato: https://www.skyscanner.es/transporte/vuelos/{from}/{to}/{depart}/{return}/
// from/to en minúsculas, fechas YYYYMMDD
function buildSkyscannerUrl(from, to, departDate, returnDate) {
  const fromCode = from.toLowerCase();
  const toCode = to.toLowerCase();
  const depart = departDate.replace(/-/g, ''); // 2026-02-26 -> 20260226
  
  if (!returnDate) {
    // Solo ida
    return `https://www.skyscanner.es/transporte/vuelos/${fromCode}/${toCode}/${depart}/`;
  }
  
  const returnFormatted = returnDate.replace(/-/g, '');
  return `https://www.skyscanner.es/transporte/vuelos/${fromCode}/${toCode}/${depart}/${returnFormatted}/`;
}

// Construir URL de KAYAK
// Formato: https://www.kayak.es/flights/{FROM}-{TO}/{YYYY-MM-DD}/{YYYY-MM-DD}
// FROM/TO en mayúsculas, fechas con guiones
function buildKayakUrl(from, to, departDate, returnDate) {
  const fromCode = from.toUpperCase();
  const toCode = to.toUpperCase();
  
  if (!returnDate) {
    return null; // KAYAK no funciona bien para solo ida
  }
  
  return `https://www.kayak.es/flights/${fromCode}-${toCode}/${departDate}/${returnDate}`;
}

// Construir URL de Booking
// Formato: https://www.booking.com/searchresults.es.html?ss={DESTINO}
function buildBookingUrl(destino) {
  if (!destino) return "";
  const destinoEncoded = encodeURIComponent(destino);
  return `https://www.booking.com/searchresults.es.html?ss=${destinoEncoded}`;
}

// Construir URL de Airbnb
// Formato: https://www.airbnb.es/s/{DESTINO}/homes
function buildAirbnbUrl(destino) {
  if (!destino) return "";
  const destinoEncoded = encodeURIComponent(destino);
  return `https://www.airbnb.es/s/${destinoEncoded}/homes`;
}

// Construir URL de Hotels.com
// Formato: https://es.hotels.com/Hotel-Search?destination={DESTINO}
function buildHotelsUrl(destino) {
  if (!destino) return "";
  const destinoEncoded = encodeURIComponent(destino);
  return `https://es.hotels.com/Hotel-Search?destination=${destinoEncoded}`;
}

// Renderizar vuelos con formato profesional
function renderFlights(flights, isOneWay = false, tripData = {}) {
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

  const flightsHtml = flights
    .map((flight, index) => {
      if (typeof flight === "string") {
        return `<li class="result-item">${escapeHtml(flight)}</li>`;
      }

      if (flight && typeof flight === "object") {
        const title = flight.title || flight.name || flight.airline || "Vuelo";
        const price = flight.price || flight.cost || "";
        
        // Leer SOLO del nuevo formato: flight.links.skyscanner o flight.links.kayak
        let linkUrl = "";
        let linkLabel = "";
        let linkClass = "";
        
        if (flight.links && typeof flight.links === 'object') {
          if (flight.links.skyscanner) {
            linkUrl = flight.links.skyscanner;
            linkLabel = "Ver en Skyscanner";
            linkClass = "btn-skyscanner";
          } else if (flight.links.kayak) {
            linkUrl = flight.links.kayak;
            linkLabel = "Ver en KAYAK";
            linkClass = "btn-kayak";
          }
        }
        
        const details = [];

        // Añadir detalles adicionales si existen
        if (flight.departure) details.push(`🛫 ${escapeHtml(flight.departure)}`);
        if (flight.arrival) details.push(`🛬 ${escapeHtml(flight.arrival)}`);
        if (flight.duration) details.push(`⏱️ ${escapeHtml(flight.duration)}`);
        if (flight.stops !== undefined) {
          const stopsText = flight.stops == 0 ? "Directo" : `${flight.stops} escala${flight.stops > 1 ? 's' : ''}`;
          details.push(`🔄 ${stopsText}`);
        }

        // Botón único según el link disponible
        const buttonHtml = linkUrl 
          ? `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" class="btn-view ${linkClass}">${linkLabel}</a>`
          : '<p style="color: var(--color-text-tertiary); font-size: 0.875rem; font-style: italic;">No hay enlace disponible</p>';

        return `
          <li class="result-item">
            <div style="margin-bottom: 0.75rem;">
              <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--color-primary);">${escapeHtml(title)}</h4>
              ${price ? `<div style="font-size: 1.25rem; font-weight: 600; color: var(--color-success); margin-bottom: 0.5rem;">💶 ${escapeHtml(price)} €</div>` : ''}
              ${details.length > 0 ? `<div style="margin-bottom: 0.75rem; color: var(--color-text-secondary); display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">${details.join(' • ')}</div>` : ''}
            </div>
            <div class="flight-buttons">${buttonHtml}</div>
          </li>
        `;
      }

      return `<li class="result-item">${escapeHtml(flight)}</li>`;
    })
    .join("");

  return `
    <div class="result-card">
      <h3>✈️ Vuelos</h3>
      <ul class="result-list">${flightsHtml}</ul>
    </div>
  `;
}

// Renderizar hoteles con formato profesional
function renderHotels(hotels, tripData = {}) {
  if (!Array.isArray(hotels) || hotels.length === 0) {
    return `
      <div class="result-card">
        <h3>🏨 Hoteles</h3>
        <p style="color: var(--color-text-secondary); font-style: italic;">No se encontraron hoteles disponibles.</p>
      </div>
    `;
  }

  console.log('🔍 DEBUG - Estructura de hotels[0]:', hotels[0]);

  const hotelsHtml = hotels
    .map((hotel, index) => {
      if (typeof hotel === "string") {
        return `<li class="result-item">${escapeHtml(hotel)}</li>`;
      }

      if (hotel && typeof hotel === "object") {
        const name = hotel.name || hotel.title || hotel.hotelName || "Hotel";
        const price = hotel.price || hotel.pricePerNight || hotel.cost || "";
        
        // Leer SOLO del nuevo formato: hotel.links.booking, hotel.links.airbnb, hotel.links.hotels
        let linkUrl = "";
        let linkLabel = "";
        let linkClass = "";
        
        if (hotel.links && typeof hotel.links === 'object') {
          if (hotel.links.booking) {
            linkUrl = hotel.links.booking;
            linkLabel = "Ver en Booking";
            linkClass = "btn-booking";
          } else if (hotel.links.airbnb) {
            linkUrl = hotel.links.airbnb;
            linkLabel = "Ver en Airbnb";
            linkClass = "btn-airbnb";
          } else if (hotel.links.hotels) {
            linkUrl = hotel.links.hotels;
            linkLabel = "Ver en Hotels.com";
            linkClass = "btn-hotels";
          }
        }
        
        const details = [];

        // Añadir detalles adicionales si existen
        if (hotel.rating) details.push(`⭐ ${escapeHtml(hotel.rating)}`);
        if (hotel.distanceKm !== undefined) details.push(`📍 ${escapeHtml(hotel.distanceKm)} km del centro`);
        if (hotel.distance) details.push(`📍 ${escapeHtml(hotel.distance)}`);
        if (hotel.address) details.push(`📍 ${escapeHtml(hotel.address)}`);
        if (hotel.stars) details.push(`${'⭐'.repeat(parseInt(hotel.stars))}`);

        // Botón único según el link disponible
        const buttonHtml = linkUrl 
          ? `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" class="btn-view ${linkClass}">${linkLabel}</a>`
          : '<p style="color: var(--color-text-tertiary); font-size: 0.875rem; font-style: italic;">No hay enlace disponible</p>';

        return `
          <li class="result-item">
            <div style="margin-bottom: 0.75rem;">
              <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--color-primary);">${escapeHtml(name)}</h4>
              ${price ? `<div style="font-size: 1.25rem; font-weight: 600; color: var(--color-success); margin-bottom: 0.5rem;">💶 ${escapeHtml(price)} € / noche</div>` : ''}
              ${details.length > 0 ? `<div style="margin-bottom: 0.75rem; color: var(--color-text-secondary);">${details.join(' • ')}</div>` : ''}
            </div>
            <div class="flight-buttons">${buttonHtml}</div>
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

function renderResponse(data, isOneWay = false, tripData = {}) {
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
    ${renderFlights(flights, isOneWay, tripData)}
    ${renderHotels(hotels, tripData)}
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
    
    // Pasar datos del viaje para generar URLs si es necesario
    const tripData = {
      origen,
      destino,
      fechaSalida,
      fechaVuelta
    };
    
    renderResponse(data, isOneWay, tripData);
  } catch (err) {
    setError("No se pudo obtener el plan. Intenta nuevamente.");
  } finally {
    setLoading(false);
  }
});