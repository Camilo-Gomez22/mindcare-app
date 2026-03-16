// Payments Module - Manages payment tracking and debt calculation

import Storage from './storage.js';

class Payments {
    static init() {
        this.setupEventListeners();
        this.updatePatientFilter();
        this.renderPaymentsList().catch(err => console.error('Error rendering payments:', err));
    }

    static setupEventListeners() {
        // Filter changes
        document.getElementById('payment-status-filter').addEventListener('change', () => {
            this.renderPaymentsList();
        });

        document.getElementById('payment-method-filter').addEventListener('change', () => {
            this.renderPaymentsList();
        });

        document.getElementById('payment-patient-filter').addEventListener('change', () => {
            this.renderPaymentsList();
        });
    }

    static async getFilteredPayments() {
        let appointments = await Storage.getAppointments();
        const statusFilter = document.getElementById('payment-status-filter').value;
        const methodFilter = document.getElementById('payment-method-filter').value;
        const patientFilter = document.getElementById('payment-patient-filter').value;

        // Apply patient filter
        if (patientFilter !== 'all') {
            appointments = appointments.filter(a => a.patientId === patientFilter);
        }

        // Apply status filter
        if (statusFilter === 'paid') {
            appointments = appointments.filter(a => a.paymentStatus !== 'pendiente');
        } else if (statusFilter === 'pending') {
            appointments = appointments.filter(a => a.paymentStatus === 'pendiente');
        }

        // Apply method filter
        if (methodFilter !== 'all') {
            appointments = appointments.filter(a => a.paymentStatus === methodFilter);
        }

        // Sort by date (most recent first)
        appointments.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateB - dateA;
        });

        return appointments;
    }

    static async renderPaymentsList() {
        const container = document.getElementById('payments-list');
        const appointments = await this.getFilteredPayments();

        // Render patient summary panel (shows/hides automatically)
        await this.renderPatientSummary();

        if (appointments.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay pagos que coincidan con los filtros</p>';
            return;
        }

        // Detect if we're on mobile
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Mobile view: render as cards
            let html = '<div class="patients-card-grid">';

            for (const appointment of appointments) {
                const patient = await Storage.getPatientById(appointment.patientId);
                if (!patient) continue;

                const [year, month, day] = appointment.date.split('-').map(Number);
                const localDate = new Date(year, month - 1, day);
                const formattedDate = localDate.toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                const isPaid = appointment.paymentStatus !== 'pendiente';
                const statusText = isPaid ? 'Pagado' : 'Pendiente';
                const statusClass = isPaid ? 'no-debt' : 'debt';
                const methodText = isPaid ? (appointment.paymentStatus === 'efectivo' ? 'Efectivo' : 'Transferencia') : '-';

                html += `
                    <div class="patient-card">
                        <div class="patient-card-header">
                            <h3>${patient.firstname} ${patient.lastname}</h3>
                            <span class="appointment-badge badge-${appointment.type}">${appointment.type}</span>
                        </div>
                        <div class="patient-card-body">
                            <div class="patient-card-info">
                                <span class="info-label">📅 Fecha:</span>
                                <span class="info-value">${formattedDate}</span>
                            </div>
                            <div class="patient-card-info">
                                <span class="info-label">💰 Monto:</span>
                                <span class="info-value"><strong>$${appointment.amount.toLocaleString()}</strong></span>
                            </div>
                            <div class="patient-card-info">
                                <span class="info-label">📋 Estado:</span>
                                <span class="info-value ${statusClass}"><strong>${statusText}</strong></span>
                            </div>
                            <div class="patient-card-info">
                                <span class="info-label">💳 Método:</span>
                                <span class="info-value">${methodText}</span>
                            </div>
                        </div>
                        <div class="patient-card-actions">
                            ${!isPaid ? `
                                <button class="btn btn-sm btn-success" onclick="window.paymentsModule.markAsPaid('${appointment.id}', 'efectivo')">
                                    💵 Efectivo
                                </button>
                                <button class="btn btn-sm btn-success" onclick="window.paymentsModule.markAsPaid('${appointment.id}', 'transferencia')">
                                    🏦 Transferencia
                                </button>
                            ` : `
                                <button class="btn btn-sm btn-secondary" onclick="window.paymentsModule.markAsPending('${appointment.id}')">
                                    ⏳ Marcar Pendiente
                                </button>
                            `}
                        </div>
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;
        } else {
            // Desktop view: render as table
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Paciente</th>
                            <th>Fecha</th>
                            <th>Tipo Cita</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th>Método</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const appointment of appointments) {
                const patient = await Storage.getPatientById(appointment.patientId);
                if (!patient) continue;

                const [year, month, day] = appointment.date.split('-').map(Number);
                const localDate = new Date(year, month - 1, day);
                const formattedDate = localDate.toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });

                const isPaid = appointment.paymentStatus !== 'pendiente';
                const statusText = isPaid ? 'Pagado' : 'Pendiente';
                const statusColor = isPaid ? 'var(--success)' : 'var(--error)';
                const methodText = isPaid ? appointment.paymentStatus : '-';

                html += `
                    <tr>
                        <td><strong>${patient.firstname} ${patient.lastname}</strong></td>
                        <td>${formattedDate}</td>
                        <td><span class="appointment-badge badge-${appointment.type}">${appointment.type}</span></td>
                        <td><strong>$${appointment.amount.toLocaleString()}</strong></td>
                        <td style="color: ${statusColor};"><strong>${statusText}</strong></td>
                        <td>${methodText === 'efectivo' ? 'Efectivo' : methodText === 'transferencia' ? 'Transferencia' : '-'}</td>
                        <td>
                            <div class="table-actions">
                                ${!isPaid ? `
                                    <button class="btn btn-sm btn-success" onclick="window.paymentsModule.markAsPaid('${appointment.id}', 'efectivo')">
                                        Efectivo
                                    </button>
                                    <button class="btn btn-sm btn-success" onclick="window.paymentsModule.markAsPaid('${appointment.id}', 'transferencia')">
                                        Transferencia
                                    </button>
                                ` : `
                                    <button class="btn btn-sm btn-secondary" onclick="window.paymentsModule.markAsPending('${appointment.id}')">
                                        Marcar Pendiente
                                    </button>
                                `}
                            </div>
                        </td>
                    </tr>
                `;
            }

            html += '</tbody></table>';
            container.innerHTML = html;
        }
    }

    /**
     * Renders a summary card for the selected patient.
     * Shows all their sessions (date, amount, status) and total pending.
     * Visible only when a specific patient is selected in the filter.
     */
    static async renderPatientSummary() {
        const summaryContainer = document.getElementById('patient-payment-summary');
        if (!summaryContainer) return;

        const patientFilter = document.getElementById('payment-patient-filter').value;

        // Hide panel when no patient is selected
        if (!patientFilter || patientFilter === 'all') {
            summaryContainer.style.display = 'none';
            summaryContainer.innerHTML = '';
            return;
        }

        // Fetch ALL appointments for this patient (ignore other filters for the summary)
        const Storage = (await import('./storage.js')).default;
        const patient = await Storage.getPatientById(patientFilter);
        if (!patient) return;

        const allAppointments = await Storage.getAppointmentsByPatient(patientFilter);

        // Sort by date ascending
        allAppointments.sort((a, b) => new Date(a.date) - new Date(b.date));

        const pendingAppointments = allAppointments.filter(a => a.paymentStatus === 'pendiente');
        const totalPending = pendingAppointments.reduce((sum, a) => sum + (a.amount || 0), 0);
        const totalSessions = allAppointments.length;
        const hasPending = pendingAppointments.length > 0;

        // Build summary rows for ALL sessions
        let rows = '';
        for (const apt of allAppointments) {
            const [year, month, day] = apt.date.split('-').map(Number);
            const localDate = new Date(year, month - 1, day);
            const formattedDate = localDate.toLocaleDateString('es-ES', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            });
            const isPaid = apt.paymentStatus !== 'pendiente';
            const statusText = isPaid ? (apt.paymentStatus === 'efectivo' ? 'Efectivo' : 'Transferencia') : 'Pendiente';
            const statusClass = isPaid ? 'summary-status-paid' : 'summary-status-pending';

            rows += `
                <tr>
                    <td class="summary-date">${formattedDate}</td>
                    <td class="summary-amount">$${(apt.amount || 0).toLocaleString()}</td>
                    <td><span class="summary-status ${statusClass}">${statusText}</span></td>
                </tr>
            `;
        }

        summaryContainer.style.display = 'block';
        summaryContainer.innerHTML = `
            <div class="patient-summary-card">
                <div class="patient-summary-header">
                    <div class="patient-summary-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <div>
                            <h3>${patient.firstname} ${patient.lastname}</h3>
                            <p class="patient-summary-subtitle">${totalSessions} sesión(es) registrada(s)</p>
                        </div>
                    </div>
                    <div class="patient-summary-total ${hasPending ? 'total-pending' : 'total-clear'}">
                        <span class="total-label">${hasPending ? 'Total Pendiente' : '✓ Al día'}</span>
                        ${hasPending ? `<span class="total-amount">$${totalPending.toLocaleString()}</span>` : ''}
                    </div>
                </div>

                <div class="patient-summary-table-wrapper">
                    <table class="patient-summary-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Monto</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                        ${hasPending ? `
                        <tfoot>
                            <tr class="summary-total-row">
                                <td><strong>Total pendiente</strong></td>
                                <td><strong>$${totalPending.toLocaleString()}</strong></td>
                                <td></td>
                            </tr>
                        </tfoot>
                        ` : ''}
                    </table>
                </div>

                ${hasPending ? `
                <div class="patient-summary-actions">
                    <button class="btn btn-sm btn-primary" onclick="window.paymentsModule.copyDebtToClipboard('${patientFilter}')" title="Copiar resumen para enviar al paciente">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copiar resumen
                    </button>
                    ${patient.phone ? `
                    <button class="btn btn-sm btn-success" onclick="window.paymentsModule.sendDebtWhatsApp('${patientFilter}')" title="Enviar resumen por WhatsApp">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        Enviar por WhatsApp
                    </button>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        `;
    }

    /** Builds the pending debt text for a patient */
    static async buildDebtText(patientId) {
        const Storage = (await import('./storage.js')).default;
        const patient = await Storage.getPatientById(patientId);
        const allAppointments = await Storage.getAppointmentsByPatient(patientId);
        const pending = allAppointments
            .filter(a => a.paymentStatus === 'pendiente')
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (pending.length === 0) return null;

        const total = pending.reduce((sum, a) => sum + (a.amount || 0), 0);
        const lines = pending.map(apt => {
            const [year, month, day] = apt.date.split('-').map(Number);
            const localDate = new Date(year, month - 1, day);
            const dateStr = localDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
            return `  • ${dateStr}: $${(apt.amount || 0).toLocaleString()}`;
        });

        return `Hola ${patient.firstname}, te comparto el resumen de sesiones pendientes de pago:\n\n` +
            lines.join('\n') +
            `\n\n*Total: $${total.toLocaleString()}*\n\nGracias 🙏`;
    }

    /** Copies the pending debt summary to clipboard */
    static async copyDebtToClipboard(patientId) {
        const text = await this.buildDebtText(patientId);
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            import('../app.js').then(m => m.showToast('✓ Resumen copiado al portapapeles', 'success'));
        } catch (e) {
            import('../app.js').then(m => m.showToast('No se pudo copiar al portapapeles', 'error'));
        }
    }

    /** Opens WhatsApp with the pending debt message pre-filled */
    static async sendDebtWhatsApp(patientId) {
        const text = await this.buildDebtText(patientId);
        if (!text) return;
        const Storage = (await import('./storage.js')).default;
        const patient = await Storage.getPatientById(patientId);
        let cleanPhone = String(patient.phone).replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) cleanPhone = '57' + cleanPhone;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    }

    static async markAsPaid(appointmentId, method) {
        try {
            // Automatic date assignment
            const today = new Date().toISOString().split('T')[0];

            /* MANUAL DATE SELECTION - Commented out, uncomment only for historical adjustments
            const appointment = await Storage.getAppointmentById(appointmentId);

// Prompt for payment date
const dateInput = prompt(
    `¿En qué fecha se recibió el pago?\n\n` +
    `Fecha de la cita: ${appointment.date}\n` +
    `Formato: AAAA-MM-DD (ej: 2026-01-26)`,
    today
);
            
            // If user cancels, abort
            if (dateInput === null) {
                return;
            }

// Validate date format
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(dateInput)) {
    import('../app.js').then(module => {
        module.showToast('Formato de fecha inválido. Usa AAAA-MM-DD', 'error');
    });
    return;
}
            
            // Validate date is not in the future
            const paymentDate = new Date(dateInput);
            const todayDate = new Date(today);
            if (paymentDate > todayDate) {
                import('../app.js').then(module => {
                    module.showToast('La fecha de pago no puede ser futura', 'error');
                });
                return;
            }
            */

            // Update appointment with payment info
            await Storage.updateAppointment(appointmentId, {
                paymentStatus: method,
                paidDate: today  // Using today's date automatically
            });
            await this.renderPaymentsList();

            // Update other views
            import('../app.js').then(async module => {
                module.showToast(`Pago registrado como ${method}`, 'success');
                await module.updateDashboard();
            });
        } catch (error) {
            console.error('Error marking as paid:', error);
        }
    }

    static async markAsPending(appointmentId) {
        try {
            // Confirmation dialog to prevent accidental unmarking
            const confirmed = confirm(
                '¿Estás seguro de que quieres marcar este pago como PENDIENTE?\n\n' +
                'Esto eliminará el registro de pago y la fecha de pago.'
            );

            if (!confirmed) {
                return; // User cancelled
            }

            await Storage.updateAppointment(appointmentId, {
                paymentStatus: 'pendiente',
                paidDate: null
            });
            await this.renderPaymentsList();

            // Update other views
            import('../app.js').then(async module => {
                module.showToast('Pago marcado como pendiente', 'success');
                await module.updateDashboard();
            });
        } catch (error) {
            console.error('Error marking as pending:', error);
        }
    }

    static async getPaymentsSummary(startDate, endDate) {
        const appointments = await Storage.getAppointmentsByDateRange(startDate, endDate);

        let totalRevenue = 0;
        let totalPending = 0;
        let totalCash = 0;
        let totalTransfer = 0;
        let paidCount = 0;
        let pendingCount = 0;

        appointments.forEach(apt => {
            if (apt.paymentStatus === 'pendiente') {
                totalPending += apt.amount;
                pendingCount++;
            } else {
                totalRevenue += apt.amount;
                paidCount++;
                if (apt.paymentStatus === 'efectivo') {
                    totalCash += apt.amount;
                } else if (apt.paymentStatus === 'transferencia') {
                    totalTransfer += apt.amount;
                }
            }
        });

        return {
            totalRevenue,
            totalPending,
            totalCash,
            totalTransfer,
            paidCount,
            pendingCount,
            totalAppointments: appointments.length
        };
    }

    static async updatePatientFilter() {
        const select = document.getElementById('payment-patient-filter');
        const patients = await Storage.getPatients();

        // Sort patients alphabetically
        const sortedPatients = patients.sort((a, b) => {
            const nameA = `${a.firstname} ${a.lastname}`.toLowerCase();
            const nameB = `${b.firstname} ${b.lastname}`.toLowerCase();
            return nameA.localeCompare(nameB);
        });

        // Keep current selection
        const currentValue = select.value || 'all';

        select.innerHTML = '<option value="all">Todos los pacientes</option>';

        sortedPatients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.firstname} ${patient.lastname}`;
            select.appendChild(option);
        });

        // Restore selection
        select.value = currentValue;
    }
}

export default Payments;
