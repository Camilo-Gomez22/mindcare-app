// Reports Module - Generates reports and exports to Excel

import Storage from './storage.js';
import { showToast } from '../app.js';

class Reports {
    static currentReportData = null;

    static init() {
        this.setupEventListeners();
        this.setDefaultDates();
    }

    static setupEventListeners() {
        // Export to Excel button
        const exportBtn = document.getElementById('export-excel-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportToExcel();
            });
        }

        // Auto-generate report when date range or type changes
        const reportTypeInput = document.getElementById('report-type');
        const startDateInput = document.getElementById('report-start-date');
        const endDateInput = document.getElementById('report-end-date');

        if (reportTypeInput) {
            reportTypeInput.addEventListener('change', () => {
                this.generateReport();
            });
        }

        if (startDateInput) {
            startDateInput.addEventListener('change', () => {
                this.generateReport();
            });
        }

        if (endDateInput) {
            endDateInput.addEventListener('change', () => {
                this.generateReport();
            });
        }
    }

    static setDefaultDates() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const startDateInput = document.getElementById('report-start-date');
        const endDateInput = document.getElementById('report-end-date');

        // Manual formatting for generic dates
        const formatDateInput = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (startDateInput) {
            startDateInput.value = formatDateInput(firstDay);
        }

        if (endDateInput) {
            endDateInput.value = formatDateInput(lastDay);
        }

        // Generate initial report
        this.generateReport().catch(err => console.error('Error generating report:', err));
    }

    static async generateReport() {
        const reportType = document.getElementById('report-type').value;
        const startDateValue = document.getElementById('report-start-date').value;
        const endDateValue = document.getElementById('report-end-date').value;

        if (!startDateValue || !endDateValue) {
            document.getElementById('report-content').innerHTML = `
                <p class="empty-state">Selecciona el rango de fechas completo para generar el reporte</p>
            `;
            return;
        }

        const startDate = new Date(startDateValue);
        const endDate = new Date(endDateValue);
        endDate.setHours(23, 59, 59, 999); // Include entire end date

        // Validate date range
        if (new Date(startDate) > new Date(endDate)) {
            document.getElementById('report-content').innerHTML = `
                <p class="empty-state" style="color: var(--danger);">La fecha de inicio no puede ser mayor que la fecha de fin</p>
            `;
            return;
        }

        const appointments = await Storage.getAppointments();

        // Filter appointments based on report type
        let filteredAppointments;

        if (reportType === 'payment') {
            // Financial report: filter by payment date (only paid appointments)
            filteredAppointments = appointments.filter(apt => {
                // Only include paid appointments
                if (apt.paymentStatus === 'pendiente' || !apt.paidDate) {
                    return false;
                }

                const [year, month, day] = apt.paidDate.split('-').map(Number);
                const paidDate = new Date(year, month - 1, day);

                const startLocal = new Date(startDateValue + 'T00:00:00');
                const endLocal = new Date(endDateValue + 'T23:59:59');

                return paidDate >= startLocal && paidDate <= endLocal;
            });
        } else {
            // Standard report: filter by appointment date
            filteredAppointments = appointments.filter(apt => {
                const [year, month, day] = apt.date.split('-').map(Number);
                const aptDate = new Date(year, month - 1, day);

                const startLocal = new Date(startDateValue + 'T00:00:00');
                const endLocal = new Date(endDateValue + 'T23:59:59');

                return aptDate >= startLocal && aptDate <= endLocal;
            });
        }

        if (filteredAppointments.length === 0) {
            const message = reportType === 'payment'
                ? 'No hay pagos recibidos en el período seleccionado'
                : 'No hay citas en el período seleccionado';
            document.getElementById('report-content').innerHTML = `
                <p class="empty-state">${message}</p>
            `;
            return;
        }

        await this.renderReport(filteredAppointments, startDateValue, endDateValue, reportType);
    }

    static async renderReport(appointments, startDate, endDate, reportType = 'appointment') {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');

        const formatDate = (date) => {
            return date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        };

        const periodLabel = `${formatDate(start)} - ${formatDate(end)}`;
        const reportTypeLabel = reportType === 'payment'
            ? 'Reporte Financiero (por Fecha de Pago)'
            : 'Reporte por Fecha de Cita';

        // Group by patient
        const patientStats = {};
        let totalRevenue = 0;
        let totalPending = 0;

        for (const apt of appointments) {
            if (!patientStats[apt.patientId]) {
                const patient = await Storage.getPatientById(apt.patientId);
                patientStats[apt.patientId] = {
                    patient,
                    sessions: 0,
                    paid: 0,
                    pending: 0
                };
            }

            patientStats[apt.patientId].sessions++;

            if (apt.paymentStatus === 'pendiente') {
                patientStats[apt.patientId].pending += apt.amount;
                totalPending += apt.amount;
            } else {
                patientStats[apt.patientId].paid += apt.amount;
                totalRevenue += apt.amount;
            }
        }

        // Save for Excel export
        this.currentReportData = {
            startDate,
            endDate,
            periodLabel,
            reportType,
            reportTypeLabel,
            appointments,
            patientStats,
            totalRevenue,
            totalPending
        };

        let html = `
            <div class="report-header">
                <h3>${reportTypeLabel}</h3>
                <p class="report-period">${periodLabel}</p>
                <div class="report-summary">
                    <div class="summary-item">
                        <span class="summary-label">Total de Citas:</span>
                        <span class="summary-value">${appointments.length}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Ingresos Totales:</span>
                        <span class="summary-value">$${totalRevenue.toLocaleString()}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Pagos Pendientes:</span>
                        <span class="summary-value">$${totalPending.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div class="report-details">
                <h4>Detalle por Paciente</h4>
                <table>
                    <thead>
                        <tr>
                            <th>Paciente</th>
                            <th>Sesiones</th>
                            <th>Pagado</th>
                            <th>Pendiente</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        Object.values(patientStats).forEach(stat => {
            const total = stat.paid + stat.pending;
            html += `
                <tr>
                    <td><strong>${stat.patient.firstname} ${stat.patient.lastname}</strong></td>
                    <td>${stat.sessions}</td>
                    <td style="color: var(--success);">$${stat.paid.toLocaleString()}</td>
                    <td style="color: var(--error);">$${stat.pending.toLocaleString()}</td>
                    <td><strong>$${total.toLocaleString()}</strong></td>
                </tr>
            `;
        });

        const grandTotal = totalRevenue + totalPending;
        html += `
                        <tr style="background: var(--gray-100); font-weight: bold;">
                            <td>TOTAL</td>
                            <td>${appointments.length}</td>
                            <td style="color: var(--success);">$${totalRevenue.toLocaleString()}</td>
                            <td style="color: var(--error);">$${totalPending.toLocaleString()}</td>
                            <td>$${grandTotal.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('report-content').innerHTML = html;
    }

    static async exportToExcel() {
        if (!this.currentReportData) {
            showToast('Por favor genera un reporte primero', 'error');
            return;
        }

        const { periodLabel, reportTypeLabel, patientStats, appointments, totalRevenue, totalPending } = this.currentReportData;

        // Helper function to format dates
        const formatDate = (date) => {
            return date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        };

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Summary sheet
        const summaryData = [
            [reportTypeLabel, periodLabel],
            [],
            ['Métrica', 'Valor'],
            ['Total Citas', appointments.length],
            ['Ingresos Totales', totalRevenue],
            ['Pagos Pendientes', totalPending],
            ['Total General', totalRevenue + totalPending]
        ];

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

        // Patient details sheet with enhanced formatting
        const patientDetailsData = [
            [reportTypeLabel],
            [`Del ${formatDate(new Date(this.currentReportData.startDate + 'T00:00:00'))} al ${formatDate(new Date(this.currentReportData.endDate + 'T00:00:00'))}`],
            [], // Empty row
            ['Paciente', 'Sesiones', 'Pagado', 'Pendiente', 'Total']
        ];

        Object.values(patientStats).forEach(stat => {
            const total = stat.paid + stat.pending;
            patientDetailsData.push([
                `${stat.patient.firstname} ${stat.patient.lastname}`,
                stat.sessions,
                stat.paid,
                stat.pending,
                total
            ]);
        });

        // Add separator
        patientDetailsData.push([]);

        // Add totals row
        const grandTotal = totalRevenue + totalPending;
        patientDetailsData.push([
            '═══ TOTALES ═══',
            appointments.length,
            totalRevenue,
            totalPending,
            grandTotal
        ]);

        // Add empty row before summary
        patientDetailsData.push([]);

        // Add summary section
        const averagePerAppointment = appointments.length > 0 ? totalRevenue / appointments.length : 0;

        patientDetailsData.push(['RESUMEN DEL PERÍODO']);
        patientDetailsData.push([]);
        patientDetailsData.push(['Total de Citas:', appointments.length]);
        patientDetailsData.push(['Ingresos Totales:', totalRevenue]);
        patientDetailsData.push(['Pagos Pendientes:', totalPending]);
        patientDetailsData.push(['Total General:', grandTotal]);
        patientDetailsData.push([]);
        patientDetailsData.push(['Promedio por Cita:', averagePerAppointment]);

        const wsPatients = XLSX.utils.aoa_to_sheet(patientDetailsData);
        XLSX.utils.book_append_sheet(wb, wsPatients, 'Detalle por Paciente');

        // Appointments details sheet
        const appointmentsData = [
            ['Fecha Cita', 'Hora', 'Paciente', 'Tipo', 'Monto', 'Estado Pago', 'Método', 'Fecha de Pago']
        ];

        for (const apt of appointments) {
            const patient = await Storage.getPatientById(apt.patientId);
            const [year, month, day] = apt.date.split('-').map(Number);
            const date = new Date(year, month - 1, day);

            let paidDateFormatted = '-';
            if (apt.paidDate) {
                const [pYear, pMonth, pDay] = apt.paidDate.split('-').map(Number);
                const paidDate = new Date(pYear, pMonth - 1, pDay);
                paidDateFormatted = paidDate.toLocaleDateString('es-ES');
            }

            appointmentsData.push([
                date.toLocaleDateString('es-ES'),
                apt.time,
                `${patient.firstname} ${patient.lastname}`,
                apt.type,
                apt.amount,
                apt.paymentStatus === 'pendiente' ? 'Pendiente' : 'Pagado',
                apt.paymentStatus === 'pendiente' ? '-' : apt.paymentStatus,
                paidDateFormatted
            ]);
        }

        const wsAppointments = XLSX.utils.aoa_to_sheet(appointmentsData);
        XLSX.utils.book_append_sheet(wb, wsAppointments, 'Todas las Citas');

        // Generate Excel file
        const fileName = `Reporte_${periodLabel.replace(/\s/g, '_').replace(/\//g, '-')}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showToast('Reporte exportado exitosamente', 'success');
    }
}

export default Reports;
