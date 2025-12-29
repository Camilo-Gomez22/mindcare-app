// Main App Module - Coordinates all modules and manages UI

import Storage from './modules/storage.js';
import Patients from './modules/patients.js';
import Appointments from './modules/appointments.js';
import Payments from './modules/payments.js';
import Reports from './modules/reports.js';
import GoogleCalendarAPI from './modules/google-calendar-api.js';
import GoogleDriveStorage from './modules/google-drive-storage.js';

class App {
    static async init() {
        console.log('Inicializando MindCare...');

        // Initialize Google Calendar API
        await this.initGoogleCalendar();

        // Initialize modules
        Patients.init();
        Appointments.init();
        Payments.init();
        Reports.init();

        // Setup navigation
        this.setupNavigation();

        // Update dashboard
        await this.updateDashboard();

        // Make modules globally available for onclick handlers
        window.patientsModule = Patients;
        window.appointmentsModule = Appointments;
        window.paymentsModule = Payments;
        window.reportsModule = Reports;

        console.log('MindCare iniciado exitosamente');
    }

    static async initGoogleCalendar() {
        try {
            await GoogleCalendarAPI.init();

            // Setup event listeners for Google auth buttons in header
            const signInBtn = document.getElementById('google-signin-btn');
            const signOutBtn = document.getElementById('google-signout-btn');

            // Setup event listener for login screen button
            const loginScreenBtn = document.getElementById('google-signin-btn-login');

            if (signInBtn) {
                signInBtn.style.display = 'block';
                signInBtn.addEventListener('click', async () => {
                    await GoogleCalendarAPI.signIn();
                });
            }

            if (loginScreenBtn) {
                loginScreenBtn.addEventListener('click', async () => {
                    await GoogleCalendarAPI.signIn();
                });
            }

            if (signOutBtn) {
                signOutBtn.addEventListener('click', () => {
                    GoogleCalendarAPI.signOut();
                });
            }

            // Check and migrate data if needed
            await this.checkAndMigrateData();

        } catch (error) {
            console.log('Google Calendar API no disponible:', error);
            // La aplicación funciona sin Google Calendar API
        }
    }

    static async checkAndMigrateData() {
        const migrated = localStorage.getItem('drive_migrated');
        if (!migrated && GoogleCalendarAPI.isSignedIn) {
            try {
                console.log('🔄 Migrando datos a Drive...');
                await this.migrateToDriver();
                localStorage.setItem('drive_migrated', 'true');
                console.log('✅ Migración completada');
            } catch (error) {
                console.error('Error durante migración:', error);
            }
        }
    }

    static async migrateToDriver() {
        // Leer datos de localStorage
        const patientsData = localStorage.getItem('mindcare_patients');
        const appointmentsData = localStorage.getItem('mindcare_appointments');

        if (patientsData || appointmentsData) {
            // Inicializar Drive folder
            await GoogleDriveStorage.initDriveFolder();

            // Migrar pacientes si existen
            if (patientsData) {
                const patients = JSON.parse(patientsData);
                if (patients.length > 0) {
                    await GoogleDriveStorage.saveData('patients.json', patients);
                    console.log(`Migrados ${patients.length} pacientes`);
                }
            }

            // Migrar citas si existen
            if (appointmentsData) {
                const appointments = JSON.parse(appointmentsData);
                if (appointments.length > 0) {
                    await GoogleDriveStorage.saveData('appointments.json', appointments);
                    console.log(`Migradas ${appointments.length} citas`);
                }
            }
        }
    }

    static setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');

        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const sectionName = btn.dataset.section;
                this.navigateToSection(sectionName);

                // Update active nav button
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    static navigateToSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update data when switching sections
        switch (sectionName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'patients':
                Patients.renderPatientsList();
                break;
            case 'appointments':
                Appointments.renderAppointmentsList();
                break;
            case 'payments':
                Payments.renderPaymentsList();
                break;
            case 'reports':
                // Reports are generated on demand
                break;
        }
    }

    static async updateDashboard() {
        const patients = await Storage.getPatients();
        const appointments = await Storage.getAppointments();

        // Update stats
        document.getElementById('total-patients').textContent = patients.length;

        // Appointments this week
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + 7);

        const appointmentsThisWeek = appointments.filter(a => {
            const aptDate = new Date(a.date);
            return aptDate >= today && aptDate <= weekEnd;
        });
        document.getElementById('appointments-this-week').textContent = appointmentsThisWeek.length;

        // Revenue this month
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

        const appointmentsThisMonth = appointments.filter(a => {
            const aptDate = new Date(a.date);
            return aptDate >= monthStart && aptDate <= monthEnd;
        });

        const revenue = appointmentsThisMonth.reduce((sum, apt) => {
            if (apt.paymentStatus !== 'pendiente') {
                return sum + (apt.amount || 0);
            }
            return sum;
        }, 0);
        document.getElementById('revenue-this-month').textContent = `$${revenue.toLocaleString()}`;

        // Pending payments
        const pendingPayments = appointments.reduce((sum, apt) => {
            if (apt.paymentStatus === 'pendiente') {
                return sum + (apt.amount || 0);
            }
            return sum;
        }, 0);
        document.getElementById('pending-payments').textContent = `$${pendingPayments.toLocaleString()}`;

        // Update upcoming appointments
        this.updateUpcomingAppointments();

        // Update pending payments list
        this.updatePendingPaymentsList();
    }

    static async updateUpcomingAppointments() {
        const container = document.getElementById('upcoming-appointments');
        const appointments = await Storage.getAppointments();

        // Get next 5 upcoming appointments
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcoming = appointments
            .filter(a => new Date(a.date) >= today)
            .sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateA - dateB;
            })
            .slice(0, 5);

        if (upcoming.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay citas programadas</p>';
            return;
        }

        let html = '';
        for (const apt of upcoming) {
            const patient = await Storage.getPatientById(apt.patientId);
            if (!patient) continue;

            const date = new Date(apt.date);
            const formattedDate = date.toLocaleDateString('es-ES', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });

            html += `
                <div class="list-item">
                    <div class="list-item-info">
                        <h4>${patient.firstname} ${patient.lastname}</h4>
                        <p>${formattedDate} a las ${apt.time} - ${apt.type}</p>
                    </div>
                    <span class="appointment-badge badge-${apt.type}">${apt.type}</span>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    static async updatePendingPaymentsList() {
        const container = document.getElementById('pending-payments-list');
        const appointments = await Storage.getAppointments();

        // Get pending payments
        const pending = appointments
            .filter(a => a.paymentStatus === 'pendiente')
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5);

        if (pending.length === 0) {
            container.innerHTML = '<p class="empty-state">No hay pagos pendientes</p>';
            return;
        }

        let html = '';
        for (const apt of pending) {
            const patient = await Storage.getPatientById(apt.patientId);
            if (!patient) continue;

            const date = new Date(apt.date);
            const formattedDate = date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short'
            });

            html += `
                <div class="list-item">
                    <div class="list-item-info">
                        <h4>${patient.firstname} ${patient.lastname}</h4>
                        <p>${formattedDate} - $${apt.amount.toLocaleString()}</p>
                    </div>
                    <span class="appointment-badge badge-pending">Pendiente</span>
                </div>
            `;
        }

        container.innerHTML = html;
    }
}

// Toast notification function
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast';
    if (type) {
        toast.classList.add(type);
    }
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Export updateDashboard for use in other modules
export async function updateDashboard() {
    await App.updateDashboard();
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
