// Load environment variables at the very top
require('dotenv').config();

const fs = require('fs');
console.log('Does .env exist?', fs.existsSync('.env'));
console.log('Raw .env contents:', fs.readFileSync('.env', 'utf8'));

console.log('Loaded STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY);
console.log('Loaded STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY);

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { sendWelcomeEmail, sendCertificateEmail, sendEnrollmentConfirmation } = require('./utils/emailUtils');
const paypal = require('@paypal/checkout-server-sdk');
const { generateCertificatePDF } = require('./utils/certificateUtils');

// Debug log for Stripe key
console.log('Stripe Secret Key:', process.env.STRIPE_SECRET_KEY ? 'Present' : 'Missing');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Log the current working directory and .env file path
console.log('Current working directory:', process.cwd());
console.log('.env file path:', path.resolve(process.cwd(), '.env'));

// Debug all environment variables (excluding sensitive values)
console.log('Environment variables loaded:', {
    RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Present' : 'Missing',
    JWT_SECRET: process.env.JWT_SECRET ? 'Present' : 'Missing',
    NODE_ENV: process.env.NODE_ENV || 'Not set'
});

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Admin middleware
const isAdmin = (req, res, next) => {
    console.log('Checking admin status...');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('Invalid token:', err.message);
            return res.status(401).json({ error: 'Invalid token' });
        }

        console.log('Token decoded:', decoded);
        // Query to check if user is admin
        const query = 'SELECT role FROM users WHERE id = ?';
        db.query(query, [decoded.userId], (error, results) => {
            if (error) {
                console.error('Error checking admin status:', error);
                return res.status(500).json({ error: 'Error checking admin status' });
            }

            console.log('User role check results:', results);
            if (!results.length || results[0].role !== 'admin') {
                console.log('User is not an admin');
                return res.status(403).json({ error: 'Not authorized as admin' });
            }

            console.log('User is admin, proceeding...');
            req.user = decoded;
            next();
        });
    });
};

// Debug middleware to log all requests
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// PayPal SDK setup (add this near the top, after dotenv/config)
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'sandbox';
let paypalEnvironment;
if (PAYPAL_MODE === 'live') {
  console.log('Using PayPal Live Environment');
  paypalEnvironment = new paypal.core.LiveEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
} else {
  console.log('Using PayPal Sandbox Environment');
  paypalEnvironment = new paypal.core.SandboxEnvironment(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
}
const paypalClient = new paypal.core.PayPalHttpClient(paypalEnvironment);

// Routes
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

// Get all courses
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
    console.log('Courses fetched:', results);
    res.json(results);
  });
});

