# Guía de Integración con Google Calendar

## 📧 Nueva Funcionalidad: Integración con Calendario

### ✅ Lo que ya funciona (sin configuración adicional):

1. **Campo de Email añadido a Pacientes**
   - Ahora puedes registrar el email de cada paciente
   - Campo obligatorio para nuevos pacientes

2. **Descarga de archivo .ics**
   - Botón ".ics" en cada cita
   - Genera archivo estándar de calendario
   - Compatible con Gmail, Outlook, Apple Calendar, etc.
   - Incluye recordatorio automático 24 horas antes

3. **Link directo de Google Calendar**
   - Botón "Calendar" en cada cita
   - Abre Google Calendar en el navegador
   - Pre-llena todos los datos de la cita
   - Agrega automáticamente al paciente como invitado

4. **Envío de Invitación por Email**
   - Botón "Email" en cada cita
   - Abre cliente de correo con mensaje prellenado
   - Descarga automáticamente el archivo .ics
   - El paciente puede agregarlo a su calendario

---

## 🚀 Cómo Usar las Nuevas Funcionalidades

### 1. Registrar Email del Paciente
```
1. Ir a Pacientes → Nuevo Paciente
2. Llenar campos incluyendo Email (obligatorio)
3. Opcionalmente agregar Teléfono para WhatsApp
4. Guardar
```

### 2. Crear Cita y Enviar Invitación
```
1. Crear cita normalmente en sección "Citas"
2. Después de guardar, usar uno de estos botones:
   
   📥 .ics → Descarga archivo para adjuntar/importar
   📅 Calendar → Abre Google Calendar directamente
   📧 Email → Envía invitación completa por correo
```

### 3. El Paciente Recibe
- Email con detalles de la cita
- Archivo .ics adjunto (si usaste el botón Email)
- Link directo a Google Calendar
- Recordatorio automático 24h antes (si importa el .ics)

---

## 🔄 Sincronización con Google Calendar

### Método Actual (Sin configuración):

**Ventajas:** ✅ Funciona inmediatamente, sin setup, privado  
**Desventajas:** ⚠️ No sincroniza automáticamente, requiere acción manual

**Flujo:**
1. Creas cita en MindCare
2. Haces clic en "Calendar" o "Email"
3. El paciente agrega la cita a su calendario
4. Si confirma/rechaza, te llega por email

---

## 🌟 Integración Avanzada con Google Calendar API (Opcional)

Para tener sincronización bidireccional automática (citas se crean automáticamente en Google Calendar, notificaciones automáticas 24h antes, etc.):

### Requisitos:
1. Cuenta de Google Cloud Platform (gratis)
2. Configurar OAuth 2.0
3. Modificar código para usar API

### Pasos Detallados:

#### 1. Crear Proyecto en Google Cloud
```
1. Ir a https://console.cloud.google.com
2. Crear nuevo proyecto "MindCare"
3. Habilitar "Google Calendar API"
```

#### 2. Configurar OAuth 2.0
```
1. Ir a "APIs y servicios" → "Credenciales"
2. Crear credenciales → ID de cliente de OAuth 2.0
3. Tipo: Aplicación web
4. Orígenes autorizados: http://localhost:8080
5. URI de redireccionamiento: http://localhost:8080/callback
6. Descargar JSON de credenciales
```

#### 3. Implementación Técnica

**Archivo necesario:** `modules/google-calendar-api.js`

