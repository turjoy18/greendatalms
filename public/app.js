// DOM Elements
let loginBtn;
let registerBtn;
let loginForm;
let registerForm;
let courseCatalog;
let paymentModal;
let paymentForm;
let paymentCourseDetails;
let paymentTotal;
let mainContent;
let myCoursesNavItem;
let myCertificatesNavItem;
let myCertificatesBtn;
let preCourseQuestionnaireModal;
let preCourseQuestionnaireForm;
let loginModal;
let registerModal;

// Add this at the top with other global variables
let currentView = 'catalog';

// Initialize Stripe
let stripe;
let elements;
let paymentElement;

// Initialize DOM elements after page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    loginBtn = document.getElementById('loginBtn');
    registerBtn = document.getElementById('registerBtn');
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    courseCatalog = document.getElementById('courseCatalog');
    paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    paymentForm = document.getElementById('paymentForm');
    paymentCourseDetails = document.getElementById('paymentCourseDetails');
    paymentTotal = document.getElementById('paymentTotal');
    mainContent = document.getElementById('mainContent');
    myCoursesNavItem = document.getElementById('myCoursesNavItem');
    myCertificatesNavItem = document.getElementById('myCertificatesNavItem');
    myCertificatesBtn = document.getElementById('myCertificatesBtn');
    preCourseQuestionnaireModal = new bootstrap.Modal(document.getElementById('preCourseQuestionnaireModal'));
    preCourseQuestionnaireForm = document.getElementById('preCourseQuestionnaireForm');
    loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    registerModal = new bootstrap.Modal(document.getElementById('registerModal'));

    const allCoursesBtn = document.getElementById('allCoursesBtn');
    const allTemplatesBtn = document.getElementById('allTemplatesBtn');

    // Event Listeners
    if (loginBtn) {
        loginBtn.addEventListener('click', () => loginModal.show());
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', () => registerModal.show());
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const role = e.submitter.getAttribute('data-role');
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
                    // Check if the user role matches the selected login role
                    if ((role === 'admin' && result.user.role !== 'admin') || (role === 'learner' && result.user.role !== 'student')) {
                        alert('You are not authorized to log in as this role.');
                        return;
                    }
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));
                    localStorage.setItem('role', result.user.role);
                    loginModal.hide();
                    
                    // Update UI first
                    updateUI();
                    
                    // Then show enrolled courses if student
                    if (result.user.role === 'student') {
                        showMyCourses();
                    } else {
                        displayCourseCatalog();
                    }
                } else {
                    alert(result.error);
                }
            } catch (error) {
                alert('Error logging in');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const data = {
                email: formData.get('email'),
                password: formData.get('password'),
                first_name: formData.get('first_name'),
                last_name: formData.get('last_name'),
                role: 'learner'
            };

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    alert('Registration successful! Please log in.');
                    registerModal.hide();
                    loginModal.show();
                } else {
                    const result = await response.json();
                    alert(result.error || 'Registration failed');
                }
            } catch (error) {
                alert('Error during registration');
            }
        });
    }

    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const courseId = paymentForm.getAttribute('data-course-id');
            
            try {
                // First process the payment (mock for now)
                // Then enroll the user in the course
                const response = await fetch('/api/enroll', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ courseId })
                });

                if (!response.ok) {
                    throw new Error('Failed to enroll in course');
                }

                alert('Payment successful! You are now enrolled in the course.');
                paymentModal.hide();
                
                // Show pre-course questionnaire instead of going directly to course
                preCourseQuestionnaireForm.setAttribute('data-course-id', courseId);
                preCourseQuestionnaireModal.show();
            } catch (error) {
                console.error('Error enrolling in course:', error);
                alert('Error enrolling in course. Please try again.');
            }
        });
    }

    if (preCourseQuestionnaireForm) {
        preCourseQuestionnaireForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const courseId = preCourseQuestionnaireForm.getAttribute('data-course-id');
            const formData = new FormData(preCourseQuestionnaireForm);
            
            try {
                const response = await fetch(`/api/courses/${courseId}/pre-course-responses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        motivation: formData.get('motivation'),
                        knowledge_level: formData.get('knowledge_level'),
                        expectations: formData.get('expectations')
                    })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to submit questionnaire');
                }

                preCourseQuestionnaireModal.hide();
                
                // Now redirect to the course view
                viewCourse(courseId);
            } catch (error) {
                console.error('Error submitting questionnaire:', error);
                alert(error.message || 'Error submitting questionnaire. Please try again.');
            }
        });
    }

    if (myCertificatesBtn) {
        myCertificatesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showMyCertificates();
        });
    }

    // Initialize the page
    displayCourseCatalog();
    updateUI();

    // Show/hide All Courses and All Templates buttons based on login
    function updateTopNavButtons() {
        const token = localStorage.getItem('token');
        if (!token) {
            if (allCoursesBtn) allCoursesBtn.classList.remove('d-none');
            if (allTemplatesBtn) allTemplatesBtn.classList.remove('d-none');
        } else {
            if (allCoursesBtn) allCoursesBtn.classList.add('d-none');
            if (allTemplatesBtn) allTemplatesBtn.classList.add('d-none');
        }
    }
    updateTopNavButtons();

    // Also call this after login/logout
    const origUpdateUI = updateUI;
    updateUI = function() {
        origUpdateUI.apply(this, arguments);
        updateTopNavButtons();
    };

    // All Courses button shows course catalog
    if (allCoursesBtn) {
        allCoursesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            displayCourseCatalog();
        });
    }
    // All Templates button shows coming soon
    if (allTemplatesBtn) {
        allTemplatesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showSection('.featured-courses-section', false);
            showSection('.join-community-section', false);
            const heroSection = document.querySelector('.hero-section');
            if (heroSection) heroSection.style.display = 'none';
            if (mainContent) {
                mainContent.innerHTML = `<div class='container mt-5 text-center'><h2>All Templates</h2><p class='lead'>Coming soon!</p></div>`;
            }
        });
    }

    // Check for pending questionnaire
    const pendingCourseId = localStorage.getItem('pendingQuestionnaireCourseId');
    if (pendingCourseId) {
        preCourseQuestionnaireForm.setAttribute('data-course-id', pendingCourseId);
        preCourseQuestionnaireModal.show();
        localStorage.removeItem('pendingQuestionnaireCourseId');
    }
});

// Display course catalog
async function displayCourseCatalog() {
    currentView = 'catalog';
    // Show homepage sections
    showSection('.featured-courses-section', true);
    showSection('.join-community-section', true);
    
    // Clean up any existing views first
    cleanupView();
    
    // Show loading state
    courseCatalog.innerHTML = `
        <div class="col-12 text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading courses...</p>
        </div>
    `;
    
    try {
        console.log('Fetching courses...');
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        // Get all courses
        const coursesResponse = await fetch('/api/courses', { headers });
        console.log('Response status:', coursesResponse.status);
        
        if (!coursesResponse.ok) {
            if (coursesResponse.status === 401) {
                courseCatalog.innerHTML = `
                    <div class="col-12 text-center">
                        <p>Please log in to view courses</p>
                        <button class="btn btn-primary" onclick="loginModal.show()">Login</button>
                    </div>
                `;
                return;
            }
            throw new Error('Failed to fetch courses');
        }
        
        const courses = await coursesResponse.json();
        console.log('Courses received:', courses);

        // If user is logged in, get their enrolled courses
        let enrolledCourses = [];
        if (token) {
            const enrolledResponse = await fetch('/api/enrolled-courses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (enrolledResponse.ok) {
                enrolledCourses = await enrolledResponse.json();
            }
        }
        
        if (courses.length === 0) {
            courseCatalog.innerHTML = `
                <div class="col-12 text-center">
                    <p>No courses available at the moment.</p>
                </div>
            `;
            return;
        }
        
        courseCatalog.innerHTML = courses.map(course => {
            const isEnrolled = enrolledCourses.some(ec => ec.id === course.id);
            return `
                <div class="col-md-6 col-lg-3">
                    <div class="card course-card">
                        <img src="https://images.unsplash.com/photo-1473448912268-2022ce9509d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" class="card-img-top" alt="${course.title}">
                        <div class="sustainability-badge">
                            <i class="bi bi-leaf"></i> Sustainable
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${course.title}</h5>
                            <p class="card-text">${course.description.substring(0, 150)}...</p>
                            <div class="course-features">
                                <span class="course-feature">
                                    <i class="bi bi-clock"></i> Self-paced
                                </span>
                                <span class="course-feature">
                                    <i class="bi bi-person"></i> Beginner
                                </span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-3">
                                <span class="price">USD ${course.price}</span>
                                ${isEnrolled ? 
                                    `<button class="btn btn-success" onclick="viewCourse(${course.id})">
                                        Continue Learning
                                    </button>` :
                                    `<button class="btn btn-primary" onclick="viewCourseDetails(${course.id})">
                                        Enroll Now
                                    </button>`
                                }
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error displaying course catalog:', error);
        courseCatalog.innerHTML = `
            <div class="col-12 text-center">
                <div class="alert alert-danger">
                    Error loading courses. Please try again later.
                </div>
                <button class="btn btn-primary" onclick="displayCourseCatalog()">Retry</button>
            </div>
        `;
    }
}

// Show payment modal
async function showPaymentModal(courseId) {
    const token = localStorage.getItem('token');
    if (!token) {
        // If not logged in, show registration modal first
        registerModal.show();
        // Store the course ID to handle after registration
        registerForm.setAttribute('data-course-id', courseId);
        return;
    }

    try {
        const response = await fetch(`/api/courses/${courseId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch course details');
        }
        
        const course = await response.json();
        
        paymentCourseDetails.innerHTML = `
            <div class="d-flex justify-content-between mb-2">
                <span>${course.title}</span>
                <span>USD ${course.price}</span>
            </div>
        `;
        paymentTotal.textContent = `USD ${course.price}`;
        paymentModal.show();

        // Initialize payment methods
        initializePaymentMethods(courseId, course.price);
    } catch (error) {
        console.error('Error fetching course details:', error);
        alert('Error loading course details. Please try again later.');
    }
}

// Initialize payment methods
async function initializePaymentMethods(courseId, price) {
    // Initialize PayPal
    renderPayPalButton(courseId, price);

    // Get Stripe publishable key
    const keyResponse = await fetch('/api/stripe/publishable-key');
    const { publishableKey } = await keyResponse.json();

    // Initialize Stripe
    const stripeResponse = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            amount: price,
            courseId: courseId
        })
    });

    const { clientSecret } = await stripeResponse.json();

    // Initialize Stripe
    stripe = Stripe(publishableKey);
    elements = stripe.elements({ clientSecret });
    paymentElement = elements.create('payment');
    paymentElement.mount('#payment-element');

    // Add payment method selection handlers
    document.getElementById('paypalMethod').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('paypal-button-container').style.display = 'block';
            document.getElementById('stripe-payment-form').style.display = 'none';
        }
    });

    document.getElementById('stripeMethod').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('paypal-button-container').style.display = 'none';
            document.getElementById('stripe-payment-form').style.display = 'block';
        }
    });

    // Handle Stripe form submission
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleStripePayment(courseId);
    });
}

// Handle Stripe payment
async function handleStripePayment(courseId) {
    const submitButton = document.getElementById('submit-payment');
    const messageDiv = document.getElementById('payment-message');
    
    submitButton.disabled = true;
    submitButton.querySelector('#spinner').classList.remove('hidden');
    submitButton.querySelector('#button-text').classList.add('hidden');

    try {
        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/payment-success.html`,
            }
        });

        if (error) {
            messageDiv.textContent = error.message;
            messageDiv.classList.remove('hidden');
        } else {
            // Payment successful, confirm on server
            const response = await fetch('/api/stripe/confirm-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    paymentIntentId: paymentIntent.id,
                    courseId: courseId
                })
            });

            if (response.ok) {
                paymentModal.hide();
                preCourseQuestionnaireForm.setAttribute('data-course-id', courseId);
                preCourseQuestionnaireModal.show();
            } else {
                throw new Error('Failed to confirm payment');
            }
        }
    } catch (error) {
        messageDiv.textContent = 'An error occurred. Please try again.';
        messageDiv.classList.remove('hidden');
    } finally {
        submitButton.disabled = false;
        submitButton.querySelector('#spinner').classList.add('hidden');
        submitButton.querySelector('#button-text').classList.remove('hidden');
    }
}

