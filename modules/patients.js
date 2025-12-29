// Patients Module - Manages patient data and UI

import Storage from './storage.js';
import { showToast } from '../app.js';

class Patients {
    static init() {
        this.setupEventListeners();
        this.renderPatientsList().catch(err => console.error('Error rendering patients:', err));
    }

    static setupEventListeners() {
        // Add patient button
        document.getElementById('add-patient-btn').addEventListener('click', () => {
            this.openPatientModal();
        });

        // Close modal buttons
        document.getElementById('close-patient-modal').addEventListener('click', () => {
            this.closePatientModal();
        });

        document.getElementById('cancel-patient-btn').addEventListener('click', () => {
            this.closePatientModal();
        });

        // Patient form submission
        document.getElementById('patient-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePatient();
        });

        // Search functionality
        document.getElementById('patient-search').addEventListener('input', (e) => {
            this.searchPatients(e.target.value);
        });

        // Patient type change to show/hide connection location
        document.getElementById('patient-type').addEventListener('change', (e) => {
            const connectionGroup = document.getElementById('connection-location-group');
            if (e.target.value === 'virtual' || e.target.value === 'ambos') {
                connectionGroup.style.display = 'block';
            } else {
                connectionGroup.style.display = 'none';
            }
        });
    }

    static async openPatientModal(patientId = null) {
        const modal = document.getElementById('patient-modal');
        const form = document.getElementById('patient-form');
        const title = document.getElementById('patient-modal-title');

        form.reset();
        document.getElementById('connection-location-group').style.display = 'none';

        if (patientId) {
            const patient = await Storage.getPatientById(patientId);
            if (patient) {
                title.textContent = 'Editar Paciente';
                document.getElementById('patient-id').value = patient.id;
                document.getElementById('patient-firstname').value = patient.firstname;
                document.getElementById('patient-lastname').value = patient.lastname;
                document.getElementById('patient-email').value = patient.email || '';
                document.getElementById('patient-phone').value = patient.phone || '';
                document.getElementById('patient-startdate').value = patient.startDate;
                document.getElementById('patient-origin').value = patient.origin || '';
                document.getElementById('patient-type').value = patient.preferredType;
                document.getElementById('patient-connection').value = patient.connectionLocation || '';

                if (patient.preferredType === 'virtual' || patient.preferredType === 'ambos') {
                    document.getElementById('connection-location-group').style.display = 'block';
                }
            }
        } else {
            title.textContent = 'Nuevo Paciente';
            document.getElementById('patient-id').value = '';
        }

        modal.classList.add('active');
    }

    static closePatientModal() {
        const modal = document.getElementById('patient-modal');
        modal.classList.remove('active');
    }

    static async savePatient() {
        const id = document.getElementById('patient-id').value;
        const patientData = {
            firstname: document.getElementById('patient-firstname').value.trim(),
            lastname: document.getElementById('patient-lastname').value.trim(),
            email: document.getElementById('patient-email').value.trim(),
            phone: document.getElementById('patient-phone').value.trim(),
            startDate: document.getElementById('patient-startdate').value,
            origin: document.getElementById('patient-origin').value.trim(),
            preferredType: document.getElementById('patient-type').value,
            connectionLocation: document.getElementById('patient-connection').value.trim()
        };

        try {
            if (id) {
                await Storage.updatePatient(id, patientData);
                showToast('Paciente actualizado exitosamente', 'success');
            } else {
                await Storage.addPatient(patientData);
                showToast('Paciente agregado exitosamente', 'success');
            }

            this.closePatientModal();
            await this.renderPatientsList();

            // Update appointment patient select if on appointments section
            import('./appointments.js').then(async module => {
                await module.default.updatePatientSelect();
            });
        } catch (error) {
            console.error('Error guardando paciente:', error);
            showToast('Error al guardar paciente: ' + error.message, 'error');
        }
    }

    static async deletePatient(id) {
        if (confirm('¿Estás seguro de que deseas eliminar este paciente? Esto también eliminará todas sus citas.')) {
            try {
                await Storage.deletePatient(id);
                showToast('Paciente eliminado exitosamente', 'success');
                await this.renderPatientsList();
            } catch (error) {
                console.error('Error eliminando paciente:', error);
                showToast('Error al eliminar paciente', 'error');
            }
        }
    }

    static async searchPatients(query) {
        const patients = await Storage.getPatients();
        const filtered = patients.filter(p => {
            const fullName = `${p.firstname} ${p.lastname}`.toLowerCase();
            return fullName.includes(query.toLowerCase());
        });
        await this.renderPatientsList(filtered);
    }

    static async renderPatientsList(patients = null) {
        const container = document.getElementById('patients-list');
        const patientsData = patients || await Storage.getPatients();

        if (patientsData.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay pacientes registrados</p>';
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Nombre Completo</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Fecha Inicio</th>
                        <th>Tipo Preferido</th>
                        <th>Estado Financiero</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
        `;

        for (const patient of patientsData) {
            const appointments = await Storage.getAppointmentsByPatient(patient.id);
            const debt = this.calculatePatientDebt(appointments);
            const debtDisplay = debt > 0 ? `$${debt.toLocaleString()}` : 'Al día';
            const debtClass = debt > 0 ? 'color: var(--error);' : 'color: var(--success);';

            html += `
                <tr>
                    <td><strong>${patient.firstname} ${patient.lastname}</strong></td>
                    <td>${patient.email || '-'}</td>
                    <td>${patient.phone || '-'}</td>
                    <td>${new Date(patient.startDate).toLocaleDateString('es-ES')}</td>
                    <td><span class="appointment-badge badge-${patient.preferredType}">${patient.preferredType}</span></td>
                    <td style="${debtClass}"><strong>${debtDisplay}</strong></td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-sm btn-secondary" onclick="window.patientsModule.openPatientModal('${patient.id}')">
                                Editar
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="window.patientsModule.deletePatient('${patient.id}')">
                                Eliminar
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }

        html += '</tbody></table>';
        container.innerHTML = html;
    }

    static calculatePatientDebt(appointments) {
        return appointments.reduce((total, apt) => {
            if (apt.paymentStatus === 'pendiente') {
                return total + (apt.amount || 0);
            }
            return total;
        }, 0);
    }

    static async getPatientDebtInfo(patientId) {
        const appointments = await Storage.getAppointmentsByPatient(patientId);
        const debt = this.calculatePatientDebt(appointments);
        const pendingAppointments = appointments.filter(a => a.paymentStatus === 'pendiente');
        return {
            debt,
            pendingCount: pendingAppointments.length,
            appointments: pendingAppointments
        };
    }
}

export default Patients;
