# Learning Management System (LMS) Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Design](#database-design)
5. [API Documentation](#api-documentation)
6. [Authentication & Authorization](#authentication--authorization)
7. [Payment Integration](#payment-integration)
8. [Email System](#email-system)
9. [Certificate Generation](#certificate-generation)
10. [Development Setup](#development-setup)
11. [Deployment Guide](#deployment-guide)
12. [Security Considerations](#security-considerations)
13. [Troubleshooting](#troubleshooting)
14. [Frontend Overview](#frontend-overview)
15. [SQL Queries](#sql-queries)
16. [State Management](#state-management)

## Project Overview

The Learning Management System (LMS) is a comprehensive platform designed to facilitate online learning through structured courses, video content, quizzes, and certification. The system supports both student and admin roles, with features for course management, progress tracking, and payment processing.

### Key Features
- User registration and authentication
- Course creation and management
- Video-based learning content
- Interactive quizzes and assessments
- Progress tracking
- Certificate generation
- Payment processing (Stripe & PayPal)
- Email notifications
- Pre-course questionnaires

## System Architecture

### Backend Architecture
The system follows a monolithic architecture with the following components:

1. **Express.js Server**
   - Handles HTTP requests
   - Implements RESTful API endpoints
   - Manages middleware for authentication and authorization

2. **Database Layer**
   - MySQL database for persistent storage
   - Connection pooling for efficient database operations

3. **Authentication Layer**
   - JWT-based authentication
   - Role-based access control (RBAC)

4. **Payment Processing**
   - Stripe integration for credit card payments
   - PayPal integration for alternative payment methods

5. **Email Service**
   - Resend API integration for transactional emails
   - Automated email notifications

### Directory Structure

```
LMSthirdtry/
├── public/
│   ├── app.js                  # Frontend JavaScript
│   ├── greendata logo.png      # Logo image
│   ├── index.html              # Main HTML page
│   ├── payment-success.html    # Payment success page
│   └── styles.css              # Stylesheet
├── Sample UI/
│   ├── admin dashboard.jpg     
│   ├── course view.jpg         
│   └── landing page.jpg        
├── utils/
│   ├── certificateUtils.js     # Certificate generation utilities
│   ├── emailTemplates.js       # Email HTML/text templates
│   └── emailUtils.js           # Email sending logic
├── .env                        # Environment variables (not committed)
├── .gitignore                  # Git ignore rules
├── Blue Modern Certificate...  # Certificate template image
├── DOCUMENTATION.md            # Project documentation
├── insert_esg_course.sql       # Example SQL for inserting ESG course
├── package-lock.json           # NPM lock file
├── package.json                # Project dependencies and scripts
├── README.md                   # Project overview and setup
├── schema.sql                  # Database schema (reference only)
├── server.js                   # Main backend server
```

## Technology Stack

### Backend Technologies
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **MySQL**: Database
- **JWT**: Authentication
- **bcryptjs**: Password hashing
- **Stripe**: Payment processing
- **PayPal SDK**: Alternative payment processing
- **Resend**: Email service
- **pdf-lib**: PDF generation

### Development Tools
- **nodemon**: Development server with auto-reload
- **dotenv**: Environment variable management

## Database Design

### Table Descriptions

#### users
- **id**: Primary key, auto-increment integer
- **email**: User's email address (unique)
- **password**: Hashed password
- **first_name**: User's first name
- **last_name**: User's last name
- **role**: 'student' or 'admin'
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### courses
- **id**: Primary key
- **title**: Course title
- **description**: Course description
- **price**: Course price
- **instructor_id**: Foreign key to users (instructor)
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### chapters
- **id**: Primary key
- **course_id**: Foreign key to courses
- **title**: Chapter title
- **description**: Chapter description
- **order_index**: Order of chapter in course
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### videos
- **id**: Primary key
- **chapter_id**: Foreign key to chapters
- **title**: Video title
- **description**: Video description
- **video_url**: URL to video file
- **duration**: Duration in seconds
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### quizzes
- **id**: Primary key
- **chapter_id**: Foreign key to chapters
- **title**: Quiz title
- **description**: Quiz description
- **passing_score**: Minimum score to pass
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### questions
- **id**: Primary key
- **quiz_id**: Foreign key to quizzes
- **question_text**: The question
- **question_type**: 'multiple_choice' or 'true_false'
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### answers
- **id**: Primary key
- **question_id**: Foreign key to questions
- **answer_text**: The answer text
- **is_correct**: Boolean, if this is the correct answer
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### user_progress
- **id**: Primary key
- **user_id**: Foreign key to users
- **video_id**: Foreign key to videos
- **watched**: Boolean, if video is watched
- **progress_percentage**: How much of the video is watched
- **last_watched_position**: Last watched position in seconds
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### quiz_attempts
- **id**: Primary key
- **user_id**: Foreign key to users
- **quiz_id**: Foreign key to quizzes
- **score**: Score achieved
- **passed**: Boolean, if passed
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### course_enrollments
- **id**: Primary key
- **user_id**: Foreign key to users
- **course_id**: Foreign key to courses
- **payment_id**: Payment reference
- **enrollment_date**: Timestamp of enrollment
- **status**: 'active', 'completed', or 'expired'
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### course_feedback
- **id**: Primary key
- **user_id**: Foreign key to users
- **course_id**: Foreign key to courses
- **rating**: Integer (1-5)
- **comment**: Feedback text
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### certificates
- **id**: Primary key
- **user_id**: Foreign key to users
- **course_id**: Foreign key to courses
- **issue_date**: Date issued
- **certificate_number**: Unique certificate number
- **created_at**: Timestamp of creation
- **updated_at**: Timestamp of last update

#### pre_course_responses
- **id**: Primary key
- **user_id**: Foreign key to users
- **course_id**: Foreign key to courses
- **motivation**: Enum (motivation for taking course)
- **knowledge_level**: Enum (self-assessed knowledge)
- **expectations**: Text
- **created_at**: Timestamp of creation

## Code Implementation Examples

### Authentication System

#### User Registration
```javascript
// Registration endpoint
app.post('/api/register', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;
  
  try {
    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user into database
    const query = 'INSERT INTO users (email, password, first_name, last_name) VALUES (?, ?, ?, ?)';
    db.query(query, [email, hashedPassword, first_name, last_name], async (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error registering user' });
      }

      // Send welcome email
      try {
        await sendWelcomeEmail(email, first_name);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }

      res.status(201).json({ message: 'User registered successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
});
```

#### User Login
```javascript
// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Find user by email
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error logging in' });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const user = results[0];
      
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Return user data and token
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});
```

### Course Management

#### Creating a Course
```javascript
// Create course endpoint
app.post('/api/courses', authenticateToken, isAdmin, async (req, res) => {
  const { title, description, price, instructor_id } = req.body;
  
  try {
    const query = `
      INSERT INTO courses (title, description, price, instructor_id)
      VALUES (?, ?, ?, ?)
    `;
    
    db.query(query, [title, description, price, instructor_id], (err, result) => {
      if (err) {
        console.error('Error creating course:', err);
        return res.status(500).json({ error: 'Error creating course' });
      }
      
      res.status(201).json({
        message: 'Course created successfully',
        courseId: result.insertId
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating course' });
  }
});
```

#### Adding Chapter to Course
```javascript
// Add chapter endpoint
app.post('/api/courses/:courseId/chapters', authenticateToken, isAdmin, async (req, res) => {
  const { courseId } = req.params;
  const { title, description, order_index } = req.body;
  
  try {
    const query = `
      INSERT INTO chapters (course_id, title, description, order_index)
      VALUES (?, ?, ?, ?)
    `;
    
    db.query(query, [courseId, title, description, order_index], (err, result) => {
      if (err) {
        console.error('Error adding chapter:', err);
        return res.status(500).json({ error: 'Error adding chapter' });
      }
      
      res.status(201).json({
        message: 'Chapter added successfully',
        chapterId: result.insertId
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error adding chapter' });
  }
});
```

### Quiz System

#### Creating a Quiz with Questions
```javascript
// Create quiz endpoint
app.post('/api/chapters/:chapterId/quizzes', authenticateToken, isAdmin, async (req, res) => {
  const { chapterId } = req.params;
  const { title, description, passing_score, questions } = req.body;
  
  try {
    // Start transaction
    db.beginTransaction();
    
    // Insert quiz
    const quizQuery = `
      INSERT INTO quizzes (chapter_id, title, description, passing_score)
      VALUES (?, ?, ?, ?)
    `;
    
    db.query(quizQuery, [chapterId, title, description, passing_score], (err, quizResult) => {
      if (err) {
        db.rollback();
        return res.status(500).json({ error: 'Error creating quiz' });
      }
      
      const quizId = quizResult.insertId;
      
      // Insert questions and answers
      const questionPromises = questions.map(question => {
        return new Promise((resolve, reject) => {
          const questionQuery = `
            INSERT INTO questions (quiz_id, question_text, question_type)
            VALUES (?, ?, ?)
          `;
          
          db.query(questionQuery, [quizId, question.text, question.type], (err, questionResult) => {
            if (err) {
              reject(err);
              return;
            }
            
            const questionId = questionResult.insertId;
            
            // Insert answers for each question
            const answerPromises = question.answers.map(answer => {
              return new Promise((resolve, reject) => {
                const answerQuery = `
                  INSERT INTO answers (question_id, answer_text, is_correct)
                  VALUES (?, ?, ?)
                `;
                
                db.query(answerQuery, [questionId, answer.text, answer.isCorrect], (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              });
            });
            
            Promise.all(answerPromises)
              .then(() => resolve())
              .catch(err => reject(err));
          });
        });
      });
      
      // Commit transaction if all operations successful
      Promise.all(questionPromises)
        .then(() => {
          db.commit();
          res.status(201).json({
            message: 'Quiz created successfully',
            quizId: quizId
          });
        })
        .catch(err => {
          db.rollback();
          res.status(500).json({ error: 'Error creating quiz questions' });
        });
    });
  } catch (error) {
    db.rollback();
    res.status(500).json({ error: 'Error creating quiz' });
  }
});
```

### Payment Processing

#### Stripe Integration
```javascript
// Create payment intent endpoint
app.post('/api/create-payment-intent', authenticateToken, async (req, res) => {
  const { amount, currency } = req.body;
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: currency,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Error creating payment intent' });
  }
});
```

#### PayPal Integration
```javascript
// Create PayPal order endpoint
app.post('/api/create-paypal-order', authenticateToken, async (req, res) => {
  const { amount, currency } = req.body;
  
  try {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount
        }
      }]
    });
    
    const order = await paypalClient.execute(request);
    res.json({
      orderID: order.result.id
    });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    res.status(500).json({ error: 'Error creating PayPal order' });
  }
});
```

### Certificate Generation

#### Certificate Creation and Email
```javascript
// Certificate generation function
async function generateCertificate(userId, courseId) {
  try {
    // Get user and course information
    const [user, course] = await Promise.all([
      getUserById(userId),
      getCourseById(courseId)
    ]);
    
    // Generate unique certificate number
    const certificateNumber = generateUniqueNumber();
    
    // Create certificate record
    const query = `
      INSERT INTO certificates (user_id, course_id, certificate_number)
      VALUES (?, ?, ?)
    `;
    
    db.query(query, [userId, courseId, certificateNumber], async (err, result) => {
      if (err) {
        throw new Error('Error creating certificate record');
      }
      
      // Generate PDF certificate
      const pdfBuffer = await generateCertificatePDF({
        userName: `${user.first_name} ${user.last_name}`,
        courseName: course.title,
        certificateNumber: certificateNumber,
        issueDate: new Date().toLocaleDateString()
      });
      
      // Send certificate email
      await sendCertificateEmail(user.email, user.first_name, pdfBuffer);
      
      return result.insertId;
    });
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw error;
  }
}
```

## API Documentation

### Authentication Endpoints

#### POST /api/register
- **Purpose**: Register a new user.
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string",
    "first_name": "string",
    "last_name": "string"
  }
  ```
- **Response**: 201 Created
  ```json
  {
    "message": "User registered successfully"
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid input (e.g., missing fields, invalid email format)
  - 500 Internal Server Error: Server-side error (e.g., database error)

**Implementation Details**:
```javascript
app.post('/api/register', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;
  
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user into database
    const query = 'INSERT INTO users (email, password, first_name, last_name) VALUES (?, ?, ?, ?)';
    db.query(query, [email, hashedPassword, first_name, last_name], async (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error registering user' });
      }

      // Send welcome email
      try {
        await sendWelcomeEmail(email, first_name);
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Don't return error to user, just log it
      }

      res.status(201).json({ message: 'User registered successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
});
```

#### POST /api/login
- **Purpose**: Authenticate a user and return a JWT token.
- **Request Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "token": "string",
    "user": {
      "id": "number",
      "email": "string",
      "firstName": "string",
      "lastName": "string",
      "role": "string"
    }
  }
  ```
- **Error Responses**:
  - 401 Unauthorized: Invalid credentials
  - 500 Internal Server Error: Server-side error

**Implementation Details**:
```javascript
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Error logging in' });
      }
      
      if (results.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const user = results[0];
      
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});
```

### Course Management Endpoints

#### GET /api/courses
- **Purpose**: List all available courses.
- **Response**: 200 OK
  ```json
  [
    {
      "id": "number",
      "title": "string",
      "description": "string",
      "price": "number",
      "instructor_id": "number",
      "first_name": "string",
      "last_name": "string"
    }
  ]
  ```
- **Error Responses**:
  - 500 Internal Server Error: Server-side error

**Implementation Details**:
```javascript
app.get('/api/courses', (req, res) => {
  const query = `
    SELECT c.*, u.first_name, u.last_name 
    FROM courses c 
    LEFT JOIN users u ON c.instructor_id = u.id
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching courses:', err);
      return res.status(500).json({ error: 'Error fetching courses' });
    }
    res.json(results);
  });
});
```

#### GET /api/enrolled-courses
- **Purpose**: Get all courses enrolled by the authenticated user.
- **Response**: 200 OK
  ```json
  [
    {
      "id": "number",
      "title": "string",
      "description": "string",
      "price": "number",
      "instructor_id": "number",
      "enrollment_date": "string",
      "status": "string"
    }
  ]
  ```
- **Error Responses**:
  - 401 Unauthorized: Not authenticated
  - 500 Internal Server Error: Server-side error

**Implementation Details**:
```javascript
app.get('/api/enrolled-courses', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const query = `
    SELECT c.*, ce.enrollment_date, ce.status
    FROM courses c
    INNER JOIN course_enrollments ce ON c.id = ce.course_id
    WHERE ce.user_id = ? AND ce.status = 'active'
    ORDER BY ce.enrollment_date DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error('Error fetching enrolled courses:', err);
      return res.status(500).json({ error: 'Error fetching enrolled courses' });
    }
    res.json(results);
  });
});
```

### Quiz Management Endpoints

#### POST /api/chapters/:chapterId/quizzes
- **Purpose**: Create a new quiz for a chapter (admin only).
- **Request Body**:
  ```json
  {
    "title": "string",
    "description": "string",
    "passing_score": "number",
    "questions": [
      {
        "text": "string",
        "type": "string",
        "answers": [
          {
            "text": "string",
            "isCorrect": "boolean"
          }
        ]
      }
    ]
  }
  ```
- **Response**: 201 Created
  ```json
  {
    "message": "Quiz created successfully",
    "quizId": "number"
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid input
  - 401 Unauthorized: Not authenticated
  - 403 Forbidden: Not authorized as admin
  - 404 Not Found: Chapter not found
  - 500 Internal Server Error: Server-side error

### Payment Endpoints

#### POST /api/create-payment-intent
- **Purpose**: Initialize a Stripe payment intent.
- **Request Body**:
  ```json
  {
    "amount": "number",
    "currency": "string"
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "clientSecret": "string"
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid input
  - 500 Internal Server Error: Server-side error

#### POST /api/create-paypal-order
- **Purpose**: Initialize a PayPal order.
- **Request Body**:
  ```json
  {
    "amount": "number",
    "currency": "string"
  }
  ```
- **Response**: 200 OK
  ```json
  {
    "orderID": "string"
  }
  ```
- **Error Responses**:
  - 400 Bad Request: Invalid input
  - 500 Internal Server Error: Server-side error

### Common Error Responses

- **400 Bad Request**: Invalid input data
  ```json
  {
    "error": {
      "message": "Invalid input",
      "code": "INVALID_INPUT"
    }
  }
  ```
- **401 Unauthorized**: Not authenticated
  ```json
  {
    "error": {
      "message": "No token provided",
      "code": "NO_TOKEN"
    }
  }
  ```
- **403 Forbidden**: Not authorized
  ```json
  {
    "error": {
      "message": "Not authorized as admin",
      "code": "NOT_ADMIN"
    }
  }
  ```
- **404 Not Found**: Resource not found
  ```json
  {
    "error": {
      "message": "Resource not found",
      "code": "NOT_FOUND"
    }
  }
  ```
- **500 Internal Server Error**: Server-side error
  ```json
  {
    "error": {
      "message": "Internal Server Error",
      "code": "INTERNAL_ERROR"
    }
  }
  ```

## Authentication & Authorization

### JWT Implementation
- Token-based authentication
- 24-hour token expiration
- Role-based access control

### Security Measures
- Password hashing with bcrypt
- HTTPS enforcement
- CORS configuration
- Input validation

## Payment Integration

### Stripe Integration
- Secure payment processing
- Support for multiple currencies
- Payment intent creation
- Client-side payment confirmation

### PayPal Integration
- Sandbox and production environments
- Express checkout implementation
- Order management
- Payment capture

### Recommended Webhook Implementation
While the current implementation doesn't include webhooks, it's recommended to add them for better payment handling:

```javascript
// Example Stripe webhook implementation
app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Handle successful payment
      await handleSuccessfulPayment(paymentIntent);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      // Handle failed payment
      await handleFailedPayment(failedPayment);
      break;
  }

  res.json({received: true});
});

// Example PayPal webhook implementation
app.post('/api/webhooks/paypal', async (req, res) => {
  const event = req.body;

  switch (event.event_type) {
    case 'PAYMENT.CAPTURE.COMPLETED':
      // Handle successful payment
      await handlePayPalPaymentSuccess(event.resource);
      break;
    case 'PAYMENT.CAPTURE.DENIED':
      // Handle failed payment
      await handlePayPalPaymentFailure(event.resource);
      break;
  }

  res.json({received: true});
});
```

## Error Handling and Logging

### Global Error Handler
```javascript
// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Log error to monitoring service
  logError(err);
  
  // Send appropriate response
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});
```

### Request Logging
```javascript
// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});
```

## Security Best Practices

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again after 15 minutes'
});

app.use('/api/login', loginLimiter);
```

### Input Validation
```javascript
const { body, validationResult } = require('express-validator');

const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

app.post('/api/register', validateRegistration, async (req, res) => {
  // Registration logic
});
```

## Performance Optimization

### Database Indexing
```sql
-- Add indexes for frequently queried columns
ALTER TABLE users ADD INDEX idx_email (email);
ALTER TABLE courses ADD INDEX idx_instructor (instructor_id);
ALTER TABLE chapters ADD INDEX idx_course_order (course_id, order_index);
ALTER TABLE user_progress ADD INDEX idx_user_video (user_id, video_id);
```

### Query Optimization
```javascript
// Example of optimized course query with proper joins
const getCourseWithDetails = async (courseId) => {
  const query = `
    SELECT 
      c.*,
      u.first_name as instructor_first_name,
      u.last_name as instructor_last_name,
      COUNT(DISTINCT ce.user_id) as enrolled_students,
      AVG(cf.rating) as average_rating
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    LEFT JOIN course_enrollments ce ON c.id = ce.course_id
    LEFT JOIN course_feedback cf ON c.id = cf.course_id
    WHERE c.id = ?
    GROUP BY c.id
  `;
  
  return db.query(query, [courseId]);
};
```

## Testing Strategy

### Unit Tests
```javascript
// Example unit test for user registration
describe('User Registration', () => {
  test('should register a new user successfully', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User'
    };
    
    const response = await request(app)
      .post('/api/register')
      .send(userData);
    
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User registered successfully');
  });
});
```

### Integration Tests
```javascript
// Example integration test for course enrollment
describe('Course Enrollment', () => {
  test('should enroll user in course after successful payment', async () => {
    // Create test user
    const user = await createTestUser();
    
    // Create test course
    const course = await createTestCourse();
    
    // Simulate payment
    const payment = await simulatePayment(user.id, course.id);
    
    // Check enrollment
    const enrollment = await getEnrollment(user.id, course.id);
    
    expect(enrollment.status).toBe('active');
    expect(enrollment.payment_id).toBe(payment.id);
  });
});
```

## Monitoring and Maintenance

### Health Check Endpoint
```javascript
app.get('/api/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now()
  };
  
  try {
    // Check database connection
    db.query('SELECT 1', (err) => {
      if (err) {
        healthcheck.database = 'ERROR';
        return res.status(503).json(healthcheck);
      }
      
      healthcheck.database = 'OK';
      res.json(healthcheck);
    });
  } catch (error) {
    healthcheck.database = 'ERROR';
    res.status(503).json(healthcheck);
  }
});
```

### Database Backup Strategy
```sql
-- Example backup script
mysqldump -u username -p lms_db > backup_$(date +%Y%m%d).sql

-- Example restore script
mysql -u username -p lms_db < backup_20240101.sql
```

## Email System

### Email Types
1. Welcome Emails
2. Enrollment Confirmations
3. Course Completion Notifications

### Implementation
- Asynchronous email sending
- HTML email templates
- Error handling and retry logic

## Certificate Generation

### Features
- PDF certificate generation
- Custom certificate numbers
- Digital signature support
- Email delivery

### Implementation
- PDF template management
- Dynamic content insertion
- Secure storage

## Development Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- npm or yarn

### Environment Variables
```env
DB_HOST=localhost
DB_USER=username
DB_PASSWORD=your_password
DB_NAME=lms_db
JWT_SECRET=jwt_secret
PORT=3000
RESEND_API_KEY=your_resend_api_key
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### Installation Steps
1. Clone repository
2. Install dependencies: `npm install`
3. Set up database: `mysql -u username -p < schema.sql`
4. Configure environment variables
5. Start development server: `npm run dev`

## Deployment Guide

### Production Considerations
- Environment configuration
- Database optimization
- SSL/TLS setup
- Load balancing
- Monitoring setup

### Deployment Steps
1. Build application
2. Configure production environment
3. Set up database
4. Configure web server
5. Set up SSL certificates
6. Deploy application

## Security Considerations

### Data Protection
- Password hashing
- Input sanitization
- SQL injection prevention
- XSS protection

### API Security
- Rate limiting
- Request validation
- Error handling
- Logging

## Troubleshooting

### Common Issues
1. Database Connection Issues
   - Check database credentials
   - Verify database service
   - Check network connectivity

2. Payment Processing Issues
   - Verify API keys
   - Check webhook configuration
   - Validate payment data

3. Email Delivery Issues
   - Check email service configuration
   - Verify email templates
   - Check spam filters

### Debugging Tools
- Console logging
- Error tracking
- Database monitoring
- API testing tools

## Frontend Overview

The frontend of this Learning Management System is a static web application located in the `public/` directory. It is designed to provide a clean, modern, and user-friendly interface for students and administrators.

### Visual Structure & Layout

- **Homepage (`index.html`)**: The homepage serves as the main entry point. It typically features a welcoming header with the Greendata logo, a navigation bar, and sections for login, registration, and course browsing. The layout is organized using semantic HTML elements and styled for clarity and accessibility.

- **Navigation**: A top navigation bar or header is present on most pages, displaying the logo (`greendata logo.png`) and links to key sections such as Home, Courses, Login, and Register. The navigation is styled for visibility and ease of use.

- **Course Listings**: Courses are displayed in a grid or list format, with each course presented as a card or panel. Each card includes the course title, a brief description, and a call-to-action button (e.g., "View Details" or "Enroll").

- **Forms**: Login and registration forms are centered on the page, with clear labels, input fields, and styled buttons. Form elements are spaced for readability and accessibility.

- **Payment Success Page (`payment-success.html`)**: After a successful payment, users are redirected to a confirmation page. This page features a prominent success message, visual cues (such as a checkmark or green color), and instructions for next steps.

- **Branding**: The Greendata logo is displayed prominently on all main pages, reinforcing brand identity. The color palette and typography are chosen to be modern, professional, and easy on the eyes.

### Sample UI Screenshots

#### Landing Page
![Landing Page](Sample%20UI/landing%20page.jpg)
*The landing page welcomes users with branding, navigation, and a clean layout for login, registration, and course browsing.*

#### Course View Page
![Course View Page](Sample%20UI/course%20view%20page.jpg)
*The course view page displays course details, chapters, and video content in a structured and visually appealing format.*

#### Admin Dashboard
![Admin Dashboard](Sample%20UI/admin%20dashboard.jpg)
*The admin dashboard provides an overview of platform activity, course management, and user statistics in a clear, organized interface.*

### Styling & Responsiveness

- **CSS (`styles.css`)**: All visual styling is handled by the `styles.css` file. This includes layout (using Flexbox or Grid), color schemes, font choices, button styles, spacing, and responsive breakpoints.
    - **Color Scheme**: The application uses a consistent color palette, often with greens, whites, and grays to match the Greendata branding.
    - **Typography**: Clean, sans-serif fonts are used for readability.
    - **Buttons & Inputs**: Buttons are styled with rounded corners, hover effects, and clear color contrast. Input fields are styled for clarity and accessibility.
    - **Cards & Panels**: Course and content cards have subtle shadows, padding, and rounded corners to create a modern look.
    - **Responsiveness**: The layout adapts to different screen sizes using media queries, ensuring usability on desktops, tablets, and mobile devices.

### How the Look is Achieved

- **HTML Structure**: Semantic HTML elements (header, nav, main, section, form, etc.) are used to organize content logically and accessibly.
- **Bootstrap**: The frontend uses Bootstrap for layout, components, and responsive design. Bootstrap classes (e.g., `container`, `row`, `col`, `btn`, `card`) are used to create a consistent, modern look. Custom CSS in `styles.css` augments or overrides Bootstrap defaults to match the Greendata branding and design preferences.
- **CSS Styling**: The `styles.css` file defines all visual aspects, including layout (Flexbox/Grid), colors, fonts, spacing, and responsive design. Custom classes are used to apply consistent styles across components.
- **Images & Icons**: The logo and any icons are included as image files and styled for appropriate sizing and placement.
- **Feedback & States**: Visual feedback is provided for user actions (e.g., button hover, form validation errors, success messages) using CSS transitions and color changes.

### Example: Course Card Markup
```html
<div class="course-card">
  <h3>Course Title</h3>
  <p>Short course description goes here.</p>
  <button class="enroll-btn">Enroll</button>
</div>
```

### Example: CSS for Course Card
```css
.course-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1.5rem;
  margin: 1rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.course-card h3 {
  margin-top: 0;
  color: #2e7d32;
}
.enroll-btn {
  background: #43a047;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1.5rem;
  margin-top: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.enroll-btn:hover {
  background: #388e3c;
}
```

### Summary
The frontend is visually appealing, clean, and easy to navigate. Its look is achieved through a combination of semantic HTML, modern CSS techniques, and consistent branding. The design ensures a positive user experience across all devices, making the LMS accessible and professional for all users. 

## SQL Queries

### User Management

#### Get User Progress (Admin Dashboard)
```sql
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    COUNT(DISTINCT ce.id) as enrolled_courses,
    SUM(CASE WHEN ce.status = 'completed' THEN 1 ELSE 0 END) as completed_courses
FROM users u
LEFT JOIN course_enrollments ce ON u.id = ce.user_id
WHERE u.role = 'student'
GROUP BY u.id, u.first_name, u.last_name
```

#### Get Total Statistics (Admin Dashboard)
```sql
SELECT 
    (SELECT COUNT(*) FROM users WHERE role = 'student') as total_users,
    (SELECT COUNT(*) FROM courses) as total_courses,
    (SELECT COUNT(*) FROM course_enrollments) as total_enrollments,
    (SELECT COUNT(*) FROM course_enrollments WHERE status = 'completed') as completed_enrollments
```

### Course Management

#### Get Course Details with Instructor
```sql
SELECT c.*, u.first_name, u.last_name 
FROM courses c 
LEFT JOIN users u ON c.instructor_id = u.id
```

#### Get Enrolled Courses for User
```sql
SELECT c.*, ce.enrollment_date, ce.status
FROM courses c
INNER JOIN course_enrollments ce ON c.id = ce.course_id
WHERE ce.user_id = ? AND ce.status = 'active'
ORDER BY ce.enrollment_date DESC
```

#### Check Course Enrollment Status
```sql
SELECT * FROM course_enrollments 
WHERE user_id = ? AND course_id = ? AND status = 'active'
```

### Certificate Management

#### Check Existing Certificate
```sql
SELECT id FROM certificates 
WHERE user_id = ? AND course_id = ?
```

#### Get User and Course Info for Certificate
```sql
SELECT u.email, u.first_name, c.title as course_title
FROM users u
JOIN courses c ON c.id = ?
WHERE u.id = ?
```

### Payment and Enrollment

#### Check Existing Enrollment
```sql
SELECT * FROM course_enrollments 
WHERE user_id = ? AND course_id = ?
```

#### Get User and Course Info for Enrollment Email
```sql
SELECT u.email, u.first_name, c.title as course_title, c.description as course_description
FROM users u
JOIN courses c ON c.id = ?
WHERE u.id = ?
```

### Pre-Course Questionnaire

#### Check Existing Pre-Course Responses
```sql
SELECT id FROM pre_course_responses 
WHERE user_id = ? AND course_id = ?
```

#### Insert Pre-Course Responses
```sql
INSERT INTO pre_course_responses 
(user_id, course_id, motivation, knowledge_level, expectations)
VALUES (?, ?, ?, ?, ?)
```

### Quiz Management

#### Get Quiz Results
```sql
SELECT 
    q.title as quiz_title,
    qr.score,
    qr.completed_at,
    CASE 
        WHEN qr.score >= q.passing_score THEN 'passed'
        ELSE 'failed'
    END as result
FROM quiz_results qr
JOIN quizzes q ON qr.quiz_id = q.id
WHERE qr.user_id = ? AND qr.course_id = ?
ORDER BY qr.completed_at DESC
```

#### Get Quiz Questions with Answers
```sql
SELECT 
    q.text as question_text,
    q.type as question_type,
    GROUP_CONCAT(
        JSON_OBJECT(
            'text', a.text,
            'isCorrect', a.is_correct
        )
    ) as answers
FROM quiz_questions q
LEFT JOIN quiz_answers a ON q.id = a.question_id
WHERE q.quiz_id = ?
GROUP BY q.id
```

### Course Progress Tracking

#### Get User's Course Progress
```sql
SELECT 
    c.title as course_title,
    COUNT(DISTINCT ch.id) as total_chapters,
    COUNT(DISTINCT CASE WHEN cp.completed = 1 THEN cp.chapter_id END) as completed_chapters,
    CASE 
        WHEN COUNT(DISTINCT ch.id) > 0 
        THEN ROUND((COUNT(DISTINCT CASE WHEN cp.completed = 1 THEN cp.chapter_id END) / COUNT(DISTINCT ch.id)) * 100)
        ELSE 0 
    END as completion_percentage
FROM courses c
LEFT JOIN chapters ch ON c.id = ch.course_id
LEFT JOIN chapter_progress cp ON ch.id = cp.chapter_id AND cp.user_id = ?
WHERE c.id = ?
GROUP BY c.id, c.title
```

## State Management

The application uses a combination of client-side state management approaches to handle user data and application state:

### Authentication State
- **JWT Token Storage**: Authentication token is stored in `localStorage` for persistence across page reloads
- **User Information**: User data (id, name, role) is stored in `localStorage` for quick access
- **Role-based Access**: User role is stored separately in `localStorage` for role-based UI rendering

```javascript
// Storing authentication state
localStorage.setItem('token', result.token);
localStorage.setItem('user', JSON.stringify(result.user));
localStorage.setItem('role', result.user.role);

// Clearing authentication state on logout
localStorage.removeItem('token');
localStorage.removeItem('user');
localStorage.removeItem('role');
```

### Application State
- **Current View**: Tracks the current view state (catalog, course, admin dashboard)
- **UI State**: Manages visibility of UI elements based on user authentication and role
- **Course Progress**: Tracks video progress and course completion status

```javascript
// View state management
let currentView = 'catalog';

// UI state updates based on authentication
function updateUI() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = localStorage.getItem('role');
    
    // Update navigation items based on role
    updateElementDisplay('loginBtn', !token);
    updateElementDisplay('registerBtn', !token);
    updateElementDisplay('logoutBtn', !!token);
    updateElementDisplay('myCoursesNavItem', role === 'student');
    updateElementDisplay('adminDashboardNavItem', role === 'admin');
}
```

### Course Progress State
- **Video Progress**: Tracks video watching progress using timestamps
- **Course Completion**: Monitors chapter and course completion status
- **Quiz Results**: Stores quiz scores and completion status

```javascript
// Video progress tracking
async function updateVideoProgress(videoId, progressPercentage, lastWatchedPosition) {
    const token = localStorage.getItem('token');
    try {
        await fetch('/api/progress', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                videoId,
                progressPercentage,
                lastWatchedPosition
            })
        });
    } catch (error) {
        console.error('Error updating progress:', error);
    }
}
```

### State Persistence
- **Session Persistence**: Authentication state persists across page reloads
- **Progress Persistence**: Course progress is stored in the database and synced with the UI
- **Form State**: Form data is preserved during multi-step processes (e.g., course enrollment)

### State Security
- **Token Expiration**: JWT tokens expire after 24 hours
- **Secure Storage**: Sensitive data is not stored in localStorage
- **Server-side Validation**: All state changes are validated on the server

This state management approach provides:
1. Persistent user sessions
2. Role-based access control
3. Real-time progress tracking
4. Secure data handling
5. Smooth user experience with minimal page reloads