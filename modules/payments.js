// Payments Module - Manages payment tracking and debt calculation

import Storage from './storage.js';

class Payments {
    static init() {
        this.setupEventListeners();
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
    }

    static async getFilteredPayments() {
        let appointments = await Storage.getAppointments();
        const statusFilter = document.getElementById('payment-status-filter').value;
        const methodFilter = document.getElementById('payment-method-filter').value;

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

    static async markAsPaid(appointmentId, method) {
        try {
            await Storage.updateAppointment(appointmentId, { paymentStatus: method });
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
            await Storage.updateAppointment(appointmentId, { paymentStatus: 'pendiente' });
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
}

export default Payments;