// Get course details with chapters and videos
app.get('/api/courses/:courseId', (req, res) => {
  const courseId = req.params.courseId;
  
  const query = `
    SELECT 
      c.*,
      ch.id as chapter_id,
      ch.title as chapter_title,
      ch.description as chapter_description,
      ch.order_index,
      v.id as video_id,
      v.title as video_title,
      v.description as video_description,
      v.video_url,
      v.duration
    FROM courses c
    LEFT JOIN chapters ch ON c.id = ch.course_id
    LEFT JOIN videos v ON ch.id = v.chapter_id
    WHERE c.id = ?
    ORDER BY ch.order_index, v.id
  `;
  
  db.query(query, [courseId], (err, results) => {
    if (err) {
      console.error('Error fetching course details:', err);
      return res.status(500).json({ error: 'Error fetching course details' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Organize the results into a structured format
    const course = {
      id: results[0].id,
      title: results[0].title,
      description: results[0].description,
      price: results[0].price,
      chapters: []
    };
    
    let currentChapter = null;
    
    results.forEach(row => {
      if (row.chapter_id && (!currentChapter || currentChapter.id !== row.chapter_id)) {
        currentChapter = {
          id: row.chapter_id,
          title: row.chapter_title,
          description: row.chapter_description,
          orderIndex: row.order_index,
          videos: []
        };
        course.chapters.push(currentChapter);
      }
      
      if (row.video_id) {
        currentChapter.videos.push({
          id: row.video_id,
          title: row.video_title,
          description: row.video_description,
          videoUrl: row.video_url,
          duration: row.duration
        });
      }
    });
    
    res.json(course);
  });
});

// Update video progress
app.post('/api/progress', authenticateToken, (req, res) => {
  const { videoId, progressPercentage, lastWatchedPosition } = req.body;
  const userId = req.user.userId;
  
  const query = `
    INSERT INTO user_progress (user_id, video_id, progress_percentage, last_watched_position, watched)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    progress_percentage = VALUES(progress_percentage),
    last_watched_position = VALUES(last_watched_position),
    watched = VALUES(watched)
  `;
  
  const watched = progressPercentage >= 90;
  
  db.query(query, [userId, videoId, progressPercentage, lastWatchedPosition, watched], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating progress' });
    }
    res.json({ message: 'Progress updated successfully' });
  });
});

// Get user's enrolled courses
app.get('/api/enrolled-courses', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  const query = `
    SELECT c.*, ce.enrollment_date, ce.status
    FROM course_enrollments ce
    JOIN courses c ON ce.course_id = c.id
    WHERE ce.user_id = ?
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching enrolled courses' });
    }
    res.json(results);
  });
});

// Get enrolled courses for a user
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

// Check if user is enrolled in a course
app.get('/api/courses/:courseId/enrollment', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const courseId = req.params.courseId;

  const query = 'SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"';
  
  db.query(query, [userId, courseId], (err, results) => {
    if (err) {
      console.error('Error checking enrollment:', err);
      return res.status(500).json({ error: 'Error checking enrollment status' });
    }
    res.json({ isEnrolled: results.length > 0 });
  });
});

// Get user's progress for all videos in a course
app.get('/api/courses/:courseId/progress', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const courseId = req.params.courseId;

  // Get all videos for the course
  const videosQuery = `
    SELECT v.id AS video_id
    FROM chapters ch
    JOIN videos v ON ch.id = v.chapter_id
    WHERE ch.course_id = ?
  `;

  db.query(videosQuery, [courseId], (err, videos) => {
    if (err) {
      console.error('Error fetching videos for course progress:', err);
      return res.status(500).json({ error: 'Error fetching course progress' });
    }
    if (!videos.length) return res.json({});

    // Get user progress for these videos
    const videoIds = videos.map(v => v.video_id);
    const placeholders = videoIds.map(() => '?').join(',');
    const progressQuery = `
      SELECT video_id, progress_percentage, watched, last_watched_position
      FROM user_progress
      WHERE user_id = ? AND video_id IN (${placeholders})
    `;
    db.query(progressQuery, [userId, ...videoIds], (err, progressRows) => {
      if (err) {
        console.error('Error fetching user progress:', err);
        return res.status(500).json({ error: 'Error fetching user progress' });
      }
      // Map progress by video_id
      const progressMap = {};
      progressRows.forEach(row => {
        progressMap[row.video_id] = {
          progress_percentage: row.progress_percentage,
          watched: row.watched,
          last_watched_position: row.last_watched_position
        };
      });
      res.json(progressMap);
    });
  });
});

// Admin Dashboard API Endpoints
app.get('/api/admin/user-progress', isAdmin, (req, res) => {
    console.log('Fetching user progress...');
    const query = `
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
    `;

    db.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching user progress:', error);
            return res.status(500).json({ error: 'Error fetching user progress' });
        }

        console.log('User progress query results:', results);
        const userProgress = results.map(user => ({
            name: `${user.first_name} ${user.last_name}`,
            enrolledCourses: user.enrolled_courses,
            completedCourses: user.completed_courses,
            completionRate: user.enrolled_courses ? 
                Math.round((user.completed_courses / user.enrolled_courses) * 100) : 0
        }));

        console.log('User progress processed:', userProgress);
        res.json(userProgress);
    });
});

app.get('/api/admin/unfinished-courses', isAdmin, (req, res) => {
    console.log('Fetching unfinished courses...');
    const query = `
        SELECT 
            c.id,
            c.title,
            COUNT(DISTINCT ce.id) as enrollments,
            SUM(CASE WHEN ce.status = 'completed' THEN 1 ELSE 0 END) as completed_enrollments
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
        GROUP BY c.id, c.title
        ORDER BY enrollments DESC
    `;

    console.log('Executing query:', query);

    db.query(query, (error, results) => {
        if (error) {
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage,
                sqlState: error.sqlState
            });
            return res.status(500).json({ 
                error: 'Error fetching unfinished courses',
                details: error.message 
            });
        }

        console.log('Query results:', results);

        try {
            const unfinishedCourses = results.map(course => ({
                title: course.title,
                enrollments: course.enrollments || 0,
                completionRate: course.enrollments ? 
                    Math.round((course.completed_enrollments / course.enrollments) * 100) : 0,
                averageProgress: 0 // We'll add this back once basic query works
            }));

            console.log('Processed courses:', unfinishedCourses);
            res.json(unfinishedCourses);
        } catch (err) {
            console.error('Error processing results:', err);
            res.status(500).json({ 
                error: 'Error processing course data',
                details: err.message 
            });
        }
    });
});

app.get('/api/admin/course-enrollments', isAdmin, (req, res) => {
    console.log('Fetching course enrollments...');
    const query = `
        SELECT 
            c.id,
            c.title,
            COUNT(DISTINCT ce.id) as total_enrollments,
            SUM(CASE WHEN ce.status = 'active' THEN 1 ELSE 0 END) as active_students,
            SUM(CASE WHEN ce.status = 'completed' THEN 1 ELSE 0 END) as completed_enrollments
        FROM courses c
        LEFT JOIN course_enrollments ce ON c.id = ce.course_id
        GROUP BY c.id, c.title
        ORDER BY total_enrollments DESC
    `;

    db.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching course enrollments:', error);
            return res.status(500).json({ error: 'Error fetching course enrollments' });
        }

        const courseEnrollments = results.map(course => ({
            title: course.title,
            totalEnrollments: course.total_enrollments,
            activeStudents: course.active_students,
            completionRate: course.total_enrollments ? 
                Math.round((course.completed_enrollments / course.total_enrollments) * 100) : 0
        }));

        console.log('Course enrollments fetched successfully');
        res.json(courseEnrollments);
    });
});

app.get('/api/admin/total-stats', isAdmin, (req, res) => {
    console.log('Fetching total stats...');
    const query = `
        SELECT 
            (SELECT COUNT(*) FROM users WHERE role = 'student') as total_users,
            (SELECT COUNT(*) FROM courses) as total_courses,
            (SELECT COUNT(*) FROM course_enrollments) as total_enrollments,
            (SELECT COUNT(*) FROM course_enrollments WHERE status = 'completed') as completed_enrollments
    `;

    db.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching total stats:', error);
            return res.status(500).json({ error: 'Error fetching total stats' });
        }

        const stats = results[0];
        const completionRate = stats.total_enrollments ? 
            Math.round((stats.completed_enrollments / stats.total_enrollments) * 100) : 0;

        console.log('Total stats fetched successfully');
        res.json({
            totalUsers: stats.total_users,
            totalCourses: stats.total_courses,
            totalEnrollments: stats.total_enrollments,
            completionRate: completionRate
        });
    });
});

// Get user's certificates
app.get('/api/certificates', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    
    const query = `
        SELECT c.*, co.title as course_title, co.description as course_description
        FROM certificates c
        JOIN courses co ON c.course_id = co.id
        WHERE c.user_id = ?
        ORDER BY c.issue_date DESC
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching certificates:', err);
            return res.status(500).json({ error: 'Error fetching certificates' });
        }
        res.json(results);
    });
});

