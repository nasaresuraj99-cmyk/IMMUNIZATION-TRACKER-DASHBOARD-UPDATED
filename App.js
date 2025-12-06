// Add these methods to the ImmunizationTracker class

class ImmunizationTracker {
    // ... previous code ...

    async exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Immunization Coverage Report', 20, 20);
        
        // Add date
        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
        doc.text(`Facility: ${this.currentFacility}`, 20, 40);
        
        // Add table data
        const tableData = [
            ['Vaccine', 'Target', 'Administered', 'Coverage %'],
            ['BCG', '150', '142', '94.7%'],
            ['OPV3', '150', '138', '92.0%'],
            ['Penta3', '150', '136', '90.7%'],
            ['MR1', '150', '128', '85.3%'],
        ];
        
        doc.autoTable({
            startY: 50,
            head: [tableData[0]],
            body: tableData.slice(1),
        });
        
        // Save the PDF
        doc.save(`coverage-report-${this.currentFacility}-${Date.now()}.pdf`);
    }

    async exportToCSV() {
        const data = [
            ['Vaccine', 'Target', 'Administered', 'Coverage %', 'Dropout Rate'],
            ['BCG', '150', '142', '94.7%', '0%'],
            ['OPV3', '150', '138', '92.0%', '2.7%'],
            ['Penta3', '150', '136', '90.7%', '4.0%'],
            ['MR1', '150', '128', '85.3%', '9.3%'],
        ];
        
        const csvContent = data.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `coverage-report-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    calculateDropoutRate(vaccine1Count, vaccine2Count) {
        if (vaccine1Count === 0) return 0;
        return ((vaccine1Count - vaccine2Count) / vaccine1Count) * 100;
    }

    generateQRCode(childId) {
        // Generate QR code for child's immunization record
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(childId)}`;
        return qrCodeUrl;
    }

    async sendSMSReminder(phoneNumber, message) {
        // Placeholder for SMS integration
        // In production, integrate with Twilio, AWS SNS, or similar service
        console.log(`SMS to ${phoneNumber}: ${message}`);
        this.showNotification('SMS reminder queued for sending', 'info');
    }

    async checkVaccineStock() {
        try {
            const db = window.firebase.db;
            const stockRef = window.firebase.collection(db, "stock");
            const q = window.firebase.query(
                stockRef,
                window.firebase.where("facility", "==", this.currentFacility),
                window.firebase.where("quantity", "<=", 50) // Low stock threshold
            );
            
            const snapshot = await window.firebase.getDocs(q);
            
            const lowStockItems = [];
            snapshot.forEach(doc => {
                lowStockItems.push({ id: doc.id, ...doc.data() });
            });
            
            return lowStockItems;
        } catch (error) {
            console.error('Error checking stock:', error);
            return [];
        }
    }

    async recordTemperatureReading(equipmentId, temperature) {
        try {
            const db = window.firebase.db;
            
            await window.firebase.addDoc(
                window.firebase.collection(db, "temperature_logs"),
                {
                    equipmentId: equipmentId,
                    temperature: temperature,
                    timestamp: window.firebase.serverTimestamp(),
                    recordedBy: this.currentUser.uid,
                    facility: this.currentFacility
                }
            );
            
            // Check for excursion
            if (temperature < 2 || temperature > 8) {
                await this.recordTemperatureExcursion(equipmentId, temperature);
            }
            
        } catch (error) {
            console.error('Error recording temperature:', error);
        }
    }

    async recordTemperatureExcursion(equipmentId, temperature) {
        const db = window.firebase.db;
        
        await window.firebase.addDoc(
            window.firebase.collection(db, "excursions"),
            {
                equipmentId: equipmentId,
                temperature: temperature,
                timestamp: window.firebase.serverTimestamp(),
                recordedBy: this.currentUser.uid,
                facility: this.currentFacility,
                resolved: false
            }
        );
        
        // Send alert
        this.showNotification(`Temperature excursion detected: ${temperature}°C`, 'error');
    }

    async generatePerformanceReport(facilityId, startDate, endDate) {
        // Calculate performance metrics
        const metrics = {
            totalChildren: 0,
            fullyImmunized: 0,
            dropoutRates: {},
            coverageRates: {},
            timeliness: 0
        };
        
        // Implementation would fetch data from Firestore
        // and calculate all metrics
        
        return metrics;
    }

    async backupToCloud() {
        try {
            const db = window.firebase.db;
            
            // Get all local data
            const collections = ['children', 'vaccinations', 'stock', 'temperature_logs'];
            
            for (const collectionName of collections) {
                const snapshot = await window.firebase.getDocs(
                    window.firebase.collection(db, collectionName)
                );
                
                // Store in backup collection
                const backupData = snapshot.docs.map(doc => ({
                    data: doc.data(),
                    timestamp: new Date().toISOString()
                }));
                
                await window.firebase.addDoc(
                    window.firebase.collection(db, "backups"),
                    {
                        collection: collectionName,
                        data: backupData,
                        backedUpAt: window.firebase.serverTimestamp(),
                        facility: this.currentFacility
                    }
                );
            }
            
            this.showNotification('Cloud backup completed successfully', 'success');
        } catch (error) {
            console.error('Backup failed:', error);
            this.showNotification('Backup failed: ' + error.message, 'error');
        }
    }

    setupAutoBackup() {
        // Backup daily at midnight
        const now = new Date();
        const night = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1, // tomorrow
            0, 0, 0 // midnight
        );
        
        const timeToMidnight = night.getTime() - now.getTime();
        
        setTimeout(() => {
            this.backupToCloud();
            // Set up daily interval
            setInterval(() => this.backupToCloud(), 24 * 60 * 60 * 1000);
        }, timeToMidnight);
    }

    async validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async validatePhone(phone) {
        const phoneRegex = /^\+?[\d\s-]{10,}$/;
        return phoneRegex.test(phone);
    }

    async checkDuplicateChild(childId) {
        try {
            const db = window.firebase.db;
            const childrenRef = window.firebase.collection(db, "children");
            const q = window.firebase.query(
                childrenRef,
                window.firebase.where("childId", "==", childId)
            );
            
            const snapshot = await window.firebase.getDocs(q);
            return !snapshot.empty;
        } catch (error) {
            console.error('Error checking duplicate:', error);
            return false;
        }
    }

    async getFacilityStatistics() {
        return {
            totalChildren: await this.getTotalChildren(),
            monthlyTarget: 25,
            monthlyAchieved: 18,
            coverageRate: 72,
            dropoutRate: 4.2,
            stockAvailability: 85
        };
    }

    async getTotalChildren() {
        // Implementation to get total children count
        return 156; // Example
    }

    setupRealTimeListeners() {
        const db = window.firebase.db;
        
        // Listen for new children
        const childrenRef = window.firebase.collection(db, "children");
        const unsubscribeChildren = window.firebase.onSnapshot(childrenRef, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    this.showNotification(`New child registered: ${change.doc.data().name}`, 'info');
                }
            });
        });
        
        // Listen for stock changes
        const stockRef = window.firebase.collection(db, "stock");
        const unsubscribeStock = window.firebase.onSnapshot(stockRef, (snapshot) => {
            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                if (data.quantity <= data.minStock) {
                    this.showNotification(`Low stock alert: ${data.vaccineName}`, 'warning');
                }
            });
        });
        
        // Store unsubscribe functions
        this.unsubscribeFunctions = [unsubscribeChildren, unsubscribeStock];
    }

    cleanup() {
        // Unsubscribe from real-time listeners
        if (this.unsubscribeFunctions) {
            this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
        }
    }
}

// Add offline detection
window.addEventListener('online', () => {
    if (window.app) {
        window.app.isOnline = true;
        window.app.updateConnectionStatus();
        window.app.syncOfflineData();
    }
});

window.addEventListener('offline', () => {
    if (window.app) {
        window.app.isOnline = false;
        window.app.updateConnectionStatus();
    }
});

// Add beforeunload handler
window.addEventListener('beforeunload', (e) => {
    if (window.app) {
        window.app.cleanup();
    }
});

// Add error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // Log error to server if online
});

// Add unhandledrejection handler
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});