// Helper to load PayPal SDK if not already loaded
function loadPayPalSdk(clientId, callback) {
    if (document.getElementById('paypal-sdk')) {
        callback();
        return;
    }
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}`;
    script.onload = callback;
    document.body.appendChild(script);
}

// Render PayPal button
function renderPayPalButton(courseId, price) {
    const container = document.getElementById('paypal-button-container');
    container.innerHTML = '';
    fetch('/api/paypal/client-id')
      .then(res => res.json())
      .then(data => {
        const clientId = data.clientId;
        loadPayPalSdk(clientId, () => {
            paypal.Buttons({
                createOrder: function(data, actions) {
                    console.log('About to POST to /api/paypal/create-order with amount:', price);
                    return fetch('/api/paypal/create-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: price })
                    })
                    .then(response => {
                        console.log('PayPal create-order response status:', response.status);
                        return response.json();
                    })
                    .then(data => {
                        console.log('PayPal create-order response data:', data);
                        return data.id;
                    })
                    .catch(error => {
                        console.error('Error in fetch to /api/paypal/create-order:', error);
                        throw error;
                    });
                },
                onApprove: function(data, actions) {
                    return fetch('/api/paypal/capture-order', {
                        method: 'post',
                        headers: {
                            'content-type': 'application/json',
                            'authorization': 'Bearer ' + localStorage.getItem('token')
                        },
                        body: JSON.stringify({ orderID: data.orderID, courseId })
                    })
                    .then(res => res.json())
                    .then(details => {
                        if (details.message === 'Enrolled successfully') {
                            paymentModal.hide();
                            // Show success message
                            const successAlert = document.createElement('div');
                            successAlert.className = 'alert alert-success alert-dismissible fade show';
                            successAlert.innerHTML = `
                                Payment successful! You are now enrolled in the course.
                                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                            `;
                            document.querySelector('.modal-body').prepend(successAlert);
                            
                            // Show pre-course questionnaire
                            preCourseQuestionnaireForm.setAttribute('data-course-id', courseId);
                            preCourseQuestionnaireModal.show();
                        } else {
                            // Show error message
                            const errorAlert = document.createElement('div');
                            errorAlert.className = 'alert alert-danger alert-dismissible fade show';
                            errorAlert.innerHTML = `
                                Payment failed or already enrolled. Please try again.
                                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                            `;
                            document.querySelector('.modal-body').prepend(errorAlert);
                        }
                    })
                    .catch(error => {
                        // Show error message for network/other errors
                        const errorAlert = document.createElement('div');
                        errorAlert.className = 'alert alert-danger alert-dismissible fade show';
                        errorAlert.innerHTML = `
                            An error occurred during payment. Please try again.
                            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                        `;
                        document.querySelector('.modal-body').prepend(errorAlert);
                    });
                }
            }).render('#paypal-button-container');
        });
      });
}

// Update UI based on user role
function updateUI() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = localStorage.getItem('role');
    
    // Helper function to safely update element display
    const updateElementDisplay = (elementId, shouldShow) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = shouldShow ? 'block' : 'none';
        }
    };
    
    // Update navigation items
    if (token && user) {
        updateElementDisplay('loginBtn', false);
        updateElementDisplay('registerBtn', false);
        updateElementDisplay('logoutBtn', true);
        updateElementDisplay('userWelcome', true);
        updateElementDisplay('myCoursesNavItem', role === 'student');
        updateElementDisplay('myCertificatesNavItem', role === 'student');
        updateElementDisplay('adminDashboardNavItem', role === 'admin');
        
        document.getElementById('userWelcome').textContent = `Welcome, ${user.firstName}!`;
    } else {
        updateElementDisplay('loginBtn', true);
        updateElementDisplay('registerBtn', true);
        updateElementDisplay('logoutBtn', false);
        updateElementDisplay('userWelcome', false);
        updateElementDisplay('myCoursesNavItem', false);
        updateElementDisplay('myCertificatesNavItem', false);
        updateElementDisplay('adminDashboardNavItem', false);
    }
    
    // Always show course catalog unless explicitly in admin view
    if (currentView !== 'admin') {
        displayCourseCatalog();
    }
}

// Helper to show/hide homepage sections
function showSection(sectionClass, show) {
    const section = document.querySelector(sectionClass);
    if (section) {
        section.style.display = show ? '' : 'none';
    }
}

// Show My Courses in mainContent, not courseCatalog
function showMyCourses() {
    showSection('.featured-courses-section', false);
    showSection('.join-community-section', false);
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) heroSection.style.display = 'none';
    // Show loading state
    mainContent.innerHTML = `
        <div class="container mt-4">
            <h2 class="mb-4">My Courses</h2>
            <div id="myCoursesList" class="row">
        <div class="col-12 text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading your courses...</p>
                </div>
            </div>
        </div>
    `;
    loadEnrolledCourses();
}

// Update loadEnrolledCourses to render in mainContent
async function loadEnrolledCourses() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/enrolled-courses', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const enrolledCourses = await response.json();
        const myCoursesList = document.getElementById('myCoursesList');
        if (enrolledCourses.length === 0) {
            myCoursesList.innerHTML = `
                <div class="col-12 text-center">
                    <p>You haven't enrolled in any courses yet.</p>
                    <button class="btn btn-primary" onclick="displayCourseCatalog()">Browse Courses</button>
                </div>
            `;
            return;
        }
        myCoursesList.innerHTML = enrolledCourses.map(course => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card course-card h-100">
                    <img src="${course.image || 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80'}" class="card-img-top" alt="${course.title}">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${course.title}</h5>
                            <p class="card-text flex-grow-1">${course.description.substring(0, 150)}...</p>
                            <div class="course-features mb-3">
                            <span class="course-feature"><i class="bi bi-clock"></i> Self-paced</span>
                            <span class="course-feature"><i class="bi bi-person"></i> Beginner</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mt-auto">
                                <span class="badge bg-success">Enrolled</span>
                            <button class="btn btn-primary" onclick="viewCourse(${course.id})">Continue Learning</button>
                            </div>
                        </div>
                    </div>
                </div>
        `).join('');
    } catch (error) {
        const myCoursesList = document.getElementById('myCoursesList');
        if (myCoursesList) {
            myCoursesList.innerHTML = `
            <div class="col-12 text-center">
                    <div class="alert alert-danger">Error loading your courses. Please try again later.</div>
                <button class="btn btn-primary" onclick="showMyCourses()">Retry</button>
            </div>
        `;
        }
    }
}

