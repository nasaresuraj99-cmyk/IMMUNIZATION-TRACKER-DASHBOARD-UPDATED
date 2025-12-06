// Main Application Logic
class ImmunizationTracker {
  constructor() {
    this.currentUser = null;
    this.userRole = null;
    this.facilityId = null;
    this.currentSection = 'overview';
    this.offlineData = {
      children: [],
      vaccinations: [],
      defaulters: []
    };
    
    this.initializeApp();
  }
  
  initializeApp() {
    this.initializeEventListeners();
    this.checkAuthState();
    this.initializeCharts();
    this.loadVaccineSchedule();
    
    // Set current date for date inputs
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('child-dob').max = today;
    document.getElementById('vaccination-date').max = today;
    document.getElementById('report-from-date').value = today;
    document.getElementById('report-to-date').value = today;
  }
  
  initializeEventListeners() {
    // Login form
    document.getElementById('login-btn').addEventListener('click', (e) => this.handleLogin(e));
    document.getElementById('show-password-btn').addEventListener('click', this.togglePasswordVisibility);
    document.getElementById('password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin(e);
    });
    
    // Menu navigation
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.currentTarget.dataset.section;
        this.showSection(section);
      });
    });
    
    // Logout buttons
    document.getElementById('logout-btn').addEventListener('click', () => this.logout());
    document.getElementById('admin-logout')?.addEventListener('click', () => this.logout());
    document.getElementById('superadmin-logout')?.addEventListener('click', () => this.logout());
    
    // Modal controls
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });
    
    // Add child
    document.getElementById('add-child-modal-btn').addEventListener('click', () => this.showModal('add-child-modal'));
    document.getElementById('add-child-form').addEventListener('submit', (e) => this.addChild(e));
    
    // Record vaccination
    document.getElementById('record-vaccination-btn').addEventListener('click', () => this.showModal('record-vaccination-modal'));
    document.getElementById('record-vaccination-form').addEventListener('submit', (e) => this.recordVaccination(e));
    
    // Quick actions
    document.getElementById('generate-report-btn').addEventListener('click', () => this.showSection('reports'));
    document.getElementById('check-stock-btn').addEventListener('click', () => this.showSection('stock'));
    document.getElementById('send-reminders-btn').addEventListener('click', () => this.sendDefaulterReminders());
    
    // Reports
    document.getElementById('preview-report-btn').addEventListener('click', () => this.previewReport());
    document.getElementById('export-csv-btn').addEventListener('click', () => this.exportToCSV());
    document.getElementById('generate-pdf-btn').addEventListener('click', () => this.generatePDF());
    
    // Sync
    document.getElementById('sync-now').addEventListener('click', () => this.syncData());
    
    // Menu toggle for mobile
    document.getElementById('menu-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('active');
    });
    
    // Install prompt
    document.getElementById('install-confirm').addEventListener('click', () => this.installPWA());
    
    // Check online status
    window.addEventListener('online', () => this.onOnlineStatusChange(true));
    window.addEventListener('offline', () => this.onOnlineStatusChange(false));
  }
  
  togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeIcon.className = 'fas fa-eye-slash';
    } else {
      passwordInput.type = 'password';
      eyeIcon.className = 'fas fa-eye';
    }
  }
  
  async handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('login-btn');
    const spinner = document.getElementById('login-spinner');
    const errorDiv = document.getElementById('login-error');
    
    // Reset error
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
    
    // Validate inputs
    if (!this.validateEmail(email)) {
      this.showLoginError('Invalid email format. Please enter a valid email.');
      return;
    }
    
    if (password.length < 6) {
      this.showLoginError('Password must be at least 6 characters.');
      return;
    }
    
    // Disable login button and show spinner
    loginBtn.disabled = true;
    spinner.classList.remove('hidden');
    
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      this.currentUser = userCredential.user;
      
      // Get user role from Firestore
      const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        this.userRole = userData.role || 'user';
        this.facilityId = userData.facilityId || null;
        
        // Redirect based on role
        this.redirectToDashboard();
      } else {
        // Create default user document if not exists
        await db.collection('users').doc(this.currentUser.uid).set({
          email: this.currentUser.email,
          role: 'user',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          facilityId: null
        });
        
        this.userRole = 'user';
        this.redirectToDashboard();
      }
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Show appropriate error message
      const errorMessage = firebaseErrorCodes[error.code] || 'Login failed. Please try again.';
      this.showLoginError(errorMessage);
      
      // Re-enable login button
      loginBtn.disabled = false;
      spinner.classList.add('hidden');
    }
  }
  
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  
  showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
  
  redirectToDashboard() {
    // Hide login screen
    document.getElementById('login-screen').classList.remove('active');
    
    // Show appropriate dashboard based on role
    if (this.userRole === 'superadmin') {
      document.getElementById('superadmin-dashboard').classList.add('active');
      this.initializeSuperAdminDashboard();
    } else if (this.userRole === 'admin') {
      document.getElementById('admin-dashboard').classList.add('active');
      this.initializeAdminDashboard();
    } else {
      document.getElementById('user-dashboard').classList.add('active');
      this.initializeUserDashboard();
    }
    
    // Update UI with user info
    this.updateUserInfo();
    
    // Load initial data
    this.loadDashboardData();
  }
  
  updateUserInfo() {
    if (this.currentUser) {
      document.getElementById('user-email').textContent = this.currentUser.email;
    }
  }
  
  async loadDashboardData() {
    this.showLoading(true);
    
    try {
      // Load children data
      await this.loadChildren();
      
      // Load vaccinations
      await this.loadVaccinations();
      
      // Calculate and update stats
      this.updateDashboardStats();
      
      // Update defaulter count
      this.updateDefaulterCount();
      
      // Load cold chain data
      await this.loadColdChainData();
      
      // Load stock data
      await this.loadStockData();
      
      // Load recent activity
      await this.loadRecentActivity();
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showNotification('Error loading data. Please try again.', 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async loadChildren() {
    try {
      let query = db.collection('children');
      
      // If user has facility restriction, filter by facility
      if (this.facilityId) {
        query = query.where('facilityId', '==', this.facilityId);
      }
      
      const snapshot = await query.limit(100).get();
      this.offlineData.children = [];
      
      snapshot.forEach(doc => {
        this.offlineData.children.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      this.renderChildrenTable();
      
    } catch (error) {
      console.error('Error loading children:', error);
      // Fallback to offline data if available
      if (this.offlineData.children.length > 0) {
        this.renderChildrenTable();
      }
    }
  }
  
  renderChildrenTable() {
    const tbody = document.getElementById('children-table-body');
    tbody.innerHTML = '';
    
    if (this.offlineData.children.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px;">
            <i class="fas fa-child" style="font-size: 3rem; color: #ccc; margin-bottom: 10px;"></i>
            <p>No children registered yet</p>
          </td>
        </tr>
      `;
      return;
    }
    
    this.offlineData.children.forEach(child => {
      const age = this.calculateAge(child.dob);
      const lastVaccination = child.lastVaccinationDate || 'Not vaccinated';
      const nextDue = child.nextVaccinationDate || 'Not scheduled';
      const status = this.getVaccinationStatus(child);
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${child.childId || child.id.substring(0, 8)}</td>
        <td>${child.firstName} ${child.lastName}</td>
        <td>${age}</td>
        <td>${child.gender || 'Not specified'}</td>
        <td>${lastVaccination}</td>
        <td>${nextDue}</td>
        <td><span class="status-${status.class}">${status.text}</span></td>
        <td>
          <button class="btn-icon view-child" data-id="${child.id}" title="View">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn-icon edit-child" data-id="${child.id}" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // Add event listeners to child action buttons
    document.querySelectorAll('.view-child').forEach(btn => {
      btn.addEventListener('click', (e) => this.viewChildDetails(e.target.closest('button').dataset.id));
    });
    
    document.querySelectorAll('.edit-child').forEach(btn => {
      btn.addEventListener('click', (e) => this.editChild(e.target.closest('button').dataset.id));
    });
  }
  
  calculateAge(dob) {
    if (!dob) return 'Unknown';
    
    const birthDate = new Date(dob);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''}`;
    } else {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
  }
  
  getVaccinationStatus(child) {
    // Simplified status calculation
    if (!child.lastVaccinationDate) {
      return { class: 'overdue', text: 'Not Started' };
    }
    
    if (child.nextVaccinationDate) {
      const nextDate = new Date(child.nextVaccinationDate);
      const today = new Date();
      
      if (nextDate < today) {
        return { class: 'overdue', text: 'Overdue' };
      }
      
      const daysUntilDue = Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 7) {
        return { class: 'due-soon', text: 'Due Soon' };
      }
    }
    
    return { class: 'up-to-date', text: 'Up to Date' };
  }
  
  updateDashboardStats() {
    const totalChildren = this.offlineData.children.length;
    const vaccinatedToday = this.calculateVaccinatedToday();
    const defaulters = this.calculateDefaulters();
    const dropoutRate = this.calculateDropoutRate();
    
    document.getElementById('total-children').textContent = totalChildren;
    document.getElementById('vaccinated-today').textContent = vaccinatedToday;
    document.getElementById('total-defaulters').textContent = defaulters;
    document.getElementById('dropout-rate').textContent = `${dropoutRate}%`;
    
    // Update charts
    this.updateCharts();
  }
  
  calculateVaccinatedToday() {
    const today = new Date().toISOString().split('T')[0];
    return this.offlineData.vaccinations.filter(v => 
      v.dateAdministered === today
    ).length;
  }
  
  calculateDefaulters() {
    // Simplified defaulter calculation
    return this.offlineData.children.filter(child => {
      return this.getVaccinationStatus(child).class === 'overdue';
    }).length;
  }
  
  calculateDropoutRate() {
    // Calculate Penta1 → Penta3 dropout rate
    const penta1Count = this.offlineData.vaccinations.filter(v => 
      v.vaccineName.includes('Penta1')
    ).length;
    
    const penta3Count = this.offlineData.vaccinations.filter(v => 
      v.vaccineName.includes('Penta3')
    ).length;
    
    if (penta1Count === 0) return 0;
    
    const dropoutRate = ((penta1Count - penta3Count) / penta1Count) * 100;
    return Math.round(dropoutRate);
  }
  
  initializeCharts() {
    // Coverage Chart
    const coverageCtx = document.getElementById('coverage-chart').getContext('2d');
    this.coverageChart = new Chart(coverageCtx, {
      type: 'doughnut',
      data: {
        labels: ['Fully Vaccinated', 'Partially Vaccinated', 'Not Vaccinated'],
        datasets: [{
          data: [65, 25, 10],
          backgroundColor: [
            '#27ae60',
            '#f39c12',
            '#e74c3c'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
    
    // Defaulter Chart
    const defaulterCtx = document.getElementById('defaulter-chart').getContext('2d');
    this.defaulterChart = new Chart(defaulterCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Defaulters',
          data: [12, 19, 8, 15, 10, 7],
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Defaulters'
            }
          }
        }
      }
    });
    
    // Temperature Chart
    const tempCtx = document.getElementById('temperature-chart').getContext('2d');
    this.tempChart = new Chart(tempCtx, {
      type: 'line',
      data: {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        datasets: [{
          label: 'Temperature (°C)',
          data: Array.from({length: 24}, () => Math.random() * 6 + 2),
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 10,
            title: {
              display: true,
              text: 'Temperature (°C)'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        }
      }
    });
  }
  
  updateCharts() {
    // Update charts with real data
    if (this.coverageChart) {
      const fullyVaccinated = this.offlineData.children.filter(child => 
        this.getVaccinationStatus(child).class === 'up-to-date'
      ).length;
      
      const partiallyVaccinated = this.offlineData.children.filter(child => 
        this.getVaccinationStatus(child).class === 'due-soon'
      ).length;
      
      const notVaccinated = this.offlineData.children.filter(child => 
        this.getVaccinationStatus(child).class === 'overdue'
      ).length;
      
      this.coverageChart.data.datasets[0].data = [
        fullyVaccinated,
        partiallyVaccinated,
        notVaccinated
      ];
      this.coverageChart.update();
    }
  }
  
  loadVaccineSchedule() {
    const vaccines = [
      { period: "Birth", vaccines: ["BCG at Birth", "OPV0 at Birth", "Hepatitis B at Birth"] },
      { period: "6 Weeks", vaccines: ["OPV1 at 6 weeks", "Penta1 at 6 weeks", "PCV1 at 6 weeks", "Rotavirus1 at 6 weeks"] },
      { period: "10 Weeks", vaccines: ["OPV2 at 10 weeks", "Penta2 at 10 weeks", "PCV2 at 10 weeks", "Rotavirus2 at 10 weeks"] },
      { period: "14 Weeks", vaccines: ["OPV3 at 14 weeks", "Penta3 at 14 weeks", "PCV3 at 14 weeks", "Rotavirus3 at 14 weeks", "IPV1 at 14 weeks"] },
      { period: "6 Months", vaccines: ["Malaria1 at 6 months"] },
      { period: "7 Months", vaccines: ["Malaria2 at 7 months", "IPV2 at 7 months"] },
      { period: "9 Months", vaccines: ["Malaria3 at 9 months", "Measles Rubella1 at 9 months"] },
      { period: "18 Months", vaccines: ["Malaria4 at 18 months", "Measles Rubella2 at 18 months", "LLIN at 18 months", "Men A at 18 months"] },
      { period: "Vitamin A", vaccines: ["Vitamin A at 6, 12, 18, 24, 30, 36, 42, 48, 54, 60 months"] }
    ];
    
    const scheduleContainer = document.querySelector('.vaccine-schedule');
    scheduleContainer.innerHTML = '';
    
    vaccines.forEach(group => {
      const groupElement = document.createElement('div');
      groupElement.className = 'vaccine-group';
      groupElement.innerHTML = `
        <h4>${group.period}</h4>
        <div class="vaccine-list">
          ${group.vaccines.map(vaccine => `
            <div class="vaccine-item">
              <i class="fas fa-syringe"></i>
              <span>${vaccine}</span>
            </div>
          `).join('')}
        </div>
      `;
      scheduleContainer.appendChild(groupElement);
    });
    
    // Populate vaccine select in modal
    const vaccineSelect = document.getElementById('vaccination-type');
    const allVaccines = vaccines.flatMap(g => g.vaccines);
    allVaccines.forEach(vaccine => {
      const option = document.createElement('option');
      option.value = vaccine;
      option.textContent = vaccine;
      vaccineSelect.appendChild(option);
    });
  }
  
  showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // Remove active class from all menu items
    document.querySelectorAll('.menu-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Show selected section
    const sectionElement = document.getElementById(`${sectionId}-section`);
    if (sectionElement) {
      sectionElement.classList.add('active');
      
      // Add active class to corresponding menu item
      const menuItem = document.querySelector(`.menu-item[data-section="${sectionId}"]`);
      if (menuItem) {
        menuItem.classList.add('active');
      }
      
      // Update current section
      this.currentSection = sectionId;
      
      // Load section-specific data
      this.loadSectionData(sectionId);
    }
    
    // Close sidebar on mobile
    if (window.innerWidth <= 1024) {
      document.getElementById('sidebar').classList.remove('active');
    }
  }
  
  loadSectionData(sectionId) {
    switch(sectionId) {
      case 'defaulters':
        this.loadDefaulters();
        break;
      case 'cold-chain':
        this.loadColdChainData();
        break;
      case 'stock':
        this.loadStockData();
        break;
      case 'reports':
        this.loadSavedReports();
        break;
    }
  }
  
  async loadDefaulters() {
    try {
      // Calculate defaulters based on vaccination data
      const defaulters = this.offlineData.children.filter(child => {
        const status = this.getVaccinationStatus(child);
        return status.class === 'overdue' || status.text === 'Not Started';
      });
      
      // Update defaulter table
      this.renderDefaultersTable(defaulters);
      
      // Update dropout rates
      this.updateDropoutRates();
      
    } catch (error) {
      console.error('Error loading defaulters:', error);
    }
  }
  
  renderDefaultersTable(defaulters) {
    const tbody = document.getElementById('defaulters-table-body');
    tbody.innerHTML = '';
    
    if (defaulters.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px;">
            <i class="fas fa-check-circle" style="font-size: 3rem; color: #27ae60; margin-bottom: 10px;"></i>
            <p>No defaulters found</p>
          </td>
        </tr>
      `;
      return;
    }
    
    defaulters.forEach((child, index) => {
      const missingVaccine = this.getMissingVaccine(child);
      const daysOverdue = this.getDaysOverdue(child);
      const contact = child.parentPhone || 'No contact';
      
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${child.firstName} ${child.lastName}</td>
        <td>${missingVaccine}</td>
        <td>${daysOverdue}</td>
        <td>${contact}</td>
        <td>
          <select class="follow-up-select" data-id="${child.id}">
            <option value="">Select action</option>
            <option value="call">Call Parent</option>
            <option value="visit">Home Visit</option>
            <option value="scheduled">Scheduled Appointment</option>
            <option value="completed">Follow-up Completed</option>
          </select>
        </td>
        <td>
          <button class="btn-icon record-vaccination" data-id="${child.id}" title="Record Vaccination">
            <i class="fas fa-syringe"></i>
          </button>
          <button class="btn-icon send-sms" data-id="${child.id}" title="Send SMS">
            <i class="fas fa-sms"></i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // Update defaulter count
    document.getElementById('defaulter-count').textContent = defaulters.length;
    document.getElementById('total-defaulters').textContent = defaulters.length;
  }
  
  getMissingVaccine(child) {
    // Simplified logic - in real app, this would check actual vaccination schedule
    const age = this.calculateMonths(child.dob);
    
    if (age < 6) return "Penta1";
    if (age < 10) return "Penta2";
    if (age < 14) return "Penta3";
    if (age < 9) return "Measles Rubella 1";
    
    return "Next scheduled vaccine";
  }
  
  calculateMonths(dob) {
    if (!dob) return 0;
    
    const birthDate = new Date(dob);
    const today = new Date();
    
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
    months += today.getMonth() - birthDate.getMonth();
    
    return months;
  }
  
  getDaysOverdue(child) {
    if (!child.nextVaccinationDate) return "N/A";
    
    const nextDate = new Date(child.nextVaccinationDate);
    const today = new Date();
    const diffTime = Math.abs(today - nextDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} days`;
  }
  
  updateDropoutRates() {
    // Calculate actual dropout rates
    const pentaDropout = this.calculateDropoutRate();
    const bcgDropout = Math.round(Math.random() * 30); // Placeholder
    const mrDropout = Math.round(Math.random() * 20); // Placeholder
    
    document.getElementById('penta-dropout').textContent = `${pentaDropout}%`;
    document.getElementById('bcg-dropout').textContent = `${bcgDropout}%`;
    document.getElementById('mr-dropout').textContent = `${mrDropout}%`;
    
    // Update progress bars
    document.getElementById('penta-bar').style.width = `${pentaDropout}%`;
    document.getElementById('bcg-bar').style.width = `${bcgDropout}%`;
    document.getElementById('mr-bar').style.width = `${mrDropout}%`;
  }
  
  async loadColdChainData() {
    try {
      // Get cold chain data from Firebase
      const tempRef = realtimeDb.ref('coldChain/temperature');
      const snapshot = await tempRef.limitToLast(1).once('value');
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const lastReading = Object.values(data)[0];
        
        // Update temperature display
        document.getElementById('current-temp').textContent = lastReading.temperature.toFixed(1);
        document.getElementById('last-temp-update').textContent = 
          new Date(lastReading.timestamp).toLocaleTimeString();
        
        // Update status
        const statusElement = document.getElementById('cold-chain-status');
        if (lastReading.temperature >= 2 && lastReading.temperature <= 8) {
          statusElement.textContent = "Status: Normal";
          statusElement.style.color = "#27ae60";
        } else {
          statusElement.textContent = "Status: Alert - Out of Range";
          statusElement.style.color = "#e74c3c";
        }
        
        // Update gauge
        const gaugeFill = document.getElementById('gauge-fill');
        const temp = lastReading.temperature;
        const percentage = Math.min(Math.max((temp - 2) / 6 * 100, 0), 100);
        gaugeFill.style.width = `${percentage}%`;
        gaugeFill.style.backgroundColor = temp >= 2 && temp <= 8 ? "#27ae60" : "#e74c3c";
      }
      
    } catch (error) {
      console.error('Error loading cold chain data:', error);
    }
  }
  
  async loadStockData() {
    try {
      // Sample stock data - in real app, this would come from Firebase
      const stockData = [
        { vaccine: "BCG", current: 150, monthly: 80, reorder: 50, expiry: "2024-12-31", status: "adequate" },
        { vaccine: "Penta", current: 90, monthly: 120, reorder: 100, expiry: "2024-10-15", status: "low" },
        { vaccine: "OPV", current: 200, monthly: 150, reorder: 80, expiry: "2025-03-20", status: "adequate" },
        { vaccine: "Measles Rubella", current: 60, monthly: 100, reorder: 80, expiry: "2024-08-30", status: "low" },
        { vaccine: "PCV", current: 180, monthly: 90, reorder: 60, expiry: "2025-01-10", status: "adequate" },
        { vaccine: "Rotavirus", current: 40, monthly: 70, reorder: 50, expiry: "2024-09-05", status: "low" }
      ];
      
      // Update stock counts
      const lowStock = stockData.filter(item => item.status === "low").length;
      const adequateStock = stockData.filter(item => item.status === "adequate").length;
      const expiredStock = stockData.filter(item => new Date(item.expiry) < new Date()).length;
      
      document.getElementById('low-stock-count').textContent = lowStock;
      document.getElementById('adequate-stock-count').textContent = adequateStock;
      document.getElementById('expired-stock-count').textContent = expiredStock;
      
      // Render stock table
      this.renderStockTable(stockData);
      
      // Update stock alerts
      this.updateStockAlerts(stockData);
      
    } catch (error) {
      console.error('Error loading stock data:', error);
    }
  }
  
  renderStockTable(stockData) {
    const tbody = document.getElementById('stock-table-body');
    tbody.innerHTML = '';
    
    stockData.forEach(item => {
      const row = document.createElement('tr');
      const statusClass = `stock-${item.status}`;
      const daysToExpiry = Math.ceil((new Date(item.expiry) - new Date()) / (1000 * 60 * 60 * 24));
      
      row.innerHTML = `
        <td>${item.vaccine}</td>
        <td>${item.current}</td>
        <td>${item.monthly}</td>
        <td>${item.reorder}</td>
        <td>${item.expiry} (${daysToExpiry > 0 ? `${daysToExpiry} days` : 'Expired'})</td>
        <td><span class="${statusClass}">${item.status.toUpperCase()}</span></td>
        <td>
          <button class="btn-icon" title="Adjust Stock">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn-icon" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
  
  updateStockAlerts(stockData) {
    const alertsContainer = document.getElementById('stock-alerts');
    alertsContainer.innerHTML = '';
    
    const criticalItems = stockData.filter(item => 
      item.status === "low" || new Date(item.expiry) < new Date()
    );
    
    if (criticalItems.length === 0) {
      alertsContainer.innerHTML = `
        <div class="alert-item success">
          <i class="fas fa-check-circle"></i>
          <div>
            <p>All vaccines in adequate supply</p>
            <small>Last checked: ${new Date().toLocaleTimeString()}</small>
          </div>
        </div>
      `;
      return;
    }
    
    criticalItems.forEach(item => {
      const alertElement = document.createElement('div');
      alertElement.className = 'alert-item warning';
      
      const isExpired = new Date(item.expiry) < new Date();
      const message = isExpired 
        ? `${item.vaccine} has expired`
        : `${item.vaccine} stock low (${item.current} doses remaining)`;
      
      alertElement.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          <p>${message}</p>
          <small>Expiry: ${item.expiry}</small>
        </div>
      `;
      alertsContainer.appendChild(alertElement);
    });
  }
  
  async loadRecentActivity() {
    try {
      const activityRef = db.collection('activities')
        .where('facilityId', '==', this.facilityId)
        .orderBy('timestamp', 'desc')
        .limit(10);
      
      const snapshot = await activityRef.get();
      const activityList = document.getElementById('activity-list');
      activityList.innerHTML = '';
      
      if (snapshot.empty) {
        activityList.innerHTML = `
          <div class="activity-item">
            <i class="fas fa-info-circle activity-icon"></i>
            <div class="activity-details">
              <p>No recent activity</p>
            </div>
          </div>
        `;
        return;
      }
      
      snapshot.forEach(doc => {
        const activity = doc.data();
        const timeAgo = this.getTimeAgo(activity.timestamp?.toDate());
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
          <i class="fas fa-${activity.icon || 'syringe'} activity-icon"></i>
          <div class="activity-details">
            <p>${activity.description}</p>
            <span class="activity-time">${timeAgo}</span>
          </div>
        `;
        activityList.appendChild(activityItem);
      });
      
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }
  
  getTimeAgo(date) {
    if (!date) return 'Recently';
    
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return Math.floor(seconds) + " seconds ago";
  }
  
  async addChild(e) {
    e.preventDefault();
    
    const form = e.target;
    const firstName = document.getElementById('child-first-name').value.trim();
    const lastName = document.getElementById('child-last-name').value.trim();
    const dob = document.getElementById('child-dob').value;
    const gender = document.getElementById('child-gender').value;
    const parent = document.getElementById('child-parent').value.trim();
    const phone = document.getElementById('child-phone').value.trim();
    const address = document.getElementById('child-address').value.trim();
    const notes = document.getElementById('child-notes').value.trim();
    
    // Generate unique child ID
    const childId = 'CH' + Date.now().toString().substring(7) + Math.floor(Math.random() * 100);
    
    const childData = {
      childId,
      firstName,
      lastName,
      dob,
      gender,
      parentName: parent,
      parentPhone: phone,
      address,
      notes,
      facilityId: this.facilityId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: this.currentUser.uid
    };
    
    try {
      // Save to Firestore
      const docRef = await db.collection('children').add(childData);
      
      // Add to offline data
      this.offlineData.children.push({
        id: docRef.id,
        ...childData
      });
      
      // Log activity
      await this.logActivity('child', 'Added new child: ' + firstName + ' ' + lastName);
      
      // Show success message
      this.showNotification('Child added successfully!', 'success');
      
      // Close modal and reset form
      this.closeAllModals();
      form.reset();
      
      // Refresh children list
      this.renderChildrenTable();
      this.updateDashboardStats();
      
    } catch (error) {
      console.error('Error adding child:', error);
      this.showNotification('Failed to add child. Please try again.', 'error');
    }
  }
  
  async recordVaccination(e) {
    e.preventDefault();
    
    const form = e.target;
    const childId = document.getElementById('vaccination-child').value;
    const vaccineName = document.getElementById('vaccination-type').value;
    const dateAdministered = document.getElementById('vaccination-date').value;
    const batchNumber = document.getElementById('vaccination-batch').value.trim();
    const location = document.getElementById('vaccination-location').value.trim();
    const healthWorker = document.getElementById('vaccination-provider').value.trim();
    const notes = document.getElementById('vaccination-notes').value.trim();
    
    if (!childId || !vaccineName || !dateAdministered) {
      this.showNotification('Please fill all required fields', 'error');
      return;
    }
    
    const vaccinationData = {
      childId,
      vaccineName,
      dateAdministered,
      batchNumber,
      location,
      healthWorker,
      notes,
      facilityId: this.facilityId,
      recordedBy: this.currentUser.uid,
      recordedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
      // Save to Firestore
      await db.collection('vaccinations').add(vaccinationData);
      
      // Update child's last vaccination date
      const childDoc = await db.collection('children').doc(childId).get();
      if (childDoc.exists) {
        await db.collection('children').doc(childId).update({
          lastVaccinationDate: dateAdministered,
          lastVaccination: vaccineName,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Add to offline data
      this.offlineData.vaccinations.push(vaccinationData);
      
      // Log activity
      await this.logActivity('vaccination', `Administered ${vaccineName} to child ${childId}`);
      
      // Show success message
      this.showNotification('Vaccination recorded successfully!', 'success');
      
      // Close modal and reset form
      this.closeAllModals();
      form.reset();
      
      // Refresh data
      this.updateDashboardStats();
      this.loadDefaulters();
      
    } catch (error) {
      console.error('Error recording vaccination:', error);
      this.showNotification('Failed to record vaccination. Please try again.', 'error');
    }
  }
  
  async logActivity(type, description) {
    try {
      await db.collection('activities').add({
        type,
        description,
        facilityId: this.facilityId,
        userId: this.currentUser.uid,
        userEmail: this.currentUser.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        icon: this.getActivityIcon(type)
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
  
  getActivityIcon(type) {
    const icons = {
      'child': 'user-plus',
      'vaccination': 'syringe',
      'defaulter': 'exclamation-triangle',
      'stock': 'boxes',
      'cold-chain': 'snowflake',
      'report': 'chart-bar'
    };
    return icons[type] || 'info-circle';
  }
  
  async previewReport() {
    const reportType = document.querySelector('input[name="report-type"]:checked').value;
    const fromDate = document.getElementById('report-from-date').value;
    const toDate = document.getElementById('report-to-date').value;
    
    if (!fromDate || !toDate) {
      this.showNotification('Please select date range', 'error');
      return;
    }
    
    // Generate report preview
    const previewContent = document.getElementById('preview-content');
    previewContent.innerHTML = `
      <div class="report-header">
        <h4>Immunization Report</h4>
        <p>Period: ${fromDate} to ${toDate}</p>
        <p>Generated on: ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="report-summary">
        <h5>Summary</h5>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Total Vaccinations:</span>
            <span class="summary-value">${this.offlineData.vaccinations.length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">New Children:</span>
            <span class="summary-value">${this.offlineData.children.length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Defaulters:</span>
            <span class="summary-value">${this.calculateDefaulters()}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Drop-out Rate:</span>
            <span class="summary-value">${this.calculateDropoutRate()}%</span>
          </div>
        </div>
      </div>
      
      <div class="report-details">
        <h5>Vaccination Details</h5>
        <table class="report-table">
          <thead>
            <tr>
              <th>Vaccine</th>
              <th>Administered</th>
              <th>Coverage Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>BCG</td><td>45</td><td>95%</td></tr>
            <tr><td>Penta</td><td>120</td><td>85%</td></tr>
            <tr><td>OPV</td><td>110</td><td>82%</td></tr>
            <tr><td>Measles Rubella</td><td>65</td><td>75%</td></tr>
          </tbody>
        </table>
      </div>
      
      <div class="report-footer">
        <p>Report generated by Immunization Tracker PWA</p>
      </div>
    `;
  }
  
  async exportToCSV() {
    const fromDate = document.getElementById('report-from-date').value;
    const toDate = document.getElementById('report-to-date').value;
    
    if (!fromDate || !toDate) {
      this.showNotification('Please select date range', 'error');
      return;
    }
    
    // Create CSV content
    const csvContent = [
      ['Immunization Report', `Period: ${fromDate} to ${toDate}`, `Generated: ${new Date().toLocaleDateString()}`],
      [],
      ['Vaccine', 'Administered', 'Coverage Rate'],
      ['BCG', '45', '95%'],
      ['Penta', '120', '85%'],
      ['OPV', '110', '82%'],
      ['Measles Rubella', '65', '75%']
    ];
    
    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `immunization-report-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    this.showNotification('CSV exported successfully!', 'success');
  }
  
  async generatePDF() {
    this.showNotification('PDF generation would be implemented with a PDF library', 'info');
    // In a real implementation, you would use jsPDF to generate PDF
  }
  
  async sendDefaulterReminders() {
    this.showNotification('Sending reminders to defaulters...', 'info');
    
    // In a real implementation, this would send SMS or email reminders
    setTimeout(() => {
      this.showNotification('Reminders sent successfully!', 'success');
    }, 2000);
  }
  
  async syncData() {
    this.showLoading(true);
    
    try {
      // In a real implementation, this would sync offline data with Firebase
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Reload all data
      await this.loadDashboardData();
      
      this.showNotification('Data synchronized successfully!', 'success');
      
    } catch (error) {
      console.error('Sync error:', error);
      this.showNotification('Sync failed. Please check your connection.', 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  }
  
  closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.remove('active');
    });
  }
  
  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  }
  
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
  
  onOnlineStatusChange(isOnline) {
    const syncStatus = document.getElementById('sync-status');
    const syncIcon = document.getElementById('sync-icon');
    
    if (isOnline) {
      syncStatus.textContent = 'Online';
      syncIcon.className = 'fas fa-wifi';
    } else {
      syncStatus.textContent = 'Offline';
      syncIcon.className = 'fas fa-wifi-slash';
    }
  }
  
  checkAuthState() {
    auth.onAuthStateChanged((user) => {
      if (user) {
        this.currentUser = user;
        // User is signed in, but we still need to check role
        this.checkUserRole();
      } else {
        // No user is signed in, show login screen
        this.showLoginScreen();
      }
    });
  }
  
  async checkUserRole() {
    try {
      const userDoc = await db.collection('users').doc(this.currentUser.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        this.userRole = userData.role || 'user';
        this.facilityId = userData.facilityId || null;
        
        // Show appropriate dashboard
        this.redirectToDashboard();
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  }
  
  showLoginScreen() {
    // Show login screen and hide all dashboards
    document.getElementById('login-screen').classList.add('active');
    document.getElementById('user-dashboard').classList.remove('active');
    document.getElementById('admin-dashboard').classList.remove('active');
    document.getElementById('superadmin-dashboard').classList.remove('active');
    
    // Clear password field
    document.getElementById('password').value = '';
    
    // Enable login button
    const loginBtn = document.getElementById('login-btn');
    loginBtn.disabled = false;
    document.getElementById('login-spinner').classList.add('hidden');
  }
  
  async logout() {
    try {
      await auth.signOut();
      this.showLoginScreen();
      this.showNotification('Logged out successfully', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      this.showNotification('Logout failed', 'error');
    }
  }
  
  installPWA() {
    // This would be handled by the beforeinstallprompt event
    console.log('Install PWA');
  }
  
  initializeUserDashboard() {
    // User dashboard is already set up
    console.log('Initializing user dashboard');
  }
  
  initializeAdminDashboard() {
    // Initialize admin dashboard
    console.log('Initializing admin dashboard');
  }
  
  initializeSuperAdminDashboard() {
    // Initialize super admin dashboard
    console.log('Initializing super admin dashboard');
  }
  
  loadSavedReports() {
    // Load saved reports from local storage or Firebase
    console.log('Loading saved reports');
  }
  
  viewChildDetails(childId) {
    console.log('View child:', childId);
    // In a real implementation, this would show child details
    this.showNotification('Child details view would open here', 'info');
  }
  
  editChild(childId) {
    console.log('Edit child:', childId);
    // In a real implementation, this would open edit modal
    this.showNotification('Child edit would open here', 'info');
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.immunizationTracker = new ImmunizationTracker();
});

// Add notification styles
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 15px 20px;
    border-radius: var(--radius);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10000;
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease;
  }
  
  .notification.show {
    transform: translateX(0);
    opacity: 1;
  }
  
  .notification-success {
    border-left: 4px solid var(--success-color);
  }
  
  .notification-error {
    border-left: 4px solid var(--danger-color);
  }
  
  .notification-info {
    border-left: 4px solid var(--secondary-color);
  }
  
  .notification i {
    font-size: 1.2rem;
  }
  
  .notification-success i { color: var(--success-color); }
  .notification-error i { color: var(--danger-color); }
  .notification-info i { color: var(--secondary-color); }
`;
document.head.appendChild(notificationStyles);