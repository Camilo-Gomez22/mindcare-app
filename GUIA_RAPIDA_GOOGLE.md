# Guía Rápida: Usar Google Calendar API

## 🎯 ¿Qué hace esta integración?

Cuando configures Google Calendar API, la aplicación podrá:

✅ **Login con Gmail** - Tu esposa inicia sesión con su cuenta  
✅ **Sync Automático** - Citas se crean automáticamente en Google Calendar  
✅ **Invitaciones Email** - Google envía invitación al paciente automáticamente  
✅ **Confirmaciones** - Paciente puede Aceptar/Rechazar desde el email  
✅ **Recordatorio 24h** - Google envía recordatorio automático 24h antes  
✅ **Actualización** - Cambios en MindCare → se actualizan en Google Calendar  
✅ **Cancelación** - Eliminar cita → se cancela en Google Calendar  

---

## 🚀 Configuración Rápida (3 pasos)

### Paso 1: Configurar Google Cloud (20 minutos)

1. Sigue la guía completa en: `SETUP_GOOGLE_API.md`
2. Obtendrás 2 valores importantes:
   - **Client ID**: `123456-abc.apps.googleusercontent.com`
   - **API Key**: `AIza...`

### Paso 2: Actualizar Credenciales

1. Abrir: `e:\BigData\Agenda con Causa\modules\google-calendar-api.js`
2. Líneas 5-6, reemplazar:
```javascript
CLIENT_ID: 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com',
API_KEY: 'TU_API_KEY_AQUI',
```

3. Por tus valores reales
4. Guardar

### Paso 3: Usar la Aplicación

1. Abrir: `http://localhost:8080`
2. Clic en **"Conectar con Google"** (botón en el header)
3. Iniciar sesión con Gmail de tu esposa
4. ¡Listo!

---

## 📱 Cómo Funciona Día a Día

### Tu Esposa (Psicóloga):

1. **Primera vez:**
   - Abre MindCare
   - Clic en "Conectar con Google"
   - Inicia sesión (una sola vez)

2. **Crear cita:**
   - Crea cita normalmente en MindCare
   - Al guardar → **se crea automáticamente en Google Calendar**
   - Paciente recibe email de invitación automáticamente

3. **Editar cita:**
   - Edita en MindCare
   - Al guardar → **se actualiza en Google Calendar**
   - Paciente recibe email de actualización

4. **Ver calendario:**
   - Abre Google Calendar en cualquier dispositivo
   - Ve todas las citas de MindCare sincronizadas
   - Recibe notificaciones en su celular

### El Paciente:

1. **Recibe email de Google:**
   - "Invitación: Cita de Psicoanálisis"
   - Con todos los detalles
   - Botones: **Sí** / **No** / **Tal vez**

2. **Confirma asistencia:**
   - Clic en "Sí" en el email
   - Se agrega automáticamente a su calendario
   - Google le enviará recordatorio 24h antes

3. **Recordatorio automático:**
   - 24 horas antes recibe email: "Recordatorio: Cita mañana"
   - 1 hora antes recibe notificación en el celular

---

## 💡 Ventajas vs Método Anterior (.ics)

| Característica | .ics Manual | Google API |
|---|---|---|
| Configuración | ✅ Sin setup | ⚠️ Setup 20 min |
| Sincronización | ⚠️ Manual | ✅ Automática |
| Invitaciones | ⚠️ Enviar cada una | ✅ Automáticas |
| Recordatorios | ✅ Si paciente importa | ✅ Siempre automáticos |
| Confirmaciones | ⚠️ Por separado | ✅ En el mismo email |
| Actualizaciones | ⚠️ Enviar de nuevo | ✅ Automáticas |

---

## 🔄 Flujo Completo

```
1. Psicóloga crea cita en MindCare
       ↓
2. MindCare crea evento en Google Calendar
       ↓
3. Google envía email al paciente
   - Invitación con detalles
   - Botones Aceptar/Rechazar
   - Link de Meet (si es virtual)
       ↓
4. Paciente hace clic en "Sí"
   - Se agrega a su calendario
   - Confirma asistencia
       ↓
5. 24 horas antes:
   - Google envía email de recordatorio
   - Al paciente y a la psicóloga
       ↓
6. 1 hora antes:
   - Notificación en celular
   - De ambos
       ↓
7. Hora de la cita:
   - Si es virtual: link de Meet en el calendario
   - Si es presencial: dirección en el evento
```

---

## 🎨 Interfaz de Usuario

### Antes de Conectar:
- Botón: **"Conectar con Google"**

### Después de Conectar:
- Muestra: **"📧 email@gmail.com"**
- Botón: **"Cerrar Sesión"**

### En cada Cita:
- **Sin sincronizar:** Botón azul **"Sync Google"**
- **Ya sincronizada:** Badge verde **"✓ Synced"**

---

## ❓ Preguntas Frecuentes

**P: ¿Necesito conectarme cada vez que abro la aplicación?**  
R: No, la sesión se guarda. Solo una vez.

**P: ¿Qué pasa si no configuro Google API?**  
R: La aplicación funciona normal con los botones .ics y Calendar que ya tiene.

**P: ¿Puedo usar ambos métodos?**  
R: Sí, tienes todos los botones disponibles.

**P: ¿Los pacientes necesitan cuenta de Google?**  
R: No, cualquier email funciona. Ellos reciben la invitación por email.

**P: ¿Qué pasa si edito la cita en Google Calendar?**  
R: Por ahora solo funciona de MindCare → Google Calendar (unidireccional).

**P: ¿Cómo sincronizo citas antiguas?**  
R: Cada cita tiene botón "Sync Google" para sincronizar manualmente.

---

## 🔐 Seguridad

- Los datos se guardan encriptados en Google
- Solo tú y el paciente ven los detalles de la cita
- Puedes revocar acceso en cualquier momento
- La aplicación solo puede crear/editar/eliminar eventos

---

## 📞 Soporte

Si necesitas ayuda:
1. Revisa `SETUP_GOOGLE_API.md` (guía paso a paso con screenshots)
2. Verifica la consola del navegador (F12) para errores
3. Contacta para ayuda personalizada

---

**¡Todo listo para empezar!** 🎉
