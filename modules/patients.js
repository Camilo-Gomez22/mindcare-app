// Patients Module - Manages patient data and UI

import Storage from './storage.js';
import { showToast } from '../app.js';

class Patients {
    static isSaving = false; // Flag to prevent double-submit
    static listenersInitialized = false; // Flag to prevent duplicate event listeners

    static init() {
        if (!this.listenersInitialized) {
            this.setupEventListeners();
            this.listenersInitialized = true;
        }
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
        // Prevent double-submit
        if (this.isSaving) {
            console.warn('⚠️ Guardado ya en proceso, ignorando submit duplicado');
            return;
        }

        const saveBtn = document.querySelector('#patient-form button[type="submit"]');
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
            // Set saving flag and disable button
            this.isSaving = true;
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Guardando...';
            }

            if (id) {
                console.log('📝 Actualizando paciente:', id);
                await Storage.updatePatient(id, patientData);
                showToast('Paciente actualizado exitosamente', 'success');
            } else {
                console.log('✨ Creando nuevo paciente:', patientData);
                const created = await Storage.addPatient(patientData);
                console.log('✅ Paciente creado con ID:', created.id);
                showToast('Paciente agregado exitosamente', 'success');
            }

            this.closePatientModal();
            await this.renderPatientsList();

            // Update appointment patient select if on appointments section
            import('./appointments.js').then(async module => {
                await module.default.updatePatientSelect();
            });
        } catch (error) {
            console.error('❌ Error guardando paciente:', error);
            showToast('Error al guardar paciente: ' + error.message, 'error');
        } finally {
            // Reset flag and button state
            this.isSaving = false;
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Guardar Paciente';
            }
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

        // Detect if we're on mobile
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // Mobile view: render as cards
            let html = '<div class="patients-card-grid">';

            for (const patient of patientsData) {
                const appointments = await Storage.getAppointmentsByPatient(patient.id);
                const debt = this.calculatePatientDebt(appointments);
                const debtDisplay = debt > 0 ? `$${debt.toLocaleString()}` : 'Al día';
                const debtClass = debt > 0 ? 'debt' : 'no-debt';

                html += `
                    <div class="patient-card">
                        <div class="patient-card-header">
                            <h3>${patient.firstname} ${patient.lastname}</h3>
                            <span class="appointment-badge badge-${patient.preferredType}">${patient.preferredType}</span>
                        </div>
                        <div class="patient-card-body">
                            <div class="patient-card-info">
                                <span class="info-label">📧 Email:</span>
                                <span class="info-value">${patient.email || '-'}</span>
                            </div>
                            <div class="patient-card-info">
                                <span class="info-label">📱 Teléfono:</span>
                                <span class="info-value">${patient.phone || '-'}</span>
                            </div>
                            <div class="patient-card-info">
                                <span class="info-label">📅 Inicio:</span>
                                <span class="info-value">${(() => {
                        const [year, month, day] = patient.startDate.split('-').map(Number);
                        const localDate = new Date(year, month - 1, day);
                        return localDate.toLocaleDateString('es-ES');
                    })()}</span>
                            </div>
                            <div class="patient-card-info">
                                <span class="info-label">💰 Estado:</span>
                                <span class="info-value ${debtClass}"><strong>${debtDisplay}</strong></span>
                            </div>
                        </div>
                        <div class="patient-card-actions">
                            <button class="btn btn-sm btn-secondary" onclick="window.patientsModule.openPatientModal('${patient.id}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Editar
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="window.patientsModule.deletePatient('${patient.id}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Eliminar
                            </button>
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
                        <td>${(() => {
                        const [year, month, day] = patient.startDate.split('-').map(Number);
                        const localDate = new Date(year, month - 1, day);
                        return localDate.toLocaleDateString('es-ES');
                    })()}</td>
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
