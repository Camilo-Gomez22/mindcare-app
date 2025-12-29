# Sistema de Gestión de Pacientes - MindCare

Una aplicación web moderna y profesional diseñada para psicólogos y psicoanalistas que necesitan gestionar sus pacientes, citas, pagos y generar reportes.

## 🚀 Características Principales

### 📋 Gestión de Pacientes
- Registro completo de pacientes con información detallada
- Búsqueda rápida por nombre o apellido
- Visualización del estado financiero de cada paciente
- Edición y eliminación de pacientes

### 📅 Gestión de Citas
- Calendario de citas presenciales y virtuales
- Integración con Google Meet para citas virtuales
- Filtros por fecha y tipo de cita
- Envío de recordatorios por WhatsApp
- Registro de notas por cita

### 💰 Control de Pagos
- Registro de pagos por efectivo o transferencia
- Seguimiento de deudas por paciente
- Filtros por estado de pago y método
- Visualización clara de pagos pendientes

### 📊 Reportes e Informes
- Generación de reportes mensuales detallados
- Exportación a Excel con múltiples hojas
- Estadísticas de ingresos y pagos pendientes
- Desglose por paciente

## 🔧 Instalación y Uso

### Requisitos
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- No requiere instalación de software adicional
- No requiere conexión a internet después de la primera carga

### Cómo Usar

1. **Abrir la Aplicación**
   - Simplemente abre el archivo `index.html` en tu navegador web
   - La aplicación funciona completamente offline después de cargarla

2. **Agregar Pacientes**
   - Ve a la sección "Pacientes"
   - Haz clic en "Nuevo Paciente"
   - Completa el formulario con la información requerida
   - Los campos marcados con * son obligatorios

3. **Crear Citas**
   - Ve a la sección "Citas"
   - Haz clic en "Nueva Cita"
   - Selecciona el paciente del listado
   - Indica si es presencial o virtual
   - Para citas virtuales, crea el link en [meet.google.com/new](https://meet.google.com/new) y pégalo en el formulario
   - Define el monto y estado de pago

4. **Gestionar Pagos**
   - Ve a la sección "Pagos"
   - Visualiza todas las citas con su estado de pago
   - Marca los pagos como "Efectivo" o "Transferencia" cuando se realicen
   - Filtra por estado o método de pago

5. **Generar Reportes**
   - Ve a la sección "Reportes"
   - Selecciona el mes deseado
   - Haz clic en "Generar Reporte"
   - Visualiza el resumen y detalle
   - Haz clic en "Exportar a Excel" para descargar el informe

## 📱 Uso en Móvil

La aplicación está completamente optimizada para dispositivos móviles:
- Interfaz responsiva que se adapta a cualquier tamaño de pantalla
- Fácil navegación con iconos grandes
- Formularios optimizados para touch
- Funciona perfectamente en smartphones y tablets

## 💾 Almacenamiento de Datos

### Dónde se Guardan los Datos
Los datos se almacenan localmente en tu navegador usando `localStorage`:
- ✅ Tus datos nunca salen de tu dispositivo
- ✅ No se requiere cuenta ni servidor
- ✅ Acceso completamente privado y seguro
- ⚠️ Los datos solo están disponibles en este navegador y dispositivo

### Respaldo de Datos

**IMPORTANTE:** Es fundamental hacer respaldos periódicos:

1. **Crear Respaldo Manual**
   - Usa las herramientas de desarrollador del navegador (F12)
   - Ve a la consola y ejecuta: `localStorage`
   - Copia y guarda el contenido en un archivo de texto

2. **Exportar Reportes**
   - Los reportes de Excel sirven como respaldo parcial
   - Exporta un reporte completo mensualmente como respaldo

3. **Sincronización Multi-Dispositivo**
   - Para acceder desde múltiples dispositivos, necesitarías una versión con backend
   - Considera hacer respaldos y transferirlos manualmente si necesitas usar varios dispositivos

## 🔄 Envío de Notificaciones

### WhatsApp
- Al hacer clic en "WhatsApp" en una cita virtual, se abrirá WhatsApp Web
- El mensaje estará prellenado con los detalles de la cita y el link de Meet
- Necesitas confirmar el envío manualmente
- Asegúrate de tener WhatsApp Web configurado en tu navegador

### Google Meet
- Debes crear los links de Google Meet manualmente en [meet.google.com/new](https://meet.google.com/new)
- Copia el link generado y pégalo en el formulario de cita
- El link se incluirá automáticamente en los mensajes de WhatsApp

## ⚙️ Configuración Recomendada

### Para Mejor Experiencia en Móvil
1. Abre la aplicación en tu navegador móvil
2. En Chrome/Edge: Menú → "Agregar a pantalla de inicio"
3. En Safari (iOS): Compartir → "Agregar a pantalla de inicio"
4. La aplicación se comportará como una app nativa

### Para Usar Diariamente
- Añade la aplicación a favoritos o pantalla de inicio
- Cierra otras aplicaciones para mejor rendimiento
- Haz respaldos semanales de tus datos

## 🎨 Características de Diseño

- **Diseño Moderno**: Interfaz premium con gradientes y animaciones suaves
- **Modo Claro**: Diseño profesional con colores armoniosos
- **Responsive**: Se adapta perfectamente a cualquier dispositivo
- **Accesible**: Fácil de usar con navegación intuitiva
- **Rápida**: Sin tiempos de carga, todo funciona de inmediato

## 🆘 Solución de Problemas

### Los datos desaparecieron
- Puede ocurrir si limpias el caché del navegador
- Solución: Usa siempre el mismo navegador y perfil
- Prevención: Haz respaldos regulares

### No puedo exportar a Excel
- Asegúrate de tener una conexión a internet activa (solo para cargar la librería SheetJS)
- Intenta en otro navegador
- Verifica que hayas generado un reporte primero

### WhatsApp no se abre
- Verifica que WhatsApp Web esté configurado
- El número debe estar en formato internacional
- Algunos navegadores bloquean pop-ups, permite pop-ups para esta aplicación

### La aplicación no carga
- Verifica que todos los archivos estén en la misma carpeta
- Revisa la consola del navegador (F12) para ver errores
- Intenta en otro navegador moderno

## 📞 Contacto y Soporte

Esta aplicación fue creada específicamente para tu práctica de psicoanálisis. Si necesitas:
- Modificaciones o nuevas características
- Ayuda con la configuración
- Implementación de sincronización multi-dispositivo
- Integración con otros servicios

No dudes en solicitar ayuda.

## 📄 Licencia

Este software es de uso privado para la práctica profesional.

---

**Versión:** 1.0.0  
**Última actualización:** Diciembre 2025  
**Desarrollado con:** HTML5, CSS3, JavaScript (ES6+), SheetJS
