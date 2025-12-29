# Guía de Configuración: Google Calendar API

## 📋 Requisitos Previos
- Cuenta de Gmail/Google (la de tu esposa)
- Navegador web moderno
- 20-30 minutos para la configuración inicial

---

## 🚀 Paso 1: Crear Proyecto en Google Cloud Console

### 1.1 Acceder a Google Cloud Console

1. Ve a: https://console.cloud.google.com
2. Inicia sesión con la cuenta de Gmail de tu esposa
3. Acepta los términos de servicio si aparecen

### 1.2 Crear Nuevo Proyecto

1. Haz clic en el selector de proyectos (arriba a la izquierda)
2. Clic en "NUEVO PROYECTO"
3. Nombre del proyecto: `MindCare Agenda`
4. Ubicación: Sin organización
5. Clic en "CREAR"
6. Espera unos segundos a que se cree

---

## 🔧 Paso 2: Habilitar Google Calendar API

### 2.1 Activar la API

1. En el menú lateral → "APIs y servicios" → "Biblioteca"
2. Buscar: `Google Calendar API`
3. Hacer clic en "Google Calendar API"
4. Clic en "HABILITAR"
5. Esperar a que se active (tarda unos segundos)

---

## 🔐 Paso 3: Configurar OAuth 2.0

### 3.1 Configurar Pantalla de Consentimiento

1. Ir a: "APIs y servicios" → "Pantalla de consentimiento de OAuth"
2. Seleccionar: **"Externo"**
3. Clic en "CREAR"

**Información de la aplicación:**
- Nombre de la aplicación: `MindCare`
- Correo electrónico de asistencia: (tu email de Gmail)
- Logo de la aplicación: (opcional, puedes dejarlo vacío)

**Información de contacto del desarrollador:**
- Direcciones de correo electrónico: (tu email de Gmail)

4. Clic en "GUARDAR Y CONTINUAR"

**Permisos:**
5. Clic en "AGREGAR O QUITAR PERMISOS"
6. Buscar: `calendar.events`
7. Seleccionar: `https://www.googleapis.com/auth/calendar.events`
8. Clic en "ACTUALIZAR"
9. Clic en "GUARDAR Y CONTINUAR"

**Usuarios de prueba:**
10. Clic en "+ AGREGAR USUARIOS"
11. Agregar el email de tu esposa
12. Agregar tu email (si quieres probar)
13. Clic en "AGREGAR"
14. Clic en "GUARDAR Y CONTINUAR"

15. Revisar el resumen y hacer clic en "VOLVER AL PANEL"

### 3.2 Crear Credenciales OAuth 2.0

1. Ir a: "APIs y servicios" → "Credenciales"
2. Clic en "+ CREAR CREDENCIALES"
3. Seleccionar: "ID de cliente de OAuth 2.0"

**Configuración:**
- Tipo de aplicación: **Aplicación web**
- Nombre: `MindCare Web Client`

**Orígenes de JavaScript autorizados:**
- Agregar URI: `http://localhost:8080`
- Agregar URI: `http://127.0.0.1:8080`

**URI de redireccionamiento autorizados:**
- Agregar URI: `http://localhost:8080`
- Agregar URI: `http://127.0.0.1:8080`

4. Clic en "CREAR"

### 3.3 Guardar Credenciales

**¡IMPORTANTE!** Aparecerá una ventana con:
- **Tu ID de cliente**: `123456789-abcdefg.apps.googleusercontent.com`
- **Tu secreto de cliente**: `ABC123xyz...`

**Copiar ambos valores y guardarlos en un lugar seguro.**

---

## 🔑 Paso 4: Crear API Key

1. En "Credenciales", clic en "+ CREAR CREDENCIALES"
2. Seleccionar: "Clave de API"
3. Copiar la clave que aparece
4. Clic en "RESTRINGIR CLAVE"

**Configurar restricciones:**
- Nombre: `MindCare API Key`
- Restricciones de aplicación: **Sitios web**
- Agregar referencia de sitio web: `http://localhost:8080/*`
- Restricciones de API: **Restringir clave**
- Seleccionar: `Google Calendar API`
5. Clic en "GUARDAR"

---

## 📝 Paso 5: Configurar la Aplicación MindCare

### 5.1 Actualizar Credenciales

1. Abrir el archivo: `e:\BigData\Agenda con Causa\modules\google-calendar-api.js`

2. En las líneas 5-6, reemplazar:
```javascript
CLIENT_ID: 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com',
API_KEY: 'TU_API_KEY_AQUI',
```