// TEMPORARY: Remove quiz requirement for certificate eligibility (for testing only)
// Eligible if user is enrolled in the course
app.get('/api/courses/:courseId/certificate-status', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const courseId = req.params.courseId;

    const query = 'SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"';
    db.query(query, [userId, courseId], (err, results) => {
        if (err) {
            console.error('Error checking certificate status:', err);
            return res.status(500).json({ error: 'Error checking certificate status' });
        }
        res.json({ eligible_for_certificate: results.length > 0 });
    });
});

// TEMPORARY: Remove quiz requirement for certificate issuance (for testing only)
app.post('/api/courses/:courseId/issue-certificate', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const courseId = req.params.courseId;

    // Check if user is enrolled
    const checkEnrollmentQuery = 'SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ? AND status = "active"';
    db.query(checkEnrollmentQuery, [userId, courseId], async (err, enrollResults) => {
        if (err) {
            console.error('Error checking enrollment:', err);
            return res.status(500).json({ error: 'Error checking enrollment' });
        }
        if (enrollResults.length === 0) {
            return res.status(400).json({ error: 'Not enrolled in course' });
        }
        // Check if certificate already exists
        const checkExistingQuery = 'SELECT id FROM certificates WHERE user_id = ? AND course_id = ?';
        db.query(checkExistingQuery, [userId, courseId], async (err, existingResults) => {
            if (err) {
                console.error('Error checking existing certificate:', err);
                return res.status(500).json({ error: 'Error checking existing certificate' });
            }
            if (existingResults.length > 0) {
                return res.status(400).json({ error: 'Certificate already issued' });
            }
            // Generate certificate number
            const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            // Get user and course information for email
            const userCourseQuery = `
                SELECT u.email, u.first_name, c.title as course_title
                FROM users u
                JOIN courses c ON c.id = ?
                WHERE u.id = ?
            `;
            db.query(userCourseQuery, [courseId, userId], async (err, userCourseResults) => {
                if (err) {
                    console.error('Error fetching user and course info:', err);
                    return res.status(500).json({ error: 'Error fetching user and course info' });
                }
                const { email, first_name, course_title } = userCourseResults[0];
                // Issue new certificate
                const insertQuery = 'INSERT INTO certificates (user_id, course_id, certificate_number) VALUES (?, ?, ?)';
                db.query(insertQuery, [userId, courseId, certificateNumber], async (err, result) => {
                    if (err) {
                        console.error('Error issuing certificate:', err);
                        return res.status(500).json({ error: 'Error issuing certificate' });
                    }
                    // Send certificate email
                    try {
                        await sendCertificateEmail(email, first_name, course_title, certificateNumber);
                    } catch (emailError) {
                        console.error('Error sending certificate email:', emailError);
                        // Don't return error to user, just log it
                    }
                    res.status(201).json({
                        message: 'Certificate issued successfully',
                        certificateId: result.insertId,
                        certificateNumber
                    });
                });
            });
        });
    });
});

