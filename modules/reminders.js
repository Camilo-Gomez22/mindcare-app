// Reminders Module - Manages WhatsApp reminders and confirmation tracking

import Storage from './storage.js';
import { showToast } from '../app.js';

class Reminders {
    static init() {
        this.setupEventListeners();
        // Lazy loading: We DO NOT render here to avoid errors if the DOM isn't ready or section is hidden
    }

    static setupEventListeners() {
        // Buttons are currently using onclick handlers in HTML for simplicity in this generated view
    }

    static getTomorrowDate() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Manual formatting to avoid UTC conversion issues
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    static async renderRemindersList() {
        const container = document.getElementById('reminders-list');
        if (!container) {
            console.warn('Reminders container not found - probably not on reminders section');
            return;
        }

        const tomorrow = this.getTomorrowDate();
        const appointments = await Storage.getAppointments();

        // Filter appointments for tomorrow
        const tomorrowAppts = appointments.filter(a => a.date === tomorrow);

        // Update statistics if elements exist
        const totalEl = document.getElementById('reminders-total');
        const confirmedEl = document.getElementById('reminders-confirmed');
        const pendingEl = document.getElementById('reminders-pending');

        if (totalEl) totalEl.textContent = tomorrowAppts.length;
        if (confirmedEl) confirmedEl.textContent = tomorrowAppts.filter(a => a.confirmationStatus === 'confirmed').length;
        if (pendingEl) pendingEl.textContent = tomorrowAppts.filter(a => !a.confirmationStatus || a.confirmationStatus === 'pending').length;

        if (tomorrowAppts.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay citas programadas para ma\u00f1ana</p>';
            return;
        }

        // Sort by time
        tomorrowAppts.sort((a, b) => a.time.localeCompare(b.time));

        let html = '<div class="reminders-grid">';

        for (const appointment of tomorrowAppts) {
            const patient = await Storage.getPatientById(appointment.patientId);
            if (!patient) continue;

            const status = appointment.confirmationStatus || 'pending';
            const statusBadge = this.getConfirmationStatusBadge(status);

            html += `
                <div class="reminder-card">
                    <div class="reminder-header">
                        <div>
                            <h3>${patient.firstname} ${patient.lastname}</h3>
                            <p class="reminder-time">🕐 ${appointment.time}</p>
                            <p class="reminder-type">
                                <span class="appointment-badge badge-${appointment.type}">${appointment.type}</span>
                            </p>
                        </div>
                        ${statusBadge}
                    </div>
                    
                    <div class="reminder-info">
                        <div>📱 ${patient.phone || 'Sin tel\u00e9fono'}</div>
                        ${appointment.notes ? `<div>📝 ${appointment.notes}</div>` : ''}
                    </div>

                    <div class="reminder-actions">
                        ${patient.phone ? `
                            <button class="btn btn-sm btn-primary" onclick="window.remindersModule.sendWhatsAppReminder('${appointment.id}')" title="Abrir WhatsApp con mensaje de recordatorio">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                                </svg>
                                Enviar
                            </button>
                        ` : '<span style="color: var(--gray-400);">Sin tel\u00e9fono</span>'}
                        
                        ${status !== 'confirmed' ? `
                            <button class="btn btn-sm btn-success" onclick="window.remindersModule.markConfirmed('${appointment.id}')">
                                ✅ Confirmar
                            </button>
                        ` : ''}
                        
                        ${status !== 'no_confirmation' ? `
                            <button class="btn btn-sm btn-secondary" onclick="window.remindersModule.markNoConfirmation('${appointment.id}')">
                                ⚠️ No Confirm\u00f3
                            </button>
                        ` : ''}
                        
                        ${status !== 'cancelled' ? `
                            <button class="btn btn-sm btn-danger" onclick="window.remindersModule.markCancelled('${appointment.id}')">
                                ❌ Cancelar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    static getConfirmationStatusBadge(status) {
        const badges = {
            'pending': '<span class="status-badge status-pending">🟡 Pendiente</span>',
            'sent': '<span class="status-badge status-sent">📤 Enviado</span>',
            'confirmed': '<span class="status-badge status-confirmed">✅ Confirmado</span>',
            'no_confirmation': '<span class="status-badge status-no-confirmation">⚠️ No Confirm\u00f3</span>',
            'cancelled': '<span class="status-badge status-cancelled">❌ Cancel\u00f3</span>'
        };
        return badges[status] || badges['pending'];
    }

    static async sendWhatsAppReminder(appointmentId) {
        try {
            const appointment = await Storage.getAppointmentById(appointmentId);
            const patient = await Storage.getPatientById(appointment.patientId);

            if (!patient || !patient.phone) {
                showToast('El paciente no tiene número de teléfono registrado', 'error');
                return;
            }

            // Format date nicely
            const [year, month, day] = appointment.date.split('-').map(Number);
            const localDate = new Date(year, month - 1, day);

            const formattedDate = localDate.toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });

            const message = `Hola ${patient.firstname}, te recordamos tu cita de ma\u00f1ana ${formattedDate} a las ${appointment.time}. \u00bfPuedes confirmar tu asistencia? Gracias 😊`;

            // Clean phone number
            let cleanPhone = String(patient.phone).replace(/[^0-9]/g, '');

            // Logic for International Numbers:
            // 1. If length is 10, assume it's a local Colombian number (310...) -> Add 57
            // 2. If length > 10, assume user included country code (e.g. 1305... or 57310...) -> Keep as is
            if (cleanPhone.length === 10) {
                cleanPhone = '57' + cleanPhone;
            }
            // If length < 10, it's likely invalid but we try sending as is or let WhatsApp handle it

            // Open WhatsApp
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
            const newWindow = window.open(whatsappUrl, '_blank');

            if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                showToast('El navegador bloqueó la ventana emergente. Por favor permite pop-ups.', 'warning');
            }

            // Mark as sent
            await Storage.updateAppointment(appointmentId, {
                confirmationStatus: 'sent',
                reminderSentDate: new Date().toISOString()
            });

            showToast('WhatsApp abierto. Recordatorio marcado como enviado.', 'success');
            await this.renderRemindersList();
        } catch (error) {
            console.error('Error sending reminder:', error);
            showToast('Error al enviar recordatorio: ' + error.message, 'error');
        }
    }

    static async markConfirmed(appointmentId) {
        await Storage.updateAppointment(appointmentId, {
            confirmationStatus: 'confirmed',
            confirmationDate: new Date().toISOString()
        });
        showToast('Cita marcada como confirmada', 'success');
        await this.renderRemindersList();
    }

    static async markNoConfirmation(appointmentId) {
        await Storage.updateAppointment(appointmentId, {
            confirmationStatus: 'no_confirmation'
        });
        showToast('Marcado como no confirmado', 'info');
        await this.renderRemindersList();
    }

    static async markCancelled(appointmentId) {
        if (confirm('\u00bfMarcar esta cita como cancelada?')) {
            await Storage.updateAppointment(appointmentId, {
                confirmationStatus: 'cancelled'
            });
            showToast('Cita cancelada', 'success');
            await this.renderRemindersList();
        }
    }
}

export default Reminders;
