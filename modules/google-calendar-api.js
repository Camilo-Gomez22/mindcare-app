// Google Calendar API Integration Module
// Handles OAuth2 authentication and Calendar API operations

const CONFIG = {
    // IMPORTANTE: Debes reemplazar estos valores con tus propias credenciales
    // Ver SETUP_GOOGLE_API.md para instrucciones
    CLIENT_ID: '1035880327504-8a8458kqoteq731qipj0b4pmsevbpn8c.apps.googleusercontent.com',
    API_KEY: 'AIzaSyDkDQ1VWOWVz_red0fBDtlCUkpq_CMQN68',
    DISCOVERY_DOCS: [
        'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
    ],
    SCOPES: 'https://www.googleapis.com/auth/calendar.events ' +
        'https://www.googleapis.com/auth/userinfo.email ' +
        'https://www.googleapis.com/auth/drive.appdata'
};

import { showToast } from '../app.js';
import Storage from './storage.js';
import { getPatientTimezoneInfo } from './timezone-utils.js';

class GoogleCalendarAPI {
    static isInitialized = false;
    static isSignedIn = false;
    static userEmail = null;

    static async init() {
        console.log('Inicializando Google Calendar API...');

        try {
            // Cargar Google API Client
            await this.loadScript('https://apis.google.com/js/api.js');
            await this.loadScript('https://accounts.google.com/gsi/client');

            // Inicializar gapi client
            await new Promise((resolve) => {
                gapi.load('client', resolve);
            });

            await gapi.client.init({
                apiKey: CONFIG.API_KEY,
                discoveryDocs: CONFIG.DISCOVERY_DOCS,
            });

            this.isInitialized = true;
            console.log('Google Calendar API inicializado');

            // Verificar si hay sesión guardada y esperar resultado
            const authStatus = await this.checkStoredAuth();
            return authStatus;

        } catch (error) {
            console.error('Error inicializando Google Calendar API:', error);
            showToast('Error al inicializar Google Calendar', 'error');
            this.showLoginScreen();
            return false;
        }
    }

    static loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    static async signIn() {
        if (!this.isInitialized) {
            showToast('Inicializando Google Calendar...', 'info');
            await this.init();
        }

        try {
            const tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CONFIG.CLIENT_ID,
                scope: CONFIG.SCOPES,
                callback: async (response) => {
                    if (response.error) {
                        console.error('Error en autenticación:', response);
                        showToast('Error al iniciar sesión con Google', 'error');
                        return;
                    }

                    // Guardar token y tiempo de expiración
                    localStorage.setItem('google_access_token', response.access_token);
                    gapi.client.setToken({ access_token: response.access_token });
                    this.setTokenExpiration();

                    // Obtener info del usuario
                    await this.getUserInfo();

                    this.isSignedIn = true;
                    this.updateUIAfterSignIn();
                    this.hideLoginScreen();
                    showToast(`Conectado como ${this.userEmail}`, 'success');

                    // Dispatch login success event to reload data
                    window.dispatchEvent(new CustomEvent('google-signin-success'));
                },
            });