```javascript
// Esqueleto de integración con Google Calendar API
import { showToast } from '../app.js';

const CLIENT_ID = 'TU_CLIENT_ID_AQUI';
const API_KEY = 'TU_API_KEY_AQUI';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient;
let accessToken = null;

class GoogleCalendarAPI {
    static async init() {
        // Cargar Google API
        await this.loadGoogleAPI();
        this.initTokenClient();
    }

    static loadGoogleAPI() {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                gapi.load('client', () => {
                    gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                    }).then(resolve);
                });
            };
            document.body.appendChild(script);
        });
    }

    static initTokenClient() {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
                if (response.access_token) {
                    accessToken = response.access_token;
                    showToast('Conectado con Google Calendar', 'success');
                }
            },
        });
    }

    static async authenticate() {
        tokenClient.requestAccessToken();
    }

    static async createEvent(appointment, patient) {
        if (!accessToken) {
            await this.authenticate();
            return;
        }

        const startDate = new Date(`${appointment.date}T${appointment.time}`);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

        const event = {
            summary: `Cita - ${patient.firstname} ${patient.lastname}`,
            location: appointment.type === 'virtual' ? appointment.meetLink : 'Consultorio',
            description: `Tipo: ${appointment.type}\\nNotas: ${appointment.notes || ''}`,
            start: {
                dateTime: startDate.toISOString(),
                timeZone: 'America/Bogota',
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: 'America/Bogota',
            },
            attendees: [
                { email: patient.email }
            ],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 }, // 24 horas antes
                    { method: 'popup', minutes: 60 }
                ]
            },
            sendUpdates: 'all' // Envía emails automáticamente
        };

        try {
            const response = await gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event,
            });
            
            showToast('Cita creada en Google Calendar', 'success');
            return response.result;
        } catch (error) {
            console.error('Error creating event:', error);
            showToast('Error al crear evento: ' + error.message, 'error');
        }
    }
}

export default GoogleCalendarAPI;
```

#### 4. Modificar MindCare para usar la API

En `modules/appointments.js`, agregar botón:
```javascript
<button onclick="window.appointmentsModule.syncToGoogleCalendar('${appointment.id}')">
    Sincronizar con Google
</button>
```

Y método:
```javascript
static async syncToGoogleCalendar(appointmentId) {
    const appointment = Storage.getAppointmentById(appointmentId);
    const patient = Storage.getPatientById(appointment.patientId);
    
    await GoogleCalendarAPI.createEvent(appointment, patient);
}
```

---

## 📊 Comparación de Métodos

| Característica | Método Actual | Google Calendar API |
|---|---|---|
| **Setup** | ✅ Sin configuración | ⚠️ Requiere setup (30 min) |
| **Privacidad** | ✅ 100% local | ⚠️ Conecta con Google |
| **Invitaciones** | ✅ Via email/link | ✅ Automáticas |
| **Recordatorios** | ✅ Si paciente importa .ics | ✅ Automáticos por Google |
| **Sincronización** | ⚠️ Manual | ✅ Bidireccional automática |
| **Confirmaciones** | ⚠️ Por email | ✅ En calendario |
| **Costo** | ✅ Gratis | ✅ Gratis (límites generosos) |

---

## 💡 Recomendaciones

### Para Uso Inmediato:
**Usa el método actual** (ya implementado):
1. Registra pacientes con email
2. Crea citas
3. Usa botón "Email" para enviar invitación
4. El paciente recibe email + archivo .ics
5. Paciente agrega a su calendario
6. Recordatorio 24h automático funciona

### Para Sincronización Automática:
Implementa Google Calendar API si:
- Tienes muchos pacientes (>50/mes)
- Quieres notificaciones automáticas 100% confiables
- Necesitas ver confirmaciones en tiempo real
- Quieres sincronización bidireccional

---

## ❓ Preguntas Frecuentes

**P: ¿El archivo .ics funciona en cualquier calendario?**  
R: Sí, es un formato estándar. Funciona en Gmail, Outlook, Apple Calendar, etc.

**P: ¿Los recordatorios se envían automáticamente?**  
R: Si el paciente importa el .ics, su calendario enviará el recordatorio 24h antes.

**P: ¿Necesito pagar por Google Calendar API?**  
R: No, es gratis con límites generosos (1,000,000 requests/día).

**P: ¿Puedo usar ambos métodos?**  
R: Sí, puedes tener los botones actuales + API en paralelo.

**P: ¿Qué pasa si el paciente no tiene email?**  
R: Los botones de calendario se deshabilitarán automáticamente, pero puedes seguir usando WhatsApp.

---

## 🔐 Seguridad y Privacidad

- Los datos permanecen en tu navegador (localStorage)
- Los emails se envían desde tu cliente de correo
- Google Calendar API solo conecta cuando autorizas
- Puedes revocar acceso en cualquier momento desde Google

---

## 🎯 Próximos Pasos Sugeridos

1. ✅ **Ya hecho**: Usa integración básica (email + .ics)
2. Prueba durante 1-2 semanas
3. Si necesitas automatización, implementa Google Calendar API
4. Considera agregar:
   - Recordatorios por SMS (Twilio)
   - WhatsApp Business API (automático)
   - Webhooks para notificaciones

---

¿Necesitas ayuda implementando la API de Google? Avísame y te ayudo con la configuración paso a paso.