// View course details (for non-enrolled users)
async function viewCourseDetails(courseId) {
    showSection('.featured-courses-section', false);
    showSection('.join-community-section', false);
    try {
        // First check if user is enrolled
        const enrollmentResponse = await fetch(`/api/courses/${courseId}/enrollment`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (enrollmentResponse.ok) {
            const { isEnrolled } = await enrollmentResponse.json();
            if (isEnrolled) {
                // If enrolled, show the course view instead
                viewCourse(courseId);
                return;
            }
        }

        const response = await fetch(`/api/courses/${courseId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch course details');
        }
        
        const course = await response.json();
        // Use the first video of the first chapter as the preview
        const firstVideo = course.chapters[0]?.videos[0];
        const videoPreview = firstVideo ?
            `<div id="videoPreviewContainer" class="ratio ratio-16x9 mb-3">
                <iframe id="videoPreviewIframe" src="${firstVideo.videoUrl}" title="Course Preview Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>` :
            `<div class="video-container mb-3 d-flex align-items-center justify-content-center bg-dark text-white" style="height:320px; border-radius:8px;">
                <span>Course Preview Video</span>
            </div>`;
        
        // Hide hero section and featured courses heading
        const heroSection = document.querySelector('.hero-section');
        const featuredHeading = document.querySelector('h2.text-center.mb-4');
        const courseCatalog = document.getElementById('courseCatalog');
        if (heroSection) heroSection.style.display = 'none';
        if (featuredHeading) featuredHeading.style.display = 'none';
        if (courseCatalog) courseCatalog.style.display = 'none';
        
        mainContent.innerHTML = `
            <div class="container mt-4">
                <div class="row">
                    <div class="col-lg-8">
                        <h2>${course.title}</h2>
                        ${videoPreview}
                        <div class="mb-3">
                            <span class="badge bg-success me-2">Beginner</span>
                            <span class="me-2"><i class="bi bi-clock"></i> Self-paced</span>
                            <span class="me-2"><i class="bi bi-currency-dollar"></i> USD ${course.price}</span>
                        </div>
                        <div class="mb-4" id="courseDescription"></div>
                    </div>
                    <div class="col-lg-4">
                        <div class="card shadow-sm mb-3">
                            <div class="card-header bg-white">
                                <strong>Course content</strong>
                            </div>
                            <div class="accordion" id="courseContentSidebar">
                                ${course.chapters.map((chapter, cIdx) => `
                                    <div class="accordion-item">
                                        <h2 class="accordion-header" id="heading${chapter.id}">
                                            <button class="accordion-button ${cIdx !== 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${chapter.id}" aria-expanded="${cIdx === 0 ? 'true' : 'false'}" aria-controls="collapse${chapter.id}">
                                                ${chapter.title}
                                            </button>
                                        </h2>
                                        <div id="collapse${chapter.id}" class="accordion-collapse collapse ${cIdx === 0 ? 'show' : ''}" aria-labelledby="heading${chapter.id}" data-bs-parent="#courseContentSidebar">
                                            <div class="accordion-body p-2">
                                                <ul class="list-group list-group-flush">
                                                    ${chapter.videos.map((video, vIdx) => `
                                                        <li class="list-group-item d-flex justify-content-between align-items-center ${vIdx === 0 && cIdx === 0 ? 'video-list-item' : 'text-muted'}" style="cursor:${vIdx === 0 && cIdx === 0 ? 'pointer' : 'not-allowed'};" data-video-url="${video.videoUrl}" data-video-title="${video.title}">
                                                            <span><i class="bi bi-${vIdx === 0 && cIdx === 0 ? 'play-circle' : 'lock'} me-2"></i>${video.title}</span>
                                                            <span class="badge bg-secondary">${formatDuration(video.duration)}</span>
                                                        </li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="card-footer bg-white text-center">
                                <button class="btn btn-success w-100" onclick="showPaymentModal(${course.id})">Buy Course</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Format and render the course description as HTML
        const descDiv = document.getElementById('courseDescription');
        if (descDiv) {
            descDiv.innerHTML = formatCourseDescription(course.description);
        }
        
        // Add click listener only to the first video
        const firstVideoItem = document.querySelector('.video-list-item');
        if (firstVideoItem) {
            firstVideoItem.addEventListener('click', function() {
                const videoUrl = this.getAttribute('data-video-url');
                const videoTitle = this.getAttribute('data-video-title');
                const videoPreviewContainer = document.getElementById('videoPreviewContainer');
                if (videoPreviewContainer) {
                    videoPreviewContainer.innerHTML = `<iframe id="videoPreviewIframe" src="${videoUrl}" title="${videoTitle}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
                }
            });
        }
    } catch (error) {
        console.error('Error fetching course details:', error);
        mainContent.innerHTML = '<div class="container mt-4"><div class="alert alert-danger">Error loading course details. Please try again later.</div></div>';
    }
}

