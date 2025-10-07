// Cloud Storage Service using Firebase
class CloudStorageService {
    constructor() {
        this.db = null;
        this.auth = null;
        this.isConnected = false;
        this.organizationId = 'safety-tracker'; // You can change this to your organization ID
        this.currentAuthUser = null;
        this.authStateChangeCallbacks = [];
        this.init();
    }

    async init() {
        // Wait for Firebase to be available
        while (!window.firestore || !window.firebaseAuth || !window.firebaseFunctions) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.db = window.firestore;
        this.auth = window.firebaseAuth;
        this.functions = window.firebaseFunctions;
        
        // Simple Firebase connection for cloud storage
        try {
            await this.functions.signInAnonymously(this.auth);
            this.isConnected = true;
            console.log('Connected to cloud storage');
            
            // Notify the app that connection status has changed
            if (window.projectManager) {
                window.projectManager.showConnectionStatus();
            }
        } catch (error) {
            console.error('Failed to connect to cloud storage:', error);
            this.isConnected = false;
            
            // Notify the app that connection status has changed
            if (window.projectManager) {
                window.projectManager.showConnectionStatus();
            }
        }
    }

    // Generic methods for any collection
    async saveToCloud(collectionName, data) {
        if (!this.isConnected) {
            console.warn('Not connected to cloud storage, saving locally');
            return this.saveToLocal(collectionName, data);
        }

        try {
            const collectionRef = this.functions.collection(this.db, collectionName);
            const promises = Object.entries(data).map(([id, item]) => {
                const docRef = this.functions.doc(collectionRef, id);
                return this.functions.setDoc(docRef, item);
            });
            await Promise.all(promises);
            console.log(`Saved ${Object.keys(data).length} items to cloud: ${collectionName}`);
        } catch (error) {
            // Check if it's a CORS/network error that we can ignore
            if (error.message && (error.message.includes('access control') || error.message.includes('CORS'))) {
                console.warn(`Cloud storage CORS error (${collectionName}), using local storage fallback`);
            } else {
                console.error(`Error saving to cloud (${collectionName}):`, error);
            }
            // Fallback to local storage
            this.saveToLocal(collectionName, data);
        }
    }

    async loadFromCloud(collectionName) {
        if (!this.isConnected) {
            console.warn('Not connected to cloud storage, loading locally');
            return this.loadFromLocal(collectionName);
        }

        try {
            const collectionRef = this.functions.collection(this.db, collectionName);
            const snapshot = await this.functions.getDocs(collectionRef);
            const data = {};
            snapshot.forEach(doc => {
                data[doc.id] = doc.data();
            });
            console.log(`Loaded ${Object.keys(data).length} items from cloud: ${collectionName}`);
            return data;
        } catch (error) {
            console.error(`Error loading from cloud (${collectionName}):`, error);
            // Fallback to local storage
            return this.loadFromLocal(collectionName);
        }
    }

    async deleteFromCloud(collectionName, itemId) {
        if (!this.isConnected) {
            console.warn('Not connected to cloud storage, deleting locally');
            return this.deleteFromLocal(collectionName, itemId);
        }

        try {
            // Ensure itemId is a string
            const stringId = String(itemId);
            const collectionRef = this.functions.collection(this.db, collectionName);
            const docRef = this.functions.doc(collectionRef, stringId);
            await this.functions.deleteDoc(docRef);
            console.log(`Deleted item from cloud: ${collectionName}/${stringId}`);
        } catch (error) {
            console.error(`Error deleting from cloud (${collectionName}/${itemId}):`, error);
            // Fallback to local storage
            this.deleteFromLocal(collectionName, itemId);
        }
    }

    // Real-time sync (optional - for live updates)
    async subscribeToCollection(collectionName, callback) {
        if (!this.isConnected) {
            console.warn('Not connected to cloud storage, real-time sync disabled');
            return () => {};
        }

        try {
            const collectionRef = this.functions.collection(this.db, collectionName);
            return this.functions.onSnapshot(collectionRef, (snapshot) => {
                const data = {};
                snapshot.forEach(doc => {
                    data[doc.id] = doc.data();
                });
                callback(data);
            });
        } catch (error) {
            console.error(`Error setting up real-time sync (${collectionName}):`, error);
            return () => {};
        }
    }

