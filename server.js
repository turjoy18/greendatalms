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
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

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
app.get('/api/courses', authenticateToken, (req, res) => {
  const query = `
    SELECT c.*, u.first_name, u.last_name 
    FROM courses c 
    LEFT JOIN users u ON c.instructor_id = u.id
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching courses' });
    }
    res.json(results);
  });
});

// Get course details with chapters and videos
app.get('/api/courses/:courseId', authenticateToken, (req, res) => {
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
      return res.status(500).json({ error: 'Error fetching course details' });
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 