function formatCourseDescription(desc) {
    if (!desc) return '';
    let html = desc;
    // 1. Make 'Who is this course for?' a separate paragraph without extra spacing
    html = html.replace(/(Who is this course for\?\s*)(- )?/g, '</p><p><strong>$1</strong></p><p>&bull; ');
    // 2. Make 'Learning Objectives' a separate paragraph
    html = html.replace(/(Learning Objectives)/g, '</p><p><strong>$1</strong></p><p>');
    // 3. Ensure 'By the end of this course' stays inline
    html = html.replace(/(By the end of this course,?)/g, '<span class="my-2">$1</span>');
    // 4. Format bullet points
    html = html.replace(/\n- /g, '<br>&bull; ');
    html = html.replace(/^-\s*/gm, '&bull; ');
    // 5. Replace double newlines with paragraphs
    html = html.replace(/\n\n+/g, '</p><p>');
    // 6. Wrap in paragraph if not already
    if (!/^<p>/.test(html)) html = '<p>' + html;
    if (!/<\/p>$/.test(html)) html = html + '</p>';
    return html;
}

// View course (for enrolled users)
async function viewCourse(courseId) {
    showSection('.featured-courses-section', false);
    showSection('.join-community-section', false);
    try {
        // Ensure mainContent is initialized
        if (!mainContent) {
            mainContent = document.getElementById('mainContent');
            if (!mainContent) {
                throw new Error('Main content container not found');
            }
        }

        const token = localStorage.getItem('token');
        const response = await fetch(`/api/courses/${courseId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch course details');
        }
        
        const course = await response.json();
        const firstVideo = course.chapters[0]?.videos[0];

        // Get user's progress for this course
        const progressResponse = await fetch(`/api/courses/${courseId}/progress`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const progress = progressResponse.ok ? await progressResponse.json() : {};

        // Calculate overall course progress
        let totalVideos = 0;
        let watchedVideos = 0;
        course.chapters.forEach(chapter => {
            chapter.videos.forEach(video => {
                totalVideos++;
                const videoProgress = progress[video.id];
                if (videoProgress && videoProgress.progress_percentage >= 90) {
                    watchedVideos++;
                }
            });
        });
        const courseProgressPercent = totalVideos > 0 ? Math.round((watchedVideos / totalVideos) * 100) : 0;

        // Hide hero section and featured courses heading
        const heroSection = document.querySelector('.hero-section');
        const featuredHeading = document.querySelector('h2.text-center.mb-4');
        const courseCatalog = document.getElementById('courseCatalog');
        if (heroSection) heroSection.style.display = 'none';
        if (featuredHeading) featuredHeading.style.display = 'none';
        if (courseCatalog) courseCatalog.style.display = 'none';

        mainContent.innerHTML = `
            <div class="container-fluid mt-4">
                <div class="row">
                    <div class="col-lg-9 order-lg-2">
                        <div class="mb-3 d-flex justify-content-between align-items-center">
                            <button class="btn btn-outline-primary" id="floatingSidebarBtn" style="display: none;">
                                <i class="bi bi-list"></i>
                            </button>
                            <div class="flex-grow-1 ms-3">
                                <label class="form-label fw-bold">Course Progress</label>
                                <div class="progress" style="height: 24px;">
                                    <div class="progress-bar bg-success" role="progressbar" style="width: ${courseProgressPercent}%" aria-valuenow="${courseProgressPercent}" aria-valuemin="0" aria-valuemax="100">
                                        ${courseProgressPercent}% Completed
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="ratio ratio-16x9 mb-3">
                            <iframe id="videoPreviewIframe" src="${firstVideo?.videoUrl || ''}" title="Course Video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                        </div>
                        <div class="card shadow-sm">
                            <div class="card-body">
                                <h4 id="currentVideoTitle">${firstVideo?.title || 'Select a video to start learning'}</h4>
                                <div class="mt-3">
                                    <h5>Video Transcript</h5>
                                    <p class="text-muted">This is a placeholder for the video transcript. The actual transcript will be implemented in the future.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 order-lg-1" id="courseContentSidebar">
                        <div class="card shadow-sm">
                            <div class="card-header bg-white d-flex justify-content-between align-items-center">
                                <strong>Course content</strong>
                                <button class="btn btn-sm btn-outline-secondary" id="toggleSidebar">
                                    <i class="bi bi-chevron-left"></i>
                                </button>
                            </div>
                            <div class="accordion" id="courseContentAccordion">
                                ${course.chapters.map((chapter, cIdx) => `
                                    <div class="accordion-item">
                                        <h2 class="accordion-header" id="heading${chapter.id}">
                                            <button class="accordion-button ${cIdx !== 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${chapter.id}" aria-expanded="${cIdx === 0 ? 'true' : 'false'}" aria-controls="collapse${chapter.id}">
                                                ${chapter.title}
                                            </button>
                                        </h2>
                                        <div id="collapse${chapter.id}" class="accordion-collapse collapse ${cIdx === 0 ? 'show' : ''}" aria-labelledby="heading${chapter.id}" data-bs-parent="#courseContentAccordion">
                                            <div class="accordion-body p-2">
                                                <ul class="list-group list-group-flush">
                                                    ${chapter.videos.map(video => `
                                                        <li class="list-group-item d-flex justify-content-between align-items-center video-list-item" style="cursor:pointer;" data-video-url="${video.videoUrl}" data-video-title="${video.title}" data-video-id="${video.id}">
                                                            <span><i class="bi bi-play-circle me-2"></i>${video.title}</span>
                                                            <span class="badge bg-secondary">${formatDuration(video.duration)}</span>
                                                        </li>
                                                    `).join('')}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add click listeners to all video list items
        document.querySelectorAll('.video-list-item').forEach(item => {
            item.addEventListener('click', function() {
                const videoUrl = this.getAttribute('data-video-url');
                const videoTitle = this.getAttribute('data-video-title');
                const videoId = this.getAttribute('data-video-id');
                const videoPreviewIframe = document.getElementById('videoPreviewIframe');
                const currentVideoTitle = document.getElementById('currentVideoTitle');
                
                if (videoPreviewIframe) {
                    videoPreviewIframe.src = videoUrl;
                }
                if (currentVideoTitle) {
                    currentVideoTitle.textContent = videoTitle;
                }

                // Update progress when video is played
                if (videoId) {
                    updateVideoProgress(videoId, 0, 0);
                }
            });
        });

        // Add toggle functionality for the sidebar
        const toggleSidebarBtn = document.getElementById('toggleSidebar');
        const sidebar = document.getElementById('courseContentSidebar');
        const mainContentArea = document.querySelector('.col-lg-9');
        const floatingSidebarBtn = document.getElementById('floatingSidebarBtn');
        let isSidebarVisible = true;

        if (toggleSidebarBtn && sidebar && mainContentArea) {
            toggleSidebarBtn.addEventListener('click', () => {
                isSidebarVisible = !isSidebarVisible;
                if (isSidebarVisible) {
                    sidebar.style.transform = 'translateX(0)';
                    sidebar.style.position = 'relative';
                    mainContentArea.classList.remove('col-lg-12');
                    mainContentArea.classList.add('col-lg-9');
                    toggleSidebarBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
                    if (floatingSidebarBtn) floatingSidebarBtn.style.display = 'none';
                } else {
                    sidebar.style.transform = 'translateX(-100%)';
                    sidebar.style.position = 'absolute';
                    sidebar.style.left = '0';
                    sidebar.style.top = '0';
                    sidebar.style.height = '100%';
                    sidebar.style.zIndex = '1000';
                    mainContentArea.classList.remove('col-lg-9');
                    mainContentArea.classList.add('col-lg-12');
                    toggleSidebarBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
                    if (floatingSidebarBtn) floatingSidebarBtn.style.display = 'block';
                }
            });
        }

        // Add click handler to floating button
        if (floatingSidebarBtn) {
            floatingSidebarBtn.addEventListener('click', () => {
                toggleSidebarBtn.click();
            });
        }

        // Add certificate eligibility check
        await checkCertificateEligibility(courseId);
    } catch (error) {
        console.error('Error fetching course details:', error);
        if (mainContent) {
            mainContent.innerHTML = '<div class="container mt-4"><div class="alert alert-danger">Error loading course details. Please try again later.</div></div>';
        }
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
    mainContent.innerHTML = `
        <div class="container mt-4">
            <div class="ratio ratio-16x9">
                <iframe src="${videoUrl}" 
                        title="Video player" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                </iframe>
            </div>
        </div>
    `;

    // Note: We can't track progress for embedded videos
    // The progress tracking would need to be implemented differently
    // For now, we'll just mark the video as watched when the user clicks play
    updateVideoProgress(videoId, 100, 0);
}

// Format video duration
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Update cleanupView function to handle the hero and course catalog sections
function cleanupView() {
    // Show hero and course catalog sections by default
    const heroSection = document.querySelector('.hero-section');
    const courseCatalogSection = document.querySelector('.container.mb-5');
    if (heroSection) heroSection.style.display = 'block';
    if (courseCatalogSection) courseCatalogSection.style.display = 'block';
    
    // Clear main content
    if (mainContent) {
        mainContent.innerHTML = '';
    }
}

// Update the logout function
function logout() {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    currentView = 'catalog';
    
    // Clean up the view first
    cleanupView();
    
    // Then update UI and show course catalog
    updateUI();
    displayCourseCatalog();
}

// Logout function
function logout() {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    currentView = 'catalog';
    updateUI();
}

// Add click event to Green Data brand to return to landing page
const navbarBrand = document.querySelector('.navbar-brand');
if (navbarBrand) {
    navbarBrand.style.cursor = 'pointer';
    navbarBrand.addEventListener('click', () => {
        mainContent.innerHTML = '';
        const courseCatalog = document.getElementById('courseCatalog');
        if (courseCatalog) courseCatalog.style.display = '';
        const heroSection = document.querySelector('.hero-section');
        const featuredHeading = document.querySelector('h2.text-center.mb-4');
        if (heroSection) heroSection.style.display = '';
        if (featuredHeading) featuredHeading.style.display = '';
    });
}

// Admin Dashboard Functions
async function showAdminDashboard() {
    currentView = 'admin';
    showSection('.featured-courses-section', false);
    showSection('.join-community-section', false);
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) heroSection.style.display = 'none';
    // Set background color for admin dashboard
    document.body.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--background-color');
    // Show loading state
    mainContent.innerHTML = `
        <div class="container mt-4">
        <div class="col-12 text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading admin dashboard...</p>
            </div>
        </div>
    `;
    try {
        const [userProgress, unfinishedCourses, courseEnrollments, totalStats] = await Promise.all([
            fetchUserProgress(),
            fetchUnfinishedCourses(),
            fetchCourseEnrollments(),
            fetchTotalStats()
        ]);
        mainContent.innerHTML = `
            <div class="container mt-4">
                <h2 class="mb-4">Admin Dashboard</h2>
                <!-- Overview Cards -->
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-primary text-white"><div class="card-body"><h5 class="card-title">Total Users</h5><h2 class="card-text">${totalStats.totalUsers}</h2></div></div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-success text-white"><div class="card-body"><h5 class="card-title">Total Courses</h5><h2 class="card-text">${totalStats.totalCourses}</h2></div></div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-info text-white"><div class="card-body"><h5 class="card-title">Total Enrollments</h5><h2 class="card-text">${totalStats.totalEnrollments}</h2></div></div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-warning text-white"><div class="card-body"><h5 class="card-title">Completion Rate</h5><h2 class="card-text">${totalStats.completionRate}%</h2></div></div>
                            </div>
                        </div>
                <!-- User Progress -->
                <div class="card mb-4"><div class="card-header"><h4>User Progress Overview</h4></div><div class="card-body"><div class="table-responsive"><table class="table"><thead><tr><th>User</th><th>Courses Enrolled</th><th>Courses Completed</th><th>Completion Rate</th></tr></thead><tbody>${userProgress.map(user => `<tr><td>${user.name}</td><td>${user.enrolledCourses}</td><td>${user.completedCourses}</td><td>${user.completionRate}%</td></tr>`).join('')}</tbody></table></div></div></div>
                <!-- Most Unfinished Courses -->
                <div class="card mb-4"><div class="card-header"><h4>Most Unfinished Courses</h4></div><div class="card-body"><div class="table-responsive"><table class="table"><thead><tr><th>Course</th><th>Enrollments</th><th>Completion Rate</th><th>Average Progress</th></tr></thead><tbody>${unfinishedCourses.map(course => `<tr><td>${course.title}</td><td>${course.enrollments}</td><td>${course.completionRate}%</td><td>${course.averageProgress}%</td></tr>`).join('')}</tbody></table></div></div></div>
                <!-- Most Enrolled Courses -->
                <div class="card mb-4"><div class="card-header"><h4>Most Enrolled Courses</h4></div><div class="card-body"><div class="table-responsive"><table class="table"><thead><tr><th>Course</th><th>Total Enrollments</th><th>Active Students</th><th>Completion Rate</th></tr></thead><tbody>${courseEnrollments.map(course => `<tr><td>${course.title}</td><td>${course.totalEnrollments}</td><td>${course.activeStudents}</td><td>${course.completionRate}%</td></tr>`).join('')}</tbody></table></div></div></div>
            </div>
        `;
    } catch (error) {
        mainContent.innerHTML = `<div class='container mt-4'><div class='alert alert-danger'>Error loading admin dashboard. Please try again later.</div></div>`;
    }
    // Reset body background when leaving admin dashboard (handled in displayCourseCatalog)
}

// Admin Dashboard Data Fetching Functions
async function fetchUserProgress() {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/admin/user-progress', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch user progress');
    return response.json();
}

async function fetchUnfinishedCourses() {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/admin/unfinished-courses', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch unfinished courses');
    return response.json();
}

async function fetchCourseEnrollments() {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/admin/course-enrollments', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch course enrollments');
    return response.json();
}

async function fetchTotalStats() {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/admin/total-stats', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch total stats');
    return response.json();
}

// Add this function to handle navigation
function handleNavigation() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin' && currentView === 'admin') {
        showAdminDashboard();
    } else {
        // Always show course catalog for non-admin views
        displayCourseCatalog();
    }
}

// Add event listener for logo click
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.navbar-brand');
    if (logo) {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            currentView = 'catalog';
            displayCourseCatalog();
        });
    }
});

// Add event listeners for navigation
document.addEventListener('DOMContentLoaded', () => {
    // Logo click handler
    const logo = document.querySelector('.navbar-brand');
    if (logo) {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            currentView = 'catalog';
            displayCourseCatalog();
        });
    }

    // Admin Dashboard click handler
    const adminDashboardLink = document.getElementById('adminDashboardLink');
    if (adminDashboardLink) {
        adminDashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            showAdminDashboard();
        });
    }

    // My Courses click handler
    const myCoursesBtn = document.getElementById('myCoursesBtn');
    if (myCoursesBtn) {
        myCoursesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showMyCourses();
        });
    }

    // Logout click handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
});

// Show My Certificates in mainContent, not courseCatalog
async function showMyCertificates() {
    showSection('.featured-courses-section', false);
    showSection('.join-community-section', false);
    currentView = 'certificates';
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) heroSection.style.display = 'none';
    mainContent.innerHTML = `
        <div class="container mt-4">
            <h2 class="mb-4">My Certificates</h2>
            <div id="certificatesList" class="row">
                <div class="col-12 text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading certificates...</p>
                </div>
            </div>
        </div>
    `;
    try {
        const response = await fetch('/api/certificates', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch certificates');
        const certificates = await response.json();
        const certificatesList = document.getElementById('certificatesList');
        if (certificates.length === 0) {
            certificatesList.innerHTML = `
                <div class="col-12 text-center">
                    <p>You haven't earned any certificates yet.</p>
                    <p>Complete courses and pass all quizzes to earn certificates!</p>
                </div>
            `;
            return;
        }
        certificatesList.innerHTML = certificates.map(cert => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card certificate-card">
                    <div class="card-body">
                        <h5 class="card-title">${cert.course_title}</h5>
                        <p class="card-text">${cert.course_description.substring(0, 150)}...</p>
                        <div class="certificate-details">
                            <p><strong>Certificate Number:</strong> ${cert.certificate_number}</p>
                            <p><strong>Issue Date:</strong> ${new Date(cert.issue_date).toLocaleDateString()}</p>
                        </div>
                        <button class="btn btn-primary mt-3" onclick="downloadCertificate('${cert.id}')">
                            <i class="bi bi-download"></i> Download Certificate
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        const certificatesList = document.getElementById('certificatesList');
        if (certificatesList) {
            certificatesList.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-danger">Error loading certificates. Please try again later.</p>
            </div>
        `;
        }
    }
}

// Download Certificate (real implementation)
function downloadCertificate(certificateId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to download certificates.');
        return;
    }
    fetch(`/api/certificates/${certificateId}/download`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to download certificate');
        // Get filename from Content-Disposition header
        const disposition = response.headers.get('Content-Disposition');
        let filename = `certificate-${certificateId}.pdf`;
        if (disposition && disposition.indexOf('filename=') !== -1) {
            const match = disposition.match(/filename="?([^";]+)"?/);
            if (match && match[1]) filename = match[1];
        }
        return response.blob().then(blob => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    })
    .catch(err => {
        alert('Error downloading certificate.');
        console.error(err);
    });
}

