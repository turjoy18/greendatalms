const { Resend } = require('resend');
const { welcomeEmailTemplate, certificateEmailTemplate, enrollmentConfirmationTemplate } = require('./emailTemplates');

// Initialize Resend with API key
if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not defined in environment variables');
    throw new Error('RESEND_API_KEY is required for email functionality');
}

console.log('Initializing Resend with API key...');
const resend = new Resend(process.env.RESEND_API_KEY);

// Send welcome email
const sendWelcomeEmail = async (email, firstName) => {
    try {
        console.log('Attempting to send welcome email to:', email);
        const data = await resend.emails.send({
            from: 'Green Data <noreply@greendatabiz.com>',
            to: email,
            subject: 'Welcome to Green Data!',
            html: welcomeEmailTemplate(firstName)
        });
        console.log('Welcome email sent successfully:', data);
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw error;
    }
};

// Send certificate email
const sendCertificateEmail = async (email, firstName, courseName, certificateNumber) => {
    try {
        console.log('Attempting to send certificate email to:', email);
        const data = await resend.emails.send({
            from: 'Green Data <noreply@greendatabiz.com>',
            to: email,
            subject: 'Congratulations! Your Course Certificate',
            html: certificateEmailTemplate(firstName, courseName, certificateNumber)
        });
        console.log('Certificate email sent successfully:', data);
    } catch (error) {
        console.error('Error sending certificate email:', error);
        throw error;
    }
};

// Send enrollment confirmation email
const sendEnrollmentConfirmation = async (email, firstName, courseName, courseDescription) => {
    try {
        console.log('Attempting to send enrollment confirmation email to:', email);
        const data = await resend.emails.send({
            from: 'Green Data <noreply@greendatabiz.com>',
            to: email,
            subject: 'Course Enrollment Confirmation',
            html: enrollmentConfirmationTemplate(firstName, courseName, courseDescription)
        });
        console.log('Enrollment confirmation email sent successfully:', data);
    } catch (error) {
        console.error('Error sending enrollment confirmation email:', error);
        throw error;
    }
};

module.exports = {
    sendWelcomeEmail,
    sendCertificateEmail,
    sendEnrollmentConfirmation
}; 