Por tus valores reales:
```javascript
CLIENT_ID: '123456789-abcdefg.apps.googleusercontent.com', // Tu Client ID
API_KEY: 'ABC123xyz...', // Tu API Key
```

3. Guardar el archivo

---

## ✅ Paso 6: Probar la Integración

### 6.1 Iniciar la Aplicación

1. Abrir PowerShell en: `e:\BigData\Agenda con Causa`
2. Ejecutar: `python -m http.server 8080`
3. Abrir navegador: `http://localhost:8080`

### 6.2 Iniciar Sesión

1. En la aplicación, buscar el botón "Conectar con Google" (en el header o dashboard)
2. Hacer clic en "Conectar con Google"
3. Se abrirá ventana de Google
4. Seleccionar la cuenta de tu esposa
5. Aceptar los permisos

**Aparecerá advertencia:** "Google hasn't verified this app"
- Es normal porque está en modo de prueba
- Clic en "Advanced" o "Avanzado"
- Clic en "Go to MindCare (unsafe)" o "Ir a MindCare (no seguro)"
- Clic en "Continue" o "Continuar"

6. Aceptar permisos de Calendar
7. La aplicación dirá: "Conectado como [email]"

### 6.3 Crear Cita de Prueba

1. Crear un paciente con email
2. Crear una cita para mañana
3. Hacer clic en el botón "Sync Google Cal" (nuevo botón)
4. Verificar que aparece mensaje: "Evento creado en Google Calendar"
5. Abrir Google Calendar: https://calendar.google.com
6. Verificar que la cita aparece en el calendario
7. El paciente debería recibir email de invitación

---

## 🎯 Funcionalidades Activas

### ✅ Lo que funcionará automáticamente:

1. **Login con Gmail**: Tu esposa inicia sesión una vez
2. **Creación automática**: Al crear cita en MindCare → se crea en Google Calendar
3. **Invitación por email**: Google envía email automático al paciente
4. **Confirmación**: Paciente puede Aceptar/Rechazar desde el email
5. **Recordatorio 24h**: Google envía email 24h antes automáticamente
6. **Sincronización**: Todo sincronizado en Google Calendar
7. **Actualizaciones**: Si editas la cita → se actualiza en Google Calendar
8. **Cancelación**: Si eliminas cita → se cancela en Google Calendar

---

## 🔒 Seguridad y Privacidad

### Datos que Google tendrá acceso:
- Eventos del calendario (solo los de MindCare)
- Emails de los pacientes (para invitaciones)

### Datos que permanecen privados:
- Información financiera (pagos, deudas)
- Notas personales
- Datos de pacientes (solo nombre en el calendario)

### Revocar Acceso:
Si en algún momento quieres desconectar:
1. Ir a: https://myaccount.google.com/permissions
2. Buscar "MindCare"
3. Clic en "Eliminar acceso"

---

## 🆘 Solución de Problemas

### Error: "Client ID not found"
- Verifica que copiaste correctamente el Client ID
- Debe terminar en `.apps.googleusercontent.com`

### Error: "Access blocked: This app's request is invalid"
- Verifica los URIs de redirección en Google Cloud Console
- Deben ser exactamente: `http://localhost:8080`

### Error: "Google hasn't verified this app"
- Es normal en modo de prueba
- Sigue los pasos de "Advanced" → "Go to MindCare"

### No recibo emails de invitación
- Verifica que el email del paciente sea correcto
- Revisa la carpeta de Spam
- Espera unos minutos (puede tardar hasta 5 min)

### Las citas no aparecen en Google Calendar
- Verifica que iniciaste sesión correctamente
- Revisa la consola del navegador (F12) para errores
- Verifica que la API Key esté bien configurada

---

## 📊 Límites y Cuotas

Google Calendar API es **gratuito** con límites generosos:
- 1,000,000 requests/día
- 100 requests/segundo

Para una práctica de psicoanálisis (20-25 pacientes/semana):
- ~100 citas/mes = ~100 requests/mes
- ✅ Muy por debajo del límite

---

## 🎓 Video Tutorial (Opcional)

Si prefieres un video, busca en YouTube:
- "Google Calendar API OAuth setup"
- "Google Cloud Console tutorial"

---

## ✨ Siguientes Pasos

Una vez configurado:
1. ✅ Tu esposa inicia sesión con su Gmail
2. ✅ Crea citas normalmente en MindCare
3. ✅ Las citas se sincronizan automáticamente
4. ✅ Los pacientes reciben invitaciones y recordatorios
5. ✅ Todo está en el calendario de Google

**¿Necesitas ayuda con la configuración?** 
Podemos hacerlo juntos paso a paso por videollamada si prefieres.
