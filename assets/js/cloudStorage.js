// Cloud Storage Service using Firebase
class CloudStorageService {
    constructor() {
        this.db = null;
        this.auth = null;
        this.isConnected = false;
        this.organizationId = 'safety-tracker'; // You can change this to your organization ID
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
        
        // Sign in anonymously for now (you can add proper auth later)
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
            console.error(`Error saving to cloud (${collectionName}):`, error);
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
        console.log('🟠 CLOUD SAVE - Saving users to cloud:', users.map(u => u.name));
        
        // First, get all existing user IDs from cloud
        const existingData = await this.loadFromCloud('users');
        const existingIds = Object.keys(existingData);
        const newIds = users.map(u => u.id);
        
        console.log('🟠 CLOUD SAVE - Existing IDs:', existingIds);
        console.log('🟠 CLOUD SAVE - New IDs:', newIds);
        
        // Find users to delete (exist in cloud but not in new array)
        const idsToDelete = existingIds.filter(id => !newIds.includes(id));
        console.log('🟠 CLOUD SAVE - IDs to delete:', idsToDelete);
        
        // Delete removed users from cloud
        for (const id of idsToDelete) {
            console.log('🟠 CLOUD SAVE - Deleting user from cloud:', id);
            await this.deleteFromCloud('users', id);
        }
        
        // Save current users to cloud
        const data = {};
        users.forEach(user => {
            data[user.id] = user;
        });
        console.log('🟠 CLOUD SAVE - Data object keys:', Object.keys(data));
        await this.saveToCloud('users', data);
        console.log('🟠 CLOUD SAVE - Users saved to cloud successfully');
    }

    async loadUsers() {
        const data = await this.loadFromCloud('users');
        const users = Object.values(data);
        
        // Filter out old default users that shouldn't be in cloud
        const oldDefaultUsers = ['sarah', 'mike', 'lisa', 'david'];
        const filteredUsers = users.filter(user => {
            const shouldKeep = !oldDefaultUsers.includes(user.id);
            if (!shouldKeep) {
                console.log('DEBUG - Filtering out old default user:', user.id, user.name);
            }
            return shouldKeep;
        });
        
        console.log('DEBUG - Cloud users before filtering:', users.map(u => `${u.name} (${u.id})`));
        console.log('DEBUG - Cloud users after filtering:', filteredUsers.map(u => `${u.name} (${u.id})`));
        
        return filteredUsers;
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
                    return data.userId || 'all';
                }
            } catch (error) {
                console.error('Error loading current user from cloud:', error);
            }
        }
        
        const stored = localStorage.getItem('safetrack_current_user');
        return stored ? JSON.parse(stored) : 'all';
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
                email: "admin@equitashealth.com",
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
        console.log('DEBUG - Starting force cleanup of cloud users');
        const users = await this.loadUsers(); // This will now filter automatically
        console.log('DEBUG - Users after filtering:', users);
        
        // Save the filtered users back to cloud (this removes the old ones permanently)
        await this.saveUsers(users);
        console.log('DEBUG - Force cleanup completed, old default users removed from cloud');
        
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
}

// Make it available globally
window.CloudStorageService = CloudStorageService;