// Check certificate eligibility when viewing course
async function checkCertificateEligibility(courseId) {
    try {
        const response = await fetch(`/api/courses/${courseId}/certificate-status`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to check certificate status');
        }
        
        const { eligible_for_certificate } = await response.json();
        
        if (eligible_for_certificate) {
            // Add certificate button to course view
            const certificateButton = document.createElement('button');
            certificateButton.className = 'btn btn-success mt-3';
            certificateButton.innerHTML = '<i class="bi bi-award"></i> Get Certificate';
            certificateButton.onclick = () => issueCertificate(courseId);
            
            const courseActions = document.querySelector('.course-actions');
            if (courseActions) {
                courseActions.appendChild(certificateButton);
            }
        }
    } catch (error) {
        console.error('Error checking certificate eligibility:', error);
    }
}

// Issue certificate
async function issueCertificate(courseId) {
    try {
        const response = await fetch(`/api/courses/${courseId}/issue-certificate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to issue certificate');
        }
        
        const result = await response.json();
        alert('Congratulations! Your certificate has been issued successfully.');
        
        // Refresh the course view or show the certificate
        showMyCertificates();
    } catch (error) {
        console.error('Error issuing certificate:', error);
        alert(error.message || 'Error issuing certificate. Please try again later.');
    }
} 