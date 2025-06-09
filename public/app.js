// Sample course data
const courses = [
    {
        id: 1,
        title: "Sustainable Living 101",
        description: "Learn the fundamentals of sustainable living and how to reduce your environmental footprint.",
        price: 49.99,
        image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80",
        duration: "6 weeks",
        level: "Beginner",
        instructor: "Dr. Sarah Green"
    },
    {
        id: 2,
        title: "Renewable Energy Systems",
        description: "Master the principles of renewable energy and learn how to implement sustainable energy solutions.",
        price: 79.99,
        image: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80",
        duration: "8 weeks",
        level: "Intermediate",
        instructor: "Prof. James Wilson"
    },
    {
        id: 3,
        title: "Zero Waste Lifestyle",
        description: "Transform your daily habits and learn how to live a zero-waste lifestyle.",
        price: 39.99,
        image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80",
        duration: "4 weeks",
        level: "Beginner",
        instructor: "Emma Thompson"
    },
    {
        id: 4,
        title: "Sustainable Agriculture",
        description: "Learn modern sustainable farming techniques and organic agriculture practices.",
        price: 69.99,
        image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80",
        duration: "10 weeks",
        level: "Advanced",
        instructor: "Dr. Michael Brown"
    }
];

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const courseCatalog = document.getElementById('courseCatalog');
const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
const paymentForm = document.getElementById('paymentForm');
const paymentCourseDetails = document.getElementById('paymentCourseDetails');
const paymentTotal = document.getElementById('paymentTotal');

// Bootstrap Modals
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));

// Event Listeners
loginBtn.addEventListener('click', () => loginModal.show());
registerBtn.addEventListener('click', () => registerModal.show());

// Display course catalog
function displayCourseCatalog() {
    courseCatalog.innerHTML = courses.map(course => `
        <div class="col-md-6 col-lg-3">
            <div class="card course-card">
                <img src="${course.image}" class="card-img-top" alt="${course.title}">
                <div class="sustainability-badge">
                    <i class="bi bi-leaf"></i> Sustainable
                </div>
                <div class="card-body">
                    <h5 class="card-title">${course.title}</h5>
                    <p class="card-text">${course.description}</p>
                    <div class="course-features">
                        <span class="course-feature">
                            <i class="bi bi-clock"></i> ${course.duration}
                        </span>
                        <span class="course-feature">
                            <i class="bi bi-person"></i> ${course.level}
                        </span>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span class="price">$${course.price}</span>
                        <button class="btn btn-primary" onclick="showPaymentModal(${course.id})">
                            Enroll Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Show payment modal
function showPaymentModal(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    paymentCourseDetails.innerHTML = `
        <div class="d-flex justify-content-between mb-2">
            <span>${course.title}</span>
            <span>$${course.price}</span>
        </div>
    `;
    paymentTotal.textContent = `$${course.price}`;
    paymentModal.show();
}

// Handle payment form submission
paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Here you would typically handle the payment processing
    alert('Payment processed successfully! You can now access the course.');
    paymentModal.hide();
});

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (response.ok) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            loginModal.hide();
            updateUI();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Error logging in');
    }
});

// Handle Registration
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    const data = {
        email: formData.get('email'),
        password: formData.get('password'),
        first_name: formData.get('first_name'),
        last_name: formData.get('last_name')
    };

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (response.ok) {
            registerModal.hide();
            alert('Registration successful! Please login.');
            loginModal.show();
        } else {
            alert(result.error);
        }
    } catch (error) {
        alert('Error registering');
    }
});

// Update UI based on authentication status
function updateUI() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        document.querySelector('.navbar-nav').innerHTML += `
            <li class="nav-item">
                <a class="nav-link" href="#" id="myCoursesBtn">My Courses</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" id="browseCoursesBtn">Browse Courses</a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#" id="logoutBtn">Logout</a>
            </li>
        `;
        document.getElementById('myCoursesBtn').addEventListener('click', loadEnrolledCourses);
        document.getElementById('browseCoursesBtn').addEventListener('click', () => displayCourseCatalog());
        document.getElementById('logoutBtn').addEventListener('click', logout);
    } else {
        loginBtn.style.display = 'block';
        registerBtn.style.display = 'block';
    }
}

// Load enrolled courses
async function loadEnrolledCourses() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/enrolled-courses', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const enrolledCourses = await response.json();
        
        courseCatalog.innerHTML = enrolledCourses.map(course => `
            <div class="col-md-6 col-lg-3">
                <div class="card course-card">
                    <img src="${course.image || 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'}" class="card-img-top" alt="${course.title}">
                    <div class="card-body">
                        <h5 class="card-title">${course.title}</h5>
                        <p class="card-text">${course.description}</p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span class="badge bg-success">Enrolled</span>
                            <button class="btn btn-primary" onclick="viewCourse(${course.id})">
                                Continue Learning
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading enrolled courses:', error);
    }
}

