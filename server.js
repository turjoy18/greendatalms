const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

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

// Routes
app.post('/api/register', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;
  
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user into database
    const query = 'INSERT INTO users (email, password, first_name, last_name) VALUES (?, ?, ?, ?)';
    db.query(query, [email, hashedPassword, first_name, last_name], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Error registering user' });
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

// Enroll in a course
app.post('/api/enroll', authenticateToken, (req, res) => {
  const { courseId } = req.body;
  const userId = req.user.userId;

  // First check if user is already enrolled
  const checkQuery = 'SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?';
  db.query(checkQuery, [userId, courseId], (err, results) => {
    if (err) {
      console.error('Error checking enrollment:', err);
      return res.status(500).json({ error: 'Error checking enrollment status' });
    }

    if (results.length > 0) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // If not enrolled, create new enrollment
    const enrollQuery = 'INSERT INTO course_enrollments (user_id, course_id) VALUES (?, ?)';
    db.query(enrollQuery, [userId, courseId], (err, result) => {
      if (err) {
        console.error('Error enrolling in course:', err);
        return res.status(500).json({ error: 'Error enrolling in course' });
      }
      res.status(201).json({ message: 'Successfully enrolled in course' });
    });
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

// Check if user has completed all quizzes for a course
app.get('/api/courses/:courseId/certificate-status', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const courseId = req.params.courseId;
    
    const query = `
        SELECT 
            CASE 
                WHEN COUNT(DISTINCT q.id) = COUNT(DISTINCT qa.id) 
                AND COUNT(DISTINCT qa.id) > 0 
                AND MIN(qa.passed) = 1 
                THEN true 
                ELSE false 
            END as eligible_for_certificate
        FROM courses c
        JOIN chapters ch ON c.id = ch.course_id
        JOIN quizzes q ON ch.id = q.chapter_id
        LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.user_id = ?
        WHERE c.id = ?
    `;
    
    db.query(query, [userId, courseId], (err, results) => {
        if (err) {
            console.error('Error checking certificate status:', err);
            return res.status(500).json({ error: 'Error checking certificate status' });
        }
        res.json(results[0]);
    });
});

// Issue certificate for a course
app.post('/api/courses/:courseId/issue-certificate', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const courseId = req.params.courseId;
    
    // First check if user is eligible
    const checkQuery = `
        SELECT 
            CASE 
                WHEN COUNT(DISTINCT q.id) = COUNT(DISTINCT qa.id) 
                AND COUNT(DISTINCT qa.id) > 0 
                AND MIN(qa.passed) = 1 
                THEN true 
                ELSE false 
            END as eligible_for_certificate
        FROM courses c
        JOIN chapters ch ON c.id = ch.course_id
        JOIN quizzes q ON ch.id = q.chapter_id
        LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.user_id = ?
        WHERE c.id = ?
    `;
    
    db.query(checkQuery, [userId, courseId], (err, results) => {
        if (err) {
            console.error('Error checking certificate eligibility:', err);
            return res.status(500).json({ error: 'Error checking certificate eligibility' });
        }
        
        if (!results[0].eligible_for_certificate) {
            return res.status(400).json({ error: 'Not eligible for certificate' });
        }
        
        // Check if certificate already exists
        const checkExistingQuery = 'SELECT id FROM certificates WHERE user_id = ? AND course_id = ?';
        db.query(checkExistingQuery, [userId, courseId], (err, existingResults) => {
            if (err) {
                console.error('Error checking existing certificate:', err);
                return res.status(500).json({ error: 'Error checking existing certificate' });
            }
            
            if (existingResults.length > 0) {
                return res.status(400).json({ error: 'Certificate already issued' });
            }
            
            // Generate certificate number
            const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Issue new certificate
            const insertQuery = 'INSERT INTO certificates (user_id, course_id, certificate_number) VALUES (?, ?, ?)';
            db.query(insertQuery, [userId, courseId, certificateNumber], (err, result) => {
                if (err) {
                    console.error('Error issuing certificate:', err);
                    return res.status(500).json({ error: 'Error issuing certificate' });
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