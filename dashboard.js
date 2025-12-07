export class DashboardManager {
    constructor() {
        this.currentFacility = null;
        this.stats = {
            totalChildren: 0,
            totalVaccines: 0,
            dueVaccines: 0,
            coverageRate: 0,
            defaultersCount: 0,
            lowStockCount: 0
        };
    }

    async init() {
        await this.loadCurrentFacility();
        await this.loadStats();
        this.updateDashboard();
        this.setupEventListeners();
    }

    async loadCurrentFacility() {
        // Get current facility from user data or localStorage
        const facilityId = localStorage.getItem('currentFacilityId');
        
        if (facilityId) {
            try {
                const facilityDoc = await firebaseDb.collection('facilities').doc(facilityId).get();
                if (facilityDoc.exists) {
                    this.currentFacility = {
                        id: facilityDoc.id,
                        ...facilityDoc.data()
                    };
                    this.updateFacilitySelector();
                }
            } catch (error) {
                console.error('Error loading facility:', error);
            }
        }
    }

    updateFacilitySelector() {
        const selector = document.getElementById('currentFacility');
        if (selector && this.currentFacility) {
            selector.innerHTML = `<option value="${this.currentFacility.id}">${this.currentFacility.name}</option>`;
        }
    }

    async loadStats() {
        // Mock stats for now - in production, fetch from Firestore
        this.stats = {
            totalChildren: 145,
            totalVaccines: 892,
            dueVaccines: 23,
            coverageRate: 85,
            defaultersCount: 12,
            lowStockCount: 5,
            monthVaccines: 156,
            dropoutRate: 3.2,
            stockUsed: 68
        };
    }

    updateDashboard() {
        // Update all stat elements
        this.updateElement('totalChildren', this.stats.totalChildren);
        this.updateElement('totalVaccines', this.stats.totalVaccines);
        this.updateElement('dueVaccines', this.stats.dueVaccines);
        this.updateElement('coverageRate', `${this.stats.coverageRate}%`);
        this.updateElement('defaultersCount', this.stats.defaultersCount);
        this.updateElement('lowStockCount', this.stats.lowStockCount);
        this.updateElement('childrenCount', this.stats.totalChildren);
        this.updateElement('dueVaccinesCount', this.stats.dueVaccines);
        this.updateElement('monthVaccines', this.stats.monthVaccines);
        this.updateElement('dropoutRate', `${this.stats.dropoutRate}%`);
        this.updateElement('stockUsed', `${this.stats.stockUsed}%`);
        
        // Update today's tasks
        const todayTasks = document.getElementById('todayTasks');
        if (todayTasks) {
            todayTasks.textContent = `${this.stats.dueVaccines} vaccinations due`;
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            // Animate number changes
            if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
                this.animateNumber(element, parseFloat(value));
            } else {
                element.textContent = value;
            }
        }
    }

    animateNumber(element, targetValue) {
        const currentValue = parseFloat(element.textContent) || 0;
        const duration = 1000; // 1 second
        const steps = 60;
        const increment = (targetValue - currentValue) / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const newValue = currentValue + (increment * currentStep);
            
            if (currentStep >= steps) {
                element.textContent = Number.isInteger(targetValue) ? 
                    Math.round(targetValue) : 
                    targetValue.toFixed(1);
                clearInterval(timer);
            } else {
                element.textContent = Number.isInteger(targetValue) ? 
                    Math.round(newValue) : 
                    newValue.toFixed(1);
            }
        }, duration / steps);
    }

    setupEventListeners() {
        // Facility selector change
        const facilitySelector = document.getElementById('currentFacility');
        if (facilitySelector) {
            facilitySelector.addEventListener('change', async (e) => {
                const facilityId = e.target.value;
                localStorage.setItem('currentFacilityId', facilityId);
                await this.loadCurrentFacility();
                await this.loadStats();
                this.updateDashboard();
            });
        }

        // Coverage period change
        const coveragePeriod = document.getElementById('coveragePeriod');
        if (coveragePeriod) {
            coveragePeriod.addEventListener('change', async (e) => {
                await this.updateCoverageChart(e.target.value);
            });
        }
    }

    async updateCoverageChart(period) {
        // This would fetch and update the chart based on the selected period
        console.log('Updating coverage chart for period:', period);
        
        // Mock chart data
        const data = {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Vaccination Coverage',
                data: [75, 82, 79, 85],
                borderColor: 'var(--ghs-primary)',
                backgroundColor: 'rgba(0, 128, 0, 0.1)',
                tension: 0.4
            }]
        };
        
        // Render chart if Chart.js is available
        if (window.Chart) {
            const ctx = document.getElementById('coverageChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: data,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    callback: value => value + '%'
                                }
                            }
                        }
                    }
                });
            }
        }
    }
}