// View course details
async function viewCourseDetails(courseId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/courses/${courseId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const course = await response.json();
        
        mainContent.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h2>${course.title}</h2>
                    <p>${course.description}</p>
                    <p><strong>Price: $${course.price}</strong></p>
                    
                    <h3>Course Content</h3>
                    <div class="accordion" id="courseContent">
                        ${course.chapters.map((chapter, index) => `
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button" 
                                            data-bs-toggle="collapse" data-bs-target="#chapter${chapter.id}">
                                        ${chapter.title}
                                    </button>
                                </h2>
                                <div id="chapter${chapter.id}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}">
                                    <div class="accordion-body">
                                        <p>${chapter.description}</p>
                                        <ul class="list-group">
                                            ${chapter.videos.map(video => `
                                                <li class="list-group-item">
                                                    <i class="bi bi-play-circle"></i> ${video.title}
                                                    <span class="badge bg-secondary float-end">${formatDuration(video.duration)}</span>
                                                </li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <button class="btn btn-primary mt-3" onclick="enrollInCourse(${course.id})">Enroll Now</button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading course details:', error);
    }
}

// View course content
async function viewCourse(courseId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/courses/${courseId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const course = await response.json();
        
        mainContent.innerHTML = `
            <div class="row">
                <div class="col-md-8">
                    <h2>${course.title}</h2>
                    <div class="video-container mb-4">
                        <video id="courseVideo" controls class="w-100">
                            <source src="${course.chapters[0].videos[0].videoUrl}" type="video/mp4">
                            Your browser does not support the video tag.
                        </video>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-4">
                            <div class="list-group">
                                ${course.chapters.map(chapter => `
                                    <div class="list-group-item">
                                        <h5>${chapter.title}</h5>
                                        <div class="list-group">
                                            ${chapter.videos.map(video => `
                                                <a href="#" class="list-group-item list-group-item-action" 
                                                   onclick="playVideo('${video.videoUrl}', ${video.id})">
                                                    ${video.title}
                                                </a>
                                            `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add video progress tracking
        const video = document.getElementById('courseVideo');
        video.addEventListener('timeupdate', () => {
            const progress = (video.currentTime / video.duration) * 100;
            updateVideoProgress(course.chapters[0].videos[0].id, progress, video.currentTime);
        });
    } catch (error) {
        console.error('Error loading course:', error);
    }
}

// Update video progress
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

// Play video
function playVideo(videoUrl, videoId) {
    const video = document.getElementById('courseVideo');
    video.src = videoUrl;
    video.play();
    
    // Reset progress tracking for new video
    video.addEventListener('timeupdate', () => {
        const progress = (video.currentTime / video.duration) * 100;
        updateVideoProgress(videoId, progress, video.currentTime);
    });
}

// Format video duration
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUI();
    displayCourseCatalog();
}

// Initialize UI and display course catalog
updateUI();
displayCourseCatalog(); 