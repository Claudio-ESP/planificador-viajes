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

// Calcular precio total de una lista de items
function calculateTotalPrice(items) {
  if (!Array.isArray(items)) return 0;
  
  let total = 0;
  items.forEach(item => {
    if (item && typeof item === 'object') {
      const price = item.price || item.pricePerNight || item.cost || 0;
      if (price) {
        const priceNum = typeof price === 'string' 
          ? parseFloat(price.replace(/[^0-9.]/g, '')) 
          : price;
        if (!isNaN(priceNum)) total += priceNum;
      }
    }
  });
  
  return total;
}

// Calcular precio por persona
function calculatePricePerPerson(totalPrice, numPeople) {
  if (!numPeople || numPeople < 1) return 0;
  return (totalPrice / numPeople).toFixed(2);
}

// Formato de moneda
function formatCurrency(value) {
  return parseFloat(value).toFixed(2);
}

// Obtener badge dinámico según presupuesto
function getBudgetBadge(budget) {
  if (!budget || budget < 100) {
    return { text: '', color: '', show: false };
  }
  
  if (budget < 500) {
    return { 
      text: '💰 Viaje económico', 
      color: 'var(--color-success)', 
      show: true 
    };
  } else if (budget <= 1500) {
    return { 
      text: '⚖️ Viaje equilibrado', 
      color: 'var(--color-primary)', 
      show: true 
    };
  } else {
    return { 
      text: '💎 Viaje premium', 
      color: '#9c27b0', 
      show: true 
    };
  }
}

// Calcular distribución del presupuesto
function calculateBudgetDistribution(budget) {
  if (!budget || budget < 100) return null;
  
  // Distribución aproximada: 40% vuelos, 35% hotel, 25% actividades
  const flights = Math.round(budget * 0.40);
  const hotel = Math.round(budget * 0.35);
  const activities = budget - flights - hotel; // Resto para actividades
  
  return { flights, hotel, activities };
}

