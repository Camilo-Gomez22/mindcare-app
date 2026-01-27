// Main App Module - Coordinates all modules and manages UI

import Storage from './modules/storage.js';
import Patients from './modules/patients.js';
import Appointments from './modules/appointments.js';
import Payments from './modules/payments.js';
import Reports from './modules/reports.js';
import Reminders from './modules/reminders.js';
import GoogleCalendarAPI from './modules/google-calendar-api.js';
import Settings from './modules/settings.js';

class App {
    static async init() {
        console.log('Inicializando MindCare v2.3 (Autenticación segura)...');

        // Initialize Google Calendar API and wait for auth check
        const isAuthenticated = await this.initGoogleCalendar();

        if (isAuthenticated) {
            // Only initialize modules if authenticated
            await this.initModules();
            console.log('MindCare iniciado exitosamente');
        } else {
            console.log('Esperando autenticación del usuario...');
            // Wait for user to sign in
            window.addEventListener('google-signin-success', async () => {
                await this.initModules();
                console.log('MindCare iniciado después de login');
            }, { once: true });
        }

        // Setup session monitoring regardless of auth status
        this.setupSessionMonitoring();
    }

    static async initModules() {
        console.log('Inicializando módulos...');

        // Initialize modules
        Patients.init();
        Appointments.init();
        Payments.init();
        Reports.init();
        Reminders.init();
        await Settings.init();

        // Setup navigation
        this.setupNavigation();

        // Update dashboard
        await this.updateDashboard();

        // Make modules globally available for onclick handlers
        window.patientsModule = Patients;
        window.appointmentsModule = Appointments;
        window.paymentsModule = Payments;
        window.reportsModule = Reports;
        window.remindersModule = Reminders;
    }

    static async initGoogleCalendar() {
        try {
            const isAuthenticated = await GoogleCalendarAPI.init();

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
                    // Reload page to reset state
                    window.location.reload();
                });
            }

            // Check and migrate data if needed (only if authenticated)
            if (isAuthenticated) {
                await this.checkAndMigrateData();
            }

            // Setup sync status listener
            this.setupSyncListener();

            return isAuthenticated;

        } catch (error) {
            console.log('Google Calendar API no disponible:', error);
            // La aplicación funciona sin Google Calendar API
            return false;
        }
    }

    static setupSyncListener() {
        window.addEventListener('syncStatusChange', (e) => {
            const syncIndicator = document.getElementById('sync-indicator');
            const syncText = syncIndicator?.querySelector('.sync-text');

            if (!syncIndicator) return;

            if (e.detail.status === 'syncing') {
                syncIndicator.classList.add('syncing');
                if (syncText) syncText.textContent = 'Sincronizando...';
            } else if (e.detail.status === 'synced') {
                syncIndicator.classList.remove('syncing');
                if (syncText) syncText.textContent = 'Sincronizado';
            }

            // Show sync indicator when logged in
            if (GoogleCalendarAPI.isSignedIn) {
                syncIndicator.style.display = 'flex';
            }
        });

        // Listen for login success to refresh data
        window.addEventListener('google-signin-success', async () => {
            console.log('Login exitoso detectado, recargando datos...');
            Storage.clearCache();
            await App.updateDashboard();
            if (window.patientsModule) await patientsModule.renderPatientsList();
            if (window.appointmentsModule) await appointmentsModule.renderAppointmentsList();
            if (window.reportsModule) await reportsModule.generateReport();
        });
    }

    static setupSessionMonitoring() {
        // Check session validity every 5 minutes
        setInterval(() => {
            if (GoogleCalendarAPI.isSignedIn && !GoogleCalendarAPI.isTokenValid()) {
                console.log('⚠️ Token expiró, intentando re-autenticación...');
                GoogleCalendarAPI.reAuthenticate();
            }
        }, 5 * 60 * 1000); // 5 minutes
        console.log('✅ Monitoreo de sesión activado (cada 5 min)');
    }

    static async checkAndMigrateData() {
        // Migration logic disabled - data is automatically stored in Google Drive
        console.log('✅ Using modern Google Drive storage');
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
            case 'reminders':
                Reminders.renderRemindersList();
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

        // Make Total Pacientes stat-card clickable
        this.setupDashboardStatCards();
    }

    static setupDashboardStatCards() {
        // Find the first stat-card in dashboard section (Total Pacientes)
        const dashboardStatCards = document.querySelectorAll('#dashboard-section .stat-card');
        if (dashboardStatCards.length > 0) {
            const patientsCard = dashboardStatCards[0]; // First card is Total Pacientes
            patientsCard.classList.add('clickable');
            patientsCard.style.cursor = 'pointer';
            patientsCard.title = 'Click para ir a Pacientes';

            // Remove any existing click listener to avoid duplicates
            const newCard = patientsCard.cloneNode(true);
            patientsCard.parentNode.replaceChild(newCard, patientsCard);

            // Add click listener
            newCard.addEventListener('click', () => {
                this.navigateToSection('patients');

                // Update active nav button
                const navButtons = document.querySelectorAll('.nav-btn');
                navButtons.forEach(b => b.classList.remove('active'));
                const patientsNavBtn = document.querySelector('.nav-btn[data-section="patients"]');
                if (patientsNavBtn) patientsNavBtn.classList.add('active');
            });
        }
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

            // Fix timezone issue by ensuring date is parsed as local time
            const date = new Date(apt.date + 'T00:00:00');
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

            // Fix timezone issue by ensuring date is parsed as local time
            const date = new Date(apt.date + 'T00:00:00');
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
