// Storage Module - Handles all data storage operations
// Uses Google Drive as primary storage with localStorage as cache

import GoogleDriveStorage from './google-drive-storage.js';

const STORAGE_KEYS = {
    PATIENTS: 'mindcare_patients',
    APPOINTMENTS: 'mindcare_appointments',
    SETTINGS: 'mindcare_settings'
};

class Storage {
    // Patients
    static async getPatients() {
        try {
            // Intentar cargar desde Drive
            const data = await GoogleDriveStorage.loadData('patients.json');
            // Actualizar caché local
            localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(data));
            return data;
        } catch (error) {
            console.log('Usando caché local de pacientes:', error);
            // Fallback a localStorage
            const cached = localStorage.getItem(STORAGE_KEYS.PATIENTS);
            return cached ? JSON.parse(cached) : [];
        }
    }

    static async savePatients(patients) {
        try {
            // Guardar en Drive primero
            await GoogleDriveStorage.saveData('patients.json', patients);
            // Actualizar caché local
            localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
        } catch (error) {
            console.error('Error guardando pacientes en Drive:', error);
            // Al menos guardar en caché local
            localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
            throw error;
        }
    }

    static async addPatient(patient) {
        const patients = await this.getPatients();
        patient.id = this.generateId();
        patient.createdAt = new Date().toISOString();
        patients.push(patient);
        await this.savePatients(patients);
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
        try {
            // Intentar cargar desde Drive
            const data = await GoogleDriveStorage.loadData('appointments.json');
            // Actualizar caché local
            localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(data));
            return data;
        } catch (error) {
            console.log('Usando caché local de citas:', error);
            // Fallback a localStorage
            const cached = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
            return cached ? JSON.parse(cached) : [];
        }
    }

    static async saveAppointments(appointments) {
        try {
            // Guardar en Drive primero
            await GoogleDriveStorage.saveData('appointments.json', appointments);
            // Actualizar caché local
            localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
        } catch (error) {
            console.error('Error guardando citas en Drive:', error);
            // Al menos guardar en caché local
            localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
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
}

export default Storage;
