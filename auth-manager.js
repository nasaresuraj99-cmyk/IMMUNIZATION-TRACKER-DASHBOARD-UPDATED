export class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authToken = null;
        this.userData = null;
        
        this.init();
    }

    init() {
        // Firebase auth state listener
        firebaseAuth.onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                this.loadUserData(user.uid);
            } else {
                this.userData = null;
                this.authToken = null;
            }
        });
    }

    async login(email, password, rememberMe = false) {
        try {
            // Set persistence
            await firebaseAuth.setPersistence(
                rememberMe ? 
                firebase.auth.Auth.Persistence.LOCAL : 
                firebase.auth.Auth.Persistence.SESSION
            );
            
            // Sign in
            const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
            
            // Check email verification
            if (!userCredential.user.emailVerified) {
                await this.sendVerificationEmail();
                return { 
                    success: false, 
                    error: 'Please verify your email before logging in. A new verification email has been sent.' 
                };
            }
            
            // Get ID token
            this.authToken = await userCredential.user.getIdToken();
            
            // Load user data
            await this.loadUserData(userCredential.user.uid);
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: this.formatAuthError(error) 
            };
        }
    }

    async register(userData) {
        try {
            // Create user in Firebase Auth
            const userCredential = await firebaseAuth.createUserWithEmailAndPassword(
                userData.email,
                userData.password
            );
            
            // Send verification email
            await userCredential.user.sendEmailVerification();
            
            // Update profile
            await userCredential.user.updateProfile({
                displayName: `${userData.firstName} ${userData.lastName}`
            });
            
            // Create user document in Firestore
            await this.createUserDocument(userCredential.user.uid, userData);
            
            // Create facility
            if (userData.facility) {
                const facilityId = await this.createFacility(userCredential.user.uid, userData.facility);
                await this.linkUserToFacility(userCredential.user.uid, facilityId);
            }
            
            return { 
                success: true, 
                message: 'Account created successfully! Please check your email for verification.' 
            };
        } catch (error) {
            console.error('Registration error:', error);
            return { 
                success: false, 
                error: this.formatAuthError(error) 
            };
        }
    }

    async createUserDocument(userId, userData) {
        const userDoc = {
            uid: userId,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            isActive: true,
            emailVerified: false,
            lastLogin: null,
            preferences: {
                notifications: true,
                theme: 'light',
                language: 'en'
            }
        };
        
        await firebaseDb.collection('users').doc(userId).set(userDoc);
    }

    async createFacility(userId, facilityData) {
        const facilityRef = firebaseDb.collection('facilities').doc();
        
        const facilityDoc = {
            id: facilityRef.id,
            name: facilityData.name,
            type: facilityData.type,
            region: facilityData.region,
            district: facilityData.district,
            community: facilityData.community || '',
            address: facilityData.address || '',
            createdBy: userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isActive: true,
            staff: [userId],
            code: facilityData.code || this.generateFacilityCode(facilityData.type, facilityData.region)
        };
        
        await facilityRef.set(facilityDoc);
        return facilityRef.id;
    }

    async linkUserToFacility(userId, facilityId) {
        await firebaseDb.collection('users').doc(userId).update({
            facilities: firebase.firestore.FieldValue.arrayUnion(facilityId),
            currentFacility: facilityId
        });
    }

    generateFacilityCode(type, region) {
        const typeCode = type.substring(0, 3).toUpperCase();
        const regionCode = region.substring(0, 3).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        return `${typeCode}-${regionCode}-${timestamp}`;
    }

    async loadUserData(userId) {
        try {
            const userDoc = await firebaseDb.collection('users').doc(userId).get();
            if (userDoc.exists) {
                this.userData = userDoc.data();
                
                // Update last login
                await firebaseDb.collection('users').doc(userId).update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async sendVerificationEmail() {
        if (this.currentUser) {
            await this.currentUser.sendEmailVerification();
        }
    }

    async resetPassword(email) {
        try {
            await firebaseAuth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: this.formatAuthError(error) 
            };
        }
    }

    async logout() {
        try {
            await firebaseAuth.signOut();
            this.currentUser = null;
            this.userData = null;
            this.authToken = null;
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async demoLogin() {
        // Demo credentials
        const demoEmail = 'demo@ghs.gov.gh';
        const demoPassword = 'Demo@123';
        
        return await this.login(demoEmail, demoPassword, false);
    }

    formatAuthError(error) {
        switch(error.code) {
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/user-disabled':
                return 'This account has been disabled';
            case 'auth/user-not-found':
                return 'No account found with this email';
            case 'auth/wrong-password':
                return 'Incorrect password';
            case 'auth/email-already-in-use':
                return 'Email already in use';
            case 'auth/weak-password':
                return 'Password is too weak';
            case 'auth/operation-not-allowed':
                return 'Operation not allowed';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please try again later';
            default:
                return 'Authentication failed. Please try again';
        }
    }

    onAuthStateChanged(callback) {
        firebaseAuth.onAuthStateChanged(callback);
    }
}