    // Fallback to local storage methods
    saveToLocal(collectionName, data) {
        localStorage.setItem(`safetrack_${collectionName}`, JSON.stringify(data));
    }

    loadFromLocal(collectionName) {
        const stored = localStorage.getItem(`safetrack_${collectionName}`);
        return stored ? JSON.parse(stored) : {};
    }

    deleteFromLocal(collectionName, itemId) {
        const data = this.loadFromLocal(collectionName);
        delete data[itemId];
        this.saveToLocal(collectionName, data);
    }

    // Specific methods for each data type
    async saveProjects(projects) {
        const data = {};
        projects.forEach(project => {
            data[project.id] = project;
        });
        await this.saveToCloud('projects', data);
    }

    async loadProjects() {
        const data = await this.loadFromCloud('projects');
        return Object.values(data);
    }

    async saveUsers(users) {
        // First, get all existing user IDs from cloud
        const existingData = await this.loadFromCloud('users');
        const existingIds = Object.keys(existingData);
        const newIds = users.map(u => u.id);
        
        // Find users to delete (exist in cloud but not in new array)
        const idsToDelete = existingIds.filter(id => !newIds.includes(id));
        
        // Delete removed users from cloud
        for (const id of idsToDelete) {
            await this.deleteFromCloud('users', id);
        }
        
        // Save current users to cloud
        const data = {};
        users.forEach(user => {
            data[user.id] = user;
        });
        await this.saveToCloud('users', data);
    }

    async loadUsers() {
        const data = await this.loadFromCloud('users');
        const users = Object.values(data);
        
        // TEMPORARILY DISABLE USER FILTERING TO RESTORE MISSING USERS
        // Filter out ONLY the specific old default users (not any user with similar names)
        // const oldDefaultUsers = [
        //     {id: 'sarah', name: 'Sarah Johnson'},
        //     {id: 'mike', name: 'MIke'},  // Note: this was the old default "MIke" with capital I
        //     {id: 'lisa', name: 'Lisa Davis'},
        //     {id: 'david', name: 'David Wilson'}
        // ];
        
        // const filteredUsers = users.filter(user => {
        //     // Only filter if BOTH id AND name match exactly (to avoid filtering real users)
        //     const isOldDefault = oldDefaultUsers.some(oldUser => 
        //         oldUser.id === user.id && oldUser.name === user.name
        //     );
        //     return !isOldDefault;
        // });
        
        // Return ALL users for now to restore missing users
        console.log('Loading users from cloud:', users.length, 'users found');
        return users;
    }

    async saveCategories(categories) {
        const data = {};
        categories.forEach(category => {
            data[category.id] = category;
        });
        await this.saveToCloud('categories', data);
    }

    async loadCategories() {
        const data = await this.loadFromCloud('categories');
        return Object.values(data);
    }

    async saveRoles(roles) {
        const data = {};
        roles.forEach(role => {
            data[role.id] = role;
        });
        await this.saveToCloud('roles', data);
    }

    async loadRoles() {
        const data = await this.loadFromCloud('roles');
        return Object.values(data);
    }

    async saveDepartments(departments) {
        const data = {};
        departments.forEach(department => {
            data[department.id] = department;
        });
        await this.saveToCloud('departments', data);
    }

    async loadDepartments() {
        const data = await this.loadFromCloud('departments');
        return Object.values(data);
    }

    // Note system methods (following the same successful pattern as projects)

    async saveCurrentUser(userId) {
        if (this.isConnected) {
            try {
                const docRef = this.functions.doc(this.db, 'settings', 'currentUser');
                await this.functions.setDoc(docRef, { userId });
            } catch (error) {
                console.error('Error saving current user to cloud:', error);
                localStorage.setItem('safetrack_current_user', JSON.stringify(userId));
            }
        } else {
            localStorage.setItem('safetrack_current_user', JSON.stringify(userId));
        }
    }

