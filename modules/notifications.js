// Notifications Module - Handles WhatsApp and Email notifications

class Notifications {
    static sendWhatsApp(phoneNumber, message) {
        // WhatsApp Web API - opens WhatsApp with pre-filled message
        // Phone number should be in international format without + or spaces
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        const encodedMessage = encodeURIComponent(message);
        const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
        window.open(url, '_blank');
    }

    static sendEmail(email, subject, body) {
        // Opens default email client with pre-filled data
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    }

    static generateAppointmentMessage(patient, appointment) {
        const date = new Date(appointment.date);
        const formattedDate = date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let message = `Hola ${patient.firstname},\n\n`;
        message += `Te recuerdo tu cita de psicoanálisis:\n`;
        message += `📅 Fecha: ${formattedDate}\n`;
        message += `🕐 Hora: ${appointment.time}\n`;
        message += `📍 Modalidad: ${appointment.type === 'virtual' ? 'Virtual' : 'Presencial'}\n\n`;

        if (appointment.type === 'virtual' && appointment.meetLink) {
            message += `🔗 Link de la reunión:\n${appointment.meetLink}\n\n`;
        }

        message += `¡Te esperamos!\n\nSaludos cordiales.`;

        return message;
    }

    static generateAppointmentEmail(patient, appointment) {
        const subject = `Recordatorio de Cita - ${new Date(appointment.date).toLocaleDateString('es-ES')}`;
        const body = this.generateAppointmentMessage(patient, appointment);
        return { subject, body };
    }

    static notifyAppointmentWhatsApp(patient, appointment) {
        if (!patient.phone) {
            alert('El paciente no tiene número de teléfono registrado');
            return;
        }
        const message = this.generateAppointmentMessage(patient, appointment);
        this.sendWhatsApp(patient.phone, message);
    }

    static notifyAppointmentEmail(patient, appointment) {
        if (!patient.email) {
            alert('El paciente no tiene correo electrónico registrado');
            return;
        }
        const { subject, body } = this.generateAppointmentEmail(patient, appointment);
        this.sendEmail(patient.email, subject, body);
    }
}

export default Notifications;
