// Calendar Module - Handles calendar integration and event generation

class Calendar {
    // Generate .ics file content
    static generateICS(appointment, patient) {
        const startDate = new Date(`${appointment.date}T${appointment.time}`);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

        // Reminder 24 hours before
        const reminderDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);

        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const location = appointment.type === 'virtual'
            ? (appointment.meetLink || 'Virtual')
            : 'Consultorio (Presencial)';

        let description = `Cita de psicoanálisis\\n`;
        description += `Tipo: ${appointment.type === 'virtual' ? 'Virtual' : 'Presencial'}\\n`;
        if (appointment.type === 'virtual' && appointment.meetLink) {
            description += `Link de reunión: ${appointment.meetLink}\\n`;
        }
        if (appointment.notes) {
            description += `\\nNotas: ${appointment.notes}`;
        }

        const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MindCare//Agenda de Psicoanálisis//ES
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${appointment.id}@mindcare.app
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Cita con ${patient.firstname} ${patient.lastname}
DESCRIPTION:${description}
LOCATION:${location}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT24H
DESCRIPTION:Recordatorio: Cita mañana con ${patient.firstname} ${patient.lastname}
ACTION:DISPLAY
END:VALARM
ORGANIZER;CN=Consultorio:mailto:${patient.email}
ATTENDEE;CN=${patient.firstname} ${patient.lastname};RSVP=TRUE:mailto:${patient.email}
END:VEVENT
END:VCALENDAR`;

        return ics;
    }

    // Download .ics file
    static downloadICS(appointment, patient) {
        const icsContent = this.generateICS(appointment, patient);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cita_${patient.lastname}_${appointment.date}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // Generate Google Calendar URL
    static generateGoogleCalendarURL(appointment, patient) {
        const startDate = new Date(`${appointment.date}T${appointment.time}`);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

        const formatGoogleDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const title = encodeURIComponent(`Cita - ${patient.firstname} ${patient.lastname}`);
        const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;

        let details = `Tipo: ${appointment.type}`;
        if (appointment.type === 'virtual' && appointment.meetLink) {
            details += `\\nLink: ${appointment.meetLink}`;
        }
        if (appointment.notes) {
            details += `\\nNotas: ${appointment.notes}`;
        }
        const description = encodeURIComponent(details);

        const location = encodeURIComponent(
            appointment.type === 'virtual'
                ? (appointment.meetLink || 'Virtual')
                : 'Consultorio'
        );

        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${description}&location=${location}&add=${encodeURIComponent(patient.email)}&trp=false`;

        return url;
    }

    // Open Google Calendar with event
    static addToGoogleCalendar(appointment, patient) {
        const url = this.generateGoogleCalendarURL(appointment, patient);
        window.open(url, '_blank');
    }

    // Send email with calendar invitation
    static sendEmailInvitation(appointment, patient) {
        if (!patient.email) {
            alert('El paciente no tiene correo electrónico registrado');
            return;
        }

        const startDate = new Date(`${appointment.date}T${appointment.time}`);
        const formattedDate = startDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const subject = `Invitación: Cita de Psicoanálisis - ${formattedDate}`;

        let body = `Hola ${patient.firstname},\\n\\n`;
        body += `Te confirmo tu cita de psicoanálisis con los siguientes detalles:\\n\\n`;
        body += `📅 Fecha: ${formattedDate}\\n`;
        body += `🕐 Hora: ${appointment.time}\\n`;
        body += `📍 Modalidad: ${appointment.type === 'virtual' ? 'Virtual' : 'Presencial'}\\n`;

        if (appointment.type === 'virtual' && appointment.meetLink) {
            body += `\\n🔗 Link de la reunión:\\n${appointment.meetLink}\\n`;
        }

        if (appointment.notes) {
            body += `\\n📝 Notas: ${appointment.notes}\\n`;
        }

        body += `\\n⏰ Recibirás un recordatorio 24 horas antes.\\n\\n`;
        body += `Para agregar esta cita a tu calendario, descarga el archivo adjunto .ics o haz clic en el siguiente enlace:\\n`;
        body += this.generateGoogleCalendarURL(appointment, patient);
        body += `\\n\\nSi necesitas cancelar o reprogramar, por favor contáctame con anticipación.\\n\\n`;
        body += `Saludos cordiales.`;

        const mailtoLink = `mailto:${patient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;

        // Also trigger .ics download
        this.downloadICS(appointment, patient);
    }

    // Generate reminder email for appointments in 24 hours
    static generateReminderEmail(appointment, patient) {
        const startDate = new Date(`${appointment.date}T${appointment.time}`);
        const formattedDate = startDate.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        const subject = `🔔 Recordatorio: Cita Mañana - ${formattedDate}`;

        let body = `Hola ${patient.firstname},\\n\\n`;
        body += `Te recuerdo que mañana tienes tu cita de psicoanálisis:\\n\\n`;
        body += `📅 ${formattedDate}\\n`;
        body += `🕐 ${appointment.time}\\n`;
        body += `📍 ${appointment.type === 'virtual' ? 'Virtual' : 'Presencial'}\\n`;

        if (appointment.type === 'virtual' && appointment.meetLink) {
            body += `\\n🔗 Link de la reunión:\\n${appointment.meetLink}\\n`;
            body += `\\nPor favor, conéctate unos minutos antes.\\n`;
        }

        body += `\\n¡Nos vemos mañana!\\n`;
        body += `Saludos cordiales.`;

        return {
            subject,
            body,
            email: patient.email
        };
    }

    // Check for appointments that need reminders (24h before)
    static getAppointmentsNeedingReminders(appointments) {
        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

        return appointments.filter(apt => {
            const appointmentDate = new Date(`${apt.date}T${apt.time}`);
            return appointmentDate > in24Hours && appointmentDate < in25Hours;
        });
    }
}

export default Calendar;