    async loadCurrentUser() {
        if (this.isConnected) {
            try {
                const docRef = this.functions.doc(this.db, 'settings', 'currentUser');
                const snapshot = await this.functions.getDocs(this.functions.collection(this.db, 'settings'));
                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    return data.userId || 'admin';
                }
            } catch (error) {
                console.error('Error loading current user from cloud:', error);
            }
        }
        
        const stored = localStorage.getItem('safetrack_current_user');
        return stored ? JSON.parse(stored) : 'admin';
    }
    // ========================================
// PROJECT NOTES SYSTEM
// ========================================

async fetchNotes(projectId) {
    if (!this.isConnected) {
        console.warn('Not connected to cloud storage, loading from local');
        return this.loadNotesLocal(projectId);
    }

    try {
        const collectionRef = this.functions.collection(this.db, 'project_notes');
        const snapshot = await this.functions.getDocs(collectionRef);
        const allNotes = {};
        
        snapshot.forEach(doc => {
            allNotes[doc.id] = doc.data();
        });
        
        // Filter notes for this specific project
        const projectNotes = Object.entries(allNotes)
            .filter(([id, note]) => id.startsWith(`${projectId}_`))
            .map(([id, note]) => ({ id, ...note }));
        
        console.log(`Loaded ${projectNotes.length} notes for project ${projectId}`);
        return projectNotes;
    } catch (error) {
        console.error('Error fetching notes:', error);
        return this.loadNotesLocal(projectId);
    }
}

async addNote(projectId, noteData) {
    const noteId = Date.now();
    const category = noteData.category || 'user';
    const fullNoteId = `${projectId}_${category}_${noteId}`;
    
    const note = {
        text: noteData.text,
        category: category,
        createdAt: new Date().toISOString(),
        createdBy: noteData.createdBy
    };

    if (!this.isConnected) {
        console.warn('Not connected to cloud storage, saving locally');
        return this.saveNoteLocal(projectId, fullNoteId, note);
    }

    try {
        const collectionRef = this.functions.collection(this.db, 'project_notes');
        const docRef = this.functions.doc(collectionRef, fullNoteId);
        await this.functions.setDoc(docRef, note);
        
        console.log(`Note added to cloud: ${fullNoteId}`);
        return { id: fullNoteId, ...note };
    } catch (error) {
        console.error('Error adding note:', error);
        return this.saveNoteLocal(projectId, fullNoteId, note);
    }
}

async deleteNote(noteId) {
    if (!this.isConnected) {
        console.warn('Not connected to cloud storage, deleting locally');
        return this.deleteNoteLocal(noteId);
    }

    try {
        const collectionRef = this.functions.collection(this.db, 'project_notes');
        const docRef = this.functions.doc(collectionRef, noteId);
        await this.functions.deleteDoc(docRef);
        
        console.log(`Note deleted from cloud: ${noteId}`);
        return true;
    } catch (error) {
        console.error('Error deleting note:', error);
        return this.deleteNoteLocal(noteId);
    }
}

// Local storage fallback methods
loadNotesLocal(projectId) {
    const stored = localStorage.getItem('safetrack_project_notes');
    const allNotes = stored ? JSON.parse(stored) : {};
    
    return Object.entries(allNotes)
        .filter(([id, note]) => id.startsWith(`${projectId}_`))
        .map(([id, note]) => ({ id, ...note }));
}

saveNoteLocal(projectId, noteId, noteData) {
    const stored = localStorage.getItem('safetrack_project_notes');
    const allNotes = stored ? JSON.parse(stored) : {};
    
    allNotes[noteId] = noteData;
    localStorage.setItem('safetrack_project_notes', JSON.stringify(allNotes));
    
    return { id: noteId, ...noteData };
}