// Calcular presupuesto restante
function calculateRemainingBudget(budget, flights, hotels) {
  if (!budget || budget < 100) return null;
  
  let spent = 0;
  
  // Sumar precios de vuelos (solo los que tienen precio)
  if (Array.isArray(flights)) {
    flights.forEach(flight => {
      if (flight && typeof flight === 'object' && flight.price) {
        const price = typeof flight.price === 'string' 
          ? parseFloat(flight.price.replace(/[^0-9.]/g, '')) 
          : flight.price;
        if (!isNaN(price)) spent += price;
      }
    });
  }
  
  // Sumar precios de hoteles (solo los que tienen precio)
  if (Array.isArray(hotels)) {
    hotels.forEach(hotel => {
      if (hotel && typeof hotel === 'object' && hotel.price) {
        const price = typeof hotel.price === 'string' 
          ? parseFloat(hotel.price.replace(/[^0-9.]/g, '')) 
          : hotel.price;
        if (!isNaN(price)) spent += price;
      }
    });
  }
  
  return {
    budget,
    spent: Math.round(spent),
    remaining: Math.round(budget - spent)
  };
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
function renderFlights(flights, isOneWay = false, tripData = {}, numPeople = 1) {
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
        
        // Calcular precio por persona si hay más de 1
        let pricePerPersonHtml = "";
        if (price && numPeople > 1) {
          const priceNum = typeof price === 'string' 
            ? parseFloat(price.replace(/[^0-9.]/g, '')) 
            : price;
          if (!isNaN(priceNum)) {
            const pricePerPerson = (priceNum / numPeople).toFixed(2);
            pricePerPersonHtml = `<div style="font-size: 0.9rem; color: var(--color-text-secondary); margin-top: 0.25rem;">➜ ${pricePerPerson} € / persona ${numPeople > 1 ? `(entre ${numPeople})` : ''}</div>`;
          }
        }
        
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
              ${price ? `<div style="font-size: 1.25rem; font-weight: 600; color: var(--color-success); margin-bottom: 0.5rem;">💶 ${escapeHtml(price)} €${pricePerPersonHtml}</div>` : ''}
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
function renderHotels(hotels, tripData = {}, numPeople = 1) {
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
        
        // Calcular precio por persona si hay más de 1
        let pricePerPersonHtml = "";
        if (price && numPeople > 1) {
          const priceNum = typeof price === 'string' 
            ? parseFloat(price.replace(/[^0-9.]/g, '')) 
            : price;
          if (!isNaN(priceNum)) {
            const pricePerPerson = (priceNum / numPeople).toFixed(2);
            pricePerPersonHtml = `<div style="font-size: 0.9rem; color: var(--color-text-secondary); margin-top: 0.25rem;">➜ ${pricePerPerson} € / persona ${numPeople > 1 ? `(entre ${numPeople})` : ''} / noche</div>`;
          }
        }
        
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
              ${price ? `<div style="font-size: 1.25rem; font-weight: 600; color: var(--color-success); margin-bottom: 0.5rem;">💶 ${escapeHtml(price)} € / noche${pricePerPersonHtml}</div>` : ''}
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
// Formatear fecha del itinerario de forma segura
function formatDay(dayStr, index) {
  if (!dayStr || typeof dayStr !== 'string') {
    return `Día ${index + 1}`;
  }
  
  // Parsear manualmente "YYYY-MM-DD" para evitar problemas de timezone
  const parts = dayStr.trim().split('-');
  if (parts.length !== 3) {
    return `Día ${index + 1}`;
  }
  
  const [year, month, day] = parts.map(Number);
  
  // Validar que sean números válidos
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return `Día ${index + 1}`;
  }
  
  // Crear fecha (mes es 0-indexed, por eso month-1)
  const dateObj = new Date(year, month - 1, day);
  
  // Verificar que la fecha sea válida
  if (isNaN(dateObj.getTime())) {
    return `Día ${index + 1}`;
  }
  
  // Formatear a "26 feb 2026"
  const options = { day: 'numeric', month: 'short', year: 'numeric' };
  return dateObj.toLocaleDateString('es-ES', options);
}

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
        
        // Formatear fecha usando función segura
        const formattedDate = formatDay(dayDate, index);
        
        // Construir título del día
        let dayHeader = "";
        if (dayTitle) {
          dayHeader = `📅 ${escapeHtml(formattedDate)} - ${escapeHtml(dayTitle)}`;
        } else {
          dayHeader = `📅 ${escapeHtml(formattedDate)}`;
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

function renderResponse(data, isOneWay = false, tripData = {}, numPeople = 1) {
  if (!resultsEl) return;

  const summary = data?.summary ?? "Sin resumen disponible.";
  const flights = data?.flights ?? [];
  const hotels = data?.hotels ?? [];
  const itinerary = data?.itinerary ?? [];
  const budget = tripData?.presupuestoMax || null;

  // Convertir numPeople a número si es necesario
  numPeople = parseInt(numPeople) || 1;

  // Añadir nota de "Solo ida" al resumen si aplica
  let summaryText = escapeHtml(summary);
  if (isOneWay && !summary.toLowerCase().includes('solo ida')) {
    summaryText += `<div style="margin-top: 0.75rem; padding: 0.5rem; background: var(--color-warning); color: white; border-radius: 6px; font-size: 0.875rem; font-weight: 600;">➡️ Viaje de solo ida</div>`;
  }

  // Calcular totales
  const flightsTotal = calculateTotalPrice(flights);
  const hotelsTotal = calculateTotalPrice(hotels);
  const activitiesTotal = 0; // Por ahora no tenemos actividades con precio

  // Calcular totales por persona
  const flightsPP = numPeople > 1 ? (flightsTotal / numPeople).toFixed(2) : flightsTotal.toFixed(2);
  const hotelsPP = numPeople > 1 ? (hotelsTotal / numPeople).toFixed(2) : hotelsTotal.toFixed(2);
  const activitiesPP = numPeople > 1 ? (activitiesTotal / numPeople).toFixed(2) : activitiesTotal.toFixed(2);

  // Añadir información de presupuesto si existe
  let budgetHtml = '';
  if (budget && budget >= 100) {
    const badge = getBudgetBadge(budget);
    const distribution = calculateBudgetDistribution(budget);
    const remaining = calculateRemainingBudget(budget, flights, hotels);
    
    // Badge del tipo de viaje
    if (badge.show) {
      budgetHtml += `<div style="margin-top: 0.75rem; padding: 0.5rem; background: ${badge.color}; color: white; border-radius: 6px; font-size: 0.875rem; font-weight: 600;">${badge.text}</div>`;
    }
    
    // Distribución del presupuesto
    if (distribution) {
      budgetHtml += `
        <div style="margin-top: 1rem; padding: 1rem; background: var(--color-background-secondary); border-radius: 8px; border-left: 4px solid var(--color-primary);">
          <h4 style="margin: 0 0 0.75rem 0; font-size: 0.9rem; color: var(--color-text-secondary);">💰 Distribución del presupuesto</h4>
          <div style="display: grid; gap: 0.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--color-text-secondary); font-size: 0.875rem;">✈️ Vuelos:</span>
              <span style="font-weight: 600; color: var(--color-text);">${distribution.flights} €</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--color-text-secondary); font-size: 0.875rem;">🏨 Hotel por noche:</span>
              <span style="font-weight: 600; color: var(--color-text);">${distribution.hotel} €</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--color-text-secondary); font-size: 0.875rem;">🎯 Actividades:</span>
              <span style="font-weight: 600; color: var(--color-text);">${distribution.activities} €</span>
            </div>
          </div>
        </div>
      `;
    }
    
    // Presupuesto restante
    if (remaining && remaining.spent > 0) {
      const remainingColor = remaining.remaining >= 0 ? 'var(--color-success)' : 'var(--color-error)';
      const remainingIcon = remaining.remaining >= 0 ? '✅' : '⚠️';
      
      // Información por persona si> 1
      let personsHtml = '';
      if (numPeople > 1) {
        const perPersonBudget = (remaining.budget / numPeople).toFixed(2);
        const perPersonSpent = (remaining.spent / numPeople).toFixed(2);
        const perPersonRemaining = (remaining.remaining / numPeople).toFixed(2);
        
        personsHtml = `
          <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--color-border);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--color-text-secondary); font-size: 0.875rem;">👥 Por persona:</span>
              <span style="font-style: italic; color: var(--color-text-secondary); font-size: 0.875rem;">entre ${numPeople}</span>
            </div>
            <div style="display: grid; gap: 0.5rem; margin-top: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--color-text-secondary); font-size: 0.875rem;">Presupuesto:</span>
                <span style="font-weight: 600; color: var(--color-primary);">${perPersonBudget} €</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--color-text-secondary); font-size: 0.875rem;">Gastado:</span>
                <span style="font-weight: 600; color: var(--color-text);">${perPersonSpent} €</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--color-text-secondary); font-size: 0.875rem;">Restante:</span>
                <span style="font-weight: 700; color: ${remainingColor};">${perPersonRemaining} €</span>
              </div>
            </div>
          </div>
        `;
      }
      
      budgetHtml += `
        <div style="margin-top: 1rem; padding: 1rem; background: var(--color-background-secondary); border-radius: 8px; border-left: 4px solid ${remainingColor};">
          <h4 style="margin: 0 0 0.75rem 0; font-size: 0.9rem; color: var(--color-text-secondary);">📊 Resumen financiero</h4>
          <div style="display: grid; gap: 0.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--color-text-secondary); font-size: 0.875rem;">Presupuesto total:</span>
              <span style="font-weight: 600; color: var(--color-text);">${remaining.budget} €</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--color-text-secondary); font-size: 0.875rem;">Gastado:</span>
              <span style="font-weight: 600; color: var(--color-text);">${remaining.spent} €</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.5rem; border-top: 1px solid var(--color-border);">
              <span style="color: var(--color-text-secondary); font-size: 0.875rem;">${remainingIcon} Restante:</span>
              <span style="font-weight: 700; font-size: 1.1rem; color: ${remainingColor};">${remaining.remaining} €</span>
            </div>
            ${personsHtml}
          </div>
        </div>
      `;
    }
  }

  resultsEl.innerHTML = `
    <div class="result-card" style="animation-delay: 0ms;">
      <h3>📋 Resumen</h3>
      <div class="result-summary">${summaryText}${budgetHtml}</div>
    </div>
    ${renderFlights(flights, isOneWay, tripData, numPeople)}
    ${renderHotels(hotels, tripData, numPeople)}
    ${renderItinerary(itinerary)}
  `;

  // Añadir animación staggered a los cards de resultados
  const resultCards = resultsEl.querySelectorAll(".result-card");
  resultCards.forEach((card, index) => {
    card.style.animationDelay = `${index * 100}ms`;
  });
}

// Validación en tiempo real del presupuesto
const budgetInput = document.getElementById("presupuestoMax");
const budgetWarning = document.getElementById("budgetWarning");
const budgetBadge = document.getElementById("budgetBadge");

if (budgetInput && budgetWarning && budgetBadge) {
  budgetInput.addEventListener('input', () => {
    const value = Number(budgetInput.value);
    
    if (budgetInput.value === '' || value === 0) {
      budgetWarning.style.display = 'none';
      budgetBadge.style.display = 'none';
      return;
    }
    
    // Mostrar warning si es menor a 100
    if (value < 100) {
      budgetWarning.style.display = 'block';
      budgetBadge.style.display = 'none';
    } else {
      budgetWarning.style.display = 'none';
      
      // Mostrar badge según rango
      const badge = getBudgetBadge(value);
      if (badge.show) {
        budgetBadge.textContent = badge.text;
        budgetBadge.style.color = badge.color;
        budgetBadge.style.display = 'block';
      } else {
        budgetBadge.style.display = 'none';
      }
    }
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
  const numPeopleRaw = document.getElementById("numPeople")?.value ?? "1";
  const numPeople = Math.max(1, parseInt(numPeopleRaw) || 1);
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
  
  // Validar presupuesto mínimo si se proporciona
  if (presupuestoMax !== null && presupuestoMax < 100) {
    setError("El presupuesto mínimo es 100 €.");
    return;
  }

  // JSON EXACTO requerido (mismas claves, sin extras)
  const payload = {
    origen,
    destino,
    fechaSalida,
    fechaVuelta,
    presupuestoMax,
    numPeople,
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
      fechaVuelta,
      presupuestoMax
    };
    
    renderResponse(data, isOneWay, tripData, numPeople);
  } catch (err) {
    setError("No se pudo obtener el plan. Intenta nuevamente.");
  } finally {
    setLoading(false);
  }
});