// Submit pre-course questionnaire responses
app.post('/api/courses/:courseId/pre-course-responses', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const courseId = req.params.courseId;
    const { motivation, knowledge_level, expectations } = req.body;

    // Validate required fields
    if (!motivation || !knowledge_level || !expectations) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user is enrolled in the course
    const checkEnrollmentQuery = 'SELECT id FROM course_enrollments WHERE user_id = ? AND course_id = ?';
    db.query(checkEnrollmentQuery, [userId, courseId], (err, results) => {
        if (err) {
            console.error('Error checking enrollment:', err);
            return res.status(500).json({ error: 'Error checking enrollment' });
        }

        if (results.length === 0) {
            return res.status(403).json({ error: 'You must be enrolled in the course to submit responses' });
        }

        // Check if responses already exist
        const checkExistingQuery = 'SELECT id FROM pre_course_responses WHERE user_id = ? AND course_id = ?';
        db.query(checkExistingQuery, [userId, courseId], (err, results) => {
            if (err) {
                console.error('Error checking existing responses:', err);
                return res.status(500).json({ error: 'Error checking existing responses' });
            }

            if (results.length > 0) {
                return res.status(400).json({ error: 'You have already submitted responses for this course' });
            }

            // Insert responses
            const insertQuery = `
                INSERT INTO pre_course_responses 
                (user_id, course_id, motivation, knowledge_level, expectations)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            db.query(insertQuery, [userId, courseId, motivation, knowledge_level, expectations], (err, result) => {
                if (err) {
                    console.error('Error saving responses:', err);
                    return res.status(500).json({ error: 'Error saving responses' });
                }

                res.status(201).json({
                    message: 'Responses saved successfully',
                    responseId: result.insertId
                });
            });
        });
    });
});

// Create PayPal order
app.post('/api/paypal/create-order', async (req, res) => {
  const { amount } = req.body;
  console.log('Received /api/paypal/create-order request with amount:', amount);
  console.log('PayPal Client ID:', process.env.PAYPAL_CLIENT_ID);
  if (!paypalClient) {
    console.error('PayPal client is not initialized!');
    return res.status(500).json({ error: 'PayPal client not initialized' });
  }
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{ amount: { currency_code: 'USD', value: amount || '10.00' } }]
  });
  try {
    const order = await paypalClient.execute(request);
    console.log('PayPal order created:', order.result && order.result.id, order.result);
    res.json({ id: order.result.id });
  } catch (err) {
    console.error('PayPal create order error:', err && err.message, err && err.response && err.response.data);
    res.status(500).json({ error: err.message, details: err.response && err.response.data });
  }
});

// Update /api/paypal/capture-order to enroll user after payment
app.post('/api/paypal/capture-order', authenticateToken, async (req, res) => {
  const { orderID, courseId } = req.body;
  const userId = req.user.userId;
  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({});
  try {
    const capture = await paypalClient.execute(request);
    if (capture.result.status === 'COMPLETED') {
      // Check if already enrolled
      const checkQuery = 'SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?';
      db.query(checkQuery, [userId, courseId], (err, results) => {
        if (err) {
          return res.status(500).json({ error: 'Error checking enrollment status' });
        }
        if (results.length > 0) {
          return res.status(200).json({ message: 'Already enrolled', capture: capture.result });
        }
        // Insert enrollment with payment_id
        const enrollQuery = 'INSERT INTO course_enrollments (user_id, course_id, payment_id) VALUES (?, ?, ?)';
        db.query(enrollQuery, [userId, courseId, orderID], async (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Error enrolling in course' });
          }
          // Optionally send confirmation email here
          // Get user and course info for email
          const userCourseQuery = `
            SELECT u.email, u.first_name, c.title as course_title, c.description as course_description
            FROM users u
            JOIN courses c ON c.id = ?
            WHERE u.id = ?
          `;
          db.query(userCourseQuery, [courseId, userId], async (err, userCourseResults) => {
            if (!err && userCourseResults && userCourseResults[0]) {
              const { email, first_name, course_title, course_description } = userCourseResults[0];
              try {
                await sendEnrollmentConfirmation(email, first_name, course_title, course_description);
              } catch (emailError) {
                console.error('Error sending enrollment confirmation email:', emailError);
              }
            }
            res.status(201).json({ message: 'Enrolled successfully', capture: capture.result });
          });
        });
      });
    } else {
      res.status(400).json({ error: 'Payment not completed', capture: capture.result });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to serve PayPal client ID
app.get('/api/paypal/client-id', (req, res) => {
  res.json({ clientId: process.env.PAYPAL_CLIENT_ID });
});

// Download certificate PDF
app.get('/api/certificates/:certificateId/download', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const certificateId = req.params.certificateId;

  console.log(`[DOWNLOAD] User ${userId} requested certificate ${certificateId}`);

  // Get certificate and user info
  const query = `
    SELECT c.*, u.first_name, u.last_name
    FROM certificates c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ? AND c.user_id = ?
  `;
  db.query(query, [certificateId, userId], async (err, results) => {
    if (err) {
      console.error('[DOWNLOAD] Error fetching certificate for download:', err);
      return res.status(500).json({ error: 'Error fetching certificate' });
    }
    if (!results[0]) {
      console.warn(`[DOWNLOAD] Certificate not found for user ${userId}, cert ${certificateId}`);
      return res.status(404).json({ error: 'Certificate not found' });
    }
    const cert = results[0];
    const userName = cert.first_name + (cert.last_name ? ' ' + cert.last_name : '');
    try {
      console.log(`[DOWNLOAD] Generating PDF for ${userName}, cert #${cert.certificate_number}`);
      const pdfBuffer = await generateCertificatePDF(userName, cert.certificate_number);
      if (!pdfBuffer || pdfBuffer.length === 0) {
        console.error('[DOWNLOAD] PDF buffer is empty!');
        return res.status(500).json({ error: 'Failed to generate certificate PDF' });
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${cert.certificate_number}.pdf"`);
      res.send(pdfBuffer);
      console.log(`[DOWNLOAD] PDF sent for user ${userId}, cert ${certificateId}`);
    } catch (e) {
      console.error('[DOWNLOAD] Error generating certificate PDF:', e);
      res.status(500).json({ error: 'Error generating certificate PDF' });
    }
  });
});

// Stripe payment endpoints
app.post('/api/stripe/create-payment-intent', authenticateToken, async (req, res) => {
    try {
        const { amount, courseId } = req.body;
        
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Stripe uses cents
            currency: 'usd',
            metadata: {
                courseId: courseId,
                userId: req.user.userId
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: 'Error creating payment intent' });
    }
});

