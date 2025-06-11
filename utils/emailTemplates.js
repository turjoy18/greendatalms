// Email Templates
const welcomeEmailTemplate = (firstName) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to Green Data!</h1>
        </div>
        <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>Welcome to Green Data! We're excited to have you join our community of learners committed to sustainable living.</p>
            <p>With your account, you can:</p>
            <ul>
                <li>Browse our selection of ESG courses</li>
                <li>Track your learning progress</li>
                <li>Earn certificates upon completion</li>
                <li>Access course materials anytime</li>
            </ul>
            <p>Start your learning journey today by exploring our course catalog!</p>
        </div>
        <div class="footer">
            <p>© 2024 Green Data. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

const certificateEmailTemplate = (firstName, courseName, certificateNumber) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .certificate-info { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Congratulations!</h1>
        </div>
        <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>Congratulations on completing the ${courseName} course!</p>
            <div class="certificate-info">
                <p><strong>Certificate Number:</strong> ${certificateNumber}</p>
                <p>You can download your certificate from your dashboard in the "My Certificates" section.</p>
            </div>
            <p>Keep up the great work in your sustainability journey!</p>
        </div>
        <div class="footer">
            <p>© 2024 Green Data. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

const enrollmentConfirmationTemplate = (firstName, courseName, courseDescription) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .course-info { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Course Enrollment Confirmation</h1>
        </div>
        <div class="content">
            <h2>Hello ${firstName},</h2>
            <p>Thank you for enrolling in our course!</p>
            <div class="course-info">
                <h3>${courseName}</h3>
            </div>
            <p>You can access your course materials immediately through your dashboard.</p>
            <p>We're excited to have you join this learning journey!</p>
        </div>
        <div class="footer">
            <p>© 2024 Green Data. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

module.exports = {
    welcomeEmailTemplate,
    certificateEmailTemplate,
    enrollmentConfirmationTemplate
}; 