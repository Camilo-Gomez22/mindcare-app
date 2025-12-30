// Settings Module - Manage app configuration

import Storage from './storage.js';
import { showToast } from '../app.js';

class Settings {
    static async init() {
        this.setupEventListeners();
        await this.loadSettings();
    }

    static setupEventListeners() {
        // Settings button (we'll add this to the header)
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettingsDialog());
        }
    }

    static async loadSettings() {
        try {
            const settings = await Storage.getSettings();
            this.currentSettings = settings;
        } catch (error) {
            console.error('Error cargando configuración:', error);
            // Default settings con la dirección del consultorio
            this.currentSettings = {
                officeAddress: 'Cra 46 #70s-34, interior 201, Sabaneta',
                officeMapLink: 'https://maps.app.goo.gl/CWmNzMLhkRPvP5vh6'
            };
        }
    }

    static async openSettingsDialog() {
        const currentAddress = this.currentSettings.officeAddress || 'Cra 46 #70s-34, interior 201, Sabaneta';
        const currentMapLink = this.currentSettings.officeMapLink || 'https://maps.app.goo.gl/CWmNzMLhkRPvP5vh6';

        const newAddress = prompt(
            'Dirección del consultorio (para citas presenciales):\n\n' +
            'Esta dirección aparecerá en las invitaciones de Google Calendar.\n' +
            'Se guarda de forma privada en tu Google Drive.',
            currentAddress
        );

        if (newAddress !== null) {
            const newMapLink = prompt(
                'Link de Google Maps (opcional):\n\n' +
                'Los pacientes podrán hacer clic para ver la ubicación.',
                currentMapLink
            );

            if (newMapLink !== null) {
                await this.saveSettings({
                    officeAddress: newAddress.trim(),
                    officeMapLink: newMapLink.trim()
                });
            }
        }
    }

    static async saveSettings(settings) {
        try {
            await Storage.saveSettings(settings);
            this.currentSettings = settings;
            showToast('Configuración guardada exitosamente', 'success');
        } catch (error) {
            console.error('Error guardando configuración:', error);
            showToast('Error al guardar la configuración', 'error');
        }
    }

    static getOfficeLocation() {
        const address = this.currentSettings?.officeAddress || 'Cra 46 #70s-34, interior 201, Sabaneta';
        const mapLink = this.currentSettings?.officeMapLink || 'https://maps.app.goo.gl/CWmNzMLhkRPvP5vh6';

        // Combinar dirección y link para Google Calendar
        return `${address}\n${mapLink}`;
    }
}

Settings.currentSettings = { officeAddress: '' };

export default Settings;