app.post('/api/stripe/confirm-payment', authenticateToken, async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        
        // Verify the payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
            // Get course ID from payment intent metadata
            const courseId = paymentIntent.metadata.courseId;
            
            if (!courseId) {
                return res.status(400).json({ error: 'Course ID not found in payment metadata' });
            }

            // Enroll the user in the course with payment_id
            const query = 'INSERT INTO course_enrollments (user_id, course_id, payment_id, enrollment_date) VALUES (?, ?, ?, NOW())';
            db.query(query, [req.user.userId, courseId, paymentIntentId], (err, result) => {
                if (err) {
                    console.error('Error enrolling user:', err);
                    return res.status(500).json({ error: 'Error enrolling in course' });
                }
                res.json({ 
                    message: 'Payment successful and enrolled in course',
                    courseId: courseId
                });
            });
        } else {
            res.status(400).json({ error: 'Payment not successful' });
        }
    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({ error: 'Error confirming payment' });
    }
});

// Add this with other API endpoints
app.get('/api/stripe/publishable-key', (req, res) => {
    res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Available routes:');
    console.log('- GET /api/admin/user-progress');
    console.log('- GET /api/admin/unfinished-courses');
    console.log('- GET /api/admin/course-enrollments');
    console.log('- GET /api/admin/total-stats');
}); 