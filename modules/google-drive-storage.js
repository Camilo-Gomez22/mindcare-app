// Google Drive Storage Module
// Handles all Google Drive API operations for data storage

class GoogleDriveStorage {
    static folderId = 'appDataFolder'; // Use Google's special app data folder
    static appFolderName = 'MindCare';

    /**
     * Check if user is authenticated and has a valid token
     */
    static isAuthenticated() {
        return gapi && gapi.client && gapi.client.getToken() && gapi.client.getToken().access_token;
    }

    /**
     * Initialize Drive folder structure (simplified for appDataFolder)
     */
    static async initDriveFolder() {
        try {
            if (!this.isAuthenticated()) {
                console.log('Usuario no autenticado, saltando inicialización de Drive');
                return false;
            }

            // appDataFolder is automatically available, no need to create
            console.log('✅ Drive folder inicializado: appDataFolder');
            return true;
        } catch (error) {
            console.error('Error inicializando Drive folder:', error);
            return false;
        }
    }

    /**
     * Find or create a folder in Drive
     * @param {string} folderName - Name of the folder
     * @param {string} parentId - Parent folder ID (null for root)
     * @returns {string} Folder ID
     */
    static async findOrCreateFolder(folderName, parentId) {
        try {
            // Buscar carpeta existente
            const query = parentId
                ? `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
                : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

            const response = await gapi.client.request({
                path: 'https://www.googleapis.com/drive/v3/files',
                method: 'GET',
                params: {
                    q: query,
                    fields: 'files(id, name)'
                }
            });

            if (response.result.files && response.result.files.length > 0) {
                console.log(`Carpeta '${folderName}' encontrada:`, response.result.files[0].id);
                return response.result.files[0].id;
            }

            // Crear carpeta si no existe
            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            };

            if (parentId) {
                fileMetadata.parents = [parentId];
            }

            const createResponse = await gapi.client.request({
                path: 'https://www.googleapis.com/drive/v3/files',
                method: 'POST',
                body: fileMetadata,
                params: {
                    fields: 'id'
                }
            });

            console.log(`Carpeta '${folderName}' creada:`, createResponse.result.id);
            return createResponse.result.id;

        } catch (error) {
            console.error(`Error buscando/creando carpeta '${folderName}':`, error);
            throw error;
        }
    }

    /**
     * Find file by name in the app folder
     * @param {string} filename - Name of the file
     * @returns {object|null} File object or null
     */
    static async findFileByName(filename) {
        try {
            if (!this.folderId) {
                await this.initDriveFolder();
            }

            // Para appDataFolder, usar espacio especial 'appDataFolder'
            const query = `name='${filename}' and '${this.folderId}' in parents and trashed=false`;

            const response = await gapi.client.request({
                path: 'https://www.googleapis.com/drive/v3/files',
                method: 'GET',
                params: {
                    q: query,
                    spaces: 'appDataFolder',  // Especificar el espacio appDataFolder
                    fields: 'files(id, name, modifiedTime)'
                }
            });

            if (response.result.files && response.result.files.length > 0) {
                return response.result.files[0];
            }

            return null;

        } catch (error) {
            console.error(`Error buscando archivo '${filename}':`, error);
            return null;
        }
    }

    /**
     * Load data from a JSON file in Drive
     * @param {string} filename - Name of the file (e.g., 'patients.json')
     * @returns {any} Parsed JSON data or empty array
     */
    static async loadData(filename) {
        try {
            if (!this.isAuthenticated()) {
                console.log(`No autenticado, no se puede cargar '${filename}' desde Drive`);
                return [];
            }

            const file = await this.findFileByName(filename);

            if (!file) {
                console.log(`Archivo '${filename}' no existe, retornando array vacío`);
                return [];
            }

            // Descargar contenido del archivo
            const response = await gapi.client.request({
                path: `https://www.googleapis.com/drive/v3/files/${file.id}`,
                method: 'GET',
                params: {
                    alt: 'media'
                }
            });

            const data = response.result || response.body;
            console.log(`Datos cargados desde '${filename}':`, data);
            return typeof data === 'string' ? JSON.parse(data) : data;

        } catch (error) {
            console.error(`Error cargando datos de '${filename}':`, error);
            throw error;
        }
    }

    /**
     * Save data to a JSON file in Drive
     * @param {string} filename - Name of the file (e.g., 'patients.json')
     * @param {any} data - Data to save (will be JSON stringified)
     * @returns {boolean} Success status
     */
    static async saveData(filename, data) {
        try {
            if (!this.isAuthenticated()) {
                throw new Error('Usuario no autenticado - no se puede guardar en Drive');
            }

            if (!this.folderId) {
                await this.initDriveFolder();
            }

            const content = JSON.stringify(data, null, 2);
            const file = await this.findFileByName(filename);

            if (file) {
                // Actualizar archivo existente
                await this.updateFile(file.id, content);
                console.log(`Archivo '${filename}' actualizado`);
            } else {
                // Crear nuevo archivo
                await this.createFile(filename, content);
                console.log(`Archivo '${filename}' creado`);
            }

            return true;

        } catch (error) {
            console.error(`Error guardando datos en '${filename}':`, error);
            throw error;
        }
    }

    /**
     * Create a new file in Drive
     * @param {string} filename - Name of the file
     * @param {string} content - File content
     */
    static async createFile(filename, content) {
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const metadata = {
            name: filename,
            mimeType: 'application/json',
            parents: [this.folderId]
        };

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            content +
            close_delim;

        const response = await gapi.client.request({
            path: 'https://www.googleapis.com/upload/drive/v3/files',
            method: 'POST',
            params: {
                uploadType: 'multipart',
                fields: 'id'
            },
            headers: {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
        });

        return response.result;
    }

    /**
     * Update an existing file in Drive
     * @param {string} fileId - ID of the file to update
     * @param {string} content - New file content
     */
    static async updateFile(fileId, content) {
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            content +
            close_delim;

        const response = await gapi.client.request({
            path: `https://www.googleapis.com/upload/drive/v3/files/${fileId}`,
            method: 'PATCH',
            params: {
                uploadType: 'multipart',
                fields: 'id'
            },
            headers: {
                'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
        });

        return response.result;
    }

    /**
     * List all files in the app folder
     * @returns {Array} List of files
     */
    static async listFiles() {
        try {
            if (!this.folderId) {
                await this.initDriveFolder();
            }

            const response = await gapi.client.request({
                path: 'https://www.googleapis.com/drive/v3/files',
                method: 'GET',
                params: {
                    q: `'${this.folderId}' in parents and trashed=false`,
                    spaces: 'appDataFolder',
                    fields: 'files(id, name, modifiedTime, size)',
                    orderBy: 'name'
                }
            });

            return response.result.files || [];

        } catch (error) {
            console.error('Error listando archivos:', error);
            return [];
        }
    }

    /**
     * Delete a file from Drive
     * @param {string} fileId - ID of the file to delete
     * @returns {boolean} Success status
     */
    static async deleteFile(fileId) {
        try {
            await gapi.client.request({
                path: `https://www.googleapis.com/drive/v3/files/${fileId}`,
                method: 'DELETE'
            });

            console.log('Archivo eliminado:', fileId);
            return true;

        } catch (error) {
            console.error('Error eliminando archivo:', error);
            return false;
        }
    }
}

export default GoogleDriveStorage;
