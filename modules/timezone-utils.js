// timezone-utils.js
// Utilidades para conversión de hora Colombia a hora local del paciente
// basado en su campo connectionLocation

// Mapa de palabras clave (ciudades, países, regiones) → timezone IANA
// Se busca por coincidencia de palabras clave en el texto de connectionLocation
const TIMEZONE_MAP = [
    // ── Colombia (base) ──────────────────────────────────────
    { keywords: ['colombia', 'bogotá', 'bogota', 'medellín', 'medellin', 'cali', 'barranquilla', 'cartagena', 'bucaramanga', 'pereira'], timezone: 'America/Bogota', label: 'Colombia' },

    // ── USA – Este ────────────────────────────────────────────
    { keywords: ['new york', 'nueva york', 'nueva york', 'miami', 'boston', 'washington', 'atlanta', 'orlando', 'philadelphia', 'pittsburgh', 'detroit', 'cleveland', 'charlotte', 'raleigh', 'jacksonville', 'new jersey', 'connecticut', 'virginia', 'carolina del norte', 'carolina del sur', 'tennessee', 'nashville', 'memphis', 'indianapolis'], timezone: 'America/New_York', label: 'Nueva York (ET)' },

    // ── USA – Central ─────────────────────────────────────────
    { keywords: ['chicago', 'houston', 'dallas', 'san antonio', 'austin', 'minneapolis', 'milwaukee', 'kansas city', 'st. louis', 'saint louis', 'new orleans', 'oklahoma', 'iowa', 'illinois', 'texas', 'minnesota', 'wisconsin', 'missouri', 'nebraska', 'arkansas', 'louisiana', 'mississippi'], timezone: 'America/Chicago', label: 'Chicago (CT)' },

    // ── USA – Montaña ─────────────────────────────────────────
    { keywords: ['denver', 'phoenix', 'salt lake', 'albuquerque', 'tucson', 'colorado', 'utah', 'arizona', 'new mexico', 'wyoming', 'idaho', 'montana'], timezone: 'America/Denver', label: 'Denver (MT)' },

    // ── USA – Pacífico ────────────────────────────────────────
    { keywords: ['los angeles', 'san francisco', 'seattle', 'las vegas', 'portland', 'san diego', 'sacramento', 'california', 'nevada', 'oregon', 'washington state', 'vancouver usa'], timezone: 'America/Los_Angeles', label: 'Los Ángeles (PT)' },

    // ── Canadá ────────────────────────────────────────────────
    { keywords: ['toronto', 'ontario', 'montreal', 'ottawa', 'quebec', 'halifax', 'new brunswick'], timezone: 'America/Toronto', label: 'Toronto (ET)' },
    { keywords: ['vancouver', 'british columbia', 'victoria canada'], timezone: 'America/Vancouver', label: 'Vancouver (PT)' },
    { keywords: ['calgary', 'edmonton', 'alberta'], timezone: 'America/Edmonton', label: 'Calgary (MT)' },
    { keywords: ['winnipeg', 'manitoba', 'saskatchewan'], timezone: 'America/Winnipeg', label: 'Winnipeg (CT)' },

    // ── México ────────────────────────────────────────────────
    { keywords: ['ciudad de mexico', 'ciudad de méxico', 'cdmx', 'monterrey', 'guadalajara', 'puebla', 'leon', 'León', 'estado de mexico', 'queretaro', 'querétaro', 'aguascalientes', 'mexico city'], timezone: 'America/Mexico_City', label: 'Ciudad de México' },
    { keywords: ['cancún', 'cancun', 'mérida', 'merida', 'yucatan', 'yucatán', 'quintana roo', 'campeche'], timezone: 'America/Cancun', label: 'Cancún' },
    { keywords: ['tijuana', 'mexicali', 'ensenada', 'baja california'], timezone: 'America/Tijuana', label: 'Tijuana (PT)' },

    // ── Centroamérica ─────────────────────────────────────────
    { keywords: ['panama', 'panamá'], timezone: 'America/Panama', label: 'Panamá' },
    { keywords: ['costa rica', 'san jose costa', 'san josé costa'], timezone: 'America/Costa_Rica', label: 'Costa Rica' },
    { keywords: ['guatemala'], timezone: 'America/Guatemala', label: 'Guatemala' },
    { keywords: ['el salvador', 'honduras', 'nicaragua', 'tegucigalpa', 'managua'], timezone: 'America/Tegucigalpa', label: 'Centroamérica' },

    // ── Caribe ────────────────────────────────────────────────
    { keywords: ['república dominicana', 'republica dominicana', 'santo domingo', 'puerto rico', 'san juan puerto'], timezone: 'America/Santo_Domingo', label: 'Rep. Dominicana' },
    { keywords: ['cuba', 'havana', 'la habana'], timezone: 'America/Havana', label: 'Cuba' },

    // ── Sudamérica ────────────────────────────────────────────
    { keywords: ['venezuela', 'caracas', 'maracaibo', 'valencia venezuela'], timezone: 'America/Caracas', label: 'Venezuela' },
    { keywords: ['ecuador', 'quito', 'guayaquil', 'cuenca ecuador'], timezone: 'America/Guayaquil', label: 'Ecuador' },
    { keywords: ['peru', 'perú', 'lima', 'arequipa', 'cusco', 'trujillo'], timezone: 'America/Lima', label: 'Perú' },
    { keywords: ['bolivia', 'la paz', 'santa cruz bolivia', 'cochabamba'], timezone: 'America/La_Paz', label: 'Bolivia' },
    { keywords: ['chile', 'santiago', 'valparaíso', 'valparaiso', 'concepcion chile'], timezone: 'America/Santiago', label: 'Chile' },
    { keywords: ['argentina', 'buenos aires', 'córdoba argentina', 'cordoba argentina', 'rosario argentina', 'mendoza'], timezone: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
    { keywords: ['uruguay', 'montevideo'], timezone: 'America/Montevideo', label: 'Uruguay' },
    { keywords: ['paraguay', 'asuncion', 'asunción'], timezone: 'America/Asuncion', label: 'Paraguay' },
    { keywords: ['brasil', 'brazil', 'são paulo', 'sao paulo', 'rio de janeiro', 'brasilia', 'belo horizonte'], timezone: 'America/Sao_Paulo', label: 'Brasil' },

    // ── Europa ────────────────────────────────────────────────
    { keywords: ['españa', 'espana', 'spain', 'madrid', 'barcelona', 'sevilla', 'valencia spain', 'bilbao', 'málaga', 'malaga', 'zaragoza'], timezone: 'Europe/Madrid', label: 'España' },
    { keywords: ['reino unido', 'united kingdom', 'uk', 'london', 'londres', 'england', 'scotland', 'wales', 'manchester', 'birmingham'], timezone: 'Europe/London', label: 'Londres' },
    { keywords: ['portugal', 'lisboa', 'lisbon', 'porto'], timezone: 'Europe/Lisbon', label: 'Portugal' },
    { keywords: ['francia', 'france', 'paris', 'parís', 'lyon', 'marseille'], timezone: 'Europe/Paris', label: 'Francia' },
    { keywords: ['alemania', 'germany', 'berlin', 'berlín', 'munich', 'münchen', 'frankfurt', 'hamburg'], timezone: 'Europe/Berlin', label: 'Alemania' },
    { keywords: ['italia', 'italy', 'roma', 'rome', 'milan', 'milán', 'napoles'], timezone: 'Europe/Rome', label: 'Italia' },
    { keywords: ['suiza', 'switzerland', 'zurich', 'zürich', 'ginebra', 'geneva', 'berna'], timezone: 'Europe/Zurich', label: 'Suiza' },
    { keywords: ['holanda', 'países bajos', 'netherlands', 'amsterdam'], timezone: 'Europe/Amsterdam', label: 'Holanda' },
    { keywords: ['bélgica', 'belgica', 'belgium', 'bruselas', 'brussels'], timezone: 'Europe/Brussels', label: 'Bélgica' },

    // ── Otras regiones ────────────────────────────────────────
    { keywords: ['australia', 'sydney', 'melbourne', 'brisbane', 'perth australia'], timezone: 'Australia/Sydney', label: 'Australia' },
];

/**
 * Dada una cadena de texto libre (connectionLocation del paciente),
 * retorna la entrada del mapa de timezones que coincide, o null si no hay match.
 */
export function getTimezoneFromLocation(connectionLocation) {
    if (!connectionLocation || connectionLocation.trim() === '') return null;

    const searchText = connectionLocation.toLowerCase().trim();

    for (const entry of TIMEZONE_MAP) {
        for (const keyword of entry.keywords) {
            if (searchText.includes(keyword)) {
                return entry;
            }
        }
    }

    return null;
}

/**
 * Convierte una hora Colombia (dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM')
 * al timezone de destino y retorna la hora formateada en 12h (ej: "2:00 PM").
 */
export function formatTimeInTimezone(dateStr, timeStr, timezone) {
    try {
        // Construir la fecha en hora Colombia sin ambigüedad de timezone
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);

        // Crear fecha como si fuera Colombia (UTC-5)
        const bogotaOffset = -5 * 60; // minutos
        const utcMs = Date.UTC(year, month - 1, day, hours, minutes) - bogotaOffset * 60 * 1000;

        const formatter = new Intl.DateTimeFormat('es-CO', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: timezone
        });

        return formatter.format(new Date(utcMs));
    } catch (e) {
        console.error('Error formateando hora en timezone:', timezone, e);
        return null;
    }
}

/**
 * Función principal.
 * Retorna un objeto con la hora Colombia formateada y la hora local del paciente,
 * o null si no hay timezone reconocido para el paciente.
 *
 * @param {string} dateStr - Fecha de la cita 'YYYY-MM-DD'
 * @param {string} timeStr - Hora de la cita 'HH:MM'
 * @param {string} connectionLocation - Lugar de conexión del paciente (texto libre)
 * @returns {{ colombiaTime: string, localTime: string, label: string } | null}
 */
export function getPatientTimezoneInfo(dateStr, timeStr, connectionLocation) {
    const tzEntry = getTimezoneFromLocation(connectionLocation);
    if (!tzEntry) return null;

    // Si el paciente es de Colombia, no hace falta mostrar hora doble
    if (tzEntry.timezone === 'America/Bogota') return null;

    const colombiaTime = formatTimeInTimezone(dateStr, timeStr, 'America/Bogota');
    const localTime = formatTimeInTimezone(dateStr, timeStr, tzEntry.timezone);

    if (!colombiaTime || !localTime) return null;

    return {
        colombiaTime,
        localTime,
        label: tzEntry.label
    };
}
