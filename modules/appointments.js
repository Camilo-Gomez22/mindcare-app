// Appointments Module - Manages appointments and calendar

import Storage from './storage.js';
import Notifications from './notifications.js';
import Calendar from './calendar.js';
import GoogleCalendarAPI from './google-calendar-api.js';
import { showToast } from '../app.js';

class Appointments {
    static init() {
        this.setupEventListeners();
        this.updatePatientSelect().catch(err => console.error('Error updating patients:', err));
        this.renderAppointmentsList().catch(err => console.error('Error rendering appointments:', err));
    }

    static setupEventListeners() {
        // Add appointment button
        document.getElementById('add-appointment-btn').addEventListener('click', () => {
            this.openAppointmentModal();
        });

        // Close modal buttons
        document.getElementById('close-appointment-modal').addEventListener('click', () => {
            this.closeAppointmentModal();
        });

        document.getElementById('cancel-appointment-btn').addEventListener('click', () => {
            this.closeAppointmentModal();
        });

        // Appointment form submission
        document.getElementById('appointment-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveAppointment();
        });

        // Filter changes
        document.getElementById('appointment-filter').addEventListener('change', () => {
            this.renderAppointmentsList();
        });

        document.getElementById('appointment-type-filter').addEventListener('change', () => {
            this.renderAppointmentsList();
        });
    }

    static async openAppointmentModal(appointmentId = null) {
        const modal = document.getElementById('appointment-modal');
        const form = document.getElementById('patient-form');
        const title = document.getElementById('appointment-modal-title');

        form.reset();

        if (appointmentId) {
            const appointment = await Storage.getAppointmentById(appointmentId);
            if (appointment) {
                title.textContent = 'Editar Cita';
                document.getElementById('appointment-id').value = appointment.id;
                document.getElementById('appointment-patient').value = appointment.patientId;
                document.getElementById('appointment-date').value = appointment.date;
                document.getElementById('appointment-time').value = appointment.time;
                document.getElementById('appointment-type').value = appointment.type;
                document.getElementById('appointment-notes').value = appointment.notes || '';
                document.getElementById('appointment-payment-status').value = appointment.paymentStatus;
                document.getElementById('appointment-payment-amount').value = appointment.amount || '';
            }
        } else {
            title.textContent = 'Nueva Cita';
            document.getElementById('appointment-id').value = '';
            // Set default date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('appointment-date').value = today;
        }

        modal.classList.add('active');
    }

    static closeAppointmentModal() {
        const modal = document.getElementById('appointment-modal');
        modal.classList.remove('active');
    }

    static async saveAppointment() {
        const id = document.getElementById('appointment-id').value;
        const appointmentData = {
            patientId: document.getElementById('appointment-patient').value,
            date: document.getElementById('appointment-date').value,
            time: document.getElementById('appointment-time').value,
            type: document.getElementById('appointment-type').value,
            meetLink: '', // El link se genera automáticamente con Google Calendar API
            notes: document.getElementById('appointment-notes').value.trim(),
            paymentStatus: document.getElementById('appointment-payment-status').value,
            amount: parseFloat(document.getElementById('appointment-payment-amount').value) || 0
        };

        try {
            if (id) {
                // Actualizar cita existente
                const updated = await Storage.updateAppointment(id, appointmentData);
                showToast('Cita actualizada exitosamente', 'success');

                // Si está conectado a Google, actualizar evento
                if (GoogleCalendarAPI.isSignedIn && updated.googleEventId) {
                    const patient = await Storage.getPatientById(updated.patientId);
                    GoogleCalendarAPI.updateEvent(updated.googleEventId, updated, patient);
                }
            } else {
                // Crear nueva cita
                const created = await Storage.addAppointment(appointmentData);
                showToast('Cita creada exitosamente', 'success');

                // Sincronizar automáticamente con Google Calendar si está conectado
                if (GoogleCalendarAPI.isSignedIn) {
                    await this.syncAppointmentToGoogle(created.id);
                }
            }

            this.closeAppointmentModal();
            await this.renderAppointmentsList();
        } catch (error) {
            console.error('Error guardando cita:', error);
            showToast('Error al guardar cita: ' + error.message, 'error');
        }
    }

    static async deleteAppointment(id) {
        if (confirm('¿Estás seguro de que deseas eliminar esta cita?')) {
            try {
                const appointment = await Storage.getAppointmentById(id);

                // Si está en Google Calendar, eliminarlo también
                if (GoogleCalendarAPI.isSignedIn && appointment.googleEventId) {
                    GoogleCalendarAPI.deleteEvent(appointment.googleEventId);
                }

                await Storage.deleteAppointment(id);
                showToast('Cita eliminada exitosamente', 'success');
                await this.renderAppointmentsList();
            } catch (error) {
                console.error('Error eliminando cita:', error);
                showToast('Error al eliminar cita', 'error');
            }
        }
    }

    static async updatePatientSelect() {
        const select = document.getElementById('appointment-patient');
        const patients = await Storage.getPatients();

        // Keep current selection if editing
        const currentValue = select.value;

        select.innerHTML = '<option value="">Seleccionar paciente...</option>';

        patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.firstname} ${patient.lastname}`;
            select.appendChild(option);
        });

        // Restore selection
        if (currentValue) {
            select.value = currentValue;
        }
    }

    static async getFilteredAppointments() {
        let appointments = await Storage.getAppointments();
        const dateFilter = document.getElementById('appointment-filter').value;
        const typeFilter = document.getElementById('appointment-type-filter').value;

        // Apply date filter
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (dateFilter) {
            case 'today':
                appointments = appointments.filter(a => {
                    const aptDate = new Date(a.date);
                    aptDate.setHours(0, 0, 0, 0);
                    return aptDate.getTime() === today.getTime();
                });
                break;
            case 'week':
                const weekEnd = new Date(today);
                weekEnd.setDate(today.getDate() + 7);
                appointments = appointments.filter(a => {
                    const aptDate = new Date(a.date);
                    return aptDate >= today && aptDate <= weekEnd;
                });
                break;
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                appointments = appointments.filter(a => {
                    const aptDate = new Date(a.date);
                    return aptDate >= monthStart && aptDate <= monthEnd;
                });
                break;
        }

        // Apply type filter
        if (typeFilter !== 'all') {
            appointments = appointments.filter(a => a.type === typeFilter);
        }

        // Sort by date and time
        appointments.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });

        return appointments;
    }

    static async renderAppointmentsList() {
        const container = document.getElementById('appointments-list');
        const appointments = await this.getFilteredAppointments();

        if (appointments.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay citas que coincidan con los filtros</p>';
            return;
        }

        let html = '';
        for (const appointment of appointments) {
            const patient = await Storage.getPatientById(appointment.patientId);
            if (!patient) continue;

            const date = new Date(appointment.date);
            const formattedDate = date.toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });

            const paymentBadge = appointment.paymentStatus === 'pendiente'
                ? 'badge-pending'
                : 'badge-paid';

            const paymentText = appointment.paymentStatus === 'pendiente'
                ? 'Pendiente'
                : `Pagado - ${appointment.paymentStatus}`;

            html += `
                <div class="appointment-card ${appointment.type}">
                    <div class="appointment-header">
                        <div class="appointment-patient">${patient.firstname} ${patient.lastname}</div>
                        <span class="appointment-badge badge-${appointment.type}">${appointment.type}</span>
                    </div>
                    <div class="appointment-info">
                        <div>📅 ${formattedDate} a las ${appointment.time}</div>
                        <div>💰 $${appointment.amount.toLocaleString()} - <span class="appointment-badge ${paymentBadge}">${paymentText}</span></div>
                        ${appointment.notes ? `<div>📝 ${appointment.notes}</div>` : ''}
                        ${appointment.type === 'virtual' && appointment.meetLink ? `<div>🔗 <a href="${appointment.meetLink}" target="_blank">Link de reunión</a></div>` : ''}
                    </div>
                    <div class="appointment-actions">
                        ${appointment.googleEventId ? `
                            <!-- Cita sincronizada con Google - solo mostrar badge -->
                            <span class="appointment-badge" style="background: #4285F4; color: white;" title="Sincronizado con Google Calendar - Los recordatorios se envían automáticamente">
                                ✓ Sincronizado con Google
                            </span>
                        ` : `
                            <!-- Cita NO sincronizada - mostrar opciones de sincronización manual -->
                            ${appointment.type === 'virtual' && appointment.meetLink ? `
                                <button class="btn btn-sm btn-secondary" onclick="window.appointmentsModule.shareWhatsApp('${appointment.id}')">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                    </svg>
                                    WhatsApp
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-success" onclick="window.appointmentsModule.downloadICS('${appointment.id}')" title="Descargar archivo .ics">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                .ics
                            </button>
                            <button class="btn btn-sm btn-success" onclick="window.appointmentsModule.addToGoogleCalendar('${appointment.id}')" title="Agregar a Google Calendar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                Calendar
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="window.appointmentsModule.sendEmailInvitation('${appointment.id}')" title="Enviar invitación por email">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                                Email
                            </button>
                            <button class="btn btn-sm" style="background: #4285F4; color: white;" onclick="window.appointmentsModule.syncAppointmentToGoogle('${appointment.id}')" title="Sincronizar con Google Calendar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 4 23 10 17 10"></polyline>
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                </svg>
                                Sync Google
                            </button>
                        `}
                        <button class="btn btn-sm btn-secondary" onclick="window.appointmentsModule.openAppointmentModal('${appointment.id}')">
                            Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.appointmentsModule.deleteAppointment('${appointment.id}')">
                            Eliminar
                        </button>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    static shareWhatsApp(appointmentId) {
        const appointment = Storage.getAppointmentById(appointmentId);
        const patient = Storage.getPatientById(appointment.patientId);

        if (patient && appointment) {
            Notifications.notifyAppointmentWhatsApp(patient, appointment);
        }
    }

    static shareEmail(appointmentId) {
        const appointment = Storage.getAppointmentById(appointmentId);
        const patient = Storage.getPatientById(appointment.patientId);

        if (patient && appointment) {
            Notifications.notifyAppointmentEmail(patient, appointment);
        }
    }

    static downloadICS(appointmentId) {
        const appointment = Storage.getAppointmentById(appointmentId);
        const patient = Storage.getPatientById(appointment.patientId);

        if (!patient.email) {
            showToast('El paciente no tiene email registrado', 'error');
            return;
        }

        Calendar.downloadICS(appointment, patient);
        showToast('Archivo .ics descargado', 'success');
    }

    static addToGoogleCalendar(appointmentId) {
        const appointment = Storage.getAppointmentById(appointmentId);
        const patient = Storage.getPatientById(appointment.patientId);

        if (!patient.email) {
            showToast('El paciente no tiene email registrado', 'error');
            return;
        }

        Calendar.addToGoogleCalendar(appointment, patient);
        showToast('Abriendo Google Calendar...', 'success');
    }

    static sendEmailInvitation(appointmentId) {
        const appointment = Storage.getAppointmentById(appointmentId);
        const patient = Storage.getPatientById(appointment.patientId);

        if (!patient.email) {
            showToast('El paciente no tiene email registrado', 'error');
            return;
        }

        Calendar.sendEmailInvitation(appointment, patient);
        showToast('Invitación enviada por email', 'success');
    }

    static async syncAppointmentToGoogle(appointmentId) {
        if (!GoogleCalendarAPI.isSignedIn) {
            showToast('Debes conectarte con Google primero', 'error');
            await GoogleCalendarAPI.signIn();
            return;
        }

        const appointment = await Storage.getAppointmentById(appointmentId);
        const patient = await Storage.getPatientById(appointment.patientId);

        // Crear evento en Google Calendar (enviará notificación automáticamente si el paciente tiene email)
        const result = await GoogleCalendarAPI.createEvent(appointment, patient);

        if (result) {
            // Guardar el ID del evento de Google en el appointment
            await Storage.updateAppointment(appointmentId, {
                googleEventId: result.googleEventId,
                googleEventLink: result.htmlLink
            });

            showToast('✓ Cita sincronizada con Google Calendar', 'success');
            await this.renderAppointmentsList();
        }
    }
}

export default Appointments;