deleteNoteLocal(noteId) {
    const stored = localStorage.getItem('safetrack_project_notes');
    const allNotes = stored ? JSON.parse(stored) : {};
    
    delete allNotes[noteId];
    localStorage.setItem('safetrack_project_notes', JSON.stringify(allNotes));
    
    return true;
}
    // Connection status
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            organizationId: this.organizationId
        };
    }

    // Manual sync (for when connection is restored)
    async syncAllData(projectManager) {
        if (!this.isConnected) {
            console.warn('Not connected to cloud storage, cannot sync');
            return false;
        }

        try {
            console.log('Starting full data sync...');
            
            // Save all current data to cloud
            await this.saveProjects(projectManager.projects);
            await this.saveUsers(projectManager.users);
            await this.saveCategories(projectManager.categories);
            await this.saveRoles(projectManager.roles);
            await this.saveDepartments(projectManager.departments);
            await this.saveCurrentUser(projectManager.currentUser);
            
            console.log('Full data sync completed');
            return true;
        } catch (error) {
            console.error('Error during full data sync:', error);
            return false;
        }
    }

    // Force reset cloud storage to only Admin User
    async forceResetCloudUsers() {
        if (!this.isConnected) {
            console.warn('Not connected to cloud storage, cannot reset');
            return false;
        }

        try {
            // Force save only Admin User to cloud
            const adminUser = {
                id: "admin",
                name: "Admin User",
                email: "admin@safetrack.com",
                avatar: "A"
            };
            
            const data = { admin: adminUser };
            await this.saveToCloud('users', data);
            
            console.log('Cloud storage reset to Admin User only');
            return true;
        } catch (error) {
            console.error('Error resetting cloud users:', error);
            return false;
        }
    }

    // Force cleanup old default users from cloud
    async forceCleanupCloudUsers() {
        const users = await this.loadUsers(); // This will now filter automatically
        
        // Save the filtered users back to cloud (this removes the old ones permanently)
        await this.saveUsers(users);
        
        return users;
    }

    // Force reset cloud storage to empty projects
    async forceResetCloudProjects() {
        if (!this.isConnected) {
            console.warn('Not connected to cloud storage, cannot reset');
            return false;
        }

        try {
            // Force save empty projects array to cloud
            const data = {};
            await this.saveToCloud('projects', data);
            
            console.log('Cloud storage reset to empty projects');
            return true;
        } catch (error) {
            console.error('Error resetting cloud projects:', error);
            return false;
        }
    }

    // Custom Authentication methods
    async signInWithUsernameAndPassword(username, password) {
        try {
            // Hash the password for comparison (simple hash for demo - use bcrypt in production)
            const hashedPassword = await this.hashPassword(password);
            
            // Get user from Firestore
            const usersRef = this.functions.collection(this.db, 'auth_users');
            const q = this.functions.query(usersRef, this.functions.where('username', '==', username));
            const querySnapshot = await this.functions.getDocs(q);
            
            if (querySnapshot.empty) {
                return { success: false, error: 'Invalid username or password' };
            }
            
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            
            // Verify password
            if (userData.passwordHash !== hashedPassword) {
                return { success: false, error: 'Invalid username or password' };
            }
            
            // Create user session
            const user = {
                uid: userDoc.id,
                username: userData.username,
                displayName: userData.displayName,
                createdAt: userData.createdAt
            };
            
            // Save session to localStorage with expiration (24 hours)
            const session = {
                user: user,
                expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            };
            localStorage.setItem('safetrack_user_session', JSON.stringify(session));
            
            this.currentAuthUser = user;
            this.isConnected = true;
            
            // Notify callbacks
            this.authStateChangeCallbacks.forEach(callback => callback(user));
            
            return { success: true, user: user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: 'Login failed. Please try again.' };
        }
    }

    async createUserWithUsernameAndPassword(username, password, displayName) {
        try {
            // Check if username already exists
            const usersRef = this.functions.collection(this.db, 'auth_users');
            const q = this.functions.query(usersRef, this.functions.where('username', '==', username));
            const querySnapshot = await this.functions.getDocs(q);
            
            if (!querySnapshot.empty) {
                return { success: false, error: 'Username already exists' };
            }
            
            // Hash the password
            const hashedPassword = await this.hashPassword(password);
            
            // Create user document
            const newUserData = {
                username: username,
                passwordHash: hashedPassword,
                displayName: displayName,
                createdAt: new Date().toISOString()
            };
            
            const docRef = await this.functions.addDoc(usersRef, newUserData);
            
            // Create user session
            const user = {
                uid: docRef.id,
                username: username,
                displayName: displayName,
                createdAt: newUserData.createdAt
            };
            
            // Save session to localStorage
            const session = {
                user: user,
                expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            };
            localStorage.setItem('safetrack_user_session', JSON.stringify(session));
            
            this.currentAuthUser = user;
            this.isConnected = true;
            
            // Notify callbacks
            this.authStateChangeCallbacks.forEach(callback => callback(user));
            
            return { success: true, user: user };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'Registration failed. Please try again.' };
        }
    }

    async signOut() {
        try {
            // Clear session from localStorage
            localStorage.removeItem('safetrack_user_session');
            
            this.currentAuthUser = null;
            this.isConnected = false;
            
            // Notify callbacks
            this.authStateChangeCallbacks.forEach(callback => callback(null));
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Simple password hashing (use bcrypt in production)
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'safetrack_salt'); // Add salt
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    getCurrentUser() {
        return this.currentAuthUser;
    }

    isAuthenticated() {
        return this.isConnected;
    }

    onAuthStateChanged(callback) {
        // Simplified - just call immediately with connection status
        callback(this.isConnected ? { connected: true } : null);
    }

    // Bug Reports methods
    async getBugReports() {
        console.log('[CloudStorage] Getting bug reports');
        if (!this.isConnected) {
            console.warn('Not connected to cloud storage, loading from local');
            const localData = localStorage.getItem('safetrack_bug_reports_backup');
            return localData ? JSON.parse(localData) : [];
        }

        try {
            const collectionRef = this.functions.collection(this.db, 'bug_reports');
            const snapshot = await this.functions.getDocs(collectionRef);
            const bugs = [];
            
            snapshot.forEach(doc => {
                bugs.push({ id: doc.id, ...doc.data() });
            });
            
            console.log('[CloudStorage] Loaded', bugs.length, 'bug reports from Firebase');
            // Backup to localStorage
            localStorage.setItem('safetrack_bug_reports_backup', JSON.stringify(bugs));
            return bugs;
        } catch (error) {
            console.error('[CloudStorage] Error getting bug reports:', error);
            const localData = localStorage.getItem('safetrack_bug_reports_backup');
            return localData ? JSON.parse(localData) : [];
        }
    }

    async saveBugReports(bugs) {
        console.log('[CloudStorage] Saving bug reports:', bugs.length);
        if (!this.isConnected) {
            console.warn('Not connected to cloud storage, saving locally only');
            localStorage.setItem('safetrack_bug_reports_backup', JSON.stringify(bugs));
            return;
        }

        try {
            const collectionRef = this.functions.collection(this.db, 'bug_reports');
            
            // Get all existing bug reports
            const snapshot = await this.functions.getDocs(collectionRef);
            
            // Delete all existing bugs
            const deletePromises = [];
            snapshot.forEach((doc) => {
                deletePromises.push(this.functions.deleteDoc(doc.ref));
            });
            
            if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
                console.log('[CloudStorage] Deleted', deletePromises.length, 'old bug reports');
            }
            
            // Add new bugs
            if (bugs.length > 0) {
                const addPromises = bugs.map(bug => {
                    return this.functions.addDoc(collectionRef, bug);
                });
                
                await Promise.all(addPromises);
                console.log('[CloudStorage] Added', bugs.length, 'bug reports to Firebase');
            }
            
            // Also save to localStorage as backup
            localStorage.setItem('safetrack_bug_reports_backup', JSON.stringify(bugs));
        } catch (error) {
            console.error('[CloudStorage] Error saving bug reports:', error);
            localStorage.setItem('safetrack_bug_reports_backup', JSON.stringify(bugs));
            console.log('[CloudStorage] Saved bug reports to localStorage as fallback');
        }
    }

    // Notification methods (Firebase Firestore - Simple version)
    async getNotifications(userId) {
        console.log('[CloudStorage] Getting notifications for user from Firebase:', userId);
        try {
            if (!this.isConnected) {
                console.log('[CloudStorage] Not connected to Firebase, using localStorage');
                const localData = localStorage.getItem(`safetrack_notifications_${userId}`);
                return localData ? JSON.parse(localData) : [];
            }

            // Get ALL notifications from Firebase (we'll filter client-side)
            const collectionRef = this.functions.collection(this.db, 'notifications');
            const snapshot = await this.functions.getDocs(collectionRef);
            const allNotifications = [];
            
            snapshot.forEach((doc) => {
                allNotifications.push({
                    firebaseDocId: doc.id,
                    ...doc.data()
                });
            });
            
            // Filter for this specific user
            const userNotifications = allNotifications.filter(n => n.userId === userId);
            
            // Sort by createdAt (newest first)
            userNotifications.sort((a, b) => {
                const dateA = new Date(a.createdAt || 0);
                const dateB = new Date(b.createdAt || 0);
                return dateB - dateA;
            });
            
            console.log('[CloudStorage] Loaded', userNotifications.length, 'notifications from Firebase for user:', userId);
            
            // Backup to localStorage
            localStorage.setItem(`safetrack_notifications_${userId}`, JSON.stringify(userNotifications));
            return userNotifications;
        } catch (error) {
            console.error('[CloudStorage] Error getting notifications from Firebase:', error);
            // Fallback to localStorage
            const localData = localStorage.getItem(`safetrack_notifications_${userId}`);
            return localData ? JSON.parse(localData) : [];
        }
    }

    async saveNotifications(userId, notifications) {
        console.log('[CloudStorage] Saving', notifications.length, 'notifications for user to Firebase:', userId);
        try {
            if (!this.isConnected) {
                console.log('[CloudStorage] Not connected to Firebase, using localStorage only');
                localStorage.setItem(`safetrack_notifications_${userId}`, JSON.stringify(notifications));
                return;
            }

            const collectionRef = this.functions.collection(this.db, 'notifications');
            
            // Get ALL existing notifications
            const snapshot = await this.functions.getDocs(collectionRef);
            
            // Delete only THIS user's notifications
            const deletePromises = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.userId === userId) {
                    deletePromises.push(this.functions.deleteDoc(doc.ref));
                }
            });
            
            if (deletePromises.length > 0) {
                await Promise.all(deletePromises);
                console.log('[CloudStorage] Deleted', deletePromises.length, 'old notifications for user:', userId);
            }
            
            // Add new notifications using setDoc (not addDoc)
            if (notifications.length > 0) {
                const setPromises = notifications.map(notification => {
                    // Create a unique document ID for each notification
                    const docId = `${userId}_${notification.id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const docRef = this.functions.doc(collectionRef, docId);
                    
                    const notificationData = {
                        ...notification,
                        userId: userId,
                        createdAt: notification.createdAt || new Date().toISOString()
                    };
                    // Remove firebaseDocId before saving (it's auto-generated)
                    delete notificationData.firebaseDocId;
                    
                    return this.functions.setDoc(docRef, notificationData);
                });
                
                await Promise.all(setPromises);
                console.log('[CloudStorage] Added', notifications.length, 'new notifications to Firebase for user:', userId);
            }
            
            // Also save to localStorage as backup
            localStorage.setItem(`safetrack_notifications_${userId}`, JSON.stringify(notifications));
        } catch (error) {
            console.error('[CloudStorage] Error saving notifications to Firebase:', error);
            // Fallback to localStorage only
            localStorage.setItem(`safetrack_notifications_${userId}`, JSON.stringify(notifications));
            console.log('[CloudStorage] Saved notifications to localStorage as fallback');
        }
    }
}

// Make it available globally
window.CloudStorageService = CloudStorageService;
