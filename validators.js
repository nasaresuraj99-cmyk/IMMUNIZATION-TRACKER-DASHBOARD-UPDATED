export class FormValidator {
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePhone(phone) {
        // Ghana phone number validation
        const re = /^(?:\+233|0)[2345]\d{8}$/;
        return re.test(phone);
    }

    static validatePassword(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        return {
            isValid: Object.values(requirements).every(req => req),
            requirements,
            score: this.calculatePasswordScore(password)
        };
    }

    static calculatePasswordScore(password) {
        let score = 0;
        
        // Length
        if (password.length >= 8) score += 20;
        if (password.length >= 12) score += 10;
        
        // Character types
        if (/[A-Z]/.test(password)) score += 20;
        if (/[a-z]/.test(password)) score += 20;
        if (/\d/.test(password)) score += 20;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 20;
        
        return Math.min(score, 100);
    }

    static validateDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    static validateGhanaPostalCode(code) {
        const re = /^[A-Z]{2}-\d{3}-\d{4}$/;
        return re.test(code);
    }

    static validateNHISNumber(nhis) {
        const re = /^[A-Z]{3}\d{6}$/;
        return re.test(nhis);
    }

    static validateChildWeight(weight) {
        const num = parseFloat(weight);
        return !isNaN(num) && num >= 0.5 && num <= 20; // kg
    }

    static validateVaccineBatch(batch) {
        const re = /^[A-Z0-9]{6,12}$/;
        return re.test(batch);
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Remove potentially harmful characters
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript: prefix
            .replace(/on\w+=/gi, ''); // Remove event handlers
    }

    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-GH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    static formatDateTime(date) {
        return new Date(date).toLocaleString('en-GH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static calculateAge(dateOfBirth) {
        const dob = new Date(dateOfBirth);
        const today = new Date();
        
        let years = today.getFullYear() - dob.getFullYear();
        let months = today.getMonth() - dob.getMonth();
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        return { years, months };
    }

    static generateChildID(facilityCode, birthYear) {
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${facilityCode}-${birthYear}-${random}`;
    }

    static calculateNextVaccineDate(lastDate, vaccineSchedule) {
        const lastVaccine = new Date(lastDate);
        const nextDate = new Date(lastVaccine);
        
        // Add weeks based on vaccine schedule
        switch(vaccineSchedule) {
            case '6_weeks':
                nextDate.setDate(nextDate.getDate() + 42); // 6 weeks
                break;
            case '10_weeks':
                nextDate.setDate(nextDate.getDate() + 70); // 10 weeks
                break;
            case '14_weeks':
                nextDate.setDate(nextDate.getDate() + 98); // 14 weeks
                break;
            case '9_months':
                nextDate.setMonth(nextDate.getMonth() + 9);
                break;
            case '18_months':
                nextDate.setMonth(nextDate.getMonth() + 18);
                break;
            default:
                nextDate.setMonth(nextDate.getMonth() + 1);
        }
        
        return nextDate;
    }
}