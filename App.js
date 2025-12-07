import { AuthManager } from './auth/auth-manager.js';
import { DashboardManager } from './modules/dashboard.js';
import { FormValidator } from './utils/validators.js';
import { showToast } from './utils/helpers.js';

class ImmunizationTracker {
    constructor() {
        this.currentView = null;
        this.authManager = new AuthManager();
        this.dashboardManager = new DashboardManager();
        this.formValidator = new FormValidator();
        
        this.init();
    }

    async init() {
        console.log('Initializing Immunization Tracker...');
        
        // Check authentication state
        this.authManager.onAuthStateChanged(async (user) => {
            if (user) {
                await this.loadDashboard();
            } else {
                await this.loadLogin();
            }
        });

        // Handle routing
        window.addEventListener('hashchange', () => this.handleRouting());
        
        // Initial route handling
        this.handleRouting();
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').classList.add('hidden');
            }, 500);
        }, 1500);
    }

    async handleRouting() {
        const hash = window.location.hash.substring(1) || 'login';
        
        if (this.authManager.currentUser) {
            // User is authenticated
            switch(hash) {
                case 'dashboard':
                    await this.loadDashboard();
                    break;
                case 'profile':
                    await this.loadProfile();
                    break;
                case 'children':
                    await this.loadChildren();
                    break;
                case 'vaccines':
                    await this.loadVaccines();
                    break;
                case 'stock':
                    await this.loadStock();
                    break;
                case 'reports':
                    await this.loadReports();
                    break;
                case 'settings':
                    await this.loadSettings();
                    break;
                default:
                    await this.loadDashboard();
            }
        } else {
            // User is not authenticated
            switch(hash) {
                case 'register':
                    await this.loadRegister();
                    break;
                case 'forgot-password':
                    await this.loadForgotPassword();
                    break;
                case 'reset-password':
                    await this.loadResetPassword();
                    break;
                default:
                    await this.loadLogin();
            }
        }
    }

    async loadLogin() {
        const html = await this.loadView('login');
        this.renderView(html);
        this.setupLoginForm();
    }

    async loadRegister() {
        const html = await this.loadView('register');
        this.renderView(html);
        this.setupRegisterForm();
    }

    async loadDashboard() {
        const html = await this.loadView('dashboard');
        this.renderView(html);
        await this.dashboardManager.init();
        this.setupDashboard();
    }

    async loadView(viewName) {
        try {
            const response = await fetch(`src/views/${viewName}.html`);
            if (!response.ok) throw new Error('View not found');
            return await response.text();
        } catch (error) {
            console.error(`Failed to load view ${viewName}:`, error);
            return this.getFallbackView(viewName);
        }
    }

    renderView(html) {
        const appContainer = document.getElementById('app-container');
        appContainer.innerHTML = html;
        this.currentView = html;
    }

    setupLoginForm() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const password = document.getElementById('password');
                const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
                password.setAttribute('type', type);
                togglePassword.innerHTML = type === 'password' ? 
                    '<i class="fas fa-eye"></i>' : 
                    '<i class="fas fa-eye-slash"></i>';
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe').checked;
            
            // Validate
            if (!this.formValidator.validateEmail(email)) {
                showToast('Please enter a valid email address', 'error');
                return;
            }

            const loginBtn = document.getElementById('loginBtn');
            const originalText = loginBtn.querySelector('.btn-text').textContent;
            loginBtn.querySelector('.btn-text').textContent = 'Signing in...';
            loginBtn.disabled = true;

            try {
                const result = await this.authManager.login(email, password, rememberMe);
                if (result.success) {
                    showToast('Login successful!', 'success');
                    window.location.hash = 'dashboard';
                } else {
                    showToast(result.error, 'error');
                }
            } catch (error) {
                showToast('Login failed. Please try again.', 'error');
            } finally {
                loginBtn.querySelector('.btn-text').textContent = originalText;
                loginBtn.disabled = false;
            }
        });

        // Demo login
        const demoLogin = document.getElementById('demoLogin');
        if (demoLogin) {
            demoLogin.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.authManager.demoLogin();
            });
        }
    }

    setupRegisterForm() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        let currentStep = 1;
        const totalSteps = 3;

        // Step navigation
        const nextBtn = document.getElementById('nextBtn');
        const prevBtn = document.getElementById('prevBtn');
        const submitBtn = document.getElementById('submitBtn');

        const showStep = (step) => {
            document.querySelectorAll('.form-step').forEach(el => {
                el.classList.remove('active');
            });
            document.getElementById(`step${step}`).classList.add('active');

            prevBtn.style.display = step === 1 ? 'none' : 'inline-block';
            nextBtn.style.display = step === totalSteps ? 'none' : 'inline-block';
            submitBtn.style.display = step === totalSteps ? 'inline-block' : 'none';
        };

        nextBtn.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                currentStep++;
                showStep(currentStep);
            }
        });

        prevBtn.addEventListener('click', () => {
            currentStep--;
            showStep(currentStep);
        });

        // Password strength
        const passwordInput = document.getElementById('regPassword');
        const strengthBar = document.getElementById('strengthBar');
        const requirements = {
            length: document.getElementById('req-length'),
            uppercase: document.getElementById('req-uppercase'),
            number: document.getElementById('req-number'),
            special: document.getElementById('req-special')
        };

        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                const password = passwordInput.value;
                const validation = this.formValidator.validatePassword(password);
                
                // Update strength bar
                if (validation.score <= 25) {
                    strengthBar.className = 'strength-bar weak';
                } else if (validation.score <= 50) {
                    strengthBar.className = 'strength-bar medium';
                } else {
                    strengthBar.className = 'strength-bar strong';
                }

                // Update requirements
                requirements.length.classList.toggle('valid', validation.requirements.length);
                requirements.uppercase.classList.toggle('valid', validation.requirements.uppercase);
                requirements.number.classList.toggle('valid', validation.requirements.number);
                requirements.special.classList.toggle('valid', validation.requirements.special);
            });
        }

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!validateStep(currentStep)) return;

            const userData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('regEmail').value,
                phone: document.getElementById('phone').value,
                role: document.getElementById('role').value,
                password: document.getElementById('regPassword').value,
                facility: {
                    name: document.getElementById('facilityName').value,
                    type: document.getElementById('facilityType').value,
                    region: document.getElementById('region').value,
                    district: document.getElementById('district').value,
                    community: document.getElementById('community').value,
                    address: document.getElementById('address').value
                }
            };

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

            try {
                const result = await this.authManager.register(userData);
                if (result.success) {
                    showToast('Account created successfully! Please check your email for verification.', 'success');
                    setTimeout(() => {
                        window.location.hash = 'login';
                    }, 3000);
                } else {
                    showToast(result.error, 'error');
                }
            } catch (error) {
                showToast('Registration failed. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Account';
            }
        });

        function validateStep(step) {
            let isValid = true;
            
            if (step === 1) {
                // Validate personal information
                const firstName = document.getElementById('firstName');
                const lastName = document.getElementById('lastName');
                const email = document.getElementById('regEmail');
                const phone = document.getElementById('phone');
                const role = document.getElementById('role');

                if (!firstName.value.trim()) {
                    markInvalid(firstName, 'First name is required');
                    isValid = false;
                } else {
                    markValid(firstName);
                }

                if (!lastName.value.trim()) {
                    markInvalid(lastName, 'Last name is required');
                    isValid = false;
                } else {
                    markValid(lastName);
                }

                if (!email.value || !this.formValidator.validateEmail(email.value)) {
                    markInvalid(email, 'Valid email is required');
                    isValid = false;
                } else {
                    markValid(email);
                }

                if (!phone.value || !this.formValidator.validatePhone(phone.value)) {
                    markInvalid(phone, 'Valid Ghanaian phone number is required');
                    isValid = false;
                } else {
                    markValid(phone);
                }

                if (!role.value) {
                    markInvalid(role, 'Please select your role');
                    isValid = false;
                } else {
                    markValid(role);
                }
            } else if (step === 2) {
                // Validate password
                const password = document.getElementById('regPassword');
                const confirm = document.getElementById('confirmPassword');

                const validation = this.formValidator.validatePassword(password.value);
                if (!validation.isValid) {
                    markInvalid(password, 'Password does not meet requirements');
                    isValid = false;
                } else {
                    markValid(password);
                }

                if (password.value !== confirm.value) {
                    markInvalid(confirm, 'Passwords do not match');
                    isValid = false;
                } else {
                    markValid(confirm);
                }

                if (!document.getElementById('terms').checked) {
                    showToast('You must accept the terms and conditions', 'error');
                    isValid = false;
                }
            } else if (step === 3) {
                // Validate facility
                const facilityName = document.getElementById('facilityName');
                const facilityType = document.getElementById('facilityType');
                const region = document.getElementById('region');
                const district = document.getElementById('district');

                if (!facilityName.value.trim()) {
                    markInvalid(facilityName, 'Facility name is required');
                    isValid = false;
                } else {
                    markValid(facilityName);
                }

                if (!facilityType.value) {
                    markInvalid(facilityType, 'Please select facility type');
                    isValid = false;
                } else {
                    markValid(facilityType);
                }

                if (!region.value) {
                    markInvalid(region, 'Please select region');
                    isValid = false;
                } else {
                    markValid(region);
                }

                if (!district.value.trim()) {
                    markInvalid(district, 'District is required');
                    isValid = false;
                } else {
                    markValid(district);
                }
            }

            return isValid;
        }

        function markInvalid(element, message) {
            element.classList.add('error');
            const errorElement = element.parentElement.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            }
        }

        function markValid(element) {
            element.classList.remove('error');
            const errorElement = element.parentElement.querySelector('.error-message');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }

        // Auto-generate facility code
        const facilityTypeSelect = document.getElementById('facilityType');
        const facilityCodeInput = document.getElementById('facilityCode');

        if (facilityTypeSelect && facilityCodeInput) {
            facilityTypeSelect.addEventListener('change', () => {
                const type = facilityTypeSelect.value;
                const region = document.getElementById('region').value;
                if (type && region) {
                    const code = `${type.substring(0, 3).toUpperCase()}-${region.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
                    facilityCodeInput.value = code;
                }
            });
        }
    }

    setupDashboard() {
        // Menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');

        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                mainContent.classList.toggle('sidebar-open');
            });
        }

        // User dropdown
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.querySelector('.dropdown-menu');

        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.authManager.logout();
                window.location.hash = 'login';
            });
        }

        // Quick actions
        const quickAddBtn = document.getElementById('quickAddBtn');
        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', () => {
                this.showQuickAddModal();
            });
        }

        // Update current date
        this.updateCurrentDate();

        // Setup sync status
        this.setupSyncStatus();
    }

    updateCurrentDate() {
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            dateElement.textContent = now.toLocaleDateString('en-US', options);
            
            // Update greeting
            const greeting = document.getElementById('greeting');
            if (greeting) {
                const hour = now.getHours();
                let timeGreeting = 'Good ';
                if (hour < 12) timeGreeting += 'Morning';
                else if (hour < 18) timeGreeting += 'Afternoon';
                else timeGreeting += 'Evening';
                
                const userName = this.authManager.currentUser?.displayName || 'User';
                greeting.textContent = `${timeGreeting}, ${userName.split(' ')[0]}`;
            }
        }
    }

    setupSyncStatus() {
        const syncStatus = document.getElementById('syncStatus');
        if (!syncStatus) return;

        const updateStatus = (isOnline) => {
            if (isOnline) {
                syncStatus.innerHTML = '<i class="fas fa-check-circle"></i> <span>Synced</span>';
                syncStatus.style.color = 'var(--ghs-success)';
            } else {
                syncStatus.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> <span>Syncing...</span>';
                syncStatus.style.color = 'var(--ghs-warning)';
            }
        };

        // Initial status
        updateStatus(navigator.onLine);

        // Listen for network changes
        window.addEventListener('online', () => updateStatus(true));
        window.addEventListener('offline', () => updateStatus(false));
    }

    showQuickAddModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Quick Add</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="quick-actions">
                        <button class="quick-action" data-action="register-child">
                            <i class="fas fa-baby"></i>
                            <span>Register Child</span>
                        </button>
                        <button class="quick-action" data-action="administer-vaccine">
                            <i class="fas fa-syringe"></i>
                            <span>Administer Vaccine</span>
                        </button>
                        <button class="quick-action" data-action="check-stock">
                            <i class="fas fa-box"></i>
                            <span>Check Stock</span>
                        </button>
                        <button class="quick-action" data-action="generate-report">
                            <i class="fas fa-chart-bar"></i>
                            <span>Generate Report</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                animation: fadeIn 0.3s ease;
            }
            .modal-content {
                background: var(--ghs-card);
                border-radius: var(--radius-lg);
                width: 90%;
                max-width: 500px;
                max-height: 80vh;
                overflow: auto;
            }
            .modal-header {
                padding: var(--space-lg);
                border-bottom: 1px solid var(--ghs-border);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--ghs-text-light);
            }
            .modal-body {
                padding: var(--space-lg);
            }
            .quick-actions {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: var(--space-md);
            }
            .quick-action {
                padding: var(--space-lg);
                border: 2px solid var(--ghs-border);
                border-radius: var(--radius-md);
                background: none;
                cursor: pointer;
                transition: all var(--transition-fast);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: var(--space-sm);
            }
            .quick-action:hover {
                border-color: var(--ghs-primary);
                background: rgba(0,128,0,0.05);
            }
            .quick-action i {
                font-size: 2rem;
                color: var(--ghs-primary);
            }
            .quick-action span {
                font-weight: 500;
                color: var(--ghs-text);
            }
        `;
        document.head.appendChild(style);

        // Close modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close')) {
                document.body.removeChild(modal);
                document.head.removeChild(style);
            }
        });

        // Handle quick actions
        modal.querySelectorAll('.quick-action').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                this.handleQuickAction(action);
                document.body.removeChild(modal);
                document.head.removeChild(style);
            });
        });
    }

    handleQuickAction(action) {
        switch(action) {
            case 'register-child':
                window.location.hash = 'children?action=register';
                break;
            case 'administer-vaccine':
                window.location.hash = 'vaccines?action=administer';
                break;
            case 'check-stock':
                window.location.hash = 'stock';
                break;
            case 'generate-report':
                window.location.hash = 'reports';
                break;
        }
    }

    getFallbackView(viewName) {
        switch(viewName) {
            case 'login':
                return `
                    <div class="auth-container">
                        <div class="auth-card">
                            <div class="ghs-header">
                                <h1>Immunization Tracker</h1>
                                <p>Track. Monitor. Protect.</p>
                            </div>
                            <div class="auth-form">
                                <p style="color: var(--ghs-error); text-align: center;">
                                    Unable to load login form. Please check your connection.
                                </p>
                                <button onclick="window.location.reload()" class="btn-primary btn-block">
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            default:
                return '<div style="padding: 2rem; text-align: center;">View not available</div>';
        }
    }

    async loadProfile() {
        const html = '<div class="container"><h2>Profile Page</h2><p>Coming soon...</p></div>';
        this.renderView(html);
    }

    async loadChildren() {
        const html = '<div class="container"><h2>Children Management</h2><p>Coming soon...</p></div>';
        this.renderView(html);
    }

    async loadVaccines() {
        const html = '<div class="container"><h2>Vaccine Management</h2><p>Coming soon...</p></div>';
        this.renderView(html);
    }

    async loadStock() {
        const html = '<div class="container"><h2>Stock Management</h2><p>Coming soon...</p></div>';
        this.renderView(html);
    }

    async loadReports() {
        const html = '<div class="container"><h2>Reports</h2><p>Coming soon...</p></div>';
        this.renderView(html);
    }

    async loadSettings() {
        const html = '<div class="container"><h2>Settings</h2><p>Coming soon...</p></div>';
        this.renderView(html);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ImmunizationTracker();
});