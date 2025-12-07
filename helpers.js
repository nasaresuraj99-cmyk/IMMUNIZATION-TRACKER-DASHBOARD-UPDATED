// Helper functions for the application

export function showToast(message, type = 'info', duration = 5000) {
    // Create toast container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon based on type
    let icon = 'info-circle';
    switch(type) {
        case 'success':
            icon = 'check-circle';
            break;
        case 'error':
            icon = 'exclamation-circle';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            break;
    }
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="toast-close">&times;</button>
    `;
    
    container.appendChild(toast);
    
    // Add close button functionality
    toast.querySelector('.toast-close').addEventListener('click', () => {
        removeToast(toast);
    });
    
    // Auto-remove after duration
    setTimeout(() => {
        removeToast(toast);
    }, duration);
    
    function removeToast(toastElement) {
        toastElement.style.opacity = '0';
        toastElement.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toastElement.parentNode) {
                toastElement.parentNode.removeChild(toastElement);
            }
        }, 300);
    }
}

export function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function getStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        return navigator.storage.estimate();
    }
    return Promise.resolve({ usage: 0, quota: 0 });
}

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function generateQRCode(text, elementId) {
    // Simple QR code generation using Google Charts API
    const element = document.getElementById(elementId);
    if (element) {
        const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(text)}&choe=UTF-8`;
        element.innerHTML = `<img src="${qrUrl}" alt="QR Code">`;
    }
}

export function exportToCSV(data, filename) {
    if (!data || !data.length) return;
    
    const csvRows = [];
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));
    
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export function formatPhoneNumber(phone) {
    // Format Ghana phone number
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `+233 ${cleaned.substring(1, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('233')) {
        return `+233 ${cleaned.substring(3, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
    }
    return phone;
}

export function calculateVaccineSchedule(birthDate) {
    const dob = new Date(birthDate);
    const schedule = {};
    
    // IA2030 Schedule
    const vaccines = [
        { name: 'BCG', days: 0 },
        { name: 'OPV0', days: 0 },
        { name: 'Hepatitis B', days: 0 },
        { name: 'OPV1', weeks: 6 },
        { name: 'Penta1', weeks: 6 },
        { name: 'PCV1', weeks: 6 },
        { name: 'Rotavirus1', weeks: 6 },
        { name: 'OPV2', weeks: 10 },
        { name: 'Penta2', weeks: 10 },
        { name: 'PCV2', weeks: 10 },
        { name: 'Rotavirus2', weeks: 10 },
        { name: 'OPV3', weeks: 14 },
        { name: 'Penta3', weeks: 14 },
        { name: 'PCV3', weeks: 14 },
        { name: 'Rotavirus3', weeks: 14 },
        { name: 'IPV1', weeks: 14 },
        { name: 'Malaria1', months: 6 },
        { name: 'Malaria2', months: 7 },
        { name: 'IPV2', months: 7 },
        { name: 'Malaria3', months: 9 },
        { name: 'Measles Rubella1', months: 9 },
        { name: 'Malaria4', months: 18 },
        { name: 'Measles Rubella2', months: 18 },
        { name: 'Men A', months: 18 },
        { name: 'LLIN', months: 18 },
        { name: 'Vitamin A1', months: 6 },
        { name: 'Vitamin A2', months: 12 },
        { name: 'Vitamin A3', months: 18 },
        { name: 'Vitamin A4', months: 24 },
        { name: 'Vitamin A5', months: 30 },
        { name: 'Vitamin A6', months: 36 },
        { name: 'Vitamin A7', months: 42 },
        { name: 'Vitamin A8', months: 48 },
        { name: 'Vitamin A9', months: 54 },
        { name: 'Vitamin A10', months: 60 }
    ];
    
    vaccines.forEach(vaccine => {
        const dueDate = new Date(dob);
        if (vaccine.days !== undefined) {
            dueDate.setDate(dueDate.getDate() + vaccine.days);
        } else if (vaccine.weeks !== undefined) {
            dueDate.setDate(dueDate.getDate() + (vaccine.weeks * 7));
        } else if (vaccine.months !== undefined) {
            dueDate.setMonth(dueDate.getMonth() + vaccine.months);
        }
        
        schedule[vaccine.name] = {
            dueDate: dueDate.toISOString().split('T')[0],
            status: dueDate <= new Date() ? 'Due' : 'Scheduled'
        };
    });
    
    return schedule;
}

export function isOffline() {
    return !navigator.onLine;
}

export function checkConnectivity() {
    return new Promise((resolve) => {
        if (navigator.onLine) {
            // Try to fetch a small resource to confirm real connectivity
            fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' })
                .then(() => resolve(true))
                .catch(() => resolve(false));
        } else {
            resolve(false);
        }
    });
}

// Add this to window for global access
window.showToast = showToast;