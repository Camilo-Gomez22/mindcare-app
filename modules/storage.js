// Storage Module - Handles all data storage operations
// Uses Google Drive as primary storage with localStorage as cache

import GoogleDriveStorage from './google-drive-storage.js';
import GoogleCalendarAPI from './google-calendar-api.js';
import { showToast } from '../app.js';

const STORAGE_KEYS = {
    PATIENTS: 'mindcare_patients',
    APPOINTMENTS: 'mindcare_appointments',
    SETTINGS: 'mindcare_settings'
};

class Storage {
    // In-memory cache for instant reads
    static cache = {
        patients: null,
        appointments: null,
        settings: null,
        lastSync: {}
    };

    static syncQueue = [];
    static isSyncing = false;

    // Validate authentication before critical operations
    static async ensureAuthenticated() {
        if (!GoogleCalendarAPI.isSignedIn) {
            showToast('Debes iniciar sesión para guardar cambios', 'error');
            GoogleCalendarAPI.forceLogout();
            throw new Error('NO_AUTH');
        }

        // Check if token is valid
        if (!GoogleCalendarAPI.isTokenValid()) {
            // Try to re-authenticate
            const success = await GoogleCalendarAPI.reAuthenticate();
            if (!success) {
                showToast('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
                throw new Error('AUTH_EXPIRED');
            }
        }
        return true;
    }

    // Clear in-memory cache to force reload from Drive
    static clearCache() {
        this.cache = {
            patients: null,
            appointments: null,
            settings: null,
            lastSync: {}
        };
        console.log('Caché en memoria limpiada');
    }

    // Patients
    static async getPatients() {
        // Return from memory cache if available
        if (this.cache.patients !== null) {
            return this.cache.patients;
        }

        try {
            // Load from Drive
            const data = await GoogleDriveStorage.loadData('patients.json');
            // Update cache
            this.cache.patients = data;
            localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(data));
            return data;
        } catch (error) {
            console.log('Usando caché local de pacientes:', error);
            // Fallback to localStorage
            const cached = localStorage.getItem(STORAGE_KEYS.PATIENTS);
            const data = cached ? JSON.parse(cached) : [];
            this.cache.patients = data;
            return data;
        }
    }

    static async savePatients(patients) {
        try {
            // Validate authentication before saving
            await this.ensureAuthenticated();

            // Update memory cache immediately for instant UI response
            this.cache.patients = patients;
            localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));