            tokenClient.requestAccessToken({ prompt: '' }); // Empty prompt for silent re-auth

        } catch (error) {
            console.error('Error en sign in:', error);
            showToast('Error al conectar con Google', 'error');
        }
    }

    static async getUserInfo() {
        try {
            const token = gapi.client.getToken();
            if (!token || !token.access_token) {
                console.error('No access token disponible');
                this.userEmail = 'Conectado';
                return;
            }

            // Usar el endpoint de userinfo de Google OAuth2
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${token.access_token}`
                }
            });

            if (response.ok) {
                const userInfo = await response.json();
                this.userEmail = userInfo.email;
                localStorage.setItem('google_user_email', this.userEmail);
                console.log('✅ Email obtenido exitosamente:', this.userEmail);
                return;
            } else {
                console.error('Error en userinfo:', response.status);
            }
        } catch (error) {
            console.error('Error obteniendo userinfo:', error);
        }

        // Si todo falla, usar un placeholder
        if (!this.userEmail) {
            this.userEmail = 'Conectado con Google';
            console.warn('Usando placeholder para email');
        }
    }

    static signOut() {
        this.clearAuth();
        this.updateUIAfterSignOut();
        this.showLoginScreen();
        showToast('Sesión cerrada', 'success');
    }

    // Helper method to clear authentication data
    static clearAuth() {
        this.isSignedIn = false;
        this.userEmail = null;
        gapi.client.setToken(null);
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_user_email');
        localStorage.removeItem('google_token_expires_at');
        console.log('🧹 Credenciales limpiadas');
    }

    // Token validation and expiration methods
    static isTokenValid() {
        const token = gapi?.client?.getToken();
        if (!token || !token.access_token) return false;

        // Check if token expired (expires in ~1 hour)
        const expiresAt = localStorage.getItem('google_token_expires_at');
        if (expiresAt && Date.now() > parseInt(expiresAt)) {
            console.log('Token expirado');
            return false;
        }
        return true;
    }

    static setTokenExpiration() {
        // Google tokens expire in 3600 seconds (1 hour)
        const expiresAt = Date.now() + (3600 * 1000);
        localStorage.setItem('google_token_expires_at', expiresAt.toString());
        console.log('Token expirará en 1 hora');
    }

    static async reAuthenticate() {
        if (!this.isTokenValid()) {
            console.log('Token expirado, re-autenticando silenciosamente...');
            return new Promise((resolve) => {
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CONFIG.CLIENT_ID,
                    scope: CONFIG.SCOPES,
                    prompt: '', // Silent re-auth
                    callback: async (response) => {
                        if (!response.error) {
                            localStorage.setItem('google_access_token', response.access_token);
                            gapi.client.setToken({ access_token: response.access_token });
                            this.setTokenExpiration();
                            console.log('✅ Re-autenticación exitosa');
                            resolve(true);
                        } else {
                            console.error('Error en re-autenticación:', response.error);
                            this.forceLogout();
                            resolve(false);
                        }
                    }
                });
                tokenClient.requestAccessToken();
            });
        }
        return true; // Token still valid
    }

    static forceLogout() {
        this.isSignedIn = false;
        this.showLoginScreen();
        showToast('Tu sesión expiró. Por favor, inicia sesión nuevamente.', 'warning');
    }

    static async checkStoredAuth() {
        const token = localStorage.getItem('google_access_token');
        const email = localStorage.getItem('google_user_email');

        if (token && email) {
            gapi.client.setToken({ access_token: token });
            this.userEmail = email;

            // Validate token before allowing access
            if (!this.isTokenValid()) {
                console.log('⚠️ Token expirado detectado, intentando renovación silenciosa...');

                // Try silent re-authentication (await the result)
                const success = await this.attemptSilentReauth();
                if (success) {
                    console.log('✅ Token renovado exitosamente');
                    this.isSignedIn = true;
                    this.updateUIAfterSignIn();
                    this.hideLoginScreen();
                    // Dispatch event immediately (no setTimeout)
                    window.dispatchEvent(new CustomEvent('google-signin-success'));
                    return true;
                } else {
                    console.log('❌ Renovación fallida, requiere login manual');
                    this.clearAuth();
                    this.showLoginScreen();
                    showToast('Sesión expirada. Por favor, inicia sesión nuevamente.', 'warning');
                    return false;
                }
            }

            // Token válido - permitir acceso
            this.isSignedIn = true;
            this.updateUIAfterSignIn();
            this.hideLoginScreen();
            console.log('✅ Sesión restaurada exitosamente');
            // Dispatch event immediately (no setTimeout)
            window.dispatchEvent(new CustomEvent('google-signin-success'));
            return true;
        } else {
            console.log('❌ No hay credenciales guardadas, mostrando login');
            this.showLoginScreen();
            return false;
        }
    }

    // Helper to wait for authentication to complete
    static async waitForAuth() {
        return new Promise((resolve) => {
            if (this.isSignedIn) {
                resolve(true);
                return;
            }

            // Wait for signin event
            const handler = () => {
                window.removeEventListener('google-signin-success', handler);
                resolve(this.isSignedIn);
            };
            window.addEventListener('google-signin-success', handler);

            // Timeout after 30 seconds
            setTimeout(() => {
                window.removeEventListener('google-signin-success', handler);
                resolve(false);
            }, 30000);
        });
    }

    // Attempt silent re-authentication (used when token expires)
    static async attemptSilentReauth() {
        return new Promise((resolve) => {
            try {
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CONFIG.CLIENT_ID,
                    scope: CONFIG.SCOPES,
                    prompt: '', // Empty prompt = silent re-auth
                    callback: async (response) => {
                        if (response.error) {
                            console.error('Error en renovación silenciosa:', response.error);
                            resolve(false);
                            return;
                        }

                        // Save new token
                        localStorage.setItem('google_access_token', response.access_token);
                        gapi.client.setToken({ access_token: response.access_token });
                        this.setTokenExpiration();

                        // Get user info
                        await this.getUserInfo();

                        console.log('🔄 Token renovado silenciosamente');
                        resolve(true);
                    },
                });
                tokenClient.requestAccessToken();
            } catch (error) {
                console.error('Error en attemptSilentReauth:', error);
                resolve(false);
            }
        });
    }

    static hideLoginScreen() {
        const loginScreen = document.getElementById('login-screen');
        const appHeader = document.getElementById('app-header');
        const appMain = document.getElementById('app-main');

        if (loginScreen) loginScreen.style.display = 'none';
        if (appHeader) appHeader.style.display = 'block';
        if (appMain) appMain.style.display = 'block';
    }

    static showLoginScreen() {
        const loginScreen = document.getElementById('login-screen');
        const appHeader = document.getElementById('app-header');
        const appMain = document.getElementById('app-main');

        if (loginScreen) loginScreen.style.display = 'flex';
        if (appHeader) appHeader.style.display = 'none';
        if (appMain) appMain.style.display = 'none';
    }

    static updateUIAfterSignIn() {
        const loginBtn = document.getElementById('google-signin-btn');
        const logoutBtn = document.getElementById('google-signout-btn');
        const userInfo = document.getElementById('google-user-info');
        const settingsBtn = document.getElementById('settings-btn');
        const syncIndicator = document.getElementById('sync-indicator');

        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        if (settingsBtn) settingsBtn.style.display = 'inline-flex';
        if (syncIndicator) syncIndicator.style.display = 'flex';
        if (userInfo) {
            userInfo.style.display = 'block';
            userInfo.textContent = `📧 ${this.userEmail}`;
        }
    }

    static updateUIAfterSignOut() {
        const loginBtn = document.getElementById('google-signin-btn');
        const logoutBtn = document.getElementById('google-signout-btn');
        const userInfo = document.getElementById('google-user-info');
        const settingsBtn = document.getElementById('settings-btn');

        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (settingsBtn) settingsBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';
    }

    static async createEvent(appointment, patient) {
        if (!this.isSignedIn) {
            showToast('Debes iniciar sesión con Google primero', 'error');
            await this.signIn();
            return null;
        }

        // Ensure Calendar API is loaded
        if (!gapi.client.calendar) {
            console.log('Calendar API not loaded yet, waiting...');
            try {
                await this.init();
                if (!gapi.client.calendar) throw new Error('Calendar API failed to load');
            } catch (e) {
                console.error(e);
                showToast('Error: API de Calendario no lista. Intenta recargar.', 'error');
                return null;
            }
        }

        try {
            const startDate = new Date(`${appointment.date}T${appointment.time}`);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora

            // Cargar configuración para obtener la dirección del consultorio
            const settings = await Storage.getSettings();
            const officeLocation = settings.officeAddress;

            // Configurar recordatorios
            const now = new Date();
            const timeDiff = startDate.getTime() - now.getTime();
            const hoursUntilStart = timeDiff / (1000 * 60 * 60);

            const remindersOverrides = [
                { method: 'popup', minutes: 60 } // Recordatorio popup 1 hora antes (siempre)
            ];

            // Solo agregar recordatorio de email 24h antes si la cita es con suficiente anticipación
            if (hoursUntilStart > 24) {
                remindersOverrides.push({ method: 'email', minutes: 24 * 60 });
            }

            const event = {
                summary: `Cita - ${patient.firstname} ${patient.lastname}`,
                location: appointment.type === 'virtual'
                    ? appointment.meetLink || 'Virtual'
                    : officeLocation,
                description: this.buildEventDescription(appointment, settings.officeMapLink, patient),
                start: {
                    dateTime: startDate.toISOString(),
                    timeZone: 'America/Bogota',
                },
                end: {
                    dateTime: endDate.toISOString(),
                    timeZone: 'America/Bogota',
                },
                attendees: [
                    { email: patient.email, responseStatus: 'needsAction' }
                ],
                reminders: {
                    useDefault: false,
                    overrides: remindersOverrides
                },
                guestsCanModify: false,
                guestsCanInviteOthers: false,
                guestsCanSeeOtherGuests: false,
                sendUpdates: 'all' // Envía emails automáticamente al crear/modificar
            };

            // Si es virtual, agregar configuración de Google Meet
            if (appointment.type === 'virtual') {
                event.conferenceData = {
                    createRequest: {
                        requestId: `meet-${appointment.id || Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                };
            }

            const response = await gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: event,
                conferenceDataVersion: appointment.type === 'virtual' ? 1 : 0,
                sendUpdates: 'all'
            });

            console.log('Evento creado:', response.result);

            // Extraer link de Meet si fue generado
            let meetLink = null;
            if (response.result.conferenceData && response.result.conferenceData.entryPoints) {
                const meetEntry = response.result.conferenceData.entryPoints.find(e => e.entryPointType === 'video');
                if (meetEntry) {
                    meetLink = meetEntry.uri;
                    console.log('Link de Meet generado:', meetLink);
                }
            }

            // Extraer estado de respuesta del asistente
            let attendeeStatus = 'needsAction'; // Default
            if (response.result.attendees && response.result.attendees.length > 0) {
                const attendee = response.result.attendees.find(a => a.email === patient.email);
                if (attendee) {
                    attendeeStatus = attendee.responseStatus || 'needsAction';
                }
            }

            // Guardar el ID del evento de Google en el appointment
            return {
                googleEventId: response.result.id,
                htmlLink: response.result.htmlLink,
                meetLink: meetLink,
                status: response.result.status,
                attendeeStatus: attendeeStatus
            };

        } catch (error) {
            console.error('Error creando evento:', error);
            showToast('Error al crear evento en Google Calendar: ' + error.message, 'error');
            return null;
        }
    }

    static buildEventDescription(appointment, officeMapLink = null, patient = null) {
        let description = '';

        if (appointment.type === 'virtual' && appointment.meetLink) {
            description += `🔗 Link de la reunión:\n${appointment.meetLink}\n\n`;
            description += `Por favor, conéctate unos minutos antes de la hora programada.\n\n`;
        } else if (appointment.type !== 'virtual' && officeMapLink) {
            description += `📍 Ubicación en Google Maps: ${officeMapLink}\n\n`;
        }

        // Mostrar hora Colombia y hora local del paciente si aplica
        if (patient && patient.connectionLocation) {
            const tzInfo = getPatientTimezoneInfo(
                appointment.date,
                appointment.time,
                patient.connectionLocation
            );
            if (tzInfo) {
                description += `🕐 Horario de la cita:\n`;
                description += `• ${tzInfo.colombiaTime} (hora Colombia)\n`;
                description += `• ${tzInfo.localTime} (hora ${tzInfo.label})\n\n`;
            }
        }

        // Mensaje de confirmación y política de cancelación
        description += `Tu cita fue agendada. Si se te presenta algún inconveniente que te impida cumplir con tu cita por favor contáctanos con al menos 24 horas de anticipación. De esta manera podrá ser reasignada a otro paciente y se reprogramará tu espacio sin que se genere costo.`;

        return description;
    }

    static async updateEvent(googleEventId, appointment, patient) {
        if (!this.isSignedIn) {
            showToast('Debes iniciar sesión con Google', 'error');
            return null;
        }

        try {
            const startDate = new Date(`${appointment.date}T${appointment.time}`);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

            const settings = await Storage.getSettings();
            const isVirtual = appointment.type === 'virtual';

            const event = {
                summary: `Cita - ${patient.firstname} ${patient.lastname}`,
                location: isVirtual
                    ? (appointment.meetLink || 'Virtual')
                    : settings.officeAddress,
                description: this.buildEventDescription(appointment, settings.officeMapLink, patient),
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
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'popup', minutes: 60 },
                    ]
                }
            };

            // Si es virtual, solicitar creación de Google Meet
            // Si es presencial, eliminar conferencia existente
            if (isVirtual) {
                event.conferenceData = {
                    createRequest: {
                        requestId: `meet-update-${googleEventId}-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                };
            } else {
                // Eliminar la conferencia si existe (pasar objeto vacío la quita)
                event.conferenceData = {};
            }

            const response = await gapi.client.calendar.events.update({
                calendarId: 'primary',
                eventId: googleEventId,
                resource: event,
                conferenceDataVersion: isVirtual ? 1 : 0,
                sendUpdates: 'all'
            });

            console.log('Evento actualizado:', response.result);

            // Extraer el nuevo link de Meet (si aplica)
            // La API puede retornar conferenceData en estado "pending" en el update,
            // así que si no hay entryPoints aún, esperamos y hacemos un GET del evento.
            let meetLink = null;

            if (isVirtual) {
                // Intentar extraer del response directo
                if (response.result.conferenceData && response.result.conferenceData.entryPoints) {
                    const meetEntry = response.result.conferenceData.entryPoints.find(e => e.entryPointType === 'video');
                    if (meetEntry) {
                        meetLink = meetEntry.uri;
                        console.log('✅ Meet link extraído directamente:', meetLink);
                    }
                }

                // Si el link aún no está (estado pending), esperar y consultar el evento de nuevo
                if (!meetLink) {
                    console.log('⏳ conferenceData pendiente, esperando 2s y consultando el evento...');
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    try {
                        const getResponse = await gapi.client.calendar.events.get({
                            calendarId: 'primary',
                            eventId: googleEventId
                        });

                        const cd = getResponse.result.conferenceData;
                        if (cd && cd.entryPoints) {
                            const meetEntry = cd.entryPoints.find(e => e.entryPointType === 'video');
                            if (meetEntry) {
                                meetLink = meetEntry.uri;
                                console.log('✅ Meet link obtenido tras polling:', meetLink);
                            }
                        }

                        if (!meetLink) {
                            console.warn('⚠️ Meet link no disponible después del polling');
                        }
                    } catch (pollError) {
                        console.error('Error obteniendo evento en polling:', pollError);
                    }
                }
            }

            return {
                googleEventResult: response.result,
                meetLink: meetLink
            };

        } catch (error) {
            console.error('Error actualizando evento:', error);
            showToast('Error al actualizar evento: ' + error.message, 'error');
            return null;
        }
    }

    static async deleteEvent(googleEventId) {
        if (!this.isSignedIn) {
            showToast('Debes iniciar sesión con Google', 'error');
            return false;
        }

        try {
            await gapi.client.calendar.events.delete({
                calendarId: 'primary',
                eventId: googleEventId,
                sendUpdates: 'all'
            });

            console.log('Evento eliminado:', googleEventId);
            return true;

        } catch (error) {
            console.error('Error eliminando evento:', error);
            showToast('Error al eliminar evento: ' + error.message, 'error');
            return false;
        }
    }

    static async getEventAttendees(googleEventId) {
        if (!this.isSignedIn) return null;

        try {
            const response = await gapi.client.calendar.events.get({
                calendarId: 'primary',
                eventId: googleEventId
            });

            return response.result.attendees || [];

        } catch (error) {
            console.error('Error obteniendo asistentes:', error);
            return null;
        }
    }

    // Get attendee response status for a specific event and email
    static async getAttendeeStatus(googleEventId, patientEmail) {
        if (!this.isSignedIn) return null;

        try {
            const response = await gapi.client.calendar.events.get({
                calendarId: 'primary',
                eventId: googleEventId
            });

            const attendee = response.result.attendees?.find(
                a => a.email === patientEmail
            );

            return attendee?.responseStatus || 'needsAction';

        } catch (error) {
            console.error('Error obteniendo estado de asistente:', error);
            return null;
        }
    }
}

export default GoogleCalendarAPI;
