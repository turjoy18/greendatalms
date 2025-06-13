# Learning Management System (LMS)

A comprehensive Learning Management System built with Node.js, Express, and MySQL, designed to provide an interactive platform for course delivery, student progress tracking, and certification.

## Features

- User Authentication and Authorization
- Course Management
- Video-based Learning Content
- Interactive Quizzes
- Progress Tracking
- Certificate Generation
- Payment Integration (Stripe & PayPal)
- Pre-course Questionnaires
- Course Feedback System
- Email Notifications

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: JWT, bcryptjs
- **Payment Processing**: Stripe, PayPal
- **Email Service**: Resend
- **PDF Generation**: pdf-lib
- **Development**: nodemon

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd LMSthirdtry
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
- Create a MySQL database
- Run the schema.sql file to set up the database structure:
```bash
mysql -u your_username -p < schema.sql
```

4. Create a `.env` file in the root directory with the following variables:
```
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=lms_db
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
RESEND_API_KEY=your_resend_api_key
```

## Running the Application

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Database Schema

The system includes the following main tables:
- Users
- Courses
- Chapters
- Videos
- Quizzes
- Questions
- Answers
- User Progress
- Quiz Attempts
- Course Enrollments
- Course Feedback
- Certificates
- Pre-course Questionnaire Responses

## API Endpoints

The API includes endpoints for:
- User authentication and management
- Course CRUD operations
- Video content delivery
- Quiz management and submission
- Progress tracking
- Payment processing
- Certificate generation
- Feedback submission

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the repository or contact the development team. 