            // Queue background sync to Drive
            this.queueSync('patients', patients);
            return patients;
        } catch (error) {
            if (error.message === 'NO_AUTH' || error.message === 'AUTH_EXPIRED') {
                // Error already shown by ensureAuthenticated
                throw error;
            }
            console.error('Error guardando pacientes:', error);
            throw error;
        }
    }

    static async addPatient(patient) {
        const patients = await this.getPatients();

        // Extra safeguard: Check for potential duplicates by name and phone
        const isDuplicate = patients.some(p =>
            p.firstname === patient.firstname &&
            p.lastname === patient.lastname &&
            p.phone === patient.phone &&
            p.startDate === patient.startDate
        );

        if (isDuplicate) {
            console.warn('⚠️ Paciente potencialmente duplicado detectado, abortando creación');
            throw new Error('Ya existe un paciente con el mismo nombre, teléfono y fecha de inicio');
        }

        patient.id = this.generateId();
        patient.createdAt = new Date().toISOString();
        patients.push(patient);
        await this.savePatients(patients);
        console.log('💾 Paciente guardado en Storage con ID:', patient.id);
        return patient;
    }

    static async updatePatient(id, updatedData) {
        const patients = await this.getPatients();
        const index = patients.findIndex(p => p.id === id);
        if (index !== -1) {
            patients[index] = { ...patients[index], ...updatedData, updatedAt: new Date().toISOString() };
            await this.savePatients(patients);
            return patients[index];
        }
        return null;
    }

    static async deletePatient(id) {
        const patients = await this.getPatients();
        const filtered = patients.filter(p => p.id !== id);
        await this.savePatients(filtered);

        // Also delete related appointments
        const appointments = await this.getAppointments();
        const filteredAppointments = appointments.filter(a => a.patientId !== id);
        await this.saveAppointments(filteredAppointments);
    }

    static async getPatientById(id) {
        const patients = await this.getPatients();
        return patients.find(p => p.id === id);
    }

    // Appointments
    static async getAppointments() {
        // Return from memory cache if available
        if (this.cache.appointments !== null) {
            return this.cache.appointments;
        }

        try {
            // Load from Drive
            const data = await GoogleDriveStorage.loadData('appointments.json');
            // Update cache
            this.cache.appointments = data;
            localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(data));
            return data;
        } catch (error) {
            console.log('Usando caché local de citas:', error);
            // Fallback to localStorage
            const cached = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
            const data = cached ? JSON.parse(cached) : [];
            this.cache.appointments = data;
            return data;
        }
    }

    static async saveAppointments(appointments) {
        try {
            // Validate authentication before saving
            await this.ensureAuthenticated();

            // Update memory cache immediately for instant UI response
            this.cache.appointments = appointments;
            localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));

            // Queue background sync to Drive
            this.queueSync('appointments', appointments);
            return appointments;
        } catch (error) {
            if (error.message === 'NO_AUTH' || error.message === 'AUTH_EXPIRED') {
                // Error already shown by ensureAuthenticated
                throw error;
            }
            console.error('Error guardando citas:', error);
            throw error;
        }
    }

    static async addAppointment(appointment) {
        const appointments = await this.getAppointments();
        appointment.id = this.generateId();
        appointment.createdAt = new Date().toISOString();
        appointments.push(appointment);
        await this.saveAppointments(appointments);
        return appointment;
    }

    static async updateAppointment(id, updatedData) {
        const appointments = await this.getAppointments();
        const index = appointments.findIndex(a => a.id === id);
        if (index !== -1) {
            appointments[index] = { ...appointments[index], ...updatedData, updatedAt: new Date().toISOString() };
            await this.saveAppointments(appointments);
            return appointments[index];
        }
        return null;
    }

    static async deleteAppointment(id) {
        const appointments = await this.getAppointments();
        const filtered = appointments.filter(a => a.id !== id);
        await this.saveAppointments(filtered);
    }

    static async getAppointmentById(id) {
        const appointments = await this.getAppointments();
        return appointments.find(a => a.id === id);
    }

    static async getAppointmentsByPatient(patientId) {
        const appointments = await this.getAppointments();
        return appointments.filter(a => a.patientId === patientId);
    }

    static async getAppointmentsByDateRange(startDate, endDate) {
        const appointments = await this.getAppointments();
        return appointments.filter(a => {
            const appointmentDate = new Date(a.date);
            return appointmentDate >= startDate && appointmentDate <= endDate;
        });
    }

    // Data migration: Add paidDate to existing paid appointments
    static async migratePaidDates() {
        const appointments = await this.getAppointments();
        let migrationCount = 0;

        for (const apt of appointments) {
            // If appointment is paid but doesn't have a paidDate, set it to the appointment date
            if (apt.paymentStatus !== 'pendiente' && !apt.paidDate) {
                apt.paidDate = apt.date; // Use appointment date as payment date
                migrationCount++;
            }
        }

        if (migrationCount > 0) {
            await this.saveAppointments(appointments);
            console.log(`✅ Migrated ${migrationCount} paid appointments with paidDate`);
            return migrationCount;
        }

        console.log('✅ No appointments needed migration');
        return 0;
    }

    // Utility
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Settings management
    static async getSettings() {
        try {
            const data = await GoogleDriveStorage.loadData('settings.json');
            const localData = localStorage.getItem(STORAGE_KEYS.SETTINGS);

            // Defaults
            const defaults = {
                officeAddress: 'Cra 46 #70s-34, interior 201, Sabaneta',
                officeMapLink: 'https://maps.app.goo.gl/CWmNzMLhkRPvP5vh6'
            };

            // Retornar datos de Drive o fallback a localStorage o defaults
            return data && data.officeAddress ? data : (localData ? JSON.parse(localData) : defaults);
        } catch (error) {
            console.error('Error cargando settings:', error);
            const localData = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return localData ? JSON.parse(localData) : {
                officeAddress: 'Cra 46 #70s-34, interior 201, Sabaneta',
                officeMapLink: 'https://maps.app.goo.gl/CWmNzMLhkRPvP5vh6'
            };
        }
    }

    static async saveSettings(settings) {
        try {
            await GoogleDriveStorage.saveData('settings.json', settings);
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error guardando settings:', error);
            // Fallback to localStorage only
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
            throw error;
        }
    }

    // Backup & Restore
    static async exportAllData() {
        return {
            patients: await this.getPatients(),
            appointments: await this.getAppointments(),
            exportDate: new Date().toISOString()
        };
    }

    static async importAllData(data) {
        if (data.patients) await this.savePatients(data.patients);
        if (data.appointments) await this.saveAppointments(data.appointments);
    }

    static clearAllData() {
        localStorage.removeItem(STORAGE_KEYS.PATIENTS);
        localStorage.removeItem(STORAGE_KEYS.APPOINTMENTS);
    }

    // Background sync methods
    static queueSync(type, data) {
        this.syncQueue.push({ type, data, timestamp: Date.now() });
        this.processSyncQueue();
    }

    static async processSyncQueue() {
        if (this.isSyncing || this.syncQueue.length === 0) return;

        this.isSyncing = true;
        this.updateSyncStatus('syncing');

        while (this.syncQueue.length > 0) {
            const item = this.syncQueue.shift();
            try {
                const filename = item.type === 'patients' ? 'patients.json' :
                    item.type === 'appointments' ? 'appointments.json' :
                        'settings.json';

                await GoogleDriveStorage.saveData(filename, item.data);
                this.cache.lastSync[item.type] = Date.now();
                console.log(`✅ Sincronizado ${item.type} con Drive`);
            } catch (error) {
                console.error(`❌ Error sincronizando ${item.type}:`, error);
                // Re-queue if failed
                this.syncQueue.push(item);
                break;
            }
        }

        this.isSyncing = false;
        this.updateSyncStatus(this.syncQueue.length > 0 ? 'pending' : 'synced');
    }

    static updateSyncStatus(status) {
        const event = new CustomEvent('syncStatusChange', { detail: { status } });
        window.dispatchEvent(event);
    }
}

export default Storage;
