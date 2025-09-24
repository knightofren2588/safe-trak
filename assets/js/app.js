// Project data management
class ProjectManager {
    constructor() {
        this.cloudStorage = new CloudStorageService();
        this.projects = [];
        this.users = [];
        this.categories = [];
        this.roles = [];
        this.departments = [];
        this.complianceItems = [];
        this.certifications = [];
        this.currentUser = 'admin'; // Default to admin user's view
        this.currentEditId = null;
        this.currentUserEditId = null;
        
        // Import system properties
        this.importData = null;
        this.importStep = 1;
        this.columnMappings = {};
        this.validatedData = [];
        this.currentProgressEditId = null;
        this.currentCategoryEditId = null;
        this.currentRoleEditId = null;
        this.currentDepartmentEditId = null;
        this.currentComplianceEditId = null;
        this.hasUserInteracted = localStorage.getItem('safetrack_user_interacted') === 'true'; // Flag to track if user has interacted with the app
        
        // Safety quotes system
        this.safetyQuotes = [
            { quote: "Safety is not a gadget but a state of mind.", author: "Eleanor Everet" },
            { quote: "Safety first is safety always.", author: "Charles M. Hayes" },
            { quote: "Prepare and prevent, don't repair and repent.", author: "Anonymous" },
            { quote: "Safety is a cheap and effective insurance policy.", author: "Anonymous" },
            { quote: "Working safely may get old, but so do those who practice it.", author: "Anonymous" },
            { quote: "Safety is everyone's responsibility.", author: "Anonymous" },
            { quote: "Your safety is everyone's business, and everyone's business is safety.", author: "Anonymous" },
            { quote: "Safety rules are your best tools.", author: "Anonymous" },
            { quote: "Think safety, work safely, live safely.", author: "Anonymous" },
            { quote: "Safety is as simple as ABC - Always Be Careful.", author: "Anonymous" },
            { quote: "The best safety device is a careful worker.", author: "Anonymous" },
            { quote: "Safety is no accident.", author: "Anonymous" },
            { quote: "When you gamble with safety, you bet your life.", author: "Anonymous" },
            { quote: "Safety is the key, it's up to you and me.", author: "Anonymous" },
            { quote: "Shortcuts cut life short.", author: "Anonymous" },
            { quote: "Better safe than sorry.", author: "Proverb" },
            { quote: "An ounce of prevention is worth a pound of cure.", author: "Benjamin Franklin" },
            { quote: "Safety brings first aid to the uninjured.", author: "F.S. Hughes" },
            { quote: "Safety is something that happens between your ears, not something you hold in your hands.", author: "Jeff Cooper" },
            { quote: "The door to safety swings on the hinges of common sense.", author: "Anonymous" },
            { quote: "Safety is not expensive, it's priceless.", author: "Jerry Smith" },
            { quote: "If you think safety is expensive, try having an accident.", author: "Anonymous" },
            { quote: "Safety is 30% common sense, 80% compliance and the rest is good luck.", author: "Barry Spud" },
            { quote: "A spill, a slip, a hospital trip.", author: "Anonymous" },
            { quote: "Danger is real, fear is a choice, but safety is smart.", author: "Anonymous" },
            { quote: "Your family needs you, work safely.", author: "Anonymous" },
            { quote: "Safety is a full-time job, don't make it a part-time practice.", author: "Anonymous" },
            { quote: "Hard hats and safety boots are cheaper than skulls and feet.", author: "Anonymous" },
            { quote: "Safety is learned behavior reinforced through repetition.", author: "Anonymous" },
            { quote: "At the end of the day, safety comes first because everything else is secondary.", author: "Anonymous" }
        ];
        
        // Initialize enhanced quote system
        this.initializeQuoteSystem();
        this.currentQuoteIndex = 0;
        
        // Simple authentication system
        this.isAuthenticated = false;
        
        // Project view mode (personal vs all team projects)
        this.projectViewMode = localStorage.getItem('safetrack_project_view_mode') || 'personal';
        
        // Project notes system
        this.projectNotes = {};
        this.currentNotesProjectId = null;
        this.userNotifications = {}; // Will be loaded asynchronously
        
        // Developer notes system (cloud-only storage)
        this.developerNotes = {};
        this.currentDeveloperNotesProjectId = null;
        
        // Auto-cleanup old notifications on startup (async, but don't wait)
        this.autoCleanupOldNotifications();
        
        // Set up periodic notification cleanup (every hour)
        setInterval(() => {
            this.autoCleanupOldNotifications();
        }, 60 * 60 * 1000); // 1 hour
        
        // Multi-user assignment system
        this.selectedAssignedUsers = [];
        
        // Archive system
        this.archivedProjects = this.loadArchivedProjects();
        
        // Admin verification system
        this.isAdminVerified = false;
        this.pendingAdminAction = null;
    }

    // ========================================
    // USER ROLE HIERARCHY SYSTEM
    // ========================================
    
    sortUsersByRoleHierarchy(users) {
        // Define role hierarchy (higher number = higher priority)
        const roleHierarchy = {
            'Administrator': 100,
            'Associate Director of Safety': 95,
            'Associate Director of Security': 90,
            'Associate Director': 85,
            'Director': 80,
            'Safety Specialist': 70,
            'Safety Liaison': 60,
            'Team Member': 50,
            'default': 0
        };
        
        return [...users].sort((a, b) => {
            // Admin always comes last
            if (a.id === 'admin') return 1;
            if (b.id === 'admin') return -1;
            
            // Get role priorities (trim whitespace and handle case variations)
            const aRole = (a.role || 'Team Member').trim();
            const bRole = (b.role || 'Team Member').trim();
            const aPriority = roleHierarchy[aRole] || roleHierarchy['default'];
            const bPriority = roleHierarchy[bRole] || roleHierarchy['default'];
            
            // Sort by priority (descending), then by name (ascending)
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            return a.name.localeCompare(b.name);
        });
    }

    // ========================================
    // SIMPLE AUTHENTICATION SYSTEM
    // ========================================
    
    checkAuthentication() {
        // Check if user is already logged in (session storage)
        const isLoggedIn = sessionStorage.getItem('safetrack_authenticated');
        
        if (isLoggedIn === 'true') {
            this.isAuthenticated = true;
        this.init();
            this.showNotification('Welcome back to SafeTrack!', 'success');
        } else {
            this.showLoginModal();
        }
    }
    
    showLoginModal() {
        // Hide the main app
        const mainContent = document.querySelector('header');
        const nav = document.querySelector('nav');
        const main = document.querySelector('main');
        
        if (mainContent) mainContent.style.display = 'none';
        if (nav) nav.style.display = 'none';
        if (main) main.style.display = 'none';
        
        // Show login modal
        const modal = new bootstrap.Modal(document.getElementById('loginModal'));
        modal.show();
    }
    
    hideLoginModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (modal) {
            modal.hide();
        }
        
        // Show the main app
        const mainContent = document.querySelector('header');
        const nav = document.querySelector('nav');
        const main = document.querySelector('main');
        
        if (mainContent) mainContent.style.display = 'block';
        if (nav) nav.style.display = 'block';
        if (main) main.style.display = 'block';
    }
    
    async handleLogin(username, password) {
        // Hardcoded credentials
        const validCredentials = [
            { username: 'Safety', password: 'BeSafe2025!' }
        ];
        
        console.log('Login attempt - Username:', username, 'Password length:', password.length); // Debug
        
        // Check credentials
        const isValid = validCredentials.some(cred => 
            cred.username === username && cred.password === password
        );
        
        console.log('Credentials check result:', isValid); // Debug
        
        if (isValid) {
            // Successful login
            console.log('Login successful, setting authentication'); // Debug
            this.isAuthenticated = true;
            sessionStorage.setItem('safetrack_authenticated', 'true');
            sessionStorage.setItem('safetrack_login_time', new Date().toISOString());
            
            this.hideLoginModal();
            
            // Initialize app first to load users
            await this.init();
            
            // Show user selection prompt only if no user preference is saved
            const hasUserPreference = localStorage.getItem('safetrack_current_user');
            if (!hasUserPreference) {
                this.showUserSelectionModal();
            } else {
                this.showNotification('Welcome to SafeTrack!', 'success');
            }
        } else {
            // Failed login
            console.log('Login failed'); // Debug
            this.showLoginError();
        }
    }
    
    showLoginError() {
        const errorDiv = document.getElementById('loginError');
        errorDiv.classList.remove('d-none');
        
        // Clear form
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginUsername').focus();
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorDiv.classList.add('d-none');
        }, 5000);
    }
    
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            this.isAuthenticated = false;
            sessionStorage.removeItem('safetrack_authenticated');
            sessionStorage.removeItem('safetrack_login_time');
            
            this.showNotification('Logged out successfully', 'info');
            
            // Reload page to reset everything
            setTimeout(() => {
                location.reload();
            }, 1000);
        }
    }

    // ========================================
    // PROJECT NOTES SYSTEM
    // ========================================
    
    async openProjectNotes(projectId) {
        // Close any existing modals first for better UX
        const existingArchiveModal = document.getElementById('archiveModal');
        if (existingArchiveModal) {
            const archiveModalInstance = bootstrap.Modal.getInstance(existingArchiveModal);
            if (archiveModalInstance) {
                archiveModalInstance.hide();
            }
        }
        
        const existingDetailsModal = document.getElementById('projectDetailsModal');
        if (existingDetailsModal) {
            const detailsModalInstance = bootstrap.Modal.getInstance(existingDetailsModal);
            if (detailsModalInstance) {
                detailsModalInstance.hide();
            }
        }
        
        // Small delay to ensure modal closing animation completes
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Convert projectId to number since project IDs are stored as numbers
        const numericProjectId = Number(projectId);
        this.currentNotesProjectId = numericProjectId;
        
        // First try to find in active projects
        let project = this.projects.find(p => p.id === numericProjectId);
        
        // If not found in active projects, check archived projects
        if (!project) {
            const userArchive = this.archivedProjects[this.currentUser] || [];
            project = userArchive.find(p => p.originalId === numericProjectId);
        }
        
        if (!project) {
            console.error('Project not found. Looking for ID:', numericProjectId, 'Available active projects:', this.projects.map(p => ({id: p.id, name: p.name})), 'Available archived projects:', (this.archivedProjects[this.currentUser] || []).map(p => ({id: p.originalId, name: p.name})));
            this.showNotification('Project not found in active or archived projects', 'error');
            return;
        }
        
        // DISABLED: Sync notes from cloud before showing modal (causes note deletion issues)
        // await this.syncProjectNotesFromCloud();
        
        // Update modal title
        document.getElementById('notesProjectTitle').textContent = `Project: ${project.name}`;
        
        // Clear and populate notes
        this.renderProjectNotes(numericProjectId);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('projectNotesModal'));
        modal.show();
    }
    
    renderProjectNotes(projectId) {
        const notesList = document.getElementById('notesList');
        const notes = this.projectNotes[projectId] || [];
        
        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-comment-slash fa-2x mb-3"></i>
                    <p>No notes or comments yet.<br>Add the first note above!</p>
                </div>
            `;
            return;
        }
        
        notesList.innerHTML = notes.map(note => `
            <div class="note-item border rounded p-3 mb-3" style="background: rgba(13, 110, 253, 0.05);">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="note-header">
                        <div class="d-flex align-items-center mb-1">
                            <div class="user-avatar-small me-2" style="background: linear-gradient(135deg, var(--safety-blue) 0%, #0a58ca 100%);">
                                ${note.authorName ? note.authorName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <strong class="text-primary">
                                ${this.escapeHtml(note.authorName || 'Unknown User')}
                            </strong>
                        </div>
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>
                            ${new Date(note.timestamp).toLocaleString('en-US', {
                                weekday: 'short',
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit', 
                                minute: '2-digit'
                            })}
                        </small>
                    </div>
                    ${note.authorId === this.currentUser ? `
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteProjectNote('${projectId}', '${note.id}')" title="Delete note">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="note-content mt-2">
                    ${this.escapeHtml(note.text).replace(/\n/g, '<br>')}
                </div>
            </div>
        `).join('');
    }
    
    async addProjectNote(projectId, noteText) {
        if (!noteText.trim()) {
            this.showNotification('Please enter a note', 'warning');
            return;
        }
        
        // Ensure projectId is numeric for consistency
        const numericProjectId = Number(projectId);
        
        const currentUserData = this.users.find(u => u.id === this.currentUser);
        const note = {
            id: Date.now().toString(),
            text: noteText.trim(),
            authorId: this.currentUser,
            authorName: currentUserData ? currentUserData.name : this.currentUser,
            timestamp: new Date().toISOString()
        };
        
        if (!this.projectNotes[numericProjectId]) {
            this.projectNotes[numericProjectId] = [];
        }
        
        this.projectNotes[numericProjectId].unshift(note); // Add to beginning
        await this.saveProjectNotes();
        
        // Set a flag to prevent immediate sync from overwriting our addition
        this.lastNoteOperation = Date.now();
        
        this.renderProjectNotes(numericProjectId);
        
        // Add notification for project owner(s)
        this.addNotificationForProjectOwner(numericProjectId, this.currentUser, note.text);
        
        // Clear form
        document.getElementById('noteText').value = '';
        
        this.showNotification('Note added successfully', 'success');
    }
    
    async deleteProjectNote(projectId, noteId) {
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }
        
        // Ensure projectId is numeric for consistency
        const numericProjectId = Number(projectId);
        
        if (this.projectNotes[numericProjectId]) {
            console.log(`Deleting note ${noteId} from project ${numericProjectId}`);
            console.log('Notes before deletion:', this.projectNotes[numericProjectId].length);
            
            this.projectNotes[numericProjectId] = this.projectNotes[numericProjectId].filter(note => note.id !== noteId);
            
            console.log('Notes after deletion:', this.projectNotes[numericProjectId].length);
            
            console.log('About to save notes after deletion. Current notes state:', {
                projectId: numericProjectId,
                notesForThisProject: this.projectNotes[numericProjectId]?.length || 0,
                totalProjectsWithNotes: Object.keys(this.projectNotes).length,
                allNotes: this.projectNotes
            });
            
            await this.saveProjectNotes();
            console.log('Notes saved to cloud after deletion');
            
            // Verify the save worked by checking what's in memory
            console.log('After save - notes in memory:', {
                projectId: numericProjectId,
                notesForThisProject: this.projectNotes[numericProjectId]?.length || 0,
                allNotes: this.projectNotes
            });
            
            // Set a flag to prevent immediate sync from overwriting our deletion
            this.lastNoteOperation = Date.now();
            
            this.renderProjectNotes(numericProjectId);
            this.showNotification('Note deleted', 'success');
        }
    }
    
    async saveProjectNotes() {
        // CLOUD FIRST: Only save to local storage if cloud fails
        // localStorage.setItem('safetrack_project_notes', JSON.stringify(this.projectNotes));
        
        // Save to cloud storage if connected
        if (this.cloudStorage.isConnected) {
            try {
                // Convert notes format for cloud storage
                // Cloud expects {id: item} format, so we'll use project IDs as document IDs
                const cloudData = {};
                Object.entries(this.projectNotes).forEach(([projectId, notes]) => {
                    if (notes && notes.length > 0) {
                        cloudData[projectId] = {
                            projectId: projectId,
                            notes: notes,
                            lastUpdated: new Date().toISOString()
                        };
                    }
                });
                
                if (Object.keys(cloudData).length === 0) {
                    // If no projects have notes, delete all note documents from cloud
                    console.log('No projects have notes - deleting all note documents from cloud');
                    try {
                        // Delete the entire project_notes collection by deleting all known project documents
                        const existingData = await this.cloudStorage.loadFromCloud('project_notes');
                        if (existingData) {
                            for (const projectId of Object.keys(existingData)) {
                                await this.cloudStorage.deleteFromCloud('project_notes', projectId);
                                console.log(`Deleted cloud notes document for project ${projectId}`);
                            }
                        }
                        console.log('✅ All note documents deleted from cloud storage');
                    } catch (deleteError) {
                        console.error('Failed to delete note documents from cloud:', deleteError);
                    }
                } else {
                    console.log('Saving to cloud storage - data being saved:', cloudData);
                    await this.cloudStorage.saveToCloud('project_notes', cloudData);
                    console.log('✅ Project notes saved to cloud successfully:', Object.keys(cloudData).length, 'projects with notes');
                }
            } catch (error) {
                console.error('Failed to save project notes to cloud:', error);
                // Only fallback to local storage if cloud fails
                localStorage.setItem('safetrack_project_notes', JSON.stringify(this.projectNotes));
                console.log('Fallback: Saved project notes to local storage');
            }
        } else {
            // Only use local storage if not connected to cloud
            localStorage.setItem('safetrack_project_notes', JSON.stringify(this.projectNotes));
            console.log('No cloud connection: Saved project notes to local storage');
        }
    }
    
    async loadProjectNotes() {
        // Try to load from cloud first
        if (this.cloudStorage.isConnected) {
            try {
                const cloudData = await this.cloudStorage.loadFromCloud('project_notes');
                if (cloudData && Object.keys(cloudData).length > 0) {
                    // Convert cloud format back to our internal format
                    const notes = {};
                    Object.entries(cloudData).forEach(([projectId, data]) => {
                        if (data.notes) {
                            notes[projectId] = data.notes;
                        }
                    });
                    console.log('Loaded project notes from cloud:', Object.keys(notes).length, 'projects with notes');
                    return notes;
                }
            } catch (error) {
                console.error('Failed to load project notes from cloud:', error);
            }
        }
        
        // Fallback to local storage
        const stored = localStorage.getItem('safetrack_project_notes');
        const localNotes = stored ? JSON.parse(stored) : {};
        console.log('Loaded project notes from local storage');
        return localNotes;
    }
    
    async syncProjectNotesFromCloud() {
        // Check if we just performed a note operation - if so, skip sync to prevent overwriting
        if (this.lastNoteOperation && (Date.now() - this.lastNoteOperation) < 5000) {
            console.log('Skipping sync - recent note operation detected');
            return;
        }
        
        // Force refresh notes from cloud
        if (this.cloudStorage.isConnected) {
            try {
                const cloudData = await this.cloudStorage.loadFromCloud('project_notes');
                if (cloudData && Object.keys(cloudData).length > 0) {
                    // Convert cloud format back to our internal format
                    const notes = {};
                    Object.entries(cloudData).forEach(([projectId, data]) => {
                        if (data.notes) {
                            notes[projectId] = data.notes;
                        }
                    });
                    this.projectNotes = notes;
                    console.log('Synced project notes from cloud:', Object.keys(notes).length, 'projects have notes');
                    
                    // Also update local storage
                    localStorage.setItem('safetrack_project_notes', JSON.stringify(this.projectNotes));
                } else {
                    console.log('No project notes found in cloud');
                }
            } catch (error) {
                console.error('Failed to sync project notes from cloud:', error);
            }
        } else {
            console.warn('Cannot sync project notes - not connected to cloud');
        }
    }

    // ========================================
    // USER NOTIFICATIONS SYSTEM
    // ========================================
    
    async loadUserNotifications() {
        // CLOUD FIRST: Load from cloud storage if connected
        if (this.cloudStorage && this.cloudStorage.isConnected) {
            try {
                const cloudData = await this.cloudStorage.loadFromCloud('user_notifications');
                if (cloudData && Object.keys(cloudData).length > 0) {
                    // Convert cloud format back to our internal format
                    const notifications = {};
                    Object.entries(cloudData).forEach(([userId, data]) => {
                        if (data.notifications) {
                            notifications[userId] = data.notifications;
                        }
                    });
                    console.log('User notifications loaded from cloud');
                    return notifications;
                }
            } catch (error) {
                console.error('Failed to load notifications from cloud:', error);
            }
        }
        
        // Fallback to local storage
        const stored = localStorage.getItem('safetrack_user_notifications');
        const localNotifications = stored ? JSON.parse(stored) : {};
        console.log('User notifications loaded from local storage (fallback)');
        return localNotifications;
    }
    
    async saveUserNotifications() {
        // CLOUD FIRST: Save to cloud storage if connected
        if (this.cloudStorage.isConnected) {
            try {
                // Convert user notifications to proper cloud storage format
                const cloudData = {};
                Object.entries(this.userNotifications).forEach(([userId, notifications]) => {
                    if (notifications && notifications.length > 0) {
                        cloudData[userId] = {
                            userId: userId,
                            notifications: notifications,
                            lastUpdated: new Date().toISOString()
                        };
                    }
                });
                
                console.log('Saving notifications to cloud:', cloudData);
                await this.cloudStorage.saveToCloud('user_notifications', cloudData);
                console.log('✅ User notifications saved to cloud successfully');
            } catch (error) {
                console.error('Failed to save notifications to cloud:', error);
                // FALLBACK ONLY: Save to local storage if cloud fails
                localStorage.setItem('safetrack_user_notifications', JSON.stringify(this.userNotifications));
                console.log('Fallback: Notifications saved to local storage');
            }
        } else {
            // Only use local storage if not connected to cloud
            localStorage.setItem('safetrack_user_notifications', JSON.stringify(this.userNotifications));
            console.log('No cloud connection: Notifications saved to local storage');
        }
    }
    
    addNotificationForProjectOwner(projectId, noteAuthor, noteText) {
        const numericProjectId = Number(projectId);
        const project = this.projects.find(p => p.id === numericProjectId);
        
        if (!project) return;
        
        // Notify project creator and all assigned users
        const usersToNotify = [project.createdBy];
        const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
        
        // Add all assigned users to notification list
        assignedUsers.forEach(userId => {
            if (userId && userId !== project.createdBy && !usersToNotify.includes(userId)) {
                usersToNotify.push(userId);
            }
        });
        
        // Don't notify the author of the note
        const filteredUsers = usersToNotify.filter(userId => userId !== noteAuthor);
        
        filteredUsers.forEach(userId => {
            if (!this.userNotifications[userId]) {
                this.userNotifications[userId] = [];
            }
            
            const notification = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                type: 'note_added',
                projectId: numericProjectId,
                projectName: project.name,
                noteAuthor: noteAuthor,
                noteAuthorName: this.users.find(u => u.id === noteAuthor)?.name || noteAuthor,
                notePreview: noteText.substring(0, 100) + (noteText.length > 100 ? '...' : ''),
                timestamp: new Date().toISOString(),
                read: false
            };
            
            this.userNotifications[userId].unshift(notification);
        });
        
        this.saveUserNotifications();
    }
    
    getUnreadNotificationCount(userId) {
        const userNotifications = this.userNotifications[userId] || [];
        return userNotifications.filter(n => !n.read).length;
    }
    
    markNotificationAsRead(notificationId) {
        Object.keys(this.userNotifications).forEach(userId => {
            this.userNotifications[userId] = this.userNotifications[userId].map(notification => {
                if (notification.id === notificationId) {
                    notification.read = true;
                }
                return notification;
            });
        });
        this.saveUserNotifications();
    }
    
    showUserNotifications() {
        const notifications = this.userNotifications[this.currentUser] || [];
        
        if (notifications.length === 0) {
            this.showNotification('No notifications', 'info');
            return;
        }
        
        // Create notifications modal content
        const notificationsHtml = notifications.map(notification => `
            <div class="notification-item ${notification.read ? 'read' : 'unread'} border rounded p-3 mb-2">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="notification-content flex-grow-1">
                        <div class="d-flex align-items-center mb-2">
                            <i class="fas fa-sticky-note text-primary me-2"></i>
                            <strong class="text-primary">New note on "${notification.projectName}"</strong>
                            ${!notification.read ? '<span class="badge bg-danger ms-2">New</span>' : ''}
                        </div>
                        <p class="mb-2 text-muted">
                            <strong>${notification.noteAuthorName}</strong> added: "${notification.notePreview}"
                        </p>
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>
                            ${new Date(notification.timestamp).toLocaleString()}
                        </small>
                    </div>
                    <div class="notification-actions ms-3">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewProjectFromNotification(${notification.projectId}, '${notification.id}')">
                            <i class="fas fa-eye me-1"></i>View Project
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Show in a modal or alert (for now, let's use a simple modal approach)
        this.showNotificationModal(notificationsHtml);
    }
    
    showNotificationModal(content) {
        // Create a temporary modal for notifications
        const modalHtml = `
            <div class="modal fade" id="notificationsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-bell me-2"></i>Your Notifications
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                        <div class="modal-footer">
                            <div class="d-flex gap-2">
                                <button type="button" class="btn btn-outline-secondary" onclick="markAllNotificationsRead()">
                                    <i class="fas fa-check-double me-1"></i>Mark All Read
                                </button>
                                <button type="button" class="btn btn-outline-warning" onclick="clearReadNotifications()">
                                    <i class="fas fa-broom me-1"></i>Clear Read
                                </button>
                                <button type="button" class="btn btn-outline-danger" onclick="clearAllNotifications()">
                                    <i class="fas fa-trash me-1"></i>Clear All
                                </button>
                            </div>
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('notificationsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('notificationsModal'));
        modal.show();
        
        // Clean up modal after it's hidden
        document.getElementById('notificationsModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }
    
    async markAllNotificationsRead() {
        if (this.userNotifications[this.currentUser]) {
            this.userNotifications[this.currentUser].forEach(notification => {
                notification.read = true;
            });
            await this.saveUserNotifications();
            this.updateNotificationBadge();
            
            // Close modal and show success
            const modal = bootstrap.Modal.getInstance(document.getElementById('notificationsModal'));
            if (modal) modal.hide();
            this.showNotification('All notifications marked as read', 'success');
        }
    }
    
    async clearReadNotifications() {
        if (this.userNotifications[this.currentUser]) {
            const originalCount = this.userNotifications[this.currentUser].length;
            this.userNotifications[this.currentUser] = this.userNotifications[this.currentUser].filter(notification => !notification.read);
            const clearedCount = originalCount - this.userNotifications[this.currentUser].length;
            
            await this.saveUserNotifications();
            this.updateNotificationBadge();
            
            // Close modal and show success
            const modal = bootstrap.Modal.getInstance(document.getElementById('notificationsModal'));
            if (modal) modal.hide();
            
            this.showNotification(`Cleared ${clearedCount} read notifications`, 'success');
        }
    }
    
    async clearAllNotifications() {
        if (this.userNotifications[this.currentUser]) {
            const clearedCount = this.userNotifications[this.currentUser].length;
            
            if (clearedCount === 0) {
                this.showNotification('No notifications to clear', 'info');
                return;
            }
            
            // Confirm clearing all notifications
            if (!confirm(`Are you sure you want to clear all ${clearedCount} notifications?\n\nThis action cannot be undone.`)) {
                return;
            }
            
            this.userNotifications[this.currentUser] = [];
            await this.saveUserNotifications();
            this.updateNotificationBadge();
            
            // Close modal and show success
            const modal = bootstrap.Modal.getInstance(document.getElementById('notificationsModal'));
            if (modal) modal.hide();
            
            this.showNotification(`Cleared all ${clearedCount} notifications`, 'success');
        }
    }
    
    // Automatic cleanup - removes read notifications older than 7 days
    async autoCleanupOldNotifications() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        let totalCleaned = 0;
        
        for (const userId in this.userNotifications) {
            if (this.userNotifications[userId]) {
                const originalCount = this.userNotifications[userId].length;
                this.userNotifications[userId] = this.userNotifications[userId].filter(notification => {
                    // Keep unread notifications regardless of age
                    if (!notification.read) return true;
                    
                    // Keep read notifications less than 7 days old
                    const notificationDate = new Date(notification.timestamp);
                    return notificationDate > sevenDaysAgo;
                });
                totalCleaned += originalCount - this.userNotifications[userId].length;
            }
        }
        
        if (totalCleaned > 0) {
            console.log(`Auto-cleanup: Removed ${totalCleaned} old read notifications`);
        await this.saveUserNotifications();
        this.updateNotificationBadge();
        }
    }
    
    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        const count = this.getUnreadNotificationCount(this.currentUser);
        
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // ========================================
    // USER COLOR CODING SYSTEM
    // ========================================
    
    getUserColor(userId) {
        // Define a set of professional colors for different users
        const userColors = {
            'admin': '#dc3545',        // Red (safety theme)
            'marcena': '#198754',      // Green
            'mike': '#0d6efd',         // Blue
            'matt': '#ffc107',         // Yellow
            'matthoyt': '#ffc107',     // Yellow (actual user ID)
            'tyson': '#fd7e14',        // Orange
            'default': '#6c757d'       // Gray for unknown users
        };
        
        // Convert userId to lowercase for consistent matching
        const normalizedUserId = userId.toLowerCase();
        
        // Use user ID to get consistent color, or generate from hash if not predefined
        if (userColors[normalizedUserId]) {
            return userColors[normalizedUserId];
        }
        
        // Generate consistent color from user ID hash
        const colors = ['#198754', '#0d6efd', '#fd7e14', '#20c997', '#6f42c1', '#d63384'];
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = userId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }
    
    getUserColorLight(userId) {
        const color = this.getUserColor(userId);
        // Convert hex to rgba with low opacity for backgrounds
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, 0.1)`;
    }
    
    getUserColorMedium(userId) {
        const color = this.getUserColor(userId);
        // Convert hex to rgba with lighter opacity for better readability
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, 0.08)`;
    }
    
    renderUserColorLegend() {
        const legendContainer = document.getElementById('userColorLegend');
        if (!legendContainer) return;
        
        // Get unique users from projects
        const uniqueUsers = [...new Set(this.projects.map(p => p.createdBy))];
        const legendItems = uniqueUsers.map(userId => {
            const user = this.users.find(u => u.id === userId);
            const userName = user ? user.name : userId;
            const userColor = this.getUserColor(userId);
            const projectCount = this.projects.filter(p => p.createdBy === userId).length;
            
            return `
                <div class="legend-item d-flex align-items-center me-4 mb-2">
                    <div class="user-color-legend" style="background: ${userColor};"></div>
                    <span class="legend-text">
                        <strong>${this.escapeHtml(userName)}</strong>
                        <small class="text-muted ms-1">(${projectCount} project${projectCount !== 1 ? 's' : ''})</small>
                    </span>
                </div>
            `;
        }).join('');
        
        legendContainer.innerHTML = `
            <div class="d-flex flex-wrap align-items-center">
                <small class="text-muted me-3 fw-bold">Project Owners:</small>
                ${legendItems}
            </div>
        `;
    }
    
    // ========================================
    // INDIVIDUAL USER VIEWS
    // ========================================
    
    populateIndividualUserViews() {
        const container = document.getElementById('individualUserViews');
        if (!container) return;
        
        // Get all users except current user (to avoid showing "View My Projects" when already on personal view)
        const otherUsers = this.users.filter(user => user.id !== this.currentUser);
        
        container.innerHTML = otherUsers.map(user => {
            const projectCount = this.projects.filter(p => p.createdBy === user.id || p.assignedTo === user.id).length;
            const userInitial = user.avatar || user.name.charAt(0).toUpperCase();
            
            return `
                <li>
                    <a class="dropdown-item" href="#" onclick="toggleProjectView('${user.id}')">
                        <div class="d-flex align-items-center">
                            <div class="user-avatar-small me-2" style="background: linear-gradient(135deg, var(--safety-blue) 0%, #0a58ca 100%);">
                                ${userInitial}
                            </div>
                            <div class="flex-grow-1">
                                <div class="fw-medium">${this.escapeHtml(user.name)}</div>
                                <small class="text-muted">${projectCount} project${projectCount !== 1 ? 's' : ''}</small>
                            </div>
                        </div>
                    </a>
                </li>
            `;
        }).join('');
    }
    
    // ========================================
    // ADMIN PASSWORD VERIFICATION
    // ========================================
    
    requestAdminAccess() {
        // Store that user wants to access admin profile
        this.pendingAdminAction = () => {
            this.selectUserProfile('admin');
        };
        
        // Show admin password modal
        this.showAdminPasswordModal('admin profile access');
    }
    
    requireAdminPassword(actionCallback, actionName = 'admin function') {
        // If user is admin, check if already verified in this session
        if (this.currentUser === 'admin' && this.isAdminVerified) {
            actionCallback();
            return;
        }
        
        // If user is not admin, deny access
        if (this.currentUser !== 'admin') {
            this.showNotification('Admin access required. Only administrators can perform this action.', 'error');
            return;
        }
        
        // Store the action to execute after verification
        this.pendingAdminAction = actionCallback;
        
        // Show admin password modal
        this.showAdminPasswordModal(actionName);
    }
    
    showAdminPasswordModal(actionName) {
        // Clear any previous error
        document.getElementById('adminPasswordError').classList.add('d-none');
        document.getElementById('adminPassword').value = '';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('adminPasswordModal'));
        modal.show();
        
        // Focus on password field
        setTimeout(() => {
            document.getElementById('adminPassword').focus();
        }, 500);
    }
    
    verifyAdminPassword(password) {
        // Admin password (you can change this)
        const adminPassword = 'AdminSafe2025!';
        
        if (password === adminPassword) {
            // Correct admin password
            this.isAdminVerified = true;
            
            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('adminPasswordModal'));
            if (modal) modal.hide();
            
            // Execute pending action
            if (this.pendingAdminAction) {
                this.pendingAdminAction();
                this.pendingAdminAction = null;
            }
            
            this.showNotification('Admin access verified', 'success');
            
            // Reset verification after 30 minutes for security
            setTimeout(() => {
                this.isAdminVerified = false;
            }, 30 * 60 * 1000);
        } else {
            // Wrong password
            this.showAdminPasswordError();
        }
    }
    
    showAdminPasswordError() {
        const errorDiv = document.getElementById('adminPasswordError');
        errorDiv.classList.remove('d-none');
        
        // Clear password field
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
        
        // Hide error after 5 seconds
        setTimeout(() => {
            errorDiv.classList.add('d-none');
        }, 5000);
    }
    
    showUserSelectionModal() {
        // Populate user selection cards
        this.populateUserSelectionCards();
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('userSelectionModal'));
        modal.show();
    }
    
    populateUserSelectionCards() {
        const grid = document.getElementById('userSelectionGrid');
        if (!grid) return;
        
        // Ensure Admin user always exists
        const adminExists = this.users.some(u => u.id === 'admin');
        if (!adminExists) {
            // Create default Admin user
            const adminUser = {
                id: 'admin',
                name: 'Admin User',
                email: 'admin@safetrack.com',
                role: 'Administrator',
                department: 'Safety',
                avatar: 'A'
            };
            this.users.unshift(adminUser);
            this.saveUsers();
        }
        
        // If still no users (shouldn't happen now), force create admin and default
        if (this.users.length === 0) {
            this.currentUser = 'admin';
            this.saveCurrentUser();
            this.hideUserSelectionModal();
            this.showNotification('Welcome to SafeTrack! Defaulted to Admin user.', 'success');
            return;
        }
        
        // Sort users by role hierarchy
        const sortedUsers = this.sortUsersByRoleHierarchy(this.users);
        
        grid.innerHTML = sortedUsers.map(user => {
            const projectCount = this.projects.filter(p => p.createdBy === user.id || p.assignedTo === user.id).length;
            const certCount = this.certifications.filter(c => c.userId === user.id).length;
            
            return `
                <div class="col-md-6">
                    <div class="user-selection-card" onclick="${user.id === 'admin' ? 'requestAdminAccess()' : `selectUserProfile('${user.id}')`}">
                        <div class="user-selection-avatar">
                            ${user.avatar || user.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="user-selection-name">${this.escapeHtml(user.name)}</div>
                        <div class="user-selection-role">${user.role || 'Team Member'}</div>
                        <div class="user-selection-stats">
                            <div><strong>${projectCount}</strong> Projects</div>
                            <div><strong>${certCount}</strong> Certifications</div>
                        </div>
                        ${user.id === 'admin' ? '<div class="admin-badge"><i class="fas fa-shield-alt me-1"></i>Admin Access</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async selectUserProfile(userId) {
        // Update current user
        this.currentUser = userId;
        this.saveCurrentUser();
        
        // DISABLED: Sync notes from cloud when switching users (causes note deletion issues)
        // await this.syncProjectNotesFromCloud();
        
        // Update UI
        this.updateUserInterface();
        this.updateViewModeInterface();
        this.render();
        // TEMPORARILY DISABLED: Certification features
        // this.renderCertificationTable();
        // this.updateCertificationStats();
        
        // Hide modal
        this.hideUserSelectionModal();
        
        // Show welcome message with selected user
        const user = this.users.find(u => u.id === userId);
        const userName = user ? user.name : 'User';
        this.showNotification(`Welcome to SafeTrack, ${userName}!`, 'success');
    }
    
    hideUserSelectionModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('userSelectionModal'));
        if (modal) {
            modal.hide();
        }
    }

    // ========================================
    // ENHANCED QUOTE SYSTEM
    // ========================================
    
    initializeQuoteSystem() {
        // Expand the built-in quote collection
        this.builtInQuotes = [
            ...this.safetyQuotes,
            // Add more inspirational safety quotes
            { quote: "Excellence is never an accident. It is always the result of high intention, sincere effort, and intelligent execution.", author: "Aristotle" },
            { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
            { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
            { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
            { quote: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
            { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
            { quote: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
            { quote: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
            { quote: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
            { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
            { quote: "Quality is not an act, it is a habit.", author: "Aristotle" },
            { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
            { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
            { quote: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
            { quote: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" }
        ];
        
        // Load custom quotes and favorites from storage
        this.customQuotes = this.loadCustomQuotes();
        this.favoriteQuotes = this.loadFavoriteQuotes();
        
        // Combine all quotes
        this.allQuotes = [...this.builtInQuotes, ...this.customQuotes];
    }
    
    displayDailySafetyQuote() {
        // Use true randomization on each visit instead of daily consistency
        const randomIndex = Math.floor(Math.random() * this.allQuotes.length);
        this.currentQuoteIndex = randomIndex;
        
        const currentQuote = this.allQuotes[randomIndex];
        this.updateQuoteDisplay(currentQuote);
    }
    
    updateQuoteDisplay(quote) {
        const quoteElement = document.getElementById('dailySafetyQuote');
        const authorElement = document.getElementById('dailySafetyAuthor');
        
        if (quoteElement && authorElement) {
            quoteElement.textContent = `"${quote.quote}"`;
            authorElement.textContent = `— ${quote.author}`;
        }
        
        // Update modal display if open
        const currentQuoteDisplay = document.getElementById('currentQuoteDisplay');
        const currentAuthorDisplay = document.getElementById('currentAuthorDisplay');
        
        if (currentQuoteDisplay && currentAuthorDisplay) {
            currentQuoteDisplay.textContent = `"${quote.quote}"`;
            currentAuthorDisplay.textContent = quote.author;
        }
    }
    
    getNewQuote() {
        // Get a different random quote
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * this.allQuotes.length);
        } while (newIndex === this.currentQuoteIndex && this.allQuotes.length > 1);
        
        this.currentQuoteIndex = newIndex;
        const newQuote = this.allQuotes[newIndex];
        this.updateQuoteDisplay(newQuote);
        
        // Show notification
        this.showNotification('New quote loaded!', 'info', 2000);
    }
    
    openQuoteModal() {
        this.updateQuoteStats();
        this.showAllQuotes();
        
        const modal = new bootstrap.Modal(document.getElementById('quoteModal'));
        modal.show();
    }
    
    addCustomQuote(quoteText, author) {
        const newQuote = {
            quote: quoteText,
            author: author || 'Anonymous',
            custom: true,
            id: Date.now()
        };
        
        this.customQuotes.push(newQuote);
        this.allQuotes = [...this.builtInQuotes, ...this.customQuotes];
        this.saveCustomQuotes();
        
        this.showNotification('Custom quote added successfully!', 'success');
        this.updateQuoteStats();
        this.showAllQuotes();
    }
    
    addToFavorites() {
        const currentQuote = this.allQuotes[this.currentQuoteIndex];
        if (!currentQuote) return;
        
        // Check if already in favorites
        const alreadyFavorite = this.favoriteQuotes.some(fav => 
            fav.quote === currentQuote.quote && fav.author === currentQuote.author
        );
        
        if (alreadyFavorite) {
            this.showNotification('Quote is already in favorites!', 'warning');
            return;
        }
        
        const favoriteQuote = {
            ...currentQuote,
            favorite: true,
            favoriteId: Date.now()
        };
        
        this.favoriteQuotes.push(favoriteQuote);
        this.saveFavoriteQuotes();
        
        this.showNotification('Quote added to favorites!', 'success');
        this.updateQuoteStats();
    }
    
    updateQuoteStats() {
        document.getElementById('totalQuotes').textContent = this.allQuotes.length;
        document.getElementById('builtinQuotes').textContent = this.builtInQuotes.length;
        document.getElementById('customQuotes').textContent = this.customQuotes.length;
        document.getElementById('favoriteQuotes').textContent = this.favoriteQuotes.length;
    }
    
    showAllQuotes() {
        this.renderQuoteList(this.allQuotes, 'all');
    }
    
    showBuiltinQuotes() {
        this.renderQuoteList(this.builtInQuotes, 'builtin');
    }
    
    showCustomQuotes() {
        this.renderQuoteList(this.customQuotes, 'custom');
    }
    
    showFavoriteQuotes() {
        this.renderQuoteList(this.favoriteQuotes, 'favorite');
    }
    
    renderQuoteList(quotes, type) {
        const quoteList = document.getElementById('quoteList');
        if (!quotes.length) {
            quoteList.innerHTML = `<div class="text-center text-muted p-3">No ${type} quotes found.</div>`;
            return;
        }
        
        quoteList.innerHTML = quotes.map((quote, index) => {
            const isCustom = quote.custom;
            const isFavorite = this.favoriteQuotes.some(fav => 
                fav.quote === quote.quote && fav.author === quote.author
            );
            
            return `
                <div class="quote-item ${isCustom ? 'custom' : ''} ${isFavorite ? 'favorite' : ''}" onclick="projectManager.selectQuote(${this.allQuotes.indexOf(quote)})">
                    <div class="quote-item-text">"${this.escapeHtml(quote.quote)}"</div>
                    <div class="quote-item-author">— ${this.escapeHtml(quote.author)}</div>
                    <div class="quote-item-actions">
                        <button class="btn btn-outline-primary btn-sm" onclick="event.stopPropagation(); projectManager.selectQuote(${this.allQuotes.indexOf(quote)})">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!isFavorite ? `<button class="btn btn-outline-warning btn-sm" onclick="event.stopPropagation(); projectManager.addQuoteToFavorites(${this.allQuotes.indexOf(quote)})">
                            <i class="fas fa-heart"></i>
                        </button>` : ''}
                        ${isCustom ? `<button class="btn btn-outline-danger btn-sm" onclick="event.stopPropagation(); projectManager.deleteCustomQuote(${quote.id})">
                            <i class="fas fa-trash"></i>
                        </button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    selectQuote(index) {
        if (index >= 0 && index < this.allQuotes.length) {
            this.currentQuoteIndex = index;
            this.updateQuoteDisplay(this.allQuotes[index]);
        }
    }
    
    addQuoteToFavorites(index) {
        const quote = this.allQuotes[index];
        if (quote) {
            const favoriteQuote = {
                ...quote,
                favorite: true,
                favoriteId: Date.now()
            };
            
            this.favoriteQuotes.push(favoriteQuote);
            this.saveFavoriteQuotes();
            this.showNotification('Quote added to favorites!', 'success');
            this.updateQuoteStats();
            this.showAllQuotes(); // Refresh the display
        }
    }
    
    deleteCustomQuote(quoteId) {
        if (confirm('Are you sure you want to delete this custom quote?')) {
            this.customQuotes = this.customQuotes.filter(q => q.id !== quoteId);
            this.allQuotes = [...this.builtInQuotes, ...this.customQuotes];
            this.saveCustomQuotes();
            
            this.showNotification('Custom quote deleted', 'success');
            this.updateQuoteStats();
            this.showCustomQuotes(); // Refresh the display
        }
    }
    
    resetQuotesToDefault() {
        if (confirm('This will remove all custom quotes and favorites. Are you sure?')) {
            this.customQuotes = [];
            this.favoriteQuotes = [];
            this.allQuotes = [...this.builtInQuotes];
            
            localStorage.removeItem('safetrack_custom_quotes');
            localStorage.removeItem('safetrack_favorite_quotes');
            
            this.showNotification('Quotes reset to default collection', 'success');
            this.updateQuoteStats();
            this.showAllQuotes();
            
            // Display a new random quote
            this.getNewQuote();
        }
    }
    
    saveCustomQuotes() {
        localStorage.setItem('safetrack_custom_quotes', JSON.stringify(this.customQuotes));
    }
    
    loadCustomQuotes() {
        const stored = localStorage.getItem('safetrack_custom_quotes');
        return stored ? JSON.parse(stored) : [];
    }
    
    saveFavoriteQuotes() {
        localStorage.setItem('safetrack_favorite_quotes', JSON.stringify(this.favoriteQuotes));
    }
    
    loadFavoriteQuotes() {
        const stored = localStorage.getItem('safetrack_favorite_quotes');
        return stored ? JSON.parse(stored) : [];
    }

    // Calendar Integration (Email system removed)

    exportComplianceToCalendar() {
        // Get form data to create calendar event
        const title = document.getElementById('complianceTitle').value;
        const description = document.getElementById('complianceDescription').value;
        const trainingDate = document.getElementById('complianceTrainingDate').value;
        const type = document.getElementById('complianceType').value;
        const location = document.getElementById('calendarLocation').value;
        const duration = parseInt(document.getElementById('trainingDuration').value);
        
        if (!title || !trainingDate) {
            alert('Please fill in the title and training date first');
            return;
        }

        this.createCalendarFile({
            title: title,
            description: description,
            trainingDate: trainingDate,
            type: type,
            location: location,
            duration: duration
        });
    }

    createCalendarFile(complianceData) {
        const startDate = new Date(complianceData.trainingDate);
        // Set training time to 9:00 AM by default
        startDate.setHours(9, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + (complianceData.duration || 2)); // Use selected duration

        // Format dates for ICS format (YYYYMMDDTHHMMSSZ)
        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SafeTrack//Safety Compliance//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Date.now()}@safetrack.com
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${complianceData.title}
DESCRIPTION:Safety Compliance Training\\n\\nType: ${complianceData.type}\\n\\n${complianceData.description || 'No additional description'}\\n\\nGenerated by SafeTrack Safety Management System
LOCATION:${complianceData.location || 'Safety Training Center'}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-P7D
ACTION:DISPLAY
DESCRIPTION:Safety Training Reminder: ${complianceData.title}
END:VALARM
BEGIN:VALARM
TRIGGER:-P2D
ACTION:DISPLAY
DESCRIPTION:Safety Training Reminder: ${complianceData.title} - 2 days to go!
END:VALARM
BEGIN:VALARM
TRIGGER:-PT2H
ACTION:DISPLAY
DESCRIPTION:Safety Training Today: ${complianceData.title}
END:VALARM
END:VEVENT
END:VCALENDAR`;

        // Create and download the ICS file
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `SafeTrack_${complianceData.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification('Calendar file downloaded! Open with Outlook, Google Calendar, or Apple Calendar.', 'success');
    }

    exportItemToCalendar(itemId) {
        const item = this.complianceItems.find(c => c.id === itemId);
        if (!item) return;

        if (!item.trainingDate) {
            alert('No training date set for this compliance item. Please edit the item to add a training date.');
            return;
        }

        this.createCalendarFile({
            title: item.title,
            description: item.description,
            trainingDate: item.trainingDate,
            type: item.type,
            location: item.location || 'Safety Training Center',
            duration: item.duration || 2
        });
    }

    // Calendar Provider Methods
    exportToOutlook() {
        const formData = this.getFormCalendarData();
        if (!formData) return;
        
        // Try multiple Outlook integration methods
        this.tryOutlookIntegration(formData);
    }

    async tryOutlookIntegration(formData) {
        const outlookWebUrl = this.createOutlookUrl(formData);
        
        // Method 1: Try Outlook desktop protocol
        const outlookDesktopUrl = this.createOutlookDesktopUrl(formData);
        
        // Create hidden link for desktop protocol
        const desktopLink = document.createElement('a');
        desktopLink.href = outlookDesktopUrl;
        desktopLink.style.display = 'none';
        document.body.appendChild(desktopLink);
        
        let desktopOpened = false;
        
        // Try to detect if desktop Outlook opened
        try {
            // Set a flag to detect if we're still in the page after attempting to open
            const beforeTime = Date.now();
            desktopLink.click();
            
            // If we're still here after 1 second, desktop probably didn't open
            setTimeout(() => {
                const afterTime = Date.now();
                if (afterTime - beforeTime > 800) {
                    // Desktop likely didn't open, offer web option
                    this.showOutlookFallbackOptions(outlookWebUrl, formData);
                } else {
                    this.showNotification('Opening in Outlook desktop app...', 'success');
                    desktopOpened = true;
                }
            }, 1000);
            
        } catch (error) {
            console.log('Desktop Outlook failed:', error);
            this.showOutlookFallbackOptions(outlookWebUrl, formData);
        }
        
        document.body.removeChild(desktopLink);
    }

    showOutlookFallbackOptions(outlookWebUrl, formData) {
        // Create a more user-friendly dialog
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        
        modal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">
                            <i class="fab fa-microsoft me-2"></i>Choose Outlook Option
                        </h5>
                    </div>
                    <div class="modal-body text-center">
                        <p class="mb-4">How would you like to add this event to Outlook?</p>
                        <div class="d-grid gap-2">
                            <button class="btn btn-outline-primary btn-lg" onclick="window.open('${outlookWebUrl}', '_blank'); document.body.removeChild(this.closest('.modal'));">
                                <i class="fas fa-globe me-2"></i>Open Outlook Web
                            </button>
                            <button class="btn btn-outline-secondary btn-lg" onclick="projectManager.downloadOutlookICS(${JSON.stringify(formData).replace(/"/g, '&quot;')}); document.body.removeChild(this.closest('.modal'));">
                                <i class="fas fa-download me-2"></i>Download ICS File
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="document.body.removeChild(this.closest('.modal'));">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 10000);
    }

    exportToGoogleCalendar() {
        const formData = this.getFormCalendarData();
        if (!formData) return;
        
        // Create Google Calendar URL that auto-saves
        const googleUrl = this.createGoogleCalendarUrl(formData);
        window.open(googleUrl, '_blank');
        this.showNotification('Opening Google Calendar - event will be pre-filled for quick save...', 'success');
    }

    exportToAppleCalendar() {
        const formData = this.getFormCalendarData();
        if (!formData) return;
        
        // Create ICS file that auto-imports to Apple Calendar
        this.createAutoImportCalendarFile(formData);
    }

    getFormCalendarData() {
        const title = document.getElementById('complianceTitle').value;
        const description = document.getElementById('complianceDescription').value;
        const trainingDate = document.getElementById('complianceTrainingDate').value;
        const type = document.getElementById('complianceType').value;
        const location = document.getElementById('calendarLocation').value;
        const duration = parseInt(document.getElementById('trainingDuration').value);
        
        if (!title || !trainingDate) {
            alert('Please fill in the title and training date first');
            return null;
        }

        return {
            title: title,
            description: description,
            trainingDate: trainingDate,
            type: type,
            location: location,
            duration: duration
        };
    }

    createOutlookUrl(data) {
        const startDate = new Date(data.trainingDate);
        startDate.setHours(9, 0, 0, 0); // 9:00 AM
        
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + data.duration);
        
        // Format for Outlook Web (ISO format)
        const formatOutlookDate = (date) => {
            return date.toISOString();
        };
        
        // Use the most reliable Outlook Web URL format (Office 365 style)
        const params = new URLSearchParams({
            subject: `SafeTrack: ${data.title}`,
            startdt: formatOutlookDate(startDate),
            enddt: formatOutlookDate(endDate),
            body: `Safety Compliance Training\n\nType: ${data.type}\nDuration: ${data.duration} hours\n\n${data.description || 'No additional description'}\n\nGenerated by SafeTrack Safety Management System`,
            location: data.location || 'Safety Training Center',
            allday: 'false'
        });
        
        // Use Office 365 calendar URL (most reliable)
        return `https://outlook.office.com/calendar/action/compose?${params.toString()}`;
    }

    createGoogleCalendarUrl(data) {
        const startDate = new Date(data.trainingDate);
        startDate.setHours(9, 0, 0, 0); // 9:00 AM
        
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + data.duration);
        
        // Format for Google Calendar
        const formatGoogleDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: `SafeTrack: ${data.title}`,
            dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
            details: `Safety Compliance Training\n\nType: ${data.type}\nDuration: ${data.duration} hours\n\n${data.description || 'No additional description'}\n\nGenerated by SafeTrack Safety Management System`,
            location: data.location || 'Safety Training Center',
            add: '1' // Attempt to auto-add to calendar
        });
        
        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }

    createOutlookDesktopUrl(data) {
        const startDate = new Date(data.trainingDate);
        startDate.setHours(9, 0, 0, 0); // 9:00 AM
        
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + data.duration);
        
        // Format for Outlook desktop protocol (simpler format)
        const formatOutlookDesktop = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        // Use simpler Outlook protocol format
        const subject = encodeURIComponent(`SafeTrack: ${data.title}`);
        const body = encodeURIComponent(`Safety Compliance Training\n\nType: ${data.type}\nDuration: ${data.duration} hours\n\n${data.description || 'No additional description'}\n\nGenerated by SafeTrack Safety Management System`);
        const location = encodeURIComponent(data.location || 'Safety Training Center');
        const startTime = formatOutlookDesktop(startDate);
        const endTime = formatOutlookDesktop(endDate);
        
        return `outlook://calendar/new?subject=${subject}&body=${body}&location=${location}&start=${startTime}&end=${endTime}`;
    }

    createAutoImportCalendarFile(data) {
        const startDate = new Date(data.trainingDate);
        startDate.setHours(9, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + data.duration);

        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        // Enhanced ICS with auto-import properties
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SafeTrack//Safety Compliance//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
X-WR-CALNAME:SafeTrack Safety Training
X-WR-CALDESC:Safety Compliance Training Events
BEGIN:VEVENT
UID:${Date.now()}@safetrack.com
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:SafeTrack: ${data.title}
DESCRIPTION:Safety Compliance Training\\n\\nType: ${data.type}\\nDuration: ${data.duration} hours\\n\\n${data.description || 'No additional description'}\\n\\nGenerated by SafeTrack Safety Management System
LOCATION:${data.location || 'Safety Training Center'}
STATUS:CONFIRMED
TRANSP:OPAQUE
SEQUENCE:0
CLASS:PUBLIC
PRIORITY:5
BEGIN:VALARM
TRIGGER:-P7D
ACTION:DISPLAY
DESCRIPTION:SafeTrack Reminder: ${data.title} - 7 days to go!
END:VALARM
BEGIN:VALARM
TRIGGER:-P2D
ACTION:DISPLAY
DESCRIPTION:SafeTrack Reminder: ${data.title} - 2 days to go!
END:VALARM
BEGIN:VALARM
TRIGGER:-PT2H
ACTION:DISPLAY
DESCRIPTION:SafeTrack Reminder: ${data.title} starts in 2 hours
END:VALARM
BEGIN:VALARM
TRIGGER:PT0M
ACTION:DISPLAY
DESCRIPTION:SafeTrack Training: ${data.title} is starting now!
END:VALARM
END:VEVENT
END:VCALENDAR`;

        // Create blob with proper MIME type for auto-import
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;method=REQUEST' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        // Use calendar-specific filename
        const fileName = `SafeTrack_${data.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Try to auto-open with calendar app
        setTimeout(() => {
            try {
                // Try to trigger calendar app opening
                const calendarLink = document.createElement('a');
                calendarLink.href = `webcal://data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
                calendarLink.click();
            } catch (error) {
                console.log('Auto-open failed, user will need to open file manually');
            }
        }, 500);

        this.showNotification('Calendar file downloaded! It should auto-open in your default calendar app.', 'success');
    }

    downloadOutlookICS(formData) {
        // Create Outlook-optimized ICS file
        const startDate = new Date(formData.trainingDate);
        startDate.setHours(9, 0, 0, 0);
        
        const endDate = new Date(startDate);
        endDate.setHours(startDate.getHours() + formData.duration);

        const formatDate = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        // Outlook-specific ICS format
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SafeTrack//Outlook Integration//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Date.now()}@safetrack.outlook.com
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:SafeTrack: ${formData.title}
DESCRIPTION:Safety Compliance Training\\n\\nType: ${formData.type}\\nDuration: ${formData.duration} hours\\n\\n${formData.description || 'No additional description'}\\n\\nGenerated by SafeTrack Safety Management System
LOCATION:${formData.location || 'Safety Training Center'}
STATUS:CONFIRMED
TRANSP:OPAQUE
SEQUENCE:0
PRIORITY:5
CATEGORIES:Safety Training,Compliance
CLASS:PUBLIC
BEGIN:VALARM
TRIGGER:-P7D
ACTION:DISPLAY
DESCRIPTION:SafeTrack Reminder: ${formData.title} - 7 days to go!
END:VALARM
BEGIN:VALARM
TRIGGER:-P2D
ACTION:DISPLAY
DESCRIPTION:SafeTrack Reminder: ${formData.title} - 2 days to go!
END:VALARM
BEGIN:VALARM
TRIGGER:-PT2H
ACTION:DISPLAY
DESCRIPTION:SafeTrack Reminder: ${formData.title} starts in 2 hours
END:VALARM
END:VEVENT
END:VCALENDAR`;

        // Download the file
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const fileName = `SafeTrack_Outlook_${formData.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('Outlook ICS file downloaded! Double-click to import to Outlook.', 'success');
    }

    // Authentication methods removed - app works without login

    async init() {
        console.log('Initializing app normally without authentication');
        
        // Wait for cloud storage to be ready before loading data
        await this.waitForCloudStorage();
        
        // Load data from cloud storage
        await this.loadAllData();
        
        // Load archived projects and ensure proper separation
        this.archivedProjects = await this.loadArchivedProjects();
        
        // Re-enable cleanup with better logic after confirming cloud storage works
        if (this.projects.length > 0 && Object.keys(this.archivedProjects).length > 0) {
            // Check if there was a recent archive operation that requires cleanup
            const recentArchiveOperation = localStorage.getItem('recent_archive_operation');
            const lastCleanup = localStorage.getItem('last_cleanup_timestamp');
            const now = Date.now();
            const oneHour = 60 * 60 * 1000; // Increased to 1 hour to be less aggressive
            
            // Only run cleanup if there was a recent archive operation
            // Remove the time-based cleanup to prevent interference with new projects
            if (recentArchiveOperation) {
                console.log('Running cleanup - recent archive operation detected');
                console.log('Projects before cleanup:', this.projects.map(p => ({id: p.id, name: p.name})));
                console.log('Archived projects to check against:', Object.keys(this.archivedProjects).map(userId => ({
                    userId,
                    archivedIds: (this.archivedProjects[userId] || []).map(p => p.originalId)
                })));
                
                await this.cleanupArchivedProjectsFromActive();
                localStorage.setItem('last_cleanup_timestamp', now.toString());
                localStorage.removeItem('recent_archive_operation'); // Clear the flag
                
                console.log('Projects after cleanup:', this.projects.map(p => ({id: p.id, name: p.name})));
            } else {
                console.log('Skipping cleanup - no recent archive operations');
            }
        }
        
        // Load user notifications from cloud
        this.userNotifications = await this.loadUserNotifications();
        
        // Cleanup orphaned notes after all data is loaded
        console.log('About to run orphaned notes cleanup...');
        console.log('Data state before cleanup:', {
            projects: this.projects?.length || 0,
            archivedProjects: this.archivedProjects ? Object.keys(this.archivedProjects).length : 0,
            projectNotes: this.projectNotes ? Object.keys(this.projectNotes).length : 0
        });
        await this.cleanupOrphanedNotes();
        
        // TEMPORARILY DISABLED: Compliance and Certification loading
        // this.complianceItems = this.loadComplianceItems();
        // this.certifications = this.loadCertifications();
        
        // Don't load sample data - start with empty state
        // if (this.projects.length === 0 && !this.hasUserInteracted) {
        //     this.loadSampleData();
        // }
        
        // Don't load sample users - users should be added manually
        // if (this.users.length === 0 && !this.hasUserInteracted) {
        //     this.loadSampleUsers();
        // }
        
        this.render();
        this.setupEventListeners();
        this.updateUserInterface();
        this.updateViewModeInterface();
        this.populateCategoryDropdowns();
        this.populateRoleDropdowns();
        this.populateDepartmentDropdowns();
        this.displayDailySafetyQuote();
        
        // TEMPORARILY DISABLED: Compliance and Certification features
        // this.renderComplianceTable();
        // this.updateComplianceStats();
        // this.renderCertificationTable();
        // this.updateCertificationStats();
        
        // Show connection status
        this.showConnectionStatus();
    }

    // Old authentication methods removed

    // Export functionality
    exportToExcel() {
        try {
            const exportData = this.prepareExportData();
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Safety Projects");
            
            // Add some styling to the worksheet
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const address = XLSX.utils.encode_col(C) + "1"; // First row
                if (!ws[address]) continue;
                ws[address].s = { font: { bold: true }, fill: { fgColor: { rgb: "CCCCCC" } } };
            }
            
            const fileName = `SafeTrack_Projects_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            this.showNotification('Excel file downloaded successfully!', 'success');
        } catch (error) {
            console.error('Excel export error:', error);
            this.showNotification('Failed to export Excel file', 'error');
        }
    }

    exportToPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(20);
            doc.text('SafeTrack - Safety Projects Report', 20, 20);
            
            // Add date
            doc.setFontSize(12);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 35);
            
            // Add current user context
            const currentUserName = this.currentUser === 'all' ? 'All Users' : 
                (this.users.find(u => u.id === this.currentUser)?.name || 'Unknown User');
            doc.text(`View: ${currentUserName}`, 20, 45);
            
            // Prepare table data
            const exportData = this.prepareExportData();
            const tableColumns = ['Project', 'Status', 'Progress', 'Assigned To', 'Start Date', 'Due Date', 'Completed'];
            const tableRows = exportData.map(project => [
                project.Project,
                project.Status,
                project.Progress,
                project['Assigned To'],
                project['Start Date'],
                project['Due Date'],
                project['Completion Date'] || '—'
            ]);
            
            // Add table
            doc.autoTable({
                head: [tableColumns],
                body: tableRows,
                startY: 55,
                theme: 'grid',
                headStyles: { fillColor: [41, 128, 185] },
                alternateRowStyles: { fillColor: [245, 245, 245] }
            });
            
            const fileName = `SafeTrack_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            this.showNotification('PDF report downloaded successfully!', 'success');
        } catch (error) {
            console.error('PDF export error:', error);
            this.showNotification('Failed to export PDF report', 'error');
        }
    }

    exportToCSV() {
        try {
            const exportData = this.prepareExportData();
            const headers = Object.keys(exportData[0] || {});
            
            let csvContent = headers.join(',') + '\n';
            exportData.forEach(row => {
                const values = headers.map(header => {
                    let value = row[header] || '';
                    // Escape commas and quotes
                    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                        value = '"' + value.replace(/"/g, '""') + '"';
                    }
                    return value;
                });
                csvContent += values.join(',') + '\n';
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            const fileName = `SafeTrack_Data_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('CSV file downloaded successfully!', 'success');
        } catch (error) {
            console.error('CSV export error:', error);
            this.showNotification('Failed to export CSV file', 'error');
        }
    }

    printReport() {
        const printWindow = window.open('', '_blank');
        const exportData = this.prepareExportData();
        const currentUserName = this.currentUser === 'all' ? 'All Users' : 
            (this.users.find(u => u.id === this.currentUser)?.name || 'Unknown User');
        
        let tableHtml = `
            <html>
            <head>
                <title>SafeTrack Projects Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #2563eb; margin-bottom: 10px; }
                    .meta { color: #666; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f8f9fa; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .status-active { color: #28a745; font-weight: bold; }
                    .status-completed { color: #6c757d; }
                    .status-on-hold { color: #ffc107; }
                    .status-cancelled { color: #dc3545; }
                </style>
            </head>
            <body>
                <h1>SafeTrack - Safety Projects Report</h1>
                <div class="meta">
                    <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>View:</strong> ${currentUserName}</p>
                    <p><strong>Total Projects:</strong> ${exportData.length}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>Status</th>
                            <th>Progress</th>
                            <th>Assigned To</th>
                            <th>Start Date</th>
                            <th>Due Date</th>
                            <th>Created By</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        exportData.forEach(project => {
            tableHtml += `
                <tr>
                    <td><strong>${project.Project}</strong><br><small>${project.Description || ''}</small></td>
                    <td><span class="status-${project.Status.toLowerCase()}">${project.Status}</span></td>
                    <td>${project.Progress}</td>
                    <td>${project['Assigned To']}</td>
                    <td>${project['Start Date']}</td>
                    <td>${project['Due Date']}</td>
                    <td>${project['Created By']}</td>
                </tr>
            `;
        });
        
        tableHtml += `
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        printWindow.document.write(tableHtml);
        printWindow.document.close();
        printWindow.print();
        
        this.showNotification('Print dialog opened!', 'success');
    }

    prepareExportData() {
        // Get projects based on current view
        let projectsToExport;
        if (this.currentUser === 'all') {
            projectsToExport = this.projects;
        } else {
            projectsToExport = this.projects.filter(project => 
                project.createdBy === this.currentUser || project.assignedTo === this.currentUser
            );
        }
        
        return projectsToExport.map(project => {
            const assignedUser = this.users.find(u => u.id === project.assignedTo);
            const createdByUser = this.users.find(u => u.id === project.createdBy);
            
            return {
                'Project': project.title,
                'Description': project.description || '',
                'Status': project.status.charAt(0).toUpperCase() + project.status.slice(1),
                'Progress': `${project.progress}%`,
                'Assigned To': assignedUser ? assignedUser.name : (project.assignedTo || 'Unassigned'),
                'Created By': createdByUser ? createdByUser.name : 'Unknown',
                'Start Date': project.startDate ? new Date(project.startDate).toLocaleDateString() : '',
                'Due Date': project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No deadline',
                'Completion Date': project.completionDate ? new Date(project.completionDate).toLocaleDateString() : '',
                'Category': project.category || '',
                'Created Date': new Date(project.createdAt).toLocaleDateString(),
                'Screenshots': project.screenshots ? project.screenshots.length : 0
            };
        });
    }

    // Compliance Management Methods
    openComplianceModal(itemId = null) {
        this.currentComplianceEditId = itemId;
        const modal = document.getElementById('complianceModal');
        const modalTitle = document.getElementById('complianceModalTitle');
        const form = document.getElementById('complianceForm');
        
        if (itemId) {
            // Edit mode
            const item = this.complianceItems.find(c => c.id === itemId);
            if (item) {
                modalTitle.textContent = 'Edit Compliance Item';
                document.getElementById('complianceTitle').value = item.title;
                document.getElementById('complianceDescription').value = item.description || '';
                document.getElementById('complianceType').value = item.type || '';
                document.getElementById('complianceTrainingDate').value = item.trainingDate || '';
                document.getElementById('complianceAssignedTo').value = item.assignedTo || '';
                document.getElementById('compliancePriority').value = item.priority || 'medium';
            }
        } else {
            // Add mode
            modalTitle.textContent = 'New Compliance Item';
            form.reset();
            document.getElementById('compliancePriority').value = 'medium';
        }
        
        // Populate assigned to dropdown
        this.populateComplianceAssignedTo();
        
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    addComplianceItem() {
        this.openComplianceModal();
    }

    handleComplianceFormSubmit() {
        const formData = new FormData(document.getElementById('complianceForm'));
        const complianceData = {
            title: formData.get('title'),
            description: formData.get('description'),
            type: formData.get('type'),
            trainingDate: formData.get('trainingDate'),
            assignedTo: formData.get('assignedTo'),
            priority: formData.get('priority'),
            location: formData.get('location'),
            duration: formData.get('duration')
        };

        if (this.currentComplianceEditId) {
            this.editComplianceItem(this.currentComplianceEditId, complianceData);
        } else {
            this.createComplianceItem(complianceData);
        }
    }

    createComplianceItem(complianceData) {
        const complianceItem = {
            id: this.generateComplianceId(),
            ...complianceData,
            status: 'pending',
            createdBy: this.currentUser === 'all' ? 'admin' : this.currentUser,
            createdAt: new Date().toISOString(),
            linkedProjects: []
        };
        
        this.complianceItems.push(complianceItem);
        this.saveComplianceItems();
        this.renderComplianceTable();
        this.updateComplianceStats();
        this.closeComplianceModal();
        this.showNotification('Compliance item added successfully!', 'success');
    }

    editComplianceItem(itemId, complianceData) {
        const index = this.complianceItems.findIndex(c => c.id === itemId);
        if (index !== -1) {
            this.complianceItems[index] = {
                ...this.complianceItems[index],
                ...complianceData
            };
            this.saveComplianceItems();
            this.renderComplianceTable();
            this.updateComplianceStats();
            this.closeComplianceModal();
            this.showNotification('Compliance item updated successfully!', 'success');
        }
    }

    closeComplianceModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('complianceModal'));
        if (modal) {
            modal.hide();
        }
        this.currentComplianceEditId = null;
    }

    populateComplianceAssignedTo() {
        const select = document.getElementById('complianceAssignedTo');
        if (select) {
            select.innerHTML = '<option value="">Select Team Member</option>' +
                this.users.map(user => 
                    `<option value="${user.id}">${user.name}${user.role ? ` (${user.role})` : ''}</option>`
                ).join('');
        }
    }

    generateComplianceId() {
        return 'comp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    toggleComplianceStatus(itemId) {
        const item = this.complianceItems.find(c => c.id === itemId);
        if (item) {
            item.status = item.status === 'completed' ? 'pending' : 'completed';
            if (item.status === 'completed') {
                item.completedAt = new Date().toISOString();
            }
            this.saveComplianceItems();
            this.renderComplianceTable();
            this.updateComplianceStats();
        }
    }

    deleteComplianceItem(itemId) {
        if (confirm('Are you sure you want to delete this compliance item?')) {
            this.complianceItems = this.complianceItems.filter(c => c.id !== itemId);
            this.saveComplianceItems();
            this.renderComplianceTable();
            this.updateComplianceStats();
            this.showNotification('Compliance item deleted', 'success');
        }
    }

    renderComplianceTable() {
        const tbody = document.getElementById('complianceTableBody');
        if (!tbody) return;

        if (this.complianceItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        No compliance items yet. 
                        <button onclick="addComplianceItem()" class="btn btn-link p-0">Add your first compliance item</button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.complianceItems.map(item => {
            const assignedUser = this.users.find(u => u.id === item.assignedTo);
            const assignedName = assignedUser ? assignedUser.name : 'Unassigned';
            
            const statusIcon = item.status === 'completed' ? 
                '<i class="fas fa-check-circle text-success fs-5"></i>' : 
                '<i class="fas fa-clock text-warning fs-5"></i>';
            
            const trainingDateText = item.trainingDate ? new Date(item.trainingDate).toLocaleDateString() : 'Not scheduled';
            const typeIcon = this.getComplianceTypeIcon(item.type);
            
            return `
                <tr>
                    <td class="text-center">
                        <button onclick="projectManager.toggleComplianceStatus('${item.id}')" class="btn btn-sm btn-link p-0" title="Toggle Status">
                            ${statusIcon}
                        </button>
                    </td>
                    <td>
                        <div class="d-flex align-items-center">
                            <span class="me-2">${typeIcon}</span>
                            <div>
                                <strong>${item.title}</strong>
                                ${item.description ? `<br><small class="text-muted">${item.description}</small>` : ''}
                                ${item.type ? `<br><span class="badge bg-secondary">${item.type}</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>
                        ${trainingDateText}
                        ${item.status === 'completed' ? '<br><small class="text-success">Completed</small>' : ''}
                    </td>
                    <td>${assignedName}</td>
                    <td>
                        <div class="btn-group" role="group">
                            <button onclick="projectManager.openComplianceModal('${item.id}')" class="btn btn-sm btn-outline-primary" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="projectManager.exportItemToCalendar('${item.id}')" class="btn btn-sm btn-outline-success" title="Add to Calendar">
                                <i class="fas fa-calendar-plus"></i>
                            </button>
                            <button onclick="projectManager.deleteComplianceItem('${item.id}')" class="btn btn-sm btn-outline-danger" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateComplianceStats() {
        // Update the stats cards
        const completedCount = this.complianceItems.filter(c => c.status === 'completed').length;
        const totalCount = this.complianceItems.length;
        const overdueCount = this.complianceItems.filter(c => {
            return c.trainingDate && new Date(c.trainingDate) < new Date() && c.status !== 'completed';
        }).length;
        const activeCount = this.complianceItems.filter(c => c.status === 'pending').length;
        const complianceRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        // Update DOM elements
        const elements = {
            'completedProjectsCount': completedCount,
            'overdueProjectsCount': overdueCount,
            'activeProjectsCount': activeCount,
            'complianceRate': `${complianceRate}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });

        // Update alerts
        this.updateComplianceAlerts();
    }

    updateComplianceAlerts() {
        const alertsDiv = document.getElementById('complianceAlerts');
        if (!alertsDiv) return;

        const overdue = this.complianceItems.filter(c => {
            return c.trainingDate && new Date(c.trainingDate) < new Date() && c.status !== 'completed';
        });

        const dueSoon = this.complianceItems.filter(c => {
            if (!c.trainingDate || c.status === 'completed') return false;
            const trainingDate = new Date(c.trainingDate);
            const today = new Date();
            const diffDays = Math.ceil((trainingDate - today) / (1000 * 60 * 60 * 24));
            return diffDays > 0 && diffDays <= 7;
        });

        let alertsHtml = '';

        if (overdue.length > 0) {
            alertsHtml += `
                <div class="alert alert-danger py-2">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>${overdue.length} Overdue Items</strong>
                    <ul class="mb-0 mt-2">
                        ${overdue.slice(0, 3).map(item => `<li class="small">${item.title}</li>`).join('')}
                        ${overdue.length > 3 ? `<li class="small">... and ${overdue.length - 3} more</li>` : ''}
                    </ul>
                </div>
            `;
        }

        if (dueSoon.length > 0) {
            alertsHtml += `
                <div class="alert alert-warning py-2">
                    <i class="fas fa-clock me-2"></i>
                    <strong>${dueSoon.length} Due This Week</strong>
                    <ul class="mb-0 mt-2">
                        ${dueSoon.slice(0, 3).map(item => `<li class="small">${item.title}</li>`).join('')}
                        ${dueSoon.length > 3 ? `<li class="small">... and ${dueSoon.length - 3} more</li>` : ''}
                    </ul>
                </div>
            `;
        }

        if (alertsHtml === '') {
            alertsHtml = `
                <div class="alert alert-success py-2">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>All Good!</strong>
                    <p class="mb-0 small">No overdue compliance items</p>
                </div>
            `;
        }

        alertsDiv.innerHTML = alertsHtml;
    }

    async saveComplianceItems() {
        // Save to cloud storage (we'll add this to cloudStorage.js)
        localStorage.setItem('safetrack_compliance', JSON.stringify(this.complianceItems));
    }

    loadComplianceItems() {
        const stored = localStorage.getItem('safetrack_compliance');
        return stored ? JSON.parse(stored) : [];
    }

    getComplianceTypeIcon(type) {
        const icons = {
            'training': '<i class="fas fa-graduation-cap text-primary"></i>',
            'inspection': '<i class="fas fa-search text-info"></i>',
            'audit': '<i class="fas fa-clipboard-check text-warning"></i>',
            'drill': '<i class="fas fa-bell text-danger"></i>',
            'certification': '<i class="fas fa-certificate text-success"></i>',
            'equipment': '<i class="fas fa-tools text-secondary"></i>',
            'documentation': '<i class="fas fa-file-alt text-info"></i>',
            'other': '<i class="fas fa-circle text-muted"></i>'
        };
        return icons[type] || icons['other'];
    }

    // ========================================
    // CERTIFICATION MANAGEMENT
    // ========================================
    
    openCertificationModal() {
        // Reset form
        document.getElementById('certificationForm').reset();
        document.getElementById('certificationModalTitle').textContent = 'New Certification';
        document.getElementById('certificationSubmitText').textContent = 'Add Certification';
        document.getElementById('certificationFilePreview').innerHTML = '';
        this.currentCertificationEditId = null;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('certificationModal'));
        modal.show();
    }

    async addCertification(certificationData) {
        const certification = {
            id: Date.now(),
            ...certificationData,
            userId: this.currentUser,
            createdAt: new Date().toISOString()
        };
        
        this.certifications.push(certification);
        await this.saveCertifications();
        // TEMPORARILY DISABLED: Certification features
        // this.renderCertificationTable();
        // this.updateCertificationStats();
        this.closeCertificationModal();
        this.showNotification(`Certification "${certification.name}" added successfully!`, 'success');
    }

    editCertification(certificationId, certificationData) {
        const index = this.certifications.findIndex(c => c.id === certificationId);
        if (index !== -1) {
            this.certifications[index] = {
                ...this.certifications[index],
                ...certificationData
            };
            this.saveCertifications();
            this.renderCertificationTable();
            this.updateCertificationStats();
            this.closeCertificationModal();
            this.showNotification('Certification updated successfully!', 'success');
        }
    }

    closeCertificationModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('certificationModal'));
        if (modal) {
            modal.hide();
        }
    }

    deleteCertification(certificationId) {
        if (confirm('Are you sure you want to delete this certification?')) {
            this.certifications = this.certifications.filter(c => c.id !== certificationId);
            this.saveCertifications();
            this.renderCertificationTable();
            this.updateCertificationStats();
            this.showNotification('Certification deleted', 'success');
        }
    }

    renderCertificationTable() {
        const tbody = document.getElementById('certificationTableBody');
        if (!tbody) return;

        // Filter certifications by current user
        const userCertifications = this.certifications.filter(cert => cert.userId === this.currentUser);

        if (userCertifications.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">
                        <i class="fas fa-certificate fa-2x mb-2 d-block"></i>
                        No certifications found. Add your first certification to get started.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = userCertifications.map(cert => `
            <tr>
                <td>
                    <div class="fw-bold">${this.escapeHtml(cert.name)}</div>
                    ${cert.level ? `<small class="text-muted">${cert.level}</small>` : ''}
                </td>
                <td>${this.escapeHtml(cert.provider)}</td>
                <td>
                    <span class="status-badge ${this.getCertificationStatusClass(cert)}" role="status">
                        <span class="status-icon ${this.getCertificationStatusIconClass(cert)}"></span>
                        ${this.getCertificationStatus(cert)}
                    </span>
                </td>
                <td>${this.formatDate(cert.issueDate)}</td>
                <td>${cert.expiryDate ? this.formatDate(cert.expiryDate) : 'No expiry'}</td>
                <td>
                    ${cert.certificateFile ? `
                        <button class="btn btn-sm btn-outline-primary" onclick="projectManager.viewCertificate(${cert.id})" title="View Certificate">
                            <i class="fas fa-eye"></i>
                        </button>
                    ` : '<span class="text-muted">No file</span>'}
                </td>
                <td>
                    <div class="btn-group" role="group">
                        <button onclick="projectManager.editCertificationModal(${cert.id})" class="btn btn-sm btn-outline-primary" title="Edit Certification">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="projectManager.deleteCertification(${cert.id})" class="btn btn-sm btn-outline-danger" title="Delete Certification">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getCertificationStatus(cert) {
        if (!cert.expiryDate) return 'Active';
        
        const now = new Date();
        const expiry = new Date(cert.expiryDate);
        const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) return 'Expired';
        if (daysUntilExpiry <= 30) return 'Expiring Soon';
        return 'Active';
    }

    getCertificationStatusClass(cert) {
        const status = this.getCertificationStatus(cert);
        switch (status) {
            case 'Active': return 'status-badge-active';
            case 'Expiring Soon': return 'status-badge-at-risk';
            case 'Expired': return 'status-badge-overdue';
            default: return 'status-badge-pending';
        }
    }

    getCertificationStatusIconClass(cert) {
        const status = this.getCertificationStatus(cert);
        switch (status) {
            case 'Active': return 'status-icon-active';
            case 'Expiring Soon': return 'status-icon-at-risk';
            case 'Expired': return 'status-icon-overdue';
            default: return 'status-icon-pending';
        }
    }

    updateCertificationStats() {
        const userCertifications = this.certifications.filter(cert => cert.userId === this.currentUser);
        
        const total = userCertifications.length;
        const active = userCertifications.filter(cert => this.getCertificationStatus(cert) === 'Active').length;
        const expiring = userCertifications.filter(cert => this.getCertificationStatus(cert) === 'Expiring Soon').length;
        const expired = userCertifications.filter(cert => this.getCertificationStatus(cert) === 'Expired').length;

        // Update stats cards
        document.getElementById('totalCertifications').textContent = total;
        document.getElementById('activeCertifications').textContent = active;
        document.getElementById('expiringCertifications').textContent = expiring;
        document.getElementById('expiredCertifications').textContent = expired;
    }

    editCertificationModal(certificationId) {
        const cert = this.certifications.find(c => c.id === certificationId);
        if (!cert) return;

        this.currentCertificationEditId = certificationId;
        
        // Fill form with certification data
        document.getElementById('certificationName').value = cert.name;
        document.getElementById('certificationProvider').value = cert.provider;
        document.getElementById('certificationNumber').value = cert.number || '';
        document.getElementById('certificationLevel').value = cert.level || '';
        document.getElementById('certificationIssueDate').value = cert.issueDate;
        document.getElementById('certificationExpiryDate').value = cert.expiryDate || '';
        document.getElementById('certificationDescription').value = cert.description || '';
        
        // Show file preview if exists
        if (cert.certificateFile) {
            document.getElementById('certificationFilePreview').innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-file me-2"></i>Current file: ${cert.certificateFileName}
                </div>
            `;
        }
        
        // Update modal title
        document.getElementById('certificationModalTitle').textContent = 'Edit Certification';
        document.getElementById('certificationSubmitText').textContent = 'Update Certification';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('certificationModal'));
        modal.show();
    }

    viewCertificate(certificationId) {
        const cert = this.certifications.find(c => c.id === certificationId);
        if (!cert || !cert.certificateFile) return;

        // Create a new window/tab to display the certificate
        const newWindow = window.open('', '_blank');
        if (cert.certificateFile.startsWith('data:application/pdf')) {
            // PDF file
            newWindow.document.write(`
                <html>
                    <head><title>${cert.name} - Certificate</title></head>
                    <body style="margin:0;">
                        <embed src="${cert.certificateFile}" width="100%" height="100%" type="application/pdf">
                    </body>
                </html>
            `);
        } else {
            // Image file
            newWindow.document.write(`
                <html>
                    <head><title>${cert.name} - Certificate</title></head>
                    <body style="margin:0; text-align:center; background:#f5f5f5;">
                        <img src="${cert.certificateFile}" style="max-width:100%; max-height:100%; margin:20px;">
                    </body>
                </html>
            `);
        }
    }

    async saveCertifications() {
        // Save to cloud storage
        localStorage.setItem('safetrack_certifications', JSON.stringify(this.certifications));
    }

    loadCertifications() {
        const stored = localStorage.getItem('safetrack_certifications');
        return stored ? JSON.parse(stored) : [];
    }

    handleCertificationFileUpload(input) {
        const file = input.files[0];
        if (!file) return;

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            input.value = '';
            return;
        }

        // Check file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            alert('Only images (JPG, PNG, GIF) and PDF files are allowed');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const fileData = e.target.result;
            window.currentCertificateFile = fileData;
            window.currentCertificateFileName = file.name;

            // Show preview
            const preview = document.getElementById('certificationFilePreview');
            if (file.type.startsWith('image/')) {
                preview.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-image me-2"></i>Image uploaded: ${file.name}
                        <br><img src="${fileData}" class="img-thumbnail mt-2" style="max-width: 200px; max-height: 150px;">
                    </div>
                `;
            } else if (file.type === 'application/pdf') {
                preview.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fas fa-file-pdf me-2"></i>PDF uploaded: ${file.name}
                    </div>
                `;
            }
        };
        reader.readAsDataURL(file);
    }

    // ========================================
    // CERTIFICATION EXPORT FUNCTIONS
    // ========================================

    exportCertificationsToExcel() {
        const userCertifications = this.certifications.filter(cert => cert.userId === this.currentUser);
        
        if (userCertifications.length === 0) {
            this.showNotification('No certifications to export', 'warning');
            return;
        }

        const exportData = this.prepareCertificationExportData(userCertifications);
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        
        // Set column widths
        worksheet['!cols'] = [
            { width: 30 }, // Certification Name
            { width: 20 }, // Provider
            { width: 15 }, // Certificate Number
            { width: 12 }, // Level
            { width: 12 }, // Status
            { width: 12 }, // Issue Date
            { width: 12 }, // Expiry Date
            { width: 40 }  // Description
        ];
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Certifications');
        
        const userName = this.getUserById(this.currentUser)?.name || 'User';
        const fileName = `${userName}_Certifications_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        this.showNotification(`Certifications exported to ${fileName}`, 'success');
    }

    exportCertificationsToPDF() {
        const userCertifications = this.certifications.filter(cert => cert.userId === this.currentUser);
        
        if (userCertifications.length === 0) {
            this.showNotification('No certifications to export', 'warning');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const userName = this.getUserById(this.currentUser)?.name || 'User';
        const currentDate = new Date().toLocaleDateString();
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(220, 53, 69); // Safety red
        doc.text('SafeTrack - Certification Report', 20, 25);
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Team Member: ${userName}`, 20, 40);
        doc.text(`Generated: ${currentDate}`, 20, 50);
        doc.text(`Total Certifications: ${userCertifications.length}`, 20, 60);
        
        // Statistics
        const stats = this.getCertificationStats(userCertifications);
        doc.text(`Active: ${stats.active} | Expiring Soon: ${stats.expiring} | Expired: ${stats.expired}`, 20, 70);
        
        // Table
        const exportData = this.prepareCertificationExportData(userCertifications);
        const tableData = exportData.map(cert => [
            cert['Certification Name'],
            cert['Provider'],
            cert['Level'] || 'N/A',
            cert['Status'],
            cert['Issue Date'],
            cert['Expiry Date'] || 'No expiry'
        ]);
        
        doc.autoTable({
            head: [['Certification', 'Provider', 'Level', 'Status', 'Issue Date', 'Expiry Date']],
            body: tableData,
            startY: 80,
            theme: 'striped',
            headStyles: { 
                fillColor: [220, 53, 69], // Safety red
                textColor: 255,
                fontStyle: 'bold'
            },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 30 },
                2: { cellWidth: 20 },
                3: { cellWidth: 25 },
                4: { cellWidth: 25 },
                5: { cellWidth: 25 }
            }
        });
        
        const fileName = `${userName}_Certifications_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        this.showNotification(`PDF report saved as ${fileName}`, 'success');
    }

    exportCertificationsToCSV() {
        const userCertifications = this.certifications.filter(cert => cert.userId === this.currentUser);
        
        if (userCertifications.length === 0) {
            this.showNotification('No certifications to export', 'warning');
            return;
        }

        const exportData = this.prepareCertificationExportData(userCertifications);
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        const userName = this.getUserById(this.currentUser)?.name || 'User';
        const fileName = `${userName}_Certifications_${new Date().toISOString().split('T')[0]}.csv`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification(`Certifications exported to ${fileName}`, 'success');
    }

    printCertifications() {
        const userCertifications = this.certifications.filter(cert => cert.userId === this.currentUser);
        
        if (userCertifications.length === 0) {
            this.showNotification('No certifications to print', 'warning');
            return;
        }

        const userName = this.getUserById(this.currentUser)?.name || 'User';
        const currentDate = new Date().toLocaleDateString();
        const stats = this.getCertificationStats(userCertifications);
        
        let printContent = `
            <html>
            <head>
                <title>${userName} - Certification Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { border-bottom: 3px solid #dc3545; padding-bottom: 10px; margin-bottom: 20px; }
                    .header h1 { color: #dc3545; margin: 0; }
                    .stats { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
                    .stat-item { text-align: center; }
                    .stat-number { font-size: 24px; font-weight: bold; color: #dc3545; }
                    .stat-label { font-size: 12px; color: #666; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #dc3545; color: white; font-weight: bold; }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    .status-active { color: #198754; font-weight: bold; }
                    .status-expiring { color: #fd7e14; font-weight: bold; }
                    .status-expired { color: #dc3545; font-weight: bold; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🛡️ SafeTrack - Certification Report</h1>
                    <p><strong>Team Member:</strong> ${userName} | <strong>Generated:</strong> ${currentDate}</p>
                </div>
                
                <div class="stats">
                    <h3>Certification Summary</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-number">${userCertifications.length}</div>
                            <div class="stat-label">Total Certifications</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.active}</div>
                            <div class="stat-label">Active</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.expiring}</div>
                            <div class="stat-label">Expiring Soon</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${stats.expired}</div>
                            <div class="stat-label">Expired</div>
                        </div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Certification Name</th>
                            <th>Provider</th>
                            <th>Level</th>
                            <th>Status</th>
                            <th>Issue Date</th>
                            <th>Expiry Date</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        userCertifications.forEach(cert => {
            const status = this.getCertificationStatus(cert);
            const statusClass = status.toLowerCase().replace(' ', '-');
            
            printContent += `
                <tr>
                    <td><strong>${this.escapeHtml(cert.name)}</strong></td>
                    <td>${this.escapeHtml(cert.provider)}</td>
                    <td>${cert.level || 'N/A'}</td>
                    <td class="status-${statusClass}">${status}</td>
                    <td>${this.formatDate(cert.issueDate)}</td>
                    <td>${cert.expiryDate ? this.formatDate(cert.expiryDate) : 'No expiry'}</td>
                </tr>
            `;
        });
        
        printContent += `
                    </tbody>
                </table>
                
                <div style="margin-top: 30px; font-size: 12px; color: #666;">
                    <p><strong>Report Notes:</strong></p>
                    <ul>
                        <li>Active: Certifications that are currently valid</li>
                        <li>Expiring Soon: Certifications expiring within 30 days</li>
                        <li>Expired: Certifications past their expiration date</li>
                    </ul>
                    <p>Generated by SafeTrack Safety Management System</p>
                </div>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        
        this.showNotification('Print dialog opened', 'success');
    }

    prepareCertificationExportData(certifications) {
        return certifications.map(cert => ({
            'Certification Name': cert.name,
            'Provider': cert.provider,
            'Certificate Number': cert.number || '',
            'Level': cert.level || '',
            'Status': this.getCertificationStatus(cert),
            'Issue Date': this.formatDate(cert.issueDate),
            'Expiry Date': cert.expiryDate ? this.formatDate(cert.expiryDate) : '',
            'Description': cert.description || '',
            'Days Until Expiry': cert.expiryDate ? Math.ceil((new Date(cert.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : 'N/A'
        }));
    }

    getCertificationStats(certifications) {
        const active = certifications.filter(cert => this.getCertificationStatus(cert) === 'Active').length;
        const expiring = certifications.filter(cert => this.getCertificationStatus(cert) === 'Expiring Soon').length;
        const expired = certifications.filter(cert => this.getCertificationStatus(cert) === 'Expired').length;
        
        return { active, expiring, expired };
    }
    
    async waitForCloudStorage() {
        // Wait for cloud storage to be initialized
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait
        
        while (!this.cloudStorage.isConnected && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            console.warn('Cloud storage connection timeout, proceeding with local storage');
        }
    }

    showConnectionStatus() {
        const status = this.cloudStorage.getConnectionStatus();
        const indicator = document.getElementById('connectionIndicator');
        const syncButton = document.getElementById('syncButton');
        
        if (status.connected) {
            indicator.className = 'badge bg-success me-2';
            indicator.innerHTML = '<i class="fas fa-cloud me-1"></i>Cloud Connected';
            syncButton.disabled = false;
        } else {
            indicator.className = 'badge bg-danger me-2';
            indicator.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Offline Mode';
            syncButton.disabled = true;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'info'} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    // Manual function to force update dropdown (for debugging)
    forceUpdateDropdown() {
        this.populateUserDropdowns();
    }

    // Emergency function to completely clear everything
    async emergencyClearAll() {
        console.log('EMERGENCY CLEAR - Starting complete data wipe...');
        
        // Clear local storage
        localStorage.clear();
        
        // Clear cloud storage by deleting all existing projects
        if (this.cloudStorage.isConnected) {
            try {
                // First, get all existing projects and delete them one by one
                const existingProjects = await this.cloudStorage.loadFromCloud('projects');
                console.log('EMERGENCY CLEAR - Found existing projects:', Object.keys(existingProjects));
                
                // Delete each project individually
                for (const projectId of Object.keys(existingProjects)) {
                    try {
                        await this.cloudStorage.deleteFromCloud('projects', projectId);
                        console.log(`EMERGENCY CLEAR - Deleted project ${projectId}`);
                    } catch (error) {
                        console.error(`EMERGENCY CLEAR - Error deleting project ${projectId}:`, error);
                    }
                }
                
                // Save empty collections
                await this.cloudStorage.saveToCloud('projects', {});
                await this.cloudStorage.saveToCloud('users', { admin: { id: "admin", name: "Admin User", email: "admin@safetrack.com", avatar: "A" } });
                await this.cloudStorage.saveToCloud('categories', {});
                await this.cloudStorage.saveToCloud('roles', {});
                await this.cloudStorage.saveToCloud('departments', {});
                console.log('EMERGENCY CLEAR - Cloud storage cleared');
            } catch (error) {
                console.error('EMERGENCY CLEAR - Error clearing cloud storage:', error);
            }
        }
        
        // Reset local arrays
        this.projects = [];
        this.users = [{ id: "admin", name: "Admin User", email: "admin@safetrack.com", avatar: "A" }];
        this.categories = [];
        this.roles = [];
        this.departments = [];
        
        // Re-render
        this.render();
        
        console.log('EMERGENCY CLEAR - Complete! App should now be empty.');
        alert('Emergency clear completed! The app should now be completely empty.');
    }

    async syncData() {
        const syncButton = document.getElementById('syncButton');
        const originalContent = syncButton.innerHTML;
        
        try {
            syncButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            syncButton.disabled = true;
            
            const success = await this.cloudStorage.syncAllData(this);
            
            // Also sync project notes
            await this.syncProjectNotesFromCloud();
            
            if (success) {
                this.showConnectionStatus();
                alert('Data synced successfully with cloud storage!');
            } else {
                alert('Failed to sync with cloud storage. Check your connection and try again.');
            }
        } catch (error) {
            console.error('Sync error:', error);
            alert('Error syncing data: ' + error.message);
        } finally {
            syncButton.innerHTML = originalContent;
            syncButton.disabled = false;
        }
    }

    async loadAllData() {
        try {
            // Load all data in parallel
            const [projects, users, categories, roles, departments, currentUser] = await Promise.all([
                this.cloudStorage.loadProjects(),
                this.cloudStorage.loadUsers(),
                this.cloudStorage.loadCategories(),
                this.cloudStorage.loadRoles(),
                this.cloudStorage.loadDepartments(),
                this.cloudStorage.loadCurrentUser()
            ]);
            
            this.projects = projects;
            this.users = users;
            this.categories = categories;
            this.roles = roles;
            this.departments = departments;
            this.currentUser = currentUser;
            
            // Update connection status after successful data load
            this.showConnectionStatus();
        } catch (error) {
            console.error('Error loading data from cloud storage:', error);
            // Fallback to local storage
            await this.loadFromLocalStorage();
        }
    }

    async loadFromLocalStorage() {
        console.log('Falling back to local storage...');
        this.projects = this.loadProjectsLocal();
        this.users = this.loadUsersLocal();
        this.categories = this.loadCategoriesLocal();
        this.roles = this.loadRolesLocal();
        this.departments = this.loadDepartmentsLocal();
        this.currentUser = this.loadCurrentUserLocal();
        
        // Load archived projects and ensure proper separation
        this.archivedProjects = await this.loadArchivedProjects();
        
        // Re-enable cleanup with better logic (local storage fallback)
        if (this.projects.length > 0 && Object.keys(this.archivedProjects).length > 0) {
            // Only run cleanup if there was a recent archive operation
            const recentArchiveOperation = localStorage.getItem('recent_archive_operation');
            
            if (recentArchiveOperation) {
                console.log('Running cleanup (local storage) - recent archive operation detected');
                await this.cleanupArchivedProjectsFromActive();
                localStorage.removeItem('recent_archive_operation'); // Clear the flag
            } else {
                console.log('Skipping cleanup (local storage) - no recent archive operations');
            }
        }
    }

    loadProjects() {
        const stored = localStorage.getItem('safetrack_projects');
        return stored ? JSON.parse(stored) : [];
    }

    async saveProjects() {
        console.log('Attempting to save projects:', {
            count: this.projects.length,
            projects: this.projects.map(p => ({id: p.id, name: p.name, createdBy: p.createdBy}))
        });
        
        try {
            await this.cloudStorage.saveProjects(this.projects);
            console.log('✅ Projects saved to cloud successfully');
        } catch (error) {
            console.error('❌ Failed to save projects to cloud, falling back to local storage:', error);
            // FALLBACK ONLY: Save to local storage only if cloud fails
        localStorage.setItem('safetrack_projects', JSON.stringify(this.projects));
            console.log('Fallback: Projects saved to local storage');
        }
    }

    loadUsers() {
        const stored = localStorage.getItem('safetrack_users');
        return stored ? JSON.parse(stored) : [];
    }

    async saveUsers() {
        await this.cloudStorage.saveUsers(this.users);
    }

    loadCurrentUser() {
        const stored = localStorage.getItem('safetrack_current_user');
        return stored ? JSON.parse(stored) : 'admin'; // Default to admin user's view instead of all
    }

    async saveCurrentUser() {
        await this.cloudStorage.saveCurrentUser(this.currentUser);
    }

    loadCategories() {
        const stored = localStorage.getItem('safetrack_categories');
        return stored ? JSON.parse(stored) : [];
    }

    async saveCategories() {
        await this.cloudStorage.saveCategories(this.categories);
    }

    loadRoles() {
        const stored = localStorage.getItem('safetrack_roles');
        return stored ? JSON.parse(stored) : [];
    }

    async saveRoles() {
        await this.cloudStorage.saveRoles(this.roles);
    }

    loadDepartments() {
        const stored = localStorage.getItem('safetrack_departments');
        return stored ? JSON.parse(stored) : [];
    }

    async saveDepartments() {
        await this.cloudStorage.saveDepartments(this.departments);
    }

    // Local storage fallback methods
    loadProjectsLocal() {
        const stored = localStorage.getItem('safetrack_projects');
        return stored ? JSON.parse(stored) : [];
    }

    loadUsersLocal() {
        const stored = localStorage.getItem('safetrack_users');
        return stored ? JSON.parse(stored) : [];
    }

    loadCategoriesLocal() {
        const stored = localStorage.getItem('safetrack_categories');
        return stored ? JSON.parse(stored) : [];
    }

    loadRolesLocal() {
        const stored = localStorage.getItem('safetrack_roles');
        return stored ? JSON.parse(stored) : [];
    }

    loadDepartmentsLocal() {
        const stored = localStorage.getItem('safetrack_departments');
        return stored ? JSON.parse(stored) : [];
    }

    loadCurrentUserLocal() {
        const stored = localStorage.getItem('safetrack_current_user');
        return stored ? JSON.parse(stored) : 'all';
    }

    resetAllData() {
        // Admin access already verified at profile selection
        if (confirm('Are you sure you want to reset all data? This will delete all users, projects, categories, roles, and departments. This action cannot be undone.')) {
            // Clear all stored data
            localStorage.removeItem('safetrack_projects');
            localStorage.removeItem('safetrack_users');
            localStorage.removeItem('safetrack_categories');
            localStorage.removeItem('safetrack_roles');
            localStorage.removeItem('safetrack_departments');
            localStorage.removeItem('safetrack_current_user');
            localStorage.removeItem('safetrack_user_interacted');
            
            // Force reset to only Admin User
            this.users = [
                {
                    id: "admin",
                    name: "Admin User",
                    email: "admin@safetrack.com",
                    avatar: "A"
                }
            ];
            this.projects = []; // Start with empty projects
            this.saveUsers();
            this.saveProjects();
            
            // Reload the page to reset everything
            location.reload();
        }
    }

    loadSampleData() {
        // Start with empty projects array - no hardcoded data
        this.projects = [];
        this.saveProjects();
    }

    loadSampleUsers() {
        // Reset to only admin user - no sample users
        this.users = [
            {
                id: "admin",
                name: "Admin User",
                email: "admin@safetrack.com",
                avatar: "A"
            }
        ];
        this.saveUsers();
        
        // Also clear local storage to remove old default users
        localStorage.removeItem('safetrack_users');
        localStorage.setItem('safetrack_users', JSON.stringify(this.users));
    }

    setupEventListeners() {
        document.getElementById('projectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterProjects();
        });

        // Status filter
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterProjects();
        });
        
        // User filter
        document.getElementById('userFilter').addEventListener('change', (e) => {
            this.filterProjects();
        });
        
        // Date filter
        document.getElementById('dateFilter').addEventListener('change', (e) => {
            this.filterProjects();
        });
        
        // Sort by
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.filterProjects();
        });
        
        // Priority filter
        document.getElementById('priorityFilter').addEventListener('change', (e) => {
            this.filterProjects();
        });
        
        // Category filter
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filterProjects();
        });
        
        // Progress filter
        document.getElementById('progressFilter').addEventListener('change', (e) => {
            this.filterProjects();
        });
        
        // Custom date range filters
        document.getElementById('startDateFilter').addEventListener('change', (e) => {
            this.filterProjects();
        });
        
        document.getElementById('endDateFilter').addEventListener('change', (e) => {
            this.filterProjects();
        });

        // User form
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserFormSubmit();
        });

        // Compliance form
        document.getElementById('complianceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleComplianceFormSubmit();
        });
    }

    generateId() {
        return Math.max(0, ...this.projects.map(p => p.id)) + 1;
    }

    // Security helper to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ========================================
    // DESCRIPTION TOGGLE SYSTEM
    // ========================================
    
    renderProjectDescription(projectId, description) {
        if (!description || description.trim() === '') {
            return 'No description';
        }
        
        const maxLength = 80; // Characters to show before truncation
        const fullDescription = this.escapeHtml(description);
        
        if (description.length <= maxLength) {
            return fullDescription;
        }
        
        const truncated = this.escapeHtml(description.substring(0, maxLength));
        const expandId = `desc-${projectId}`;
        
        return `
            <span id="${expandId}-short">
                ${truncated}...
                <button class="btn btn-link btn-sm p-0 ms-1 text-primary" 
                        onclick="projectManager.toggleDescription('${expandId}')"
                        title="Show full description">
                    <i class="fas fa-expand-alt"></i>
                </button>
            </span>
            <span id="${expandId}-full" style="display: none;">
                ${fullDescription}
                <button class="btn btn-link btn-sm p-0 ms-1 text-primary" 
                        onclick="projectManager.toggleDescription('${expandId}')"
                        title="Show less">
                    <i class="fas fa-compress-alt"></i>
                </button>
            </span>
        `;
    }
    
    toggleDescription(expandId) {
        const shortElement = document.getElementById(`${expandId}-short`);
        const fullElement = document.getElementById(`${expandId}-full`);
        
        if (shortElement && fullElement) {
            if (shortElement.style.display === 'none') {
                // Show short, hide full
                shortElement.style.display = 'inline';
                fullElement.style.display = 'none';
            } else {
                // Show full, hide short
                shortElement.style.display = 'none';
                fullElement.style.display = 'inline';
            }
        }
    }
    
    // ========================================
    // STATUS MODAL SYSTEM
    // ========================================
    
    openStatusModal(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;
        
        const modalHtml = `
            <div class="modal fade" id="statusModal" tabindex="-1">
                <div class="modal-dialog modal-sm">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-flag me-2"></i>Change Status
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p class="mb-3"><strong>${this.escapeHtml(project.name)}</strong></p>
                            <div class="d-grid gap-2">
                                <button class="btn btn-success status-modal-btn" onclick="projectManager.changeProjectStatus(${projectId}, 'active'); projectManager.closeStatusModal();">
                                    <i class="fas fa-play me-2"></i>Active
                                </button>
                                <button class="btn btn-info status-modal-btn" onclick="projectManager.changeProjectStatus(${projectId}, 'on-going'); projectManager.closeStatusModal();">
                                    <i class="fas fa-cog me-2"></i>On Going
                                </button>
                                <button class="btn btn-warning status-modal-btn" onclick="projectManager.changeProjectStatus(${projectId}, 'on-hold'); projectManager.closeStatusModal();">
                                    <i class="fas fa-pause me-2"></i>On Hold
                                </button>
                                <button class="btn btn-primary status-modal-btn" onclick="projectManager.changeProjectStatus(${projectId}, 'completed'); projectManager.closeStatusModal();">
                                    <i class="fas fa-check me-2"></i>Complete
                                </button>
                                <button class="btn btn-danger status-modal-btn" onclick="projectManager.changeProjectStatus(${projectId}, 'cancelled'); projectManager.closeStatusModal();">
                                    <i class="fas fa-times me-2"></i>Cancelled
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if present
        const existingModal = document.getElementById('statusModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('statusModal'));
        modal.show();
    }
    
    closeStatusModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('statusModal'));
        if (modal) {
            modal.hide();
        }
    }

    // Update project table title based on current user
    updateProjectTableTitle() {
        const titleElement = document.getElementById('projectTableTitle');
        if (titleElement) {
            if (this.projectViewMode === 'all') {
                titleElement.textContent = 'All Team Safety Projects';
            } else {
                const user = this.users.find(u => u.id === this.currentUser);
                const userName = user ? user.name : 'User';
                titleElement.textContent = `${userName}'s Safety Projects`;
            }
        }
    }

    addProject(projectData) {
        // Mark that user has interacted with the app
        this.hasUserInteracted = true;
        localStorage.setItem('safetrack_user_interacted', 'true');
        
        // If current user is 'all', default to admin for project creation
        const creatorId = this.currentUser === 'all' ? 'admin' : this.currentUser;
        
        // Handle multiple assigned users
        let assignedUsers = projectData.assignedTo;
        if (!Array.isArray(assignedUsers)) {
            assignedUsers = assignedUsers ? [assignedUsers] : [creatorId];
        }
        
        const project = {
            id: this.generateId(),
            ...projectData,
            status: 'active',
            progress: 0,
            createdBy: creatorId,
            assignedTo: assignedUsers,
            createdAt: new Date().toISOString()
        };
        this.projects.unshift(project);
        this.saveProjects();
        this.render();
        this.closeModal();
        this.showNotification(`Safety project "${project.name}" created successfully!`, 'success');
    }

    editProject(id, projectData) {
        const index = this.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.projects[index] = { 
                ...this.projects[index], 
                ...projectData,
                screenshots: projectData.screenshots && projectData.screenshots.length > 0 ? projectData.screenshots : this.projects[index].screenshots
            };
            this.saveProjects();
            this.render();
            this.closeModal();
            this.showNotification(`Safety project "${projectData.name}" updated successfully!`, 'success');
        }
    }

    async deleteProject(id) {
        const project = this.projects.find(p => p.id === id);
        if (!project) return;
        
        const projectName = project.name;
        if (confirm(`Are you sure you want to delete the project "${projectName}"?\n\nThis action cannot be undone.`)) {
            try {
                // Mark that user has interacted with the app
                this.hasUserInteracted = true;
                localStorage.setItem('safetrack_user_interacted', 'true');
                
                // Remove from local array
            this.projects = this.projects.filter(p => p.id !== id);
                
                // Save to cloud storage
                await this.saveProjects();
                
                // Also delete from cloud storage directly
                if (this.cloudStorage.isConnected) {
                    await this.cloudStorage.deleteFromCloud('projects', id);
                }
                
                // Re-render the UI
            this.render();
                
                // Show success message
                this.showNotification(`Project "${projectName}" deleted successfully`, 'success');
            } catch (error) {
                console.error('Error deleting project:', error);
                this.showNotification('Error deleting project. Please try again.', 'error');
            }
        }
    }

    updateProgress(id, progress) {
        const project = this.projects.find(p => p.id === id);
        if (project) {
            project.progress = Math.min(100, Math.max(0, parseInt(progress)));
            if (project.progress === 100) {
                project.status = 'completed';
            }
            this.saveProjects();
            this.render();
        }
    }

    async handleFormSubmit() {
        const formData = new FormData(document.getElementById('projectForm'));
        const screenshots = await this.handleScreenshotUploadAsync();
        
        const projectData = {
            name: formData.get('name'),
            description: formData.get('description'),
            priority: formData.get('priority'),
            category: formData.get('category'),
            startDate: formData.get('startDate'),
            dueDate: formData.get('dueDate'),
            completionDate: formData.get('completionDate'),
            assignedTo: this.selectedAssignedUsers.length > 0 ? this.selectedAssignedUsers : [this.currentUser],
            status: formData.get('status'),
            screenshots: screenshots
        };

        if (this.currentEditId) {
            this.editProject(this.currentEditId, projectData);
        } else {
            this.addProject(projectData);
        }
    }

    openProjectModal() {
        // Reset form for new project
        document.getElementById('projectForm').reset();
        document.getElementById('modalTitle').textContent = 'New Safety Project';
        document.getElementById('submitText').textContent = 'Create Safety Project';
        this.currentEditId = null;
        
        // Explicitly ensure completion date field is enabled and interactive
        const completionDateField = document.getElementById('projectCompletionDate');
        if (completionDateField) {
            completionDateField.removeAttribute('readonly');
            completionDateField.removeAttribute('disabled');
            completionDateField.style.pointerEvents = 'auto';
        }
        
        // Reset assigned users
        this.selectedAssignedUsers = [];
        this.renderAssignedUsers();
        this.populateAssignedUsersDropdown();
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('projectModal'));
        modal.show();
    }

    closeModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('projectModal'));
        if (modal) {
            modal.hide();
        }
        this.currentEditId = null;
        // Clear file input
        document.getElementById('projectScreenshots').value = '';
    }

    filterProjects() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;
        const userFilter = document.getElementById('userFilter').value;
        const dateFilter = document.getElementById('dateFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const categoryFilter = document.getElementById('categoryFilter').value;
        const progressFilter = document.getElementById('progressFilter').value;
        const startDateFilter = document.getElementById('startDateFilter').value;
        const endDateFilter = document.getElementById('endDateFilter').value;
        
        let filteredProjects = this.projects;
        
        // Apply view mode filtering first
        if (this.projectViewMode === 'personal') {
            filteredProjects = filteredProjects.filter(project => {
                const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
                return project.createdBy === this.currentUser || assignedUsers.includes(this.currentUser);
            });
        } else if (this.projectViewMode !== 'all') {
            // Individual user view
            filteredProjects = filteredProjects.filter(project => {
                const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
                return project.createdBy === this.projectViewMode || assignedUsers.includes(this.projectViewMode);
            });
        }
        
        // Search filter
        if (searchTerm) {
            filteredProjects = filteredProjects.filter(project => {
                const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
                const assignedUserNames = assignedUsers.map(userId => this.getUserName(userId)).join(' ').toLowerCase();
                
                return project.name.toLowerCase().includes(searchTerm) ||
                       (project.description && project.description.toLowerCase().includes(searchTerm)) ||
                       this.getUserName(project.createdBy).toLowerCase().includes(searchTerm) ||
                       assignedUserNames.includes(searchTerm);
            });
        }
        
        // Status filter (including special statuses)
        if (statusFilter) {
            if (statusFilter === 'overdue') {
                filteredProjects = filteredProjects.filter(project => this.isProjectOverdue(project));
            } else {
                filteredProjects = filteredProjects.filter(project => project.status === statusFilter);
            }
        }
        
        // User filter
        if (userFilter) {
            filteredProjects = filteredProjects.filter(project => {
                const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
                return project.createdBy === userFilter || assignedUsers.includes(userFilter);
            });
        }
        
        // Priority filter
        if (priorityFilter) {
            filteredProjects = filteredProjects.filter(project => project.priority === priorityFilter);
        }
        
        // Category filter
        if (categoryFilter) {
            filteredProjects = filteredProjects.filter(project => project.category === categoryFilter);
        }
        
        // Progress filter
        if (progressFilter) {
            filteredProjects = filteredProjects.filter(project => {
                const progress = project.progress || 0;
                switch (progressFilter) {
                    case 'not-started': return progress === 0;
                    case 'in-progress': return progress > 0 && progress < 100;
                    case 'completed': return progress === 100;
                    case 'low-progress': return progress >= 0 && progress <= 25;
                    case 'high-progress': return progress >= 75 && progress < 100;
                    default: return true;
                }
            });
        }
        
        // Date range filters
        if (dateFilter) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            filteredProjects = filteredProjects.filter(project => {
                const startDate = project.startDate ? new Date(project.startDate) : null;
                const dueDate = project.dueDate ? new Date(project.dueDate) : null;
                
                switch (dateFilter) {
                    case 'this-week':
                        const weekStart = new Date(today);
                        weekStart.setDate(today.getDate() - today.getDay());
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6);
                        return startDate && startDate >= weekStart && startDate <= weekEnd;
                        
                    case 'this-month':
                        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        return startDate && startDate >= monthStart && startDate <= monthEnd;
                        
                    case 'last-30-days':
                        const thirtyDaysAgo = new Date(today);
                        thirtyDaysAgo.setDate(today.getDate() - 30);
                        return startDate && startDate >= thirtyDaysAgo;
                        
                    case 'overdue-items':
                        return this.isProjectOverdue(project);
                        
                    case 'due-soon':
                        const sevenDaysFromNow = new Date(today);
                        sevenDaysFromNow.setDate(today.getDate() + 7);
                        return dueDate && dueDate >= today && dueDate <= sevenDaysFromNow;
                        
                    case 'no-deadline':
                        return !project.dueDate;
                        
                    default: return true;
                }
            });
        }
        
        // Custom date range filter
        if (startDateFilter || endDateFilter) {
            filteredProjects = filteredProjects.filter(project => {
                const projectStartDate = project.startDate ? new Date(project.startDate) : null;
                if (!projectStartDate) return false;
                
                if (startDateFilter && projectStartDate < new Date(startDateFilter)) return false;
                if (endDateFilter && projectStartDate > new Date(endDateFilter)) return false;
                return true;
            });
        }
        
        // Apply sorting
        const sortBy = document.getElementById('sortBy').value;
        if (sortBy) {
            filteredProjects = this.sortProjects(filteredProjects, sortBy);
        }
        
        this.renderProjectTable(filteredProjects);
        this.updateFilterStats(filteredProjects);
    }
    
    sortProjects(projects, sortBy) {
        if (!sortBy || !projects || projects.length === 0) {
            return projects;
        }
        
        // Create a copy to avoid mutating the original array
        const sortedProjects = [...projects];
        
        switch (sortBy) {
            case 'name-asc':
                return sortedProjects.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            
            case 'name-desc':
                return sortedProjects.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            
            case 'start-date-asc':
                return sortedProjects.sort((a, b) => {
                    const dateA = a.startDate ? new Date(a.startDate) : new Date(0);
                    const dateB = b.startDate ? new Date(b.startDate) : new Date(0);
                    return dateA - dateB;
                });
            
            case 'start-date-desc':
                return sortedProjects.sort((a, b) => {
                    const dateA = a.startDate ? new Date(a.startDate) : new Date(0);
                    const dateB = b.startDate ? new Date(b.startDate) : new Date(0);
                    return dateB - dateA;
                });
            
            case 'due-date-asc':
                return sortedProjects.sort((a, b) => {
                    const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
                    const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
                    return dateA - dateB;
                });
            
            case 'due-date-desc':
                return sortedProjects.sort((a, b) => {
                    const dateA = a.dueDate ? new Date(a.dueDate) : new Date('1900-01-01');
                    const dateB = b.dueDate ? new Date(b.dueDate) : new Date('1900-01-01');
                    return dateB - dateA;
                });
            
            case 'completion-date-asc':
                return sortedProjects.sort((a, b) => {
                    const dateA = a.completionDate ? new Date(a.completionDate) : new Date('1900-01-01');
                    const dateB = b.completionDate ? new Date(b.completionDate) : new Date('1900-01-01');
                    return dateA - dateB;
                });
            
            case 'completion-date-desc':
                return sortedProjects.sort((a, b) => {
                    const dateA = a.completionDate ? new Date(a.completionDate) : new Date('9999-12-31');
                    const dateB = b.completionDate ? new Date(b.completionDate) : new Date('9999-12-31');
                    return dateB - dateA;
                });
            
            case 'created-date-asc':
                return sortedProjects.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return dateA - dateB;
                });
            
            case 'created-date-desc':
                return sortedProjects.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return dateB - dateA;
                });
            
            case 'priority-high':
                return sortedProjects.sort((a, b) => {
                    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                    const priorityA = priorityOrder[a.priority] || 0;
                    const priorityB = priorityOrder[b.priority] || 0;
                    return priorityB - priorityA;
                });
            
            case 'priority-low':
                return sortedProjects.sort((a, b) => {
                    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                    const priorityA = priorityOrder[a.priority] || 0;
                    const priorityB = priorityOrder[b.priority] || 0;
                    return priorityA - priorityB;
                });
            
            case 'progress-asc':
                return sortedProjects.sort((a, b) => {
                    const progressA = a.progress || 0;
                    const progressB = b.progress || 0;
                    return progressA - progressB;
                });
            
            case 'progress-desc':
                return sortedProjects.sort((a, b) => {
                    const progressA = a.progress || 0;
                    const progressB = b.progress || 0;
                    return progressB - progressA;
                });
            
            default:
                return projects;
        }
    }
    
    getUserName(userId) {
        const user = this.users.find(u => u.id === userId);
        return user ? user.name : 'Unknown';
    }
    
    // ========================================
    // DEVELOPER NOTES SYSTEM (CLOUD-ONLY)
    // ========================================
    
    showProjectDeveloperNotes(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) {
            this.showNotification('Project not found', 'error');
            return;
        }
        
        // Store current project ID for developer notes
        this.currentDeveloperNotesProjectId = projectId;
        
        // Update modal title to show we're viewing developer notes
        document.getElementById('notesProjectTitle').textContent = `Project: ${project.name}`;
        
        // Switch to developer notes tab
        const devNotesTab = document.getElementById('developer-notes-tab');
        if (devNotesTab) {
            devNotesTab.click();
        }
        
        // Render developer notes
        this.renderDeveloperNotes(projectId);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('projectNotesModal'));
        modal.show();
    }
    
    renderDeveloperNotes(projectId) {
        const notesList = document.getElementById('developerNotesList');
        const notes = this.developerNotes[projectId] || [];
        
        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-code fa-3x mb-3 opacity-50"></i>
                    <p class="mb-0">No developer notes yet.</p>
                    <small>Add your first developer update above.</small>
                </div>
            `;
            return;
        }
        
        notesList.innerHTML = notes.map(note => {
            const user = this.users.find(u => u.id === note.userId);
            const userName = user ? user.name : 'Unknown';
            const userColor = this.getUserColor(user ? user.id : 'unknown');
            const typeIcon = this.getDeveloperNoteTypeIcon(note.type);
            const typeColor = this.getDeveloperNoteTypeColor(note.type);
            
            return `
                <div class="developer-note-item mb-3 p-3 border-start border-info border-3 bg-light">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="d-flex align-items-center">
                            <span class="badge ${typeColor} me-2">${typeIcon} ${note.type}</span>
                            <strong style="color: ${userColor};">${userName}</strong>
                        </div>
                        <div class="text-muted small">
                            <i class="fas fa-clock me-1"></i>
                            ${new Date(note.timestamp).toLocaleString()}
                        </div>
                    </div>
                    <div class="developer-note-content">
                        <p class="mb-0">${this.escapeHtml(note.text)}</p>
                    </div>
                    <div class="mt-2 d-flex justify-content-end">
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteDeveloperNote('${note.id}')" title="Delete Note">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    getDeveloperNoteTypeIcon(type) {
        const icons = {
            'enhancement': '🚀',
            'bugfix': '🐛',
            'feature': '✨',
            'update': '🔄',
            'maintenance': '🔧',
            'performance': '⚡',
            'security': '🔒',
            'documentation': '📚'
        };
        return icons[type] || '📝';
    }
    
    getDeveloperNoteTypeColor(type) {
        const colors = {
            'enhancement': 'bg-success',
            'bugfix': 'bg-warning',
            'feature': 'bg-primary',
            'update': 'bg-info',
            'maintenance': 'bg-secondary',
            'performance': 'bg-purple',
            'security': 'bg-danger',
            'documentation': 'bg-dark'
        };
        return colors[type] || 'bg-secondary';
    }
    
    async addDeveloperNote(projectId, noteText, noteType) {
        if (!noteText.trim()) {
            this.showNotification('Please enter a developer note', 'warning');
            return;
        }
        
        if (!noteType) {
            this.showNotification('Please select an update type', 'warning');
            return;
        }
        
        const numericProjectId = Number(projectId);
        const note = {
            id: Date.now().toString(),
            text: noteText.trim(),
            type: noteType,
            userId: this.currentUser,
            timestamp: new Date().toISOString()
        };
        
        if (!this.developerNotes[numericProjectId]) {
            this.developerNotes[numericProjectId] = [];
        }
        
        this.developerNotes[numericProjectId].unshift(note); // Add to beginning
        await this.saveDeveloperNotes();
        
        this.renderDeveloperNotes(numericProjectId);
        this.showNotification('Developer note added', 'success');
        
        // Clear form
        document.getElementById('developerNoteText').value = '';
        document.getElementById('developerNoteType').value = '';
    }
    
    async deleteDeveloperNote(projectId, noteId) {
        const numericProjectId = Number(projectId);
        
        if (this.developerNotes[numericProjectId]) {
            this.developerNotes[numericProjectId] = this.developerNotes[numericProjectId].filter(note => note.id !== noteId);
            await this.saveDeveloperNotes();
            this.renderDeveloperNotes(numericProjectId);
            this.showNotification('Developer note deleted', 'success');
        }
    }
    
    async saveDeveloperNotes() {
        // Save to cloud first, with local storage backup
        const cloudData = {};
        Object.entries(this.developerNotes).forEach(([projectId, notes]) => {
            if (notes && notes.length > 0) {
                cloudData[projectId] = {
                    projectId: projectId,
                    notes: notes,
                    lastUpdated: new Date().toISOString()
                };
            }
        });
        
        if (this.cloudStorage.isConnected) {
            try {
                await this.cloudStorage.saveToCloud('developer_notes', cloudData);
                console.log('Developer notes saved to cloud successfully');
            } catch (error) {
                console.error('Failed to save developer notes to cloud:', error);
                // Fall back to local storage
                localStorage.setItem('safetrack_developer_notes', JSON.stringify(this.developerNotes));
                console.log('Developer notes saved to local storage as backup');
            }
        } else {
            // Save to local storage if no cloud connection
            localStorage.setItem('safetrack_developer_notes', JSON.stringify(this.developerNotes));
            console.log('No cloud connection: Developer notes saved to local storage');
        }
    }
    
    async loadDeveloperNotes() {
        // Try cloud first, fall back to local storage
        if (this.cloudStorage.isConnected) {
            try {
                const cloudData = await this.cloudStorage.loadFromCloud('developer_notes');
                if (cloudData && Object.keys(cloudData).length > 0) {
                    const notes = {};
                    Object.entries(cloudData).forEach(([projectId, data]) => {
                        if (data.notes) {
                            notes[projectId] = data.notes;
                        }
                    });
                    this.developerNotes = notes;
                    console.log('Developer notes loaded from cloud:', Object.keys(notes).length, 'projects have developer notes');
                    
                    // Also save to local storage as backup
                    localStorage.setItem('safetrack_developer_notes', JSON.stringify(this.developerNotes));
                    return;
                } else {
                    console.log('No developer notes found in cloud, checking local storage');
                }
            } catch (error) {
                console.error('Failed to load developer notes from cloud:', error);
                console.log('Falling back to local storage');
            }
        }
        
        // Fallback to local storage
        const stored = localStorage.getItem('safetrack_developer_notes');
        if (stored) {
            try {
                this.developerNotes = JSON.parse(stored);
                console.log('Developer notes loaded from local storage:', Object.keys(this.developerNotes).length, 'projects have developer notes');
            } catch (error) {
                console.error('Failed to parse developer notes from local storage:', error);
                this.developerNotes = {};
            }
        } else {
            console.log('No developer notes found in local storage');
            this.developerNotes = {};
        }
    }
    
    updateFilterStats(filteredProjects) {
        // Update the table title to show filter results
        const titleElement = document.getElementById('projectTableTitle');
        if (titleElement) {
            const total = this.projects.length;
            const filtered = filteredProjects.length;
            if (filtered !== total) {
                titleElement.textContent = `Safety Projects (${filtered} of ${total})`;
            } else {
                titleElement.textContent = 'All Safety Projects';
            }
        }
    }
    
    populateFilterDropdowns() {
        // Populate user filter
        const userFilter = document.getElementById('userFilter');
        if (userFilter) {
            const currentOptions = Array.from(userFilter.options).map(option => option.value);
            const userOptions = this.users.map(user => 
                `<option value="${user.id}" ${currentOptions.includes(user.id) ? 'selected' : ''}>${user.name}</option>`
            ).join('');
            userFilter.innerHTML = `<option value="">All Users</option>${userOptions}`;
        }
        
        // Populate category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter && this.categories) {
            const categoryOptions = this.categories.map(category => 
                `<option value="${category.name}">${category.name}</option>`
            ).join('');
            categoryFilter.innerHTML = `<option value="">All Categories</option>${categoryOptions}`;
        }
    }
    
    clearAllFilters() {
        // Clear all filter inputs
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = '';
        document.getElementById('userFilter').value = '';
        document.getElementById('dateFilter').value = '';
        document.getElementById('sortBy').value = '';
        document.getElementById('priorityFilter').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('progressFilter').value = '';
        document.getElementById('startDateFilter').value = '';
        document.getElementById('endDateFilter').value = '';
        
        // Hide advanced filters
        const advancedFilters = document.getElementById('advancedFilters');
        const button = document.getElementById('moreFiltersBtn');
        if (advancedFilters && button) {
            advancedFilters.style.display = 'none';
            button.innerHTML = '<i class="fas fa-filter me-1"></i>More Filters';
            button.classList.remove('btn-secondary');
            button.classList.add('btn-outline-secondary');
        }
        
        // Re-render with no filters
        this.filterProjects();
        this.showNotification('All filters cleared', 'info');
    }

    // ========================================
    // MULTI-USER ASSIGNMENT SYSTEM
    // ========================================
    
    addAssignedUser() {
        const select = document.getElementById('projectAssignedTo');
        const userId = select.value;
        
        if (!userId || this.selectedAssignedUsers.includes(userId)) {
            select.value = ''; // Reset selection
            return;
        }
        
        this.selectedAssignedUsers.push(userId);
        this.renderAssignedUsers();
        select.value = ''; // Reset selection
    }
    
    removeAssignedUser(userId) {
        this.selectedAssignedUsers = this.selectedAssignedUsers.filter(id => id !== userId);
        this.renderAssignedUsers();
    }
    
    renderAssignedUsers() {
        const container = document.getElementById('assignedUsersContainer');
        if (!container) return;
        
        if (this.selectedAssignedUsers.length === 0) {
            container.innerHTML = '<div class="text-muted small p-2">No team members assigned yet</div>';
            return;
        }
        
        container.innerHTML = this.selectedAssignedUsers.map(userId => {
            const user = this.users.find(u => u.id === userId);
            if (!user) return '';
            
            return `
                <div class="assigned-user-tag d-inline-flex align-items-center me-2 mb-2">
                    <div class="user-avatar-small me-1" style="background: ${this.getUserColor(userId)};">
                        ${user.avatar || user.name.charAt(0).toUpperCase()}
                    </div>
                    <span class="me-2">${this.escapeHtml(user.name)}</span>
                    <button type="button" class="btn-close btn-close-sm" onclick="removeAssignedUser('${userId}')" title="Remove ${user.name}"></button>
                </div>
            `;
        }).join('');
    }
    
    populateAssignedUsersDropdown() {
        const select = document.getElementById('projectAssignedTo');
        if (!select) return;
        
        // Get users not already selected
        const availableUsers = this.users.filter(user => !this.selectedAssignedUsers.includes(user.id));
        
        const options = availableUsers.map(user => 
            `<option value="${user.id}">${user.name}</option>`
        ).join('');
        
        select.innerHTML = `<option value="">+ Add Team Member</option>${options}`;
    }

    // ========================================
    // PROJECT ARCHIVE SYSTEM
    // ========================================
    
    async archiveProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) {
            this.showNotification('Project not found', 'error');
            return;
        }
        
        // Only allow archiving completed projects
        if (project.status !== 'completed') {
            this.showNotification('Only completed projects can be archived', 'warning');
            return;
        }
        
        // Check if user can archive (creator or assigned user)
        if (!this.canUserEditProject(project)) {
            this.showNotification('You can only archive projects you created or are assigned to', 'error');
            return;
        }
        
        if (!confirm(`Are you sure you want to archive "${project.name}"?\n\nArchived projects are moved to your personal archive and hidden from the main project list.`)) {
            return;
        }
        
        // Add archive metadata
        const archivedProject = {
            ...project,
            archivedAt: new Date().toISOString(),
            archivedBy: this.currentUser,
            originalId: project.id
        };
        
        // Add to user's archive
        if (!this.archivedProjects[this.currentUser]) {
            this.archivedProjects[this.currentUser] = [];
        }
        this.archivedProjects[this.currentUser].unshift(archivedProject);
        
        // Remove from active projects
        const originalProjectCount = this.projects.length;
        this.projects = this.projects.filter(p => p.id !== projectId);
        const newProjectCount = this.projects.length;
        
        console.log(`Archive: Removed project ${projectId}. Projects count: ${originalProjectCount} → ${newProjectCount}`);
        console.log(`Archive: Active projects after filter:`, this.projects.map(p => ({id: p.id, name: p.name})));
        
        // Save both active projects and archive
        await this.saveProjects();
        await this.saveArchivedProjects();
        
        console.log(`Archive: Saved to cloud. Active projects: ${this.projects.length}, Archived projects: ${this.archivedProjects[this.currentUser]?.length || 0}`);
        
        // Set flag to indicate recent archive operation for cleanup
        localStorage.setItem('recent_archive_operation', 'true');
        console.log('Archive: Set flag for cleanup to run on next page load');
        
        // Update interface
        this.render();
        this.showNotification(`Project "${project.name}" archived successfully`, 'success');
    }
    
    async restoreProject(archivedProjectId) {
        const userArchive = this.archivedProjects[this.currentUser] || [];
        const archivedProject = userArchive.find(p => p.originalId === archivedProjectId);
        
        if (!archivedProject) {
            this.showNotification('Archived project not found', 'error');
            return;
        }
        
        if (!confirm(`Are you sure you want to restore "${archivedProject.name}"?\n\nThis will move it back to your active projects list.`)) {
            return;
        }
        
        // Create restored project (keep original ID to avoid conflicts with cleanup)
        const restoredProject = {
            ...archivedProject,
            id: archivedProject.originalId, // Use original ID to maintain consistency
            restoredAt: new Date().toISOString(),
            restoredBy: this.currentUser
        };
        
        // Remove archive metadata
        delete restoredProject.archivedAt;
        delete restoredProject.archivedBy;
        delete restoredProject.originalId;
        delete restoredProject.restoredAt;
        delete restoredProject.restoredBy;
        
        // Add back to active projects
        this.projects.unshift(restoredProject);
        console.log(`Restore: Added project ${restoredProject.id} back to active projects. Total active: ${this.projects.length}`);
        
        // Remove from archive
        const originalArchiveCount = this.archivedProjects[this.currentUser].length;
        this.archivedProjects[this.currentUser] = userArchive.filter(p => p.originalId !== archivedProjectId);
        const newArchiveCount = this.archivedProjects[this.currentUser].length;
        console.log(`Restore: Removed from archive. Archive count: ${originalArchiveCount} → ${newArchiveCount}`);
        
        // Ensure the current user's archive is properly tracked even if empty
        if (!this.archivedProjects[this.currentUser]) {
            this.archivedProjects[this.currentUser] = [];
        }
        
        // Save both
        await this.saveProjects();
        await this.saveArchivedProjects();
        
        console.log(`Restore: Saved to cloud. Active projects: ${this.projects.length}, Archived projects: ${this.archivedProjects[this.currentUser]?.length || 0}`);
        
        // Set flag to indicate recent archive operation for cleanup
        localStorage.setItem('recent_archive_operation', 'true');
        console.log('Restore: Set flag for cleanup to run on next page load');
        
        // Update interface
        this.render();
        this.showNotification(`Project "${archivedProject.name}" restored successfully`, 'success');
    }
    
    async deleteArchivedProject(projectId) {
        const userArchive = this.archivedProjects[this.currentUser] || [];
        const projectIndex = userArchive.findIndex(p => p.originalId === projectId);
        
        if (projectIndex === -1) {
            this.showNotification('Archived project not found', 'error');
            return;
        }
        
        const project = userArchive[projectIndex];
        
        // Confirm deletion
        if (!confirm(`Are you sure you want to permanently delete "${project.name}"?\n\nThis action cannot be undone and will remove:\n- All project data\n- All project notes\n- All project history\n\nClick OK to permanently delete, or Cancel to keep the project.`)) {
            return;
        }
        
        // Remove from archived projects
        this.archivedProjects[this.currentUser].splice(projectIndex, 1);
        console.log(`Delete: Removed project ${projectId} from archive. Remaining archived: ${this.archivedProjects[this.currentUser].length}`);
        
        // Remove project notes for this project
        if (this.projectNotes[projectId]) {
            delete this.projectNotes[projectId];
            await this.saveProjectNotes();
            console.log(`Delete: Removed notes for project ${projectId}`);
        }
        
        // CRITICAL: Ensure this project ID is completely removed from active projects
        const activeProjectsBefore = this.projects.length;
        this.projects = this.projects.filter(p => p.id !== projectId);
        const activeProjectsAfter = this.projects.length;
        if (activeProjectsBefore !== activeProjectsAfter) {
            console.log(`Delete: Also removed ${activeProjectsBefore - activeProjectsAfter} active projects with same ID ${projectId}`);
        } else {
            console.log(`Delete: No active projects found with ID ${projectId} (this is expected for archive-only deletion)`);
        }
        
        // Save changes
        console.log(`Delete: About to save archives. Current user ${this.currentUser} has ${this.archivedProjects[this.currentUser]?.length || 0} archived projects`);
        await this.saveArchivedProjects();
        
        // ALWAYS save active projects to ensure the deletion is synced to cloud
        await this.saveProjects();
        console.log(`Delete: Force-saved active projects to cloud to ensure project ${projectId} is removed`);
        
        console.log(`Delete: Final state - Active: ${this.projects.length}, Archived: ${this.archivedProjects[this.currentUser].length}`);
        
        // Force immediate cloud storage update for current user's archive
        if (this.cloudStorage.isConnected) {
            try {
                const currentUserProjects = this.archivedProjects[this.currentUser] || [];
                
                if (currentUserProjects.length === 0) {
                    // If no projects left, completely DELETE the cloud storage document
                    await this.cloudStorage.deleteFromCloud(`archived_projects_${this.currentUser}`, this.currentUser);
                    console.log(`Delete: COMPLETELY REMOVED cloud storage document for ${this.currentUser}`);
                } else {
                    // Save normal archive data
                    const archiveData = {
                        [this.currentUser]: {
                            userId: this.currentUser,
                            projects: currentUserProjects,
                            lastUpdated: new Date().toISOString()
                        }
                    };
                    await this.cloudStorage.saveToCloud(`archived_projects_${this.currentUser}`, archiveData);
                    console.log(`Delete: Force-saved archive to cloud: ${currentUserProjects.length} projects`);
                }
            } catch (error) {
                console.error('Delete: Failed to update cloud storage:', error);
            }
        }
        
        // Update the main interface to reflect changes
        this.render();
        
        // Refresh archive modal if open
        const archiveModal = document.getElementById('archiveModal');
        if (archiveModal && archiveModal.style.display !== 'none') {
            this.showUserArchive();
        }
        
        this.showNotification(`Project "${project.name}" permanently deleted`, 'success');
    }

    // ========================================
    // COMPREHENSIVE SYSTEM TEST
    // ========================================
    
    runSystemTest() {
        console.log('🧪 RUNNING COMPREHENSIVE SYSTEM TEST...');
        
        const testResults = {
            coreData: this.testCoreDataIntegrity(),
            userManagement: this.testUserManagement(),
            projectManagement: this.testProjectManagement(),
            archiveSystem: this.testArchiveSystem(),
            notesSystem: this.testNotesSystem(),
            cloudStorage: this.testCloudStorageConnection(),
            security: this.testSecurityFeatures()
        };
        
        console.log('🎯 SYSTEM TEST RESULTS:', testResults);
        
        const passedTests = Object.values(testResults).filter(result => result.status === 'PASS').length;
        const totalTests = Object.keys(testResults).length;
        
        console.log(`📊 OVERALL SCORE: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            console.log('🎉 ALL TESTS PASSED - SYSTEM READY FOR LAUNCH!');
        } else {
            console.log('⚠️ SOME TESTS FAILED - REVIEW REQUIRED');
        }
        
        return testResults;
    }
    
    async cleanupOrphanedNotes() {
        console.log('🧹 Cleaning up orphaned notes...');
        
        let cleanedCount = 0;
        const validProjectIds = new Set();
        
        // Collect all valid project IDs (active projects)
        if (Array.isArray(this.projects)) {
            this.projects.forEach(p => {
                if (p && p.id) {
                    validProjectIds.add(p.id);
                }
            });
        }
        
        // Collect all valid archived project IDs
        if (this.archivedProjects && typeof this.archivedProjects === 'object') {
            Object.values(this.archivedProjects).forEach(userArchive => {
                if (Array.isArray(userArchive)) {
                    userArchive.forEach(p => {
                        if (p && p.originalId) {
                            validProjectIds.add(p.originalId);
                        }
                    });
                }
            });
        }
        
        // Remove notes for non-existent projects
        if (this.projectNotes && typeof this.projectNotes === 'object') {
            Object.keys(this.projectNotes).forEach(projectId => {
                const numericId = Number(projectId);
                if (!validProjectIds.has(numericId)) {
                    console.log(`Removing orphaned notes for project ${projectId}`);
                    delete this.projectNotes[projectId];
                    cleanedCount++;
                }
            });
        }
        
        if (cleanedCount > 0) {
            await this.saveProjectNotes();
            console.log(`✅ Cleaned up ${cleanedCount} orphaned note collections`);
        } else {
            console.log('✅ No orphaned notes found');
        }
        
        return cleanedCount;
    }
    
    clearUnnecessaryLocalStorage() {
        console.log('🧹 CLEARING UNNECESSARY LOCAL STORAGE FOR MULTI-USER SAFETY...');
        
        // Keep only essential session data, remove user-specific data that could cause conflicts
        const itemsToKeep = [
            'last_cleanup_timestamp',
            'recent_archive_operation'
        ];
        
        const itemsToRemove = [
            'safetrack_projects',           // Should be cloud-only
            'safetrack_users',             // Should be cloud-only  
            'safetrack_current_user',      // Should be session-only
            'safetrack_project_notes',     // Should be cloud-only
            'safetrack_user_notifications', // Should be cloud-only
            'safetrack_archived_projects', // Should be cloud-only
            'safetrack_categories',        // Should be cloud-only
            'safetrack_roles',            // Should be cloud-only
            'safetrack_departments',      // Should be cloud-only
            'safetrack_compliance',       // Should be cloud-only
            'safetrack_certifications',   // Should be cloud-only
            'safetrack_custom_quotes',    // Should be cloud-only
            'safetrack_favorite_quotes',  // Should be cloud-only
            'safetrack_user_interacted',  // Should be cloud-only
            'safetrack_project_view_mode' // Should be session-only
        ];
        
        let removedCount = 0;
        itemsToRemove.forEach(item => {
            if (localStorage.getItem(item)) {
                localStorage.removeItem(item);
                removedCount++;
                console.log(`Removed local storage: ${item}`);
            }
        });
        
        console.log(`✅ Cleared ${removedCount} local storage items to prevent multi-user conflicts`);
        return removedCount;
    }
    
    async runFullSystemCheck() {
        console.log('🔧 RUNNING FULL SYSTEM CHECK WITH CLEANUP...');
        
        // First, clean up any orphaned notes
        await this.cleanupOrphanedNotes();
        
        // Clear unnecessary local storage for multi-user safety
        this.clearUnnecessaryLocalStorage();
        
        // Then run the comprehensive system test
        const testResults = this.runSystemTest();
        
        return testResults;
    }
    
    testCoreDataIntegrity() {
        try {
            const issues = [];
            
            // Check if core arrays exist and are valid
            if (!Array.isArray(this.projects)) issues.push('Projects array invalid');
            if (!Array.isArray(this.users)) issues.push('Users array invalid');
            if (!Array.isArray(this.categories)) issues.push('Categories array invalid');
            if (!this.currentUser) issues.push('No current user set');
            
            // Check for duplicate project IDs
            const projectIds = this.projects.map(p => p.id);
            const uniqueIds = new Set(projectIds);
            if (projectIds.length !== uniqueIds.size) issues.push('Duplicate project IDs found');
            
            return {
                status: issues.length === 0 ? 'PASS' : 'FAIL',
                issues: issues,
                data: {
                    projects: this.projects.length,
                    users: this.users.length,
                    categories: this.categories.length,
                    currentUser: this.currentUser
                }
            };
        } catch (error) {
            return { status: 'ERROR', error: error.message };
        }
    }
    
    testUserManagement() {
        try {
            const issues = [];
            
            // Check if current user exists in users array
            const currentUserExists = this.users.find(u => u.id === this.currentUser);
            if (!currentUserExists) issues.push('Current user not found in users array');
            
            // Check for duplicate user IDs
            const userIds = this.users.map(u => u.id);
            const uniqueUserIds = new Set(userIds);
            if (userIds.length !== uniqueUserIds.size) issues.push('Duplicate user IDs found');
            
            // Check if all users have required fields
            this.users.forEach(user => {
                if (!user.id) issues.push(`User missing ID: ${user.name}`);
                if (!user.name) issues.push(`User missing name: ${user.id}`);
                if (!user.role) issues.push(`User missing role: ${user.name}`);
            });
            
            return {
                status: issues.length === 0 ? 'PASS' : 'FAIL',
                issues: issues,
                data: {
                    totalUsers: this.users.length,
                    currentUser: currentUserExists ? currentUserExists.name : 'NOT FOUND'
                }
            };
        } catch (error) {
            return { status: 'ERROR', error: error.message };
        }
    }
    
    testProjectManagement() {
        try {
            const issues = [];
            
            // Check if all projects have required fields
            this.projects.forEach(project => {
                if (!project.id) issues.push(`Project missing ID: ${project.name}`);
                if (!project.name) issues.push(`Project missing name: ID ${project.id}`);
                if (!project.createdBy) issues.push(`Project missing createdBy: ${project.name}`);
                if (!project.status) issues.push(`Project missing status: ${project.name}`);
                if (typeof project.progress !== 'number') issues.push(`Project invalid progress: ${project.name}`);
            });
            
            // Check project status distribution
            const statusCounts = {};
            this.projects.forEach(p => {
                statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
            });
            
            return {
                status: issues.length === 0 ? 'PASS' : 'FAIL',
                issues: issues,
                data: {
                    totalProjects: this.projects.length,
                    statusDistribution: statusCounts
                }
            };
        } catch (error) {
            return { status: 'ERROR', error: error.message };
        }
    }
    
    testArchiveSystem() {
        try {
            const issues = [];
            
            // Check archive structure
            if (typeof this.archivedProjects !== 'object') issues.push('Archived projects not an object');
            
            // Check for archived projects in active list
            const allArchivedIds = new Set();
            Object.values(this.archivedProjects).forEach(userArchive => {
                if (Array.isArray(userArchive)) {
                    userArchive.forEach(p => allArchivedIds.add(p.originalId));
                }
            });
            
            const activeIds = new Set(this.projects.map(p => p.id));
            const overlap = [...allArchivedIds].filter(id => activeIds.has(id));
            if (overlap.length > 0) issues.push(`Projects in both active and archived: ${overlap.join(', ')}`);
            
            return {
                status: issues.length === 0 ? 'PASS' : 'FAIL',
                issues: issues,
                data: {
                    totalArchived: Object.values(this.archivedProjects).reduce((sum, arr) => sum + (arr?.length || 0), 0),
                    usersWithArchives: Object.keys(this.archivedProjects).length,
                    overlappingProjects: overlap
                }
            };
        } catch (error) {
            return { status: 'ERROR', error: error.message };
        }
    }
    
    testNotesSystem() {
        try {
            const issues = [];
            
            // Check notes structure
            if (typeof this.projectNotes !== 'object') issues.push('Project notes not an object');
            
            // Check if notes reference valid projects
            Object.keys(this.projectNotes).forEach(projectId => {
                const numericId = Number(projectId);
                const projectExists = this.projects.find(p => p.id === numericId);
                const archivedExists = Object.values(this.archivedProjects).some(userArchive => 
                    userArchive?.find(p => p.originalId === numericId)
                );
                
                if (!projectExists && !archivedExists) {
                    issues.push(`Notes exist for non-existent project: ${projectId}`);
                }
            });
            
            return {
                status: issues.length === 0 ? 'PASS' : 'FAIL',
                issues: issues,
                data: {
                    totalProjectsWithNotes: Object.keys(this.projectNotes).length,
                    totalNotes: Object.values(this.projectNotes).reduce((sum, notes) => sum + (notes?.length || 0), 0)
                }
            };
        } catch (error) {
            return { status: 'ERROR', error: error.message };
        }
    }
    
    testCloudStorageConnection() {
        try {
            const issues = [];
            
            if (!this.cloudStorage) issues.push('Cloud storage not initialized');
            if (!this.cloudStorage.isConnected) issues.push('Not connected to cloud storage');
            
            return {
                status: issues.length === 0 ? 'PASS' : 'WARN',
                issues: issues,
                data: {
                    connected: this.cloudStorage?.isConnected || false,
                    hasCloudStorage: !!this.cloudStorage
                }
            };
        } catch (error) {
            return { status: 'ERROR', error: error.message };
        }
    }
    
    testSecurityFeatures() {
        try {
            const issues = [];
            
            // Check if XSS protection is in place
            if (typeof this.escapeHtml !== 'function') issues.push('XSS protection (escapeHtml) missing');
            
            // Check authentication state
            if (typeof this.isAuthenticated !== 'boolean') issues.push('Authentication state not properly set');
            
            return {
                status: issues.length === 0 ? 'PASS' : 'FAIL',
                issues: issues,
                data: {
                    authenticated: this.isAuthenticated,
                    hasXSSProtection: typeof this.escapeHtml === 'function'
                }
            };
        } catch (error) {
            return { status: 'ERROR', error: error.message };
        }
    }
    
    async cleanupArchivedProjectsFromActive() {
        // Get all archived project IDs across all users
        const archivedProjectIds = new Set();
        
        for (const userId in this.archivedProjects) {
            const userArchive = this.archivedProjects[userId] || [];
            userArchive.forEach(archivedProject => {
                if (archivedProject.originalId) {
                    archivedProjectIds.add(archivedProject.originalId);
                }
            });
        }
        
        // Remove any projects from active list that are in archived list
        const originalCount = this.projects.length;
        this.projects = this.projects.filter(project => !archivedProjectIds.has(project.id));
        const newCount = this.projects.length;
        
        if (originalCount !== newCount) {
            console.log(`Cleanup: Removed ${originalCount - newCount} archived projects from active list`);
            // Save the cleaned up active projects
            await this.saveProjects();
        }
    }
    
    async saveArchivedProjects() {
        // CLOUD FIRST: Only save to local storage if cloud fails
        // localStorage.setItem('safetrack_archived_projects', JSON.stringify(this.archivedProjects));
        
        // Save to cloud storage if connected
        if (this.cloudStorage.isConnected) {
            try {
                // Get all users who should have archive data saved (including current user)
                const usersToSave = new Set(Object.keys(this.archivedProjects));
                if (this.currentUser) {
                    usersToSave.add(this.currentUser);
                }
                
                // Save each user's archived projects separately to avoid array storage issues
                for (const userId of usersToSave) {
                    const projects = this.archivedProjects[userId] || [];
                    
                    if (projects.length === 0) {
                        // If no projects, DELETE the cloud storage document completely
                        await this.cloudStorage.deleteFromCloud(`archived_projects_${userId}`, userId);
                        console.log(`Deleted cloud storage document for ${userId}: no archived projects`);
                    } else {
                        // Save normal archive data
                        const archiveData = {
                            [userId]: {
                                userId: userId,
                                projects: projects,
                                lastUpdated: new Date().toISOString()
                            }
                        };
                        await this.cloudStorage.saveToCloud(`archived_projects_${userId}`, archiveData);
                        console.log(`Saved archive for ${userId}: ${projects.length} projects`, projects.map(p => ({id: p.originalId, name: p.name})));
                    }
                }
                console.log('Archived projects saved to cloud');
            } catch (error) {
                console.error('Failed to save archived projects to cloud:', error);
                // FALLBACK ONLY: Save to local storage if cloud fails
                localStorage.setItem('safetrack_archived_projects', JSON.stringify(this.archivedProjects));
                console.log('Fallback: Archived projects saved to local storage');
            }
        } else {
            // Only use local storage if not connected to cloud
            localStorage.setItem('safetrack_archived_projects', JSON.stringify(this.archivedProjects));
            console.log('No cloud connection: Archived projects saved to local storage');
        }
    }
    
    async loadArchivedProjects() {
        let archivedProjects = {};
        
        // Try to load from cloud first
        if (this.cloudStorage.isConnected) {
            try {
                // Load archived projects for all users
                const users = this.users || [];
                for (const user of users) {
                    try {
                        const userArchiveData = await this.cloudStorage.loadFromCloud(`archived_projects_${user.id}`);
                        if (userArchiveData && userArchiveData[user.id]) {
                            const archiveInfo = userArchiveData[user.id];
                            // Load projects regardless of count (including empty arrays)
                            archivedProjects[user.id] = archiveInfo.projects || [];
                            console.log(`Loaded archive for ${user.id}: ${archiveInfo.projects?.length || 0} projects${archiveInfo.isEmpty ? ' (explicitly empty)' : ''}`);
                        }
                    } catch (userError) {
                        // User might not have archived projects yet
                        console.log(`No archived projects found for user ${user.id}`);
                    }
                }
                
                if (Object.keys(archivedProjects).length > 0) {
                    console.log('Loaded archived projects from cloud');
                    return archivedProjects;
                }
            } catch (error) {
                console.error('Failed to load archived projects from cloud:', error);
            }
        }
        
        // Fallback to local storage
        const stored = localStorage.getItem('safetrack_archived_projects');
        return stored ? JSON.parse(stored) : {};
    }
    
    showUserArchive() {
        const userArchive = this.archivedProjects[this.currentUser] || [];
        
        if (userArchive.length === 0) {
            this.showNotification('No archived projects found', 'info');
            return;
        }
        
        // Create archive modal content
        const archiveHtml = userArchive.map(project => {
            // Handle multiple assigned users for archived projects
            const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
            const assignedUsersData = assignedUsers.map(userId => {
                const user = this.users.find(u => u.id === userId);
                return user ? { name: user.name, avatar: user.avatar, id: userId } : { name: 'Unknown', avatar: '?', id: userId };
            });
            
            return `
                <div class="archive-item border rounded p-3 mb-3" style="background: ${this.getUserColorMedium(project.createdBy)}; border-left: 4px solid ${this.getUserColor(project.createdBy)};">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="archive-content flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                                <div class="bg-${this.getCategoryColor(project.category)} text-white p-2 rounded me-3">
                                    <i class="fas ${this.getCategoryIcon(project.category)} small"></i>
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="mb-1 fw-bold">${this.escapeHtml(project.name)}</h6>
                                    <small class="text-muted">${this.escapeHtml(project.description || 'No description')}</small>
                                </div>
                                <div class="text-end">
                                    <span class="badge bg-success">Completed</span>
                                    <div class="small text-muted mt-1">${project.priority.toUpperCase()} Priority</div>
                                </div>
                            </div>
                            
                            <!-- Detailed Project Information -->
                            <div class="row g-2 mb-2">
                                <div class="col-md-6">
                                    <div class="small">
                                        <strong>📅 Timeline:</strong><br>
                                        <span class="text-muted">Started: ${this.formatDate(project.startDate)}</span><br>
                                        <span class="text-muted">Due: ${project.dueDate ? this.formatDate(project.dueDate) : 'No deadline'}</span><br>
                                        <span class="text-success">Completed: ${this.formatDate(project.completionDate)}</span>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="small">
                                        <strong>👥 Team:</strong><br>
                                        <div class="d-flex flex-wrap gap-1 mt-1">
                                            ${assignedUsersData.map(user => `
                                                <div class="d-flex align-items-center me-2">
                                                    <div class="user-avatar-small me-1" style="background: ${this.getUserColor(user.id)};">
                                                        ${user.avatar}
                                                    </div>
                                                    <span class="text-muted small">${user.name}</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="d-flex gap-3 text-muted small">
                                <span><i class="fas fa-archive me-1"></i>Archived: ${this.formatDate(project.archivedAt)}</span>
                                <span><i class="fas fa-chart-line me-1"></i>Progress: ${project.progress}%</span>
                                <span><i class="fas fa-folder me-1"></i>Category: ${project.category}</span>
                            </div>
                        </div>
                        <div class="archive-actions ms-3 d-flex flex-column gap-1">
                            <button class="btn btn-sm btn-outline-info" onclick="viewArchivedProjectDetails(${project.originalId})" title="View full project details">
                                <i class="fas fa-eye me-1"></i>Details
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="openProjectNotes(${project.originalId})" title="View/add project notes">
                                <i class="fas fa-sticky-note me-1"></i>Notes
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="openDeveloperNotes(${project.originalId})" title="View/add developer notes">
                                <i class="fas fa-code me-1"></i>Dev Notes
                            </button>
                            <button class="btn btn-sm btn-outline-primary" onclick="restoreProject(${project.originalId})" title="Restore to active projects">
                                <i class="fas fa-undo me-1"></i>Restore
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteArchivedProject(${project.originalId})" title="Permanently delete archived project">
                                <i class="fas fa-trash me-1"></i>Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.showArchiveModal(archiveHtml);
    }
    
    showArchiveModal(content) {
        const userArchive = this.archivedProjects[this.currentUser] || [];
        const archiveCount = userArchive.length;
        
        const modalHtml = `
            <div class="modal fade" id="archiveModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-archive me-2"></i>My Archived Projects (${archiveCount})
                            </h5>
                            <div class="d-flex gap-2">
                                <!-- Archive Export Options -->
                                <div class="dropdown">
                                    <button class="btn btn-outline-success btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                        <i class="fas fa-download me-1"></i>Export Archive
                                    </button>
                                    <ul class="dropdown-menu">
                                        <li><a class="dropdown-item" href="#" onclick="exportArchiveToExcel()">
                                            <i class="fas fa-file-excel me-2 text-success"></i>Excel
                                        </a></li>
                                        <li><a class="dropdown-item" href="#" onclick="exportArchiveToPDF()">
                                            <i class="fas fa-file-pdf me-2 text-danger"></i>PDF
                                        </a></li>
                                        <li><a class="dropdown-item" href="#" onclick="exportArchiveToCSV()">
                                            <i class="fas fa-file-csv me-2 text-info"></i>CSV
                                        </a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item" href="#" onclick="printArchive()">
                                            <i class="fas fa-print me-2 text-secondary"></i>Print
                                        </a></li>
                                    </ul>
                                </div>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                        </div>
                        <div class="modal-body" style="max-height: 600px; overflow-y: auto;">
                            ${content}
                        </div>
                        <div class="modal-footer">
                            <div class="d-flex justify-content-between w-100">
                                <div class="text-muted small">
                                    <i class="fas fa-info-circle me-1"></i>
                                    Archived projects preserve all data including notes and screenshots
                                </div>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('archiveModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('archiveModal'));
        modal.show();
        
        // Clean up modal after it's hidden
        document.getElementById('archiveModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }
    
    async viewArchivedProjectDetails(projectId) {
        // Close archive modal first for better UX
        const existingArchiveModal = document.getElementById('archiveModal');
        if (existingArchiveModal) {
            const archiveModalInstance = bootstrap.Modal.getInstance(existingArchiveModal);
            if (archiveModalInstance) {
                archiveModalInstance.hide();
                // Small delay to ensure modal closing animation completes
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        const userArchive = this.archivedProjects[this.currentUser] || [];
        const project = userArchive.find(p => p.originalId === projectId);
        
        if (!project) {
            this.showNotification('Archived project not found', 'error');
            return;
        }
        
        // Handle multiple assigned users
        const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
        const assignedUsersData = assignedUsers.map(userId => {
            const user = this.users.find(u => u.id === userId);
            return user ? user.name : 'Unknown';
        });
        
        const creator = this.users.find(u => u.id === project.createdBy);
        const creatorName = creator ? creator.name : 'Unknown';
        
        const detailsHtml = `
            <div class="modal fade" id="projectDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header" style="background: ${this.getUserColorLight(project.createdBy)};">
                            <h5 class="modal-title">
                                <i class="fas fa-folder-open me-2"></i>${this.escapeHtml(project.name)}
                                <span class="badge bg-success ms-2">Archived</span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row g-4">
                                <div class="col-md-6">
                                    <h6><i class="fas fa-info-circle me-2"></i>Project Information</h6>
                                    <table class="table table-sm">
                                        <tr><td><strong>Name:</strong></td><td>${this.escapeHtml(project.name)}</td></tr>
                                        <tr><td><strong>Description:</strong></td><td>${this.escapeHtml(project.description || 'No description')}</td></tr>
                                        <tr><td><strong>Category:</strong></td><td>${project.category}</td></tr>
                                        <tr><td><strong>Priority:</strong></td><td><span class="badge bg-${this.getPriorityColor(project.priority)}">${project.priority.toUpperCase()}</span></td></tr>
                                        <tr><td><strong>Status:</strong></td><td><span class="badge bg-success">Completed</span></td></tr>
                                        <tr><td><strong>Progress:</strong></td><td>${project.progress}%</td></tr>
                                    </table>
                                </div>
                                <div class="col-md-6">
                                    <h6><i class="fas fa-calendar me-2"></i>Timeline</h6>
                                    <table class="table table-sm">
                                        <tr><td><strong>Start Date:</strong></td><td>${this.formatDate(project.startDate)}</td></tr>
                                        <tr><td><strong>Due Date:</strong></td><td>${project.dueDate ? this.formatDate(project.dueDate) : 'No deadline'}</td></tr>
                                        <tr><td><strong>Completed:</strong></td><td class="text-success">${this.formatDate(project.completionDate)}</td></tr>
                                        <tr><td><strong>Archived:</strong></td><td>${this.formatDate(project.archivedAt)}</td></tr>
                                    </table>
                                    
                                    <h6 class="mt-3"><i class="fas fa-users me-2"></i>Team Members</h6>
                                    <div class="mb-2">
                                        <strong>Created by:</strong> <span class="badge bg-primary">${creatorName}</span>
                                    </div>
                                    <div>
                                        <strong>Assigned to:</strong><br>
                                        <div class="d-flex flex-wrap gap-1 mt-1">
                                            ${assignedUsersData.map(name => `
                                                <span class="badge bg-secondary">${name}</span>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline-secondary" onclick="openProjectNotes(${project.originalId})">
                                <i class="fas fa-sticky-note me-1"></i>View/Add Notes
                            </button>
                            <button class="btn btn-outline-info" onclick="openDeveloperNotes(${project.originalId})">
                                <i class="fas fa-code me-1"></i>Developer Notes
                            </button>
                            <button class="btn btn-outline-primary" onclick="restoreProject(${project.originalId})">
                                <i class="fas fa-undo me-1"></i>Restore Project
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('projectDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', detailsHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('projectDetailsModal'));
        modal.show();
        
        // Clean up modal after it's hidden
        document.getElementById('projectDetailsModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }
    
    // Archive export functions
    exportArchiveToExcel() {
        const userArchive = this.archivedProjects[this.currentUser] || [];
        if (userArchive.length === 0) {
            this.showNotification('No archived projects to export', 'warning');
            return;
        }
        
        const exportData = userArchive.map(project => {
            const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
            const assignedNames = assignedUsers.map(userId => {
                const user = this.users.find(u => u.id === userId);
                return user ? user.name : 'Unknown';
            }).join(', ');
            
            const createdBy = this.users.find(u => u.id === project.createdBy);
            
            return {
                'Project Name': project.name,
                'Description': project.description || '',
                'Category': project.category,
                'Priority': project.priority.toUpperCase(),
                'Status': 'COMPLETED (ARCHIVED)',
                'Progress': `${project.progress}%`,
                'Assigned To': assignedNames,
                'Created By': createdBy ? createdBy.name : 'Unknown',
                'Start Date': project.startDate ? new Date(project.startDate).toLocaleDateString() : '',
                'Due Date': project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No deadline',
                'Completion Date': project.completionDate ? new Date(project.completionDate).toLocaleDateString() : '',
                'Archive Date': project.archivedAt ? new Date(project.archivedAt).toLocaleDateString() : ''
            };
        });
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Archived Projects");
        
        const fileName = `SafeTrack_Archived_Projects_${this.currentUser}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        this.showNotification('Archived projects exported to Excel successfully!', 'success');
    }
    
    exportArchiveToPDF() {
        const userArchive = this.archivedProjects[this.currentUser] || [];
        if (userArchive.length === 0) {
            this.showNotification('No archived projects to export', 'warning');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(20);
        doc.text('SafeTrack - Archived Projects', 20, 20);
        
        const currentUserData = this.users.find(u => u.id === this.currentUser);
        const userName = currentUserData ? currentUserData.name : this.currentUser;
        
        doc.setFontSize(12);
        doc.text(`User: ${userName}`, 20, 35);
        doc.text(`Export Date: ${new Date().toLocaleDateString()}`, 20, 45);
        doc.text(`Total Archived Projects: ${userArchive.length}`, 20, 55);
        
        // Prepare data for table
        const tableData = userArchive.map(project => {
            const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
            const assignedNames = assignedUsers.map(userId => {
                const user = this.users.find(u => u.id === userId);
                return user ? user.name : 'Unknown';
            }).join(', ');
            
            return [
                project.name,
                project.category,
                project.priority.toUpperCase(),
                assignedNames,
                project.completionDate ? new Date(project.completionDate).toLocaleDateString() : '',
                project.archivedAt ? new Date(project.archivedAt).toLocaleDateString() : ''
            ];
        });
        
        // Add table
        doc.autoTable({
            head: [['Project Name', 'Category', 'Priority', 'Assigned To', 'Completed', 'Archived']],
            body: tableData,
            startY: 65,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [220, 53, 69] }
        });
        
        const fileName = `SafeTrack_Archived_Projects_${this.currentUser}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        this.showNotification('Archived projects exported to PDF successfully!', 'success');
    }
    
    exportArchiveToCSV() {
        const userArchive = this.archivedProjects[this.currentUser] || [];
        if (userArchive.length === 0) {
            this.showNotification('No archived projects to export', 'warning');
            return;
        }
        
        const exportData = userArchive.map(project => {
            const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
            const assignedNames = assignedUsers.map(userId => {
                const user = this.users.find(u => u.id === userId);
                return user ? user.name : 'Unknown';
            }).join(', ');
            
            const createdBy = this.users.find(u => u.id === project.createdBy);
            
            return {
                'Project Name': project.name,
                'Description': project.description || '',
                'Category': project.category,
                'Priority': project.priority.toUpperCase(),
                'Status': 'COMPLETED (ARCHIVED)',
                'Progress': `${project.progress}%`,
                'Assigned To': assignedNames,
                'Created By': createdBy ? createdBy.name : 'Unknown',
                'Start Date': project.startDate ? new Date(project.startDate).toLocaleDateString() : '',
                'Due Date': project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No deadline',
                'Completion Date': project.completionDate ? new Date(project.completionDate).toLocaleDateString() : '',
                'Archive Date': project.archivedAt ? new Date(project.archivedAt).toLocaleDateString() : ''
            };
        });
        
        const ws = XLSX.utils.json_to_sheet(exportData);
        const csv = XLSX.utils.sheet_to_csv(ws);
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `SafeTrack_Archived_Projects_${this.currentUser}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('Archived projects exported to CSV successfully!', 'success');
    }
    
    printArchive() {
        const userArchive = this.archivedProjects[this.currentUser] || [];
        if (userArchive.length === 0) {
            this.showNotification('No archived projects to print', 'warning');
            return;
        }
        
        const currentUserData = this.users.find(u => u.id === this.currentUser);
        const userName = currentUserData ? currentUserData.name : this.currentUser;
        
        const printContent = `
            <html>
            <head>
                <title>SafeTrack - Archived Projects</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { border-bottom: 2px solid #dc3545; padding-bottom: 10px; margin-bottom: 20px; }
                    .project-item { border: 1px solid #ddd; margin-bottom: 15px; padding: 15px; border-radius: 5px; }
                    .project-header { background: #f8f9fa; padding: 10px; margin: -15px -15px 10px -15px; border-radius: 5px 5px 0 0; }
                    .badge { background: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; }
                    .text-muted { color: #6c757d; }
                    .small { font-size: 0.9em; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>SafeTrack - Archived Projects</h1>
                    <p><strong>User:</strong> ${userName} | <strong>Export Date:</strong> ${new Date().toLocaleDateString()} | <strong>Total Projects:</strong> ${userArchive.length}</p>
                </div>
                
                ${userArchive.map(project => {
                    const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
                    const assignedNames = assignedUsers.map(userId => {
                        const user = this.users.find(u => u.id === userId);
                        return user ? user.name : 'Unknown';
                    }).join(', ');
                    
                    return `
                        <div class="project-item">
                            <div class="project-header">
                                <h3>${project.name} <span class="badge">COMPLETED</span></h3>
                            </div>
                            <p><strong>Description:</strong> ${project.description || 'No description'}</p>
                            <div class="row">
                                <div class="col">
                                    <p><strong>Category:</strong> ${project.category}</p>
                                    <p><strong>Priority:</strong> ${project.priority.toUpperCase()}</p>
                                    <p><strong>Progress:</strong> ${project.progress}%</p>
                                </div>
                                <div class="col">
                                    <p><strong>Start Date:</strong> ${this.formatDate(project.startDate)}</p>
                                    <p><strong>Due Date:</strong> ${project.dueDate ? this.formatDate(project.dueDate) : 'No deadline'}</p>
                                    <p><strong>Completed:</strong> ${this.formatDate(project.completionDate)}</p>
                                    <p><strong>Archived:</strong> ${this.formatDate(project.archivedAt)}</p>
                                </div>
                            </div>
                            <p><strong>Assigned Team Members:</strong> ${assignedNames}</p>
                        </div>
                    `;
                }).join('')}
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    }

    render() {
        this.renderDashboardStats();
        this.renderRecentProjects();
        this.renderProjectTable();
        this.populateUserDropdowns(); // Update user dropdowns when rendering
    }

    renderDashboardStats() {
        // Start with only active projects (filter out archived ones)
        let projectsToCount = this.projects.filter(p => !p.isArchived && p.status !== 'archived');
        
        // Filter by current user if not viewing all team projects
        if (this.projectViewMode === 'personal') {
            projectsToCount = projectsToCount.filter(p => {
                const assignedUsers = Array.isArray(p.assignedTo) ? p.assignedTo : [p.assignedTo].filter(Boolean);
                return p.createdBy === this.currentUser || assignedUsers.includes(this.currentUser);
            });
        } else if (this.projectViewMode !== 'all') {
            // Individual user view - filter for specific user
            projectsToCount = projectsToCount.filter(p => {
                const assignedUsers = Array.isArray(p.assignedTo) ? p.assignedTo : [p.assignedTo].filter(Boolean);
                return p.createdBy === this.projectViewMode || assignedUsers.includes(this.projectViewMode);
            });
        }
        
        const activeProjects = projectsToCount.filter(p => p.status === 'active').length;
        const atRisk = projectsToCount.filter(p => p.status === 'active' && this.isProjectAtRisk(p)).length;
        const overdue = projectsToCount.filter(p => this.isProjectOverdue(p)).length;
        const teamMembers = this.users.length;

        document.getElementById('activeProjects').textContent = activeProjects;
        document.getElementById('atRiskProjects').textContent = atRisk;
        document.getElementById('teamMembers').textContent = teamMembers;
        document.getElementById('overdueProjects').textContent = overdue;
    }

    renderRecentProjects() {
        const container = document.getElementById('recentProjectsList');
        let recentProjects = this.projects;
        
        // Filter by current user if not viewing all projects
        if (this.currentUser !== 'all') {
            recentProjects = recentProjects.filter(p => p.createdBy === this.currentUser);
        }
        
        recentProjects = recentProjects.slice(0, 5);

        if (recentProjects.length === 0) {
            container.innerHTML = '<p class="text-muted text-center py-4">No safety projects yet. <button onclick="openProjectModal()" class="btn btn-link p-0">Create your first safety project</button></p>';
            return;
        }

        container.innerHTML = recentProjects.map(project => `
            <div class="d-flex justify-content-between align-items-center p-3 bg-light rounded mb-2 fade-in">
                <div class="d-flex align-items-center">
                    <div class="bg-${this.getCategoryColor(project.category)} text-white p-2 rounded me-3">
                        <i class="fas ${this.getCategoryIcon(project.category)}"></i>
                    </div>
                    <div>
                        <h6 class="mb-1 fw-bold">${this.escapeHtml(project.name)}</h6>
                        <small class="text-muted">Due: ${this.formatDate(project.dueDate)}</small>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="status-badge ${this.getEnhancedStatusClass(project)}" role="status" aria-label="Project status: ${this.getStatusDisplayText(project.status)}">
                        <span class="status-icon ${this.getStatusIconClass(project)}" aria-hidden="true"></span>
                        ${this.getStatusDisplayText(project.status)}
                    </span>
                    <span class="text-muted small">${project.progress}%</span>
                    <button onclick="projectManager.editProjectModal(${project.id})" class="btn btn-sm btn-outline-primary">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderProjectTable(projectsToRender = null) {
        const tbody = document.getElementById('projectTableBody');
        
        // If no specific projects provided, filter based on view mode
        let projects = projectsToRender;
        if (!projects) {
            // First, ensure we only work with active projects (filter out any archived ones)
            const activeProjects = this.projects.filter(p => !p.isArchived && p.status !== 'archived');
            
            if (this.projectViewMode === 'all') {
                // Show all active projects (read-only view for non-owners)
                projects = activeProjects;
            } else if (this.projectViewMode === 'personal') {
                // Show only active projects created by or assigned to current user
                projects = activeProjects.filter(project => {
                    const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
                    return project.createdBy === this.currentUser || assignedUsers.includes(this.currentUser);
                });
            } else {
                // Individual user view - show active projects created by or assigned to specific user
                projects = activeProjects.filter(project => {
                    const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
                    return project.createdBy === this.projectViewMode || assignedUsers.includes(this.projectViewMode);
                });
            }
        } else {
            // Even when projects are provided, filter out archived ones
            projects = projects.filter(p => !p.isArchived && p.status !== 'archived');
        }
        
        // Update table title based on current user
        this.updateProjectTableTitle();
        
        if (projects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">No safety projects found. <button onclick="openProjectModal()" class="btn btn-link p-0">Create your first safety project</button></td></tr>';
            return;
        }

        // Update the color legend
        this.renderUserColorLegend();
        
        tbody.innerHTML = projects.map(project => {
            const creator = this.users.find(u => u.id === project.createdBy);
            const creatorName = creator ? creator.name : 'Unknown';
            const creatorAvatar = creator ? creator.avatar : '?';
            
            // Handle multiple assigned users
            const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
            const assignedUsersData = assignedUsers.map(userId => {
                const user = this.users.find(u => u.id === userId);
                return user ? { name: user.name, avatar: user.avatar, id: userId } : { name: 'Unknown', avatar: '?', id: userId };
            });
            
            const screenshotCount = project.screenshots ? project.screenshots.length : 0;
            const screenshotThumbnails = project.screenshots ? project.screenshots.slice(0, 3).map(screenshot => 
                `<img src="${screenshot.data}" class="screenshot-thumbnail" alt="${screenshot.name}" 
                      onclick="projectManager.showScreenshots(${project.id})" title="${screenshot.name}">`
            ).join('') : '';
            
            return `
            <tr class="fade-in project-row-user-colored" style="background: ${this.getUserColorMedium(project.createdBy)} !important; border-left: 5px solid ${this.getUserColor(project.createdBy)}; box-shadow: inset 0 0 0 1px ${this.getUserColorLight(project.createdBy)};">
                <td style="background: ${this.getUserColorMedium(project.createdBy)} !important;">
                    <div class="d-flex align-items-center">
                        <div class="category-icon bg-${this.getCategoryColor(project.category)} text-white">
                            <i class="fas ${this.getCategoryIcon(project.category)}"></i>
                        </div>
                        <div>
                            <div class="fw-bold">${this.escapeHtml(project.name)}</div>
                            <small class="text-muted">${this.renderProjectDescription(project.id, project.description)}</small>
                        </div>
                    </div>
                </td>
                <td style="background: ${this.getUserColorMedium(project.createdBy)} !important;">
                    <div class="d-flex align-items-center">
                        <span class="status-badge ${this.getEnhancedStatusClass(project)}" role="status" aria-label="Project status: ${this.getStatusDisplayText(project.status)}" ${this.canUserEditProject(project) ? `style="cursor: pointer;" onclick="projectManager.openStatusModal(${project.id})" title="Click to change status"` : ''}>
                            <span class="status-icon ${this.getStatusIconClass(project)}" aria-hidden="true"></span>
                            ${this.getStatusDisplayText(project.status).toUpperCase()}
                        </span>
                    </div>
                </td>
                <td style="background: ${this.getUserColorMedium(project.createdBy)} !important;">
                    <div class="d-flex align-items-center">
                        <div class="progress-enhanced me-2 progress-clickable" style="width: 120px; cursor: pointer;" 
                             onclick="projectManager.openProgressModal(${project.id})" title="Click to update progress"
                             role="progressbar" aria-valuenow="${project.progress}" aria-valuemin="0" aria-valuemax="100"
                             aria-label="Project progress: ${project.progress}%">
                            <div class="progress-bar-enhanced" style="width: ${project.progress}%"></div>
                        </div>
                        <div class="d-flex flex-column">
                            <span class="text-muted small fw-bold">${project.progress}%</span>
                            <span class="progress-status text-${this.getProgressColor(project.progress)}">${this.getProgressStatus(project.progress)}</span>
                        </div>
                    </div>
                </td>
                <td class="text-muted" style="background: ${this.getUserColorMedium(project.createdBy)} !important;">${this.formatDate(project.startDate)}</td>
                <td class="text-muted" style="background: ${this.getUserColorMedium(project.createdBy)} !important;">${project.dueDate ? this.formatDate(project.dueDate) : '<span class="text-muted">No deadline</span>'}</td>
                <td class="text-muted" style="background: ${this.getUserColorMedium(project.createdBy)} !important;">${project.completionDate ? this.formatDate(project.completionDate) : '<span class="text-muted">—</span>'}</td>
                <td style="background: ${this.getUserColorMedium(project.createdBy)} !important;">
                    <div class="assigned-users-display">
                        ${assignedUsersData.length > 0 ? `
                            <div class="d-flex flex-wrap gap-1 mb-1">
                                ${assignedUsersData.slice(0, 3).map(user => `
                                    <div class="user-avatar-small" style="background: ${this.getUserColor(user.id)};" title="${user.name}">
                                        ${user.avatar}
                                    </div>
                                `).join('')}
                                ${assignedUsersData.length > 3 ? `<span class="badge bg-secondary">+${assignedUsersData.length - 3}</span>` : ''}
                            </div>
                            <div class="assigned-users-names">
                                <small class="text-muted">${assignedUsersData.map(u => u.name).join(', ')}</small>
                            </div>
                        ` : `
                            <small class="text-muted">Unassigned</small>
                        `}
                        <div class="mt-1">
                            <small class="text-muted" style="font-size: 0.75rem;">by ${creatorName}</small>
                        </div>
                    </div>
                </td>
                <td style="background: ${this.getUserColorMedium(project.createdBy)} !important;">
                    ${screenshotCount > 0 ? `
                        <div class="screenshot-gallery">
                            ${screenshotThumbnails}
                            ${screenshotCount > 3 ? `<span class="badge bg-secondary ms-1">+${screenshotCount - 3}</span>` : ''}
                        </div>
                    ` : '<span class="text-muted small">No screenshots</span>'}
                </td>
                <td style="background: ${this.getUserColorMedium(project.createdBy)} !important;">
                    ${this.canUserEditProject(project) ? `
                        <div class="d-flex flex-wrap gap-1">
                            <button onclick="projectManager.changeProjectStatus(${project.id}, 'active')" 
                                    class="status-change-btn active" title="Set to Active">
                                <i class="fas fa-play"></i>
                            </button>
                            <button onclick="projectManager.changeProjectStatus(${project.id}, 'on-hold')" 
                                    class="status-change-btn on-hold" title="Set to On Hold">
                                <i class="fas fa-pause"></i>
                            </button>
                            <button onclick="projectManager.changeProjectStatus(${project.id}, 'completed')" 
                                    class="status-change-btn completed" title="Mark as Completed">
                                <i class="fas fa-check"></i>
                            </button>
                            <button onclick="projectManager.changeProjectStatus(${project.id}, 'cancelled')" 
                                    class="status-change-btn cancelled" title="Cancel Project">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    ` : `
                        <span class="text-muted small">View Only</span>
                    `}
                </td>
                <td style="background: ${this.getUserColorMedium(project.createdBy)} !important;">
                    ${this.canUserEditProject(project) ? `
                    <div class="btn-group btn-group-sm">
                            <button onclick="projectManager.editProjectModal(${project.id})" class="btn btn-action btn-outline-primary" title="Edit Project">
                            <i class="fas fa-edit"></i>
                        </button>
                            <button onclick="projectManager.openProgressModal(${project.id})" class="btn btn-action btn-outline-success" title="Update Progress">
                                <i class="fas fa-chart-line"></i>
                            </button>
                            <button onclick="projectManager.openProjectNotes(${project.id})" class="btn btn-outline-secondary" title="Project Notes">
                                <i class="fas fa-sticky-note"></i>
                            </button>
                            <button onclick="projectManager.showProjectDeveloperNotes(${project.id})" class="btn btn-outline-info" title="Developer Notes">
                                <i class="fas fa-code"></i>
                            </button>
                            ${screenshotCount > 0 ? `<button onclick="projectManager.showScreenshots(${project.id})" class="btn btn-outline-info" title="View Screenshots">
                                <i class="fas fa-images"></i>
                            </button>` : ''}
                            ${project.status === 'completed' ? `<button onclick="projectManager.archiveProject(${project.id})" class="btn btn-outline-warning" title="Archive Completed Project">
                                <i class="fas fa-archive"></i>
                            </button>` : ''}
                            <button onclick="projectManager.deleteProject(${project.id})" class="btn btn-outline-danger" title="Delete Project">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    ` : `
                        <div class="btn-group btn-group-sm">
                            <button onclick="projectManager.openProjectNotes(${project.id})" class="btn btn-outline-secondary" title="Project Notes">
                                <i class="fas fa-sticky-note"></i>
                            </button>
                            <button onclick="projectManager.showProjectDeveloperNotes(${project.id})" class="btn btn-outline-info" title="Developer Notes">
                                <i class="fas fa-code"></i>
                            </button>
                            ${screenshotCount > 0 ? `<button onclick="projectManager.showScreenshots(${project.id})" class="btn btn-outline-info" title="View Screenshots">
                                <i class="fas fa-images"></i>
                            </button>` : ''}
                            <span class="text-muted small ms-2">View Only</span>
                        </div>
                    `}
                </td>
            </tr>
        `;
        }).join('');
    }

    canUserEditProject(project) {
        // Users can edit projects they created or are assigned to
        if (project.createdBy === this.currentUser) {
            return true;
        }
        
        // Check if user is in the assigned users array
        const assignedUsers = Array.isArray(project.assignedTo) ? project.assignedTo : [project.assignedTo].filter(Boolean);
        return assignedUsers.includes(this.currentUser);
    }

    editProjectModal(id) {
        const project = this.projects.find(p => p.id === id);
        if (!project) return;

        this.currentEditId = id;
        
        // Fill form with project data
        document.getElementById('projectName').value = project.name;
        document.getElementById('projectDescription').value = project.description || '';
        document.getElementById('projectPriority').value = project.priority;
        document.getElementById('projectCategory').value = project.category;
        document.getElementById('projectStartDate').value = project.startDate || '';
        document.getElementById('projectDueDate').value = project.dueDate || '';
        const completionDateField = document.getElementById('projectCompletionDate');
        completionDateField.value = project.completionDate || '';
        // Explicitly ensure the field is enabled and interactive
        completionDateField.removeAttribute('readonly');
        completionDateField.removeAttribute('disabled');
        completionDateField.style.pointerEvents = 'auto';
        document.getElementById('projectAssignedTo').value = project.assignedTo || '';
        document.getElementById('projectStatus').value = project.status || 'active';
        
        // Update modal title
        document.getElementById('modalTitle').textContent = 'Edit Safety Project';
        document.getElementById('submitText').textContent = 'Update Safety Project';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('projectModal'));
        modal.show();
    }

    // Helper methods
    getCategoryColor(category) {
        const colors = {
            safety: 'danger',
            compliance: 'primary',
            training: 'success',
            technology: 'info',
            operations: 'secondary',
            quality: 'warning',
            emergency: 'danger',
            incident: 'warning'
        };
        return colors[category] || 'secondary';
    }

    getPriorityColor(priority) {
        const colors = {
            'high': 'danger',
            'medium': 'warning',
            'low': 'success'
        };
        return colors[priority?.toLowerCase()] || 'secondary';
    }

    getCategoryIcon(category) {
        const icons = {
            safety: 'fa-shield-alt',
            compliance: 'fa-clipboard-check',
            training: 'fa-graduation-cap',
            technology: 'fa-laptop-code',
            operations: 'fa-cogs',
            quality: 'fa-award',
            emergency: 'fa-exclamation-triangle',
            incident: 'fa-exclamation-circle'
        };
        return icons[category] || 'fa-project-diagram';
    }

    getStatusColor(project) {
        if (project.status === 'completed') return 'success';
        if (this.isProjectOverdue(project)) return 'danger';
        if (this.isProjectAtRisk(project)) return 'warning';
        return 'primary';
    }

    getEnhancedStatusClass(project) {
        if (project.status === 'completed') return 'status-badge-completed';
        if (project.status === 'cancelled') return 'status-badge-cancelled';
        if (project.status === 'on-going') return 'status-badge-ongoing';
        if (this.isProjectOverdue(project)) return 'status-badge-overdue';
        if (this.isProjectAtRisk(project)) return 'status-badge-at-risk';
        if (project.status === 'on-hold') return 'status-badge-pending';
        return 'status-badge-active';
    }

    getStatusIconClass(project) {
        if (project.status === 'completed') return 'status-icon-active';
        if (project.status === 'on-going') return 'status-icon-ongoing';
        if (this.isProjectOverdue(project)) return 'status-icon-overdue';
        if (this.isProjectAtRisk(project)) return 'status-icon-at-risk';
        return 'status-icon-pending';
    }

    // Enhanced notification system for better user feedback
    showNotification(message, type = 'info', duration = 4000) {
        // Remove any existing notifications
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        // Create new notification
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        const icon = this.getNotificationIcon(type);
        toast.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="${icon} me-2" aria-hidden="true"></i>
                <span>${message}</span>
                <button type="button" class="btn-close ms-auto" aria-label="Close notification" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;

        document.body.appendChild(toast);

        // Auto-remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'fas fa-check-circle text-success',
            'warning': 'fas fa-exclamation-triangle text-warning', 
            'error': 'fas fa-exclamation-circle text-danger',
            'info': 'fas fa-info-circle text-info'
        };
        return icons[type] || icons.info;
    }

    getStatusText(project) {
        if (project.status === 'completed') return 'Safety Complete';
        if (this.isProjectOverdue(project)) return 'Safety Overdue';
        if (this.isProjectAtRisk(project)) return 'Safety Risk';
        return 'Safety On Track';
    }

    getStatusDisplayText(status) {
        const statusMap = {
            'active': 'Active',
            'on-going': 'On Going',
            'on-hold': 'On Hold',
            'completed': 'Complete',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status;
    }

    getProgressColor(progress) {
        if (progress >= 80) return 'success';
        if (progress >= 60) return 'primary';
        if (progress >= 40) return 'warning';
        return 'danger';
    }

    getProgressStatus(progress) {
        if (progress === 0) return 'Not Started';
        if (progress < 25) return 'Getting Started';
        if (progress < 50) return 'In Progress';
        if (progress < 75) return 'Making Progress';
        if (progress < 100) return 'Almost Done';
        return 'Complete';
    }

    isProjectAtRisk(project) {
        if (project.status === 'completed') return false;
        const dueDate = new Date(project.dueDate);
        const today = new Date();
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilDue <= 7 && project.progress < 80;
    }

    isProjectOverdue(project) {
        if (project.status === 'completed') return false;
        const dueDate = new Date(project.dueDate);
        const today = new Date();
        return dueDate < today;
    }

    formatDate(dateString) {
        if (!dateString) return 'No due date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    // User management methods
    async addUser(userData) {
        // Mark that user has interacted with the app
        this.hasUserInteracted = true;
        localStorage.setItem('safetrack_user_interacted', 'true');
        
        // Generate unique user ID
        let userId = userData.name.toLowerCase().replace(/\s+/g, '').substring(0, 10);
        let counter = 1;
        while (this.users.find(u => u.id === userId)) {
            userId = userData.name.toLowerCase().replace(/\s+/g, '').substring(0, 8) + counter;
            counter++;
        }

        const user = {
            id: userId,
            ...userData,
            avatar: userData.name.charAt(0).toUpperCase(),
            createdAt: new Date().toISOString()
        };
        this.users.push(user);
        await this.saveUsers();
        
        // Automatically switch to the newly created user's view
        this.switchUser(user.id);
        
        this.render(); // Use render() like projects do - this updates everything!
        this.closeUserModal();
    }

    async editUser(userId, userData) {
        const index = this.users.findIndex(u => u.id === userId);
        if (index !== -1) {
            this.users[index] = { 
                ...this.users[index], 
                ...userData,
                avatar: userData.name.charAt(0).toUpperCase()
            };
            await this.saveUsers(); // Wait for save to complete!
            this.render(); // Use render() like projects do - this updates everything!
            this.closeUserModal();
        }
    }

    async deleteUser(userId) {
        // Mark that user has interacted with the app
        this.hasUserInteracted = true;
        localStorage.setItem('safetrack_user_interacted', 'true');
        
        // Check if user has projects
        const userProjects = this.projects.filter(p => p.createdBy === userId);
        if (userProjects.length > 0) {
            if (!confirm(`This user has ${userProjects.length} project(s). Do you want to reassign them to another user or delete the user and their projects?`)) {
                return;
            }
            
            // If user confirms, reassign projects to admin or delete them
            const reassignTo = prompt('Enter user ID to reassign projects to (or leave blank to delete projects):');
            if (reassignTo && this.users.find(u => u.id === reassignTo)) {
                this.projects.forEach(project => {
                    if (project.createdBy === userId) {
                        project.createdBy = reassignTo;
                    }
                });
                await this.saveProjects(); // Wait for save to complete!
            } else if (reassignTo === '') {
                // Delete projects
                this.projects = this.projects.filter(p => p.createdBy !== userId);
                await this.saveProjects(); // Wait for save to complete!
            } else {
                return; // User cancelled
            }
        }
        
        this.users = this.users.filter(u => u.id !== userId);
        await this.saveUsers();
        
        this.render(); // Use render() like projects do - this updates everything!
        
        // If deleted user was current user, switch to all view
        if (this.currentUser === userId) {
            this.switchUser('all');
        }
    }

    async handleUserFormSubmit() {
        const formData = new FormData(document.getElementById('userForm'));
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            department: formData.get('department'),
            role: formData.get('role')
        };

        // Basic validation
        if (!userData.name || !userData.email) {
            alert('Please fill in all required fields (Name and Email)');
            return;
        }

        // Check if email already exists (for new users)
        if (!this.currentUserEditId) {
            const existingUser = this.users.find(u => u.email === userData.email);
            if (existingUser) {
                alert('A user with this email already exists');
                return;
            }
        }

        if (this.currentUserEditId) {
            await this.editUser(this.currentUserEditId, userData);
        } else {
            await this.addUser(userData);
        }
    }

    closeUserModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
        if (modal) {
            modal.hide();
        }
        document.getElementById('userForm').reset();
        this.currentUserEditId = null;
    }

    switchUser(userId) {
        // DISABLED: User switching removed for security
        // Users are locked to their selected profile after login
        console.log('User switching disabled for security - users locked to selected profile');
        this.showNotification('User switching disabled. Logout to change user profile.', 'warning');
    }

    toggleProjectView(viewMode) {
        // Store the view mode without changing the current user
        this.projectViewMode = viewMode;
        localStorage.setItem('safetrack_project_view_mode', viewMode);
        
        this.updateViewModeInterface();
        this.render(); // Re-render projects with new view mode
    }

    updateUserInterface() {
        const welcomeUsername = document.getElementById('welcomeUsername');
        const welcomeUserRole = document.getElementById('welcomeUserRole');
        
        // Always show the current actual user (no more 'all' user switching)
        const user = this.users.find(u => u.id === this.currentUser);
        const userName = user ? user.name : 'Admin User';
        const userRole = user ? (user.role || 'Team Member') : 'Administrator';
        
        // Update welcome banner
        if (welcomeUsername) welcomeUsername.textContent = userName;
        if (welcomeUserRole) welcomeUserRole.textContent = userRole;
        
        // Show/hide admin-only options
        const adminOptions = document.getElementById('adminOnlyOptions');
        if (adminOptions) {
            if (this.currentUser === 'admin') {
                adminOptions.style.display = 'block';
            } else {
                adminOptions.style.display = 'none';
            }
        }
        
        // Populate individual user views in dropdown
        this.populateIndividualUserViews();
        
        // Populate filter dropdowns
        this.populateFilterDropdowns();
        
        // Update notification badge
        this.updateNotificationBadge();
    }

    updateViewModeInterface() {
        const currentViewMode = document.getElementById('currentViewMode');
        if (this.projectViewMode === 'all') {
            currentViewMode.textContent = 'All Team Projects';
        } else if (this.projectViewMode === 'personal') {
            currentViewMode.textContent = 'My Projects';
        } else {
            // Individual user view
            const user = this.users.find(u => u.id === this.projectViewMode);
            if (user) {
                currentViewMode.textContent = `${user.name}'s Projects`;
            } else {
                currentViewMode.textContent = 'User Projects';
            }
        }
    }

    updateUserDropdown() {
        // Update the project assigned to dropdown
        this.populateUserDropdowns();
        
        // Update the user management table if it's open
        this.renderUserManagementTable();
        
        // Update the current user interface
        this.updateUserInterface();
        this.updateViewModeInterface();
    }

    getUserById(userId) {
        return this.users.find(u => u.id === userId);
    }

    renderUserManagementTable() {
        const tbody = document.getElementById('userManagementTableBody');
        
        if (this.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = this.users.map(user => `
            <tr class="fade-in">
                <td>
                    <div class="d-flex align-items-center">
                        <div class="user-avatar me-3" title="${user.name}">${user.avatar}</div>
                        <div>
                            <div class="fw-bold">${this.escapeHtml(user.name)}</div>
                            <small class="text-muted">ID: ${user.id}</small>
                        </div>
                    </div>
                </td>
                <td class="text-muted">${user.email}</td>
                <td>
                    <span class="badge bg-info text-capitalize">${user.department || 'No Department'}</span>
                </td>
                <td>
                    <span class="badge bg-primary text-capitalize">${user.role ? user.role.replace('-', ' ') : 'No Role'}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button onclick="projectManager.editUserModal('${user.id}')" class="btn btn-outline-primary" title="Edit User">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="projectManager.deleteUser('${user.id}')" class="btn btn-outline-danger" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    editUserModal(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        this.currentUserEditId = userId;
        
        // Fill form with user data
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userDepartment').value = user.department || '';
        document.getElementById('userRole').value = user.role || '';
        
        // Update modal title
        document.getElementById('userModalTitle').textContent = 'Edit Safety Team Member';
        document.getElementById('userSubmitText').textContent = 'Update Team Member';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
    }

    openUserManagement() {
        // Admin access already verified at profile selection
        this.renderUserManagementTable();
        const modal = new bootstrap.Modal(document.getElementById('userManagementModal'));
        modal.show();
    }

    populateUserDropdowns() {
        // Update project assignment dropdown
        const assignedToSelect = document.getElementById('projectAssignedTo');
        if (assignedToSelect) {
            assignedToSelect.innerHTML = '<option value="">Select Team Member</option>' +
                this.users.map(user => 
                    `<option value="${user.id}">${user.name}${user.role ? ` (${user.role})` : ''}</option>`
                ).join('');
        }
        
        // Update compliance assignment dropdown
        const complianceAssignedTo = document.getElementById('complianceAssignedTo');
        if (complianceAssignedTo) {
            complianceAssignedTo.innerHTML = '<option value="">Select Team Member</option>' +
                this.users.map(user => 
                    `<option value="${user.id}">${user.name}${user.role ? ` (${user.role})` : ''}</option>`
                ).join('');
        }
        
        // DO NOT touch the header user dropdown - it's handled by static HTML and updateUserInterface()
        // The user dropdown should remain separate from project view toggle
        
        // Update the user dropdown with dynamic users
        this.updateUserDropdownUsers();
    }
    
    updateUserDropdownUsers() {
        // Find the user dropdown specifically (not the view toggle dropdown)
        const userDropdown = document.querySelector('#userDropdown + .dropdown-menu');
        if (!userDropdown) return;
        
        // Find the divider after the existing users
        const existingDivider = userDropdown.querySelector('hr.dropdown-divider');
        if (!existingDivider) return;
        
        // Remove ALL dynamically added users by finding elements marked with data-dynamic-user
        const dynamicUserElements = userDropdown.querySelectorAll('li[data-dynamic-user]');
        dynamicUserElements.forEach(li => li.remove());
        
        // Add dynamic users (excluding admin which is already in static HTML)
        const dynamicUsers = this.users.filter(user => user.id !== 'admin');
        dynamicUsers.forEach(user => {
            const li = document.createElement('li');
            li.setAttribute('data-dynamic-user', 'true'); // Mark as dynamic for easy removal
            const escapedId = user.id.replace(/'/g, "\\'");
            const escapedName = this.escapeHtml(user.name);
            li.innerHTML = `<a class="dropdown-item" href="#" onclick="switchUser('${escapedId}')">
                <i class="fas fa-user me-2"></i>${escapedName}
            </a>`;
            existingDivider.parentNode.insertBefore(li, existingDivider);
        });
    }

    handleScreenshotUpload() {
        const fileInput = document.getElementById('projectScreenshots');
        const files = fileInput.files;
        const screenshots = [];

        // For now, we'll return an empty array and handle async upload later
        // In a real implementation, you'd want to handle this asynchronously
        return screenshots;
    }

    async handleScreenshotUploadAsync() {
        const fileInput = document.getElementById('projectScreenshots');
        const files = fileInput.files;
        const screenshots = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                try {
                    const dataUrl = await this.readFileAsDataURL(file);
                    screenshots.push({
                        name: file.name,
                        data: dataUrl,
                        type: file.type,
                        size: file.size
                    });
                } catch (error) {
                    console.error('Error reading file:', error);
                }
            }
        }

        return screenshots;
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    showScreenshots(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project || !project.screenshots || project.screenshots.length === 0) {
            alert('No screenshots available for this project.');
            return;
        }

        const container = document.getElementById('screenshotContainer');
        container.innerHTML = project.screenshots.map((screenshot, index) => `
            <div class="mb-3">
                <h6>${screenshot.name}</h6>
                <img src="${screenshot.data}" class="img-fluid rounded" alt="${screenshot.name}" 
                     style="max-height: 400px; cursor: pointer;" 
                     onclick="projectManager.openScreenshotModal('${projectId}', ${index})">
            </div>
        `).join('');

        const modal = new bootstrap.Modal(document.getElementById('screenshotModal'));
        modal.show();
    }

    openScreenshotModal(projectId, screenshotIndex) {
        const project = this.projects.find(p => p.id === projectId);
        if (project && project.screenshots && project.screenshots[screenshotIndex]) {
            const screenshot = project.screenshots[screenshotIndex];
            const container = document.getElementById('screenshotContainer');
            container.innerHTML = `
                <div class="text-center">
                    <h5>${screenshot.name}</h5>
                    <img src="${screenshot.data}" class="img-fluid rounded" alt="${screenshot.name}">
                    <p class="text-muted mt-2">Size: ${(screenshot.size / 1024).toFixed(1)} KB</p>
                </div>
            `;
            
            const modal = new bootstrap.Modal(document.getElementById('screenshotModal'));
            modal.show();
        }
    }

    openProgressModal(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        this.currentProgressEditId = projectId;
        
        // Fill form with project data
        document.getElementById('projectNameDisplay').value = project.name;
        document.getElementById('progressSlider').value = project.progress;
        document.getElementById('progressValue').textContent = project.progress;
        
        // Add event listener for slider
        const slider = document.getElementById('progressSlider');
        const valueDisplay = document.getElementById('progressValue');
        
        slider.addEventListener('input', function() {
            valueDisplay.textContent = this.value;
        });
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('progressModal'));
        modal.show();
    }

    updateProjectProgress() {
        if (!this.currentProgressEditId) return;

        const project = this.projects.find(p => p.id === this.currentProgressEditId);
        if (!project) return;

        const newProgress = parseInt(document.getElementById('progressSlider').value);

        // Update project progress
        project.progress = newProgress;
        project.lastProgressUpdate = new Date().toISOString();

        // Auto-complete project if progress reaches 100%
        if (newProgress === 100 && project.status !== 'completed') {
            project.status = 'completed';
            project.completedAt = new Date().toISOString();
        }

        this.saveProjects();
        this.render();
        this.closeProgressModal();
    }

    closeProgressModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('progressModal'));
        if (modal) {
            modal.hide();
        }
        this.currentProgressEditId = null;
        document.getElementById('progressNotes').value = '';
    }

    changeProjectStatus(projectId, newStatus) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        const oldStatus = project.status;
        project.status = newStatus;
        project.statusChangedAt = new Date().toISOString();
        project.statusChangedBy = this.currentUser;

        // Handle status-specific logic
        if (newStatus === 'completed') {
            project.progress = 100;
            project.completedAt = new Date().toISOString();
        } else if (newStatus === 'cancelled') {
            project.cancelledAt = new Date().toISOString();
        } else if (newStatus === 'active' && oldStatus === 'completed') {
            // If reactivating a completed project, reset completion date
            project.completedAt = null;
            project.completionDate = null;
        }

        this.saveProjects();
        this.render();

        // Show confirmation message
        const statusText = this.getStatusDisplayText(newStatus);
        this.showStatusChangeNotification(project.name, oldStatus, newStatus);
    }

    showStatusChangeNotification(projectName, oldStatus, newStatus) {
        const oldStatusText = this.getStatusDisplayText(oldStatus);
        const newStatusText = this.getStatusDisplayText(newStatus);
        
        // Create a simple notification (you could enhance this with a proper notification system)
        const notification = document.createElement('div');
        notification.className = 'alert alert-success alert-dismissible fade show position-fixed';
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            <strong>Status Updated:</strong> "${projectName}" changed from ${oldStatusText} to ${newStatusText}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Category Management Methods
    addCategory() {
        const categoryName = document.getElementById('categoryName').value.trim();
        if (!categoryName) {
            alert('Please enter a category name');
            return;
        }

        // Check if category already exists
        if (this.categories.some(cat => cat.name.toLowerCase() === categoryName.toLowerCase())) {
            alert('Category already exists');
            return;
        }

        const newCategory = {
            id: Date.now(),
            name: categoryName,
            createdAt: new Date().toISOString(),
            createdBy: this.currentUser
        };

        this.categories.push(newCategory);
        this.saveCategories();
        this.populateCategoryDropdowns();
        this.renderCategoryTable();
        document.getElementById('categoryName').value = '';
    }

    editCategory(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        const newName = prompt('Enter new category name:', category.name);
        if (newName && newName.trim() && newName.trim() !== category.name) {
            // Check if new name already exists
            if (this.categories.some(cat => cat.id !== categoryId && cat.name.toLowerCase() === newName.trim().toLowerCase())) {
                alert('Category name already exists');
                return;
            }
            
            category.name = newName.trim();
            category.updatedAt = new Date().toISOString();
            category.updatedBy = this.currentUser;
            this.saveCategories();
            this.populateCategoryDropdowns();
            this.renderCategoryTable();
        }
    }

    deleteCategory(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;

        // Check if category is being used by any projects
        const projectsUsingCategory = this.projects.filter(project => project.category === category.name);
        if (projectsUsingCategory.length > 0) {
            alert(`Cannot delete category "${category.name}" because it is being used by ${projectsUsingCategory.length} project(s). Please reassign those projects first.`);
            return;
        }

        if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
            this.categories = this.categories.filter(cat => cat.id !== categoryId);
            this.saveCategories();
            this.populateCategoryDropdowns();
            this.renderCategoryTable();
        }
    }

    openCategoryModal() {
        this.renderCategoryTable();
        const modal = new bootstrap.Modal(document.getElementById('categoryModal'));
        modal.show();
    }

    renderCategoryTable() {
        const tbody = document.getElementById('categoryTableBody');
        
        if (this.categories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">No categories found. Add your first category above.</td></tr>';
            return;
        }

        tbody.innerHTML = this.categories.map(category => {
            const projectCount = this.projects.filter(project => project.category === category.name).length;
            
            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-folder me-2 text-safety"></i>
                            <span class="fw-medium">${category.name}</span>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-secondary">${projectCount} project${projectCount !== 1 ? 's' : ''}</span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button onclick="projectManager.editCategory(${category.id})" class="btn btn-outline-primary" title="Edit Category">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="projectManager.deleteCategory(${category.id})" class="btn btn-outline-danger" title="Delete Category">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    populateCategoryDropdowns() {
        const projectCategorySelect = document.getElementById('projectCategory');
        if (projectCategorySelect) {
            // Clear existing options except the first one
            projectCategorySelect.innerHTML = '<option value="">Select Safety Category</option>';
            
            // Add categories
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                projectCategorySelect.appendChild(option);
            });
        }
    }

    // Role Management Methods
    addRole() {
        const roleName = document.getElementById('roleName').value.trim();
        if (!roleName) {
            alert('Please enter a role name');
            return;
        }

        // Check if role already exists
        if (this.roles.some(role => role.name.toLowerCase() === roleName.toLowerCase())) {
            alert('Role already exists');
            return;
        }

        const newRole = {
            id: Date.now(),
            name: roleName,
            createdAt: new Date().toISOString(),
            createdBy: this.currentUser
        };

        this.roles.push(newRole);
        this.saveRoles();
        this.populateRoleDropdowns();
        this.renderRoleTable();
        document.getElementById('roleName').value = '';
    }

    editRole(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (!role) return;

        const newName = prompt('Enter new role name:', role.name);
        if (newName && newName.trim() && newName.trim() !== role.name) {
            // Check if new name already exists
            if (this.roles.some(r => r.id !== roleId && r.name.toLowerCase() === newName.trim().toLowerCase())) {
                alert('Role name already exists');
                return;
            }
            
            role.name = newName.trim();
            role.updatedAt = new Date().toISOString();
            role.updatedBy = this.currentUser;
            this.saveRoles();
            this.populateRoleDropdowns();
            this.renderRoleTable();
        }
    }

    deleteRole(roleId) {
        const role = this.roles.find(r => r.id === roleId);
        if (!role) return;

        // Check if role is being used by any users
        const usersUsingRole = this.users.filter(user => user.role === role.name);
        if (usersUsingRole.length > 0) {
            alert(`Cannot delete role "${role.name}" because it is being used by ${usersUsingRole.length} user(s). Please reassign those users first.`);
            return;
        }

        if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
            this.roles = this.roles.filter(r => r.id !== roleId);
            this.saveRoles();
            this.populateRoleDropdowns();
            this.renderRoleTable();
        }
    }

    openRoleModal() {
        this.renderRoleTable();
        const modal = new bootstrap.Modal(document.getElementById('roleModal'));
        modal.show();
    }

    renderRoleTable() {
        const tbody = document.getElementById('roleTableBody');
        
        if (this.roles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">No roles found. Add your first role above.</td></tr>';
            return;
        }

        tbody.innerHTML = this.roles.map(role => {
            const userCount = this.users.filter(user => user.role === role.name).length;
            
            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-user-tag me-2 text-safety"></i>
                            <span class="fw-medium">${role.name}</span>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-secondary">${userCount} user${userCount !== 1 ? 's' : ''}</span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button onclick="projectManager.editRole(${role.id})" class="btn btn-outline-primary" title="Edit Role">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="projectManager.deleteRole(${role.id})" class="btn btn-outline-danger" title="Delete Role">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    populateRoleDropdowns() {
        const userRoleSelect = document.getElementById('userRole');
        if (userRoleSelect) {
            // Clear existing options except the first one
            userRoleSelect.innerHTML = '<option value="">Select Role</option>';
            
            // Add roles
            this.roles.forEach(role => {
                const option = document.createElement('option');
                option.value = role.name;
                option.textContent = role.name;
                userRoleSelect.appendChild(option);
            });
        }
    }

    // Department Management Methods
    addDepartment() {
        const departmentName = document.getElementById('departmentName').value.trim();
        if (!departmentName) {
            alert('Please enter a department name');
            return;
        }

        // Check if department already exists
        if (this.departments.some(dept => dept.name.toLowerCase() === departmentName.toLowerCase())) {
            alert('Department already exists');
            return;
        }

        const newDepartment = {
            id: Date.now(),
            name: departmentName,
            createdAt: new Date().toISOString(),
            createdBy: this.currentUser
        };

        this.departments.push(newDepartment);
        this.saveDepartments();
        this.populateDepartmentDropdowns();
        this.renderDepartmentTable();
        document.getElementById('departmentName').value = '';
    }

    editDepartment(departmentId) {
        const department = this.departments.find(d => d.id === departmentId);
        if (!department) return;

        const newName = prompt('Enter new department name:', department.name);
        if (newName && newName.trim() && newName.trim() !== department.name) {
            // Check if new name already exists
            if (this.departments.some(d => d.id !== departmentId && d.name.toLowerCase() === newName.trim().toLowerCase())) {
                alert('Department name already exists');
                return;
            }
            
            department.name = newName.trim();
            department.updatedAt = new Date().toISOString();
            department.updatedBy = this.currentUser;
            this.saveDepartments();
            this.populateDepartmentDropdowns();
            this.renderDepartmentTable();
        }
    }

    deleteDepartment(departmentId) {
        const department = this.departments.find(d => d.id === departmentId);
        if (!department) return;

        // Check if department is being used by any users
        const usersUsingDepartment = this.users.filter(user => user.department === department.name);
        if (usersUsingDepartment.length > 0) {
            alert(`Cannot delete department "${department.name}" because it is being used by ${usersUsingDepartment.length} user(s). Please reassign those users first.`);
            return;
        }

        if (confirm(`Are you sure you want to delete the department "${department.name}"?`)) {
            this.departments = this.departments.filter(d => d.id !== departmentId);
            this.saveDepartments();
            this.populateDepartmentDropdowns();
            this.renderDepartmentTable();
        }
    }

    openDepartmentModal() {
        this.renderDepartmentTable();
        const modal = new bootstrap.Modal(document.getElementById('departmentModal'));
        modal.show();
    }

    renderDepartmentTable() {
        const tbody = document.getElementById('departmentTableBody');
        
        if (this.departments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">No departments found. Add your first department above.</td></tr>';
            return;
        }

        tbody.innerHTML = this.departments.map(department => {
            const userCount = this.users.filter(user => user.department === department.name).length;
            
            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-building me-2 text-safety"></i>
                            <span class="fw-medium">${department.name}</span>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-secondary">${userCount} user${userCount !== 1 ? 's' : ''}</span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button onclick="projectManager.editDepartment(${department.id})" class="btn btn-outline-primary" title="Edit Department">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="projectManager.deleteDepartment(${department.id})" class="btn btn-outline-danger" title="Delete Department">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    populateDepartmentDropdowns() {
        const userDepartmentSelect = document.getElementById('userDepartment');
        if (userDepartmentSelect) {
            // Clear existing options except the first one
            userDepartmentSelect.innerHTML = '<option value="">Select Department</option>';
            
            // Add departments
            this.departments.forEach(department => {
                const option = document.createElement('option');
                option.value = department.name;
                option.textContent = department.name;
                userDepartmentSelect.appendChild(option);
            });
        }
    }

    // ==========================================
    // BULK IMPORT SYSTEM
    // ==========================================

    openImportModal(type) {
        this.importType = type;
        document.getElementById('importModalLabel').innerHTML = `
            <i class="fas fa-upload me-2"></i>Import Projects from ${type.charAt(0).toUpperCase() + type.slice(1)}
        `;
        
        // Reset import state
        this.importStep = 1;
        this.importData = null;
        this.columnMappings = {};
        this.validatedData = [];
        
        // Show step 1
        this.showImportStep(1);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('importModal'));
        modal.show();
    }

    showImportStep(step) {
        // Hide all steps
        for (let i = 1; i <= 3; i++) {
            document.getElementById(`importStep${i}`).classList.add('d-none');
        }
        document.getElementById('importProgress').classList.add('d-none');
        
        // Show current step
        document.getElementById(`importStep${step}`).classList.remove('d-none');
        this.importStep = step;
        
        // Update buttons
        const backBtn = document.getElementById('importBackBtn');
        const nextBtn = document.getElementById('importNextBtn');
        const finalBtn = document.getElementById('importFinalBtn');
        
        if (step === 1) {
            backBtn.style.display = 'none';
            nextBtn.style.display = 'inline-block';
            finalBtn.style.display = 'none';
            nextBtn.disabled = !this.importData;
        } else if (step === 2) {
            backBtn.style.display = 'inline-block';
            nextBtn.style.display = 'inline-block';
            finalBtn.style.display = 'none';
            nextBtn.disabled = false;
        } else if (step === 3) {
            backBtn.style.display = 'inline-block';
            nextBtn.style.display = 'none';
            finalBtn.style.display = 'inline-block';
        }
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.showNotification('Reading file...', 'info');
        
        try {
            if (file.name.endsWith('.csv')) {
                this.importData = await this.readCSVFile(file);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                this.importData = await this.readExcelFile(file);
            } else {
                throw new Error('Unsupported file format');
            }
            
            this.showNotification(`File loaded successfully! Found ${this.importData.length - 1} rows of data.`, 'success');
            document.getElementById('importNextBtn').disabled = false;
            
        } catch (error) {
            this.showNotification(`Error reading file: ${error.message}`, 'error');
            this.importData = null;
            document.getElementById('importNextBtn').disabled = true;
        }
    }

    async readCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n').filter(line => line.trim());
                    const data = lines.map(line => {
                        // Simple CSV parser (handles basic cases)
                        const result = [];
                        let current = '';
                        let inQuotes = false;
                        
                        for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            if (char === '"') {
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                result.push(current.trim());
                                current = '';
                            } else {
                                current += char;
                            }
                        }
                        result.push(current.trim());
                        return result;
                    });
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    async readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read Excel file'));
            reader.readAsArrayBuffer(file);
        });
    }

    importNextStep() {
        if (this.importStep === 1) {
            this.setupColumnMapping();
            this.showImportStep(2);
        } else if (this.importStep === 2) {
            this.validateAndPreview();
            this.showImportStep(3);
        }
    }

    importPreviousStep() {
        if (this.importStep > 1) {
            this.showImportStep(this.importStep - 1);
        }
    }

    setupColumnMapping() {
        if (!this.importData || this.importData.length === 0) return;
        
        const headers = this.importData[0];
        const fileColumnsDiv = document.getElementById('fileColumns');
        const projectFieldsDiv = document.getElementById('projectFields');
        
        // Show file columns
        fileColumnsDiv.innerHTML = headers.map((header, index) => 
            `<div class="mb-2">
                <span class="badge bg-secondary">${index + 1}</span>
                <strong>${header}</strong>
                <div class="text-muted small">Sample: ${this.importData[1] ? this.importData[1][index] || 'N/A' : 'N/A'}</div>
            </div>`
        ).join('');
        
        // Show project field mappings
        const projectFields = [
            { key: 'title', label: 'Project Title', required: true },
            { key: 'description', label: 'Description', required: false },
            { key: 'status', label: 'Status', required: false },
            { key: 'assignedTo', label: 'Assigned To', required: false },
            { key: 'category', label: 'Category', required: false },
            { key: 'priority', label: 'Priority', required: false },
            { key: 'progress', label: 'Progress (%)', required: false },
            { key: 'startDate', label: 'Start Date', required: false },
            { key: 'endDate', label: 'End Date', required: false }
        ];
        
        projectFieldsDiv.innerHTML = projectFields.map(field => {
            const matchedColumn = this.findBestColumnMatch(headers, field.key, field.label);
            return `
                <div class="mb-3">
                    <label class="form-label">
                        ${field.label} ${field.required ? '<span class="text-danger">*</span>' : ''}
                    </label>
                    <select class="form-select form-select-sm" onchange="projectManager.updateColumnMapping('${field.key}', this.value)">
                        <option value="">-- Skip this field --</option>
                        ${headers.map((header, index) => 
                            `<option value="${index}" ${matchedColumn === index ? 'selected' : ''}>${header}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }).join('');
        
        // Initialize mappings with auto-detected matches
        this.columnMappings = {};
        projectFields.forEach(field => {
            const matchedColumn = this.findBestColumnMatch(headers, field.key, field.label);
            if (matchedColumn !== -1) {
                this.columnMappings[field.key] = matchedColumn;
            }
        });
    }

    findBestColumnMatch(headers, fieldKey, fieldLabel) {
        const searchTerms = {
            title: ['title', 'name', 'project', 'task', 'subject'],
            description: ['description', 'desc', 'details', 'notes', 'comment'],
            status: ['status', 'state', 'phase'],
            assignedTo: ['assigned', 'owner', 'responsible', 'user'],
            category: ['category', 'type', 'group', 'class'],
            priority: ['priority', 'importance', 'urgency'],
            progress: ['progress', 'completion', 'percent', '%'],
            startDate: ['start', 'begin', 'created'],
            endDate: ['end', 'due', 'deadline', 'finish']
        };
        
        const terms = searchTerms[fieldKey] || [fieldKey];
        
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toLowerCase();
            if (terms.some(term => header.includes(term))) {
                return i;
            }
        }
        return -1;
    }

    updateColumnMapping(fieldKey, columnIndex) {
        if (columnIndex === '') {
            delete this.columnMappings[fieldKey];
        } else {
            this.columnMappings[fieldKey] = parseInt(columnIndex);
        }
    }

    validateAndPreview() {
        if (!this.importData || this.importData.length < 2) return;
        
        const headers = this.importData[0];
        const rows = this.importData.slice(1);
        
        this.validatedData = [];
        let validCount = 0;
        let errorCount = 0;
        
        rows.forEach((row, index) => {
            const project = {};
            let isValid = true;
            let errors = [];
            
            // Map columns to project fields
            Object.keys(this.columnMappings).forEach(fieldKey => {
                const columnIndex = this.columnMappings[fieldKey];
                if (columnIndex !== undefined && row[columnIndex] !== undefined) {
                    let value = row[columnIndex].toString().trim();
                    
                    // Process specific fields
                    switch (fieldKey) {
                        case 'progress':
                            const progressNum = parseFloat(value);
                            if (!isNaN(progressNum)) {
                                project[fieldKey] = Math.min(100, Math.max(0, progressNum));
                            }
                            break;
                        case 'status':
                            const validStatuses = ['active', 'completed', 'on-hold'];
                            project[fieldKey] = validStatuses.includes(value.toLowerCase()) ? 
                                value.toLowerCase() : 'active';
                            break;
                        case 'priority':
                            const validPriorities = ['low', 'medium', 'high'];
                            project[fieldKey] = validPriorities.includes(value.toLowerCase()) ? 
                                value.toLowerCase() : 'medium';
                            break;
                        default:
                            project[fieldKey] = value;
                    }
                }
            });
            
            // Validate required fields
            if (!project.title || project.title.length === 0) {
                isValid = false;
                errors.push('Missing title');
            }
            
            // Set defaults
            project.id = `import_${Date.now()}_${index}`;
            project.createdAt = new Date().toISOString();
            project.screenshots = [];
            project.progress = project.progress || 0;
            project.status = project.status || 'active';
            project.priority = project.priority || 'medium';
            project.assignedTo = project.assignedTo || this.currentUser;
            
            if (isValid) {
                validCount++;
                this.validatedData.push({ ...project, _rowIndex: index + 2, _errors: [] });
            } else {
                errorCount++;
                this.validatedData.push({ ...project, _rowIndex: index + 2, _errors: errors, _invalid: true });
            }
        });
        
        // Update UI
        document.getElementById('validProjectsCount').textContent = validCount;
        document.getElementById('errorCount').textContent = errorCount;
        
        if (errorCount > 0) {
            document.getElementById('errorAlert').classList.remove('d-none');
        } else {
            document.getElementById('errorAlert').classList.add('d-none');
        }
        
        this.renderPreviewTable();
    }

    renderPreviewTable() {
        const headerRow = document.getElementById('previewTableHeader');
        const tbody = document.getElementById('previewTableBody');
        
        if (this.validatedData.length === 0) return;
        
        // Create headers
        const displayFields = ['title', 'description', 'status', 'assignedTo', 'category', 'progress'];
        headerRow.innerHTML = `
            <th>Row</th>
            <th>Status</th>
            ${displayFields.map(field => `<th>${field.charAt(0).toUpperCase() + field.slice(1)}</th>`).join('')}
        `;
        
        // Create rows
        tbody.innerHTML = this.validatedData.slice(0, 50).map(item => {
            const statusClass = item._invalid ? 'table-danger' : 'table-success';
            const statusIcon = item._invalid ? 
                '<i class="fas fa-exclamation-triangle text-warning"></i>' : 
                '<i class="fas fa-check-circle text-success"></i>';
            
            return `
                <tr class="${statusClass}">
                    <td>${item._rowIndex}</td>
                    <td>${statusIcon}</td>
                    ${displayFields.map(field => `<td>${item[field] || ''}</td>`).join('')}
                </tr>
            `;
        }).join('');
        
        if (this.validatedData.length > 50) {
            tbody.innerHTML += `
                <tr>
                    <td colspan="${displayFields.length + 2}" class="text-center text-muted">
                        ... and ${this.validatedData.length - 50} more rows
                    </td>
                </tr>
            `;
        }
    }

    async executeImport() {
        const validProjects = this.validatedData.filter(item => !item._invalid);
        if (validProjects.length === 0) {
            this.showNotification('No valid projects to import', 'warning');
            return;
        }
        
        // Show progress
        document.getElementById('importStep3').classList.add('d-none');
        document.getElementById('importProgress').classList.remove('d-none');
        
        const progressBar = document.getElementById('importProgressBar');
        const progressText = document.getElementById('importProgressText');
        
        let imported = 0;
        const total = validProjects.length;
        
        for (const project of validProjects) {
            try {
                // Clean up project data
                const cleanProject = { ...project };
                delete cleanProject._rowIndex;
                delete cleanProject._errors;
                delete cleanProject._invalid;
                
                // Add to projects array and save
                this.projects.push(cleanProject);
                await this.saveProjects();
                
                imported++;
                const percentage = Math.round((imported / total) * 100);
                progressBar.style.width = `${percentage}%`;
                progressText.textContent = `Imported ${imported} of ${total} projects...`;
                
                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 50));
                
            } catch (error) {
                console.error('Error importing project:', error);
            }
        }
        
        // Update UI and close modal
        this.render();
        this.showNotification(`Successfully imported ${imported} projects!`, 'success');
        
        // Close modal after a short delay
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
            modal.hide();
        }, 1500);
    }

    downloadImportTemplate() {
        const templateData = [
            ['Project Title', 'Description', 'Status', 'Assigned To', 'Category', 'Priority', 'Progress', 'Start Date', 'End Date'],
            ['Sample Safety Inspection', 'Monthly safety inspection of facility', 'active', 'Admin User', 'Safety', 'high', '25', '2024-01-15', '2024-01-30'],
            ['Equipment Maintenance', 'Routine maintenance of safety equipment', 'active', 'Admin User', 'Maintenance', 'medium', '0', '2024-02-01', '2024-02-15'],
            ['Training Program', 'Employee safety training program', 'completed', 'Admin User', 'Training', 'high', '100', '2024-01-01', '2024-01-31']
        ];
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(templateData);
        
        // Set column widths
        ws['!cols'] = [
            { wch: 25 }, { wch: 40 }, { wch: 12 }, { wch: 15 }, 
            { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Projects');
        XLSX.writeFile(wb, 'SafeTrack_Import_Template.xlsx');
        
        this.showNotification('Template downloaded! Fill it out and import back.', 'success');
    }

    showSampleData() {
        const sampleHtml = `
            <div class="modal fade" id="sampleDataModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Sample Data Format</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Your file should have columns like this:</p>
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered">
                                    <thead class="table-dark">
                                        <tr>
                                            <th>Project Title</th>
                                            <th>Description</th>
                                            <th>Status</th>
                                            <th>Assigned To</th>
                                            <th>Priority</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Safety Inspection</td>
                                            <td>Monthly facility inspection</td>
                                            <td>active</td>
                                            <td>John Smith</td>
                                            <td>high</td>
                                        </tr>
                                        <tr>
                                            <td>Equipment Check</td>
                                            <td>Check safety equipment</td>
                                            <td>completed</td>
                                            <td>Jane Doe</td>
                                            <td>medium</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="alert alert-info">
                                <strong>Supported Values:</strong><br>
                                <strong>Status:</strong> active, completed, on-hold<br>
                                <strong>Priority:</strong> low, medium, high<br>
                                <strong>Progress:</strong> 0-100 (numbers)
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existing = document.getElementById('sampleDataModal');
        if (existing) existing.remove();
        
        // Add and show modal
        document.body.insertAdjacentHTML('beforeend', sampleHtml);
        const modal = new bootstrap.Modal(document.getElementById('sampleDataModal'));
        modal.show();
    }
}

// Modal functions
// openProjectModal moved to global window function above

function openUserModal() {
    // Reset form for new user
    document.getElementById('userForm').reset();
    document.getElementById('userModalTitle').textContent = 'Add New Safety Team Member';
    document.getElementById('userSubmitText').textContent = 'Add Team Member';
    projectManager.currentUserEditId = null;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('userModal'));
    modal.show();
}

function openUserManagement() {
    projectManager.openUserManagement();
}

function addDepartment() {
    projectManager.addDepartment();
}

function openDepartmentModal() {
    projectManager.openDepartmentModal();
}

function resetAllData() {
    if (confirm('Are you sure you want to reset all data? This will delete all users, projects, categories, roles, and departments. This action cannot be undone.')) {
        projectManager.resetAllData();
    }
}

function syncData() {
    if (window.projectManager) {
        window.projectManager.syncData();
    }
}

function switchUser(userId) {
    if (window.projectManager) {
        window.projectManager.switchUser(userId);
    }
}

function toggleProjectView(viewMode) {
    if (window.projectManager) {
        window.projectManager.toggleProjectView(viewMode);
    }
}

function updateProjectProgress() {
    if (window.projectManager) {
        window.projectManager.updateProjectProgress();
    }
}

function addCategory() {
    if (window.projectManager) {
        window.projectManager.addCategory();
    }
}

function openCategoryModal() {
    if (window.projectManager) {
        window.projectManager.openCategoryModal();
    }
}

function addRole() {
    if (window.projectManager) {
        window.projectManager.addRole();
    }
}

function openRoleModal() {
    if (window.projectManager) {
        window.projectManager.openRoleModal();
    }
}


// Tab functionality
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const targetTab = this.dataset.tab;
        
        // Remove active class from all tabs and buttons
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active', 'border-safety-blue', 'text-safety-blue');
            b.classList.add('border-transparent', 'text-gray-600');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('d-none');
        });
        
        // Add active class to clicked button and show content
        this.classList.add('active', 'border-safety-blue', 'text-safety-blue');
        this.classList.remove('border-transparent', 'text-gray-600');
        document.getElementById(targetTab).classList.remove('d-none');
    });
});

// Critical global functions that need to be available immediately
window.logout = () => {
    if (window.projectManager) {
        window.projectManager.logout();
    }
};

window.openProjectModal = () => {
    if (window.projectManager) {
        window.projectManager.openProjectModal();
    } else {
        // Fallback if projectManager not ready
        document.getElementById('projectForm').reset();
        document.getElementById('modalTitle').textContent = 'New Safety Project';
        document.getElementById('submitText').textContent = 'Create Safety Project';
        
        // Explicitly ensure completion date field is enabled and interactive
        const completionDateField = document.getElementById('projectCompletionDate');
        if (completionDateField) {
            completionDateField.removeAttribute('readonly');
            completionDateField.removeAttribute('disabled');
            completionDateField.style.pointerEvents = 'auto';
        }
        
        const modal = new bootstrap.Modal(document.getElementById('projectModal'));
        modal.show();
    }
};

// User management is now handled by the dropdown

// Initialize the project manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.projectManager = new ProjectManager();
    
    // Load project notes after cloud storage is ready - CLOUD FIRST
    window.projectManager.waitForCloudStorage().then(async () => {
        try {
            // Try cloud storage first
            if (window.projectManager.cloudStorage.isConnected) {
                const cloudData = await window.projectManager.cloudStorage.loadFromCloud('project_notes');
                console.log('Raw cloud data loaded during init:', cloudData);
                
                if (cloudData && Object.keys(cloudData).length > 0) {
                    // Convert cloud format back to our internal format
                    const notes = {};
                    Object.entries(cloudData).forEach(([projectId, data]) => {
                        if (data.notes) {
                            notes[projectId] = data.notes;
                        }
                    });
                    window.projectManager.projectNotes = notes;
                    console.log('Project notes loaded from cloud successfully:', notes);
                    return;
                } else {
                    console.log('No cloud data found or empty cloud data');
                }
            }
            
            // Fallback to local storage only if cloud fails or is empty
            const stored = localStorage.getItem('safetrack_project_notes');
            const localNotes = stored ? JSON.parse(stored) : {};
            window.projectManager.projectNotes = localNotes;
            console.log('Project notes loaded from local storage (fallback)');
        } catch (error) {
            console.error('Failed to load project notes:', error);
            window.projectManager.projectNotes = {};
        }
        
        // Load developer notes (cloud-only)
        await window.projectManager.loadDeveloperNotes();
    });

    // Load archived projects after initialization
    window.projectManager.loadArchivedProjects().then(archive => {
        window.projectManager.archivedProjects = archive;
        console.log('Archived projects loaded successfully');
    }).catch(error => {
        console.error('Failed to load archived projects:', error);
        window.projectManager.archivedProjects = {};
    });
    
    // Check authentication after ProjectManager is created
    window.projectManager.checkAuthentication();
    
    // Remove authentication setup - app works normally
    
    // Make emergency clear function available globally
    window.emergencyClear = () => {
        window.projectManager.emergencyClearAll();
    };
    
    // Make force dropdown update available globally for testing
    window.forceDropdownUpdate = () => {
        window.projectManager.forceUpdateDropdown();
    };

    // Global export functions
    window.exportToExcel = () => {
        if (window.projectManager) {
            window.projectManager.exportToExcel();
        }
    };

    window.exportToPDF = () => {
        if (window.projectManager) {
            window.projectManager.exportToPDF();
        }
    };

    window.exportToCSV = () => {
        if (window.projectManager) {
            window.projectManager.exportToCSV();
        }
    };

    window.printReport = () => {
        if (window.projectManager) {
            window.projectManager.printReport();
        }
    };

    // Global compliance functions
    window.addComplianceItem = () => {
        if (window.projectManager) {
            window.projectManager.addComplianceItem();
        }
    };

    window.openComplianceModal = (itemId) => {
        if (window.projectManager) {
            window.projectManager.openComplianceModal(itemId);
        }
    };

    window.exportComplianceToCalendar = () => {
        if (window.projectManager) {
            window.projectManager.exportComplianceToCalendar();
        }
    };

    window.exportToOutlook = () => {
        if (window.projectManager) {
            window.projectManager.exportToOutlook();
        }
    };

    window.exportToGoogleCalendar = () => {
        if (window.projectManager) {
            window.projectManager.exportToGoogleCalendar();
        }
    };

    window.exportToAppleCalendar = () => {
        if (window.projectManager) {
            window.projectManager.exportToAppleCalendar();
        }
    };

    // Global certification functions
    window.openCertificationModal = () => {
        if (window.projectManager) {
            window.projectManager.openCertificationModal();
        }
    };

    window.handleCertificationFileUpload = (input) => {
        if (window.projectManager) {
            window.projectManager.handleCertificationFileUpload(input);
        }
    };

    // Global certification export functions
    window.exportCertificationsToExcel = () => {
        if (window.projectManager) {
            window.projectManager.exportCertificationsToExcel();
        }
    };

    window.exportCertificationsToPDF = () => {
        if (window.projectManager) {
            window.projectManager.exportCertificationsToPDF();
        }
    };

    window.exportCertificationsToCSV = () => {
        if (window.projectManager) {
            window.projectManager.exportCertificationsToCSV();
        }
    };

    window.printCertifications = () => {
        if (window.projectManager) {
            window.projectManager.printCertifications();
        }
    };

    // Global quote management functions
    window.getNewQuote = () => {
        if (window.projectManager) {
            window.projectManager.getNewQuote();
        }
    };

    window.openQuoteModal = () => {
        if (window.projectManager) {
            window.projectManager.openQuoteModal();
        }
    };

    window.addToFavorites = () => {
        if (window.projectManager) {
            window.projectManager.addToFavorites();
        }
    };

    window.showAllQuotes = () => {
        if (window.projectManager) {
            window.projectManager.showAllQuotes();
        }
    };

    window.showBuiltinQuotes = () => {
        if (window.projectManager) {
            window.projectManager.showBuiltinQuotes();
        }
    };

    window.showCustomQuotes = () => {
        if (window.projectManager) {
            window.projectManager.showCustomQuotes();
        }
    };

    window.showFavoriteQuotes = () => {
        if (window.projectManager) {
            window.projectManager.showFavoriteQuotes();
        }
    };

    window.resetQuotesToDefault = () => {
        if (window.projectManager) {
            window.projectManager.resetQuotesToDefault();
        }
    };

    // Global authentication functions
    window.selectUserProfile = async (userId) => {
        if (window.projectManager) {
            await window.projectManager.selectUserProfile(userId);
        }
    };

    window.requestAdminAccess = () => {
        if (window.projectManager) {
            window.projectManager.requestAdminAccess();
        }
    };

    // Global project notes functions
    window.deleteProjectNote = (projectId, noteId) => {
        if (window.projectManager) {
            window.projectManager.deleteProjectNote(projectId, noteId);
        }
    };

    // Global filter functions
    window.clearAllFilters = () => {
        if (window.projectManager) {
            window.projectManager.clearAllFilters();
        }
    };

    // Global multi-user assignment functions
    window.addAssignedUser = () => {
        if (window.projectManager) {
            window.projectManager.addAssignedUser();
        }
    };

    window.removeAssignedUser = (userId) => {
        if (window.projectManager) {
            window.projectManager.removeAssignedUser(userId);
        }
    };

    // Global archive functions
    window.showUserArchive = () => {
        if (window.projectManager) {
            window.projectManager.showUserArchive();
        }
    };

    window.archiveProject = (projectId) => {
        if (window.projectManager) {
            window.projectManager.archiveProject(projectId);
        }
    };

    window.restoreProject = (projectId) => {
        if (window.projectManager) {
            window.projectManager.restoreProject(projectId);
        }
    };

    window.viewArchivedProjectDetails = (projectId) => {
        if (window.projectManager) {
            window.projectManager.viewArchivedProjectDetails(projectId);
        }
    };

    // Archive export functions
    window.exportArchiveToExcel = () => {
        if (window.projectManager) {
            window.projectManager.exportArchiveToExcel();
        }
    };

    window.exportArchiveToPDF = () => {
        if (window.projectManager) {
            window.projectManager.exportArchiveToPDF();
        }
    };

    window.exportArchiveToCSV = () => {
        if (window.projectManager) {
            window.projectManager.exportArchiveToCSV();
        }
    };

    window.printArchive = () => {
        if (window.projectManager) {
            window.projectManager.printArchive();
        }
    };

    window.openProjectNotes = (projectId) => {
        if (window.projectManager) {
            window.projectManager.openProjectNotes(projectId);
        }
    };

    window.openDeveloperNotes = (projectId) => {
        if (window.projectManager) {
            window.projectManager.showProjectDeveloperNotes(projectId);
        }
    };

    window.deleteArchivedProject = (projectId) => {
        if (window.projectManager) {
            window.projectManager.deleteArchivedProject(projectId);
        }
    };

    window.toggleAdvancedFilters = () => {
        const advancedFilters = document.getElementById('advancedFilters');
        const button = document.getElementById('moreFiltersBtn');
        
        if (advancedFilters && button) {
            if (advancedFilters.style.display === 'none' || !advancedFilters.style.display) {
                // Show the filters
                advancedFilters.style.display = 'block';
                button.innerHTML = '<i class="fas fa-filter me-1"></i>Hide Filters';
                button.classList.remove('btn-outline-secondary');
                button.classList.add('btn-secondary');
            } else {
                // Hide the filters
                advancedFilters.style.display = 'none';
                button.innerHTML = '<i class="fas fa-filter me-1"></i>More Filters';
                button.classList.remove('btn-secondary');
                button.classList.add('btn-outline-secondary');
            }
        }
    };

    // Global notification functions
    window.showUserNotifications = () => {
        if (window.projectManager) {
            window.projectManager.showUserNotifications();
        }
    };

    window.syncData = () => {
        if (window.projectManager) {
            window.projectManager.syncData();
        }
    };

    window.toggleProjectView = (mode) => {
        if (window.projectManager) {
            window.projectManager.toggleProjectView(mode);
        }
    };

    window.openUserManagement = () => {
        if (window.projectManager) {
            window.projectManager.openUserManagement();
        }
    };

    window.resetAllData = () => {
        if (window.projectManager) {
            window.projectManager.resetAllData();
        }
    };

    // System testing function
    window.runSystemTest = () => {
        if (window.projectManager) {
            return window.projectManager.runSystemTest();
        }
    };

    // Manual cleanup function
    window.cleanupOrphanedNotes = () => {
        if (window.projectManager) {
            return window.projectManager.cleanupOrphanedNotes();
        }
    };

    // Full system check with cleanup
    window.runFullSystemCheck = () => {
        if (window.projectManager) {
            return window.projectManager.runFullSystemCheck();
        }
    };

    // Clear unnecessary local storage
    window.clearUnnecessaryLocalStorage = () => {
        if (window.projectManager) {
            return window.projectManager.clearUnnecessaryLocalStorage();
        }
    };

    window.markAllNotificationsRead = () => {
        if (window.projectManager) {
            window.projectManager.markAllNotificationsRead();
        }
    };

    window.clearReadNotifications = () => {
        if (window.projectManager) {
            window.projectManager.clearReadNotifications();
        }
    };

    window.clearAllNotifications = () => {
        if (window.projectManager) {
            window.projectManager.clearAllNotifications();
        }
    };

    window.viewProjectFromNotification = (projectId, notificationId) => {
        if (window.projectManager) {
            // Mark notification as read
            window.projectManager.markNotificationAsRead(notificationId);
            window.projectManager.updateNotificationBadge();
            
            // Close notifications modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('notificationsModal'));
            if (modal) modal.hide();
            
            // Open project notes
            window.projectManager.openProjectNotes(projectId);
        }
    };

    // Certification form submission handler
    document.getElementById('certificationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!window.projectManager) return;
        
        const formData = new FormData(this);
        const certificationData = {
            name: document.getElementById('certificationName').value,
            provider: document.getElementById('certificationProvider').value,
            number: document.getElementById('certificationNumber').value,
            level: document.getElementById('certificationLevel').value,
            issueDate: document.getElementById('certificationIssueDate').value,
            expiryDate: document.getElementById('certificationExpiryDate').value,
            description: document.getElementById('certificationDescription').value,
            certificateFile: window.currentCertificateFile || null,
            certificateFileName: window.currentCertificateFileName || null
        };
        
        if (window.projectManager.currentCertificationEditId) {
            window.projectManager.editCertification(window.projectManager.currentCertificationEditId, certificationData);
        } else {
            window.projectManager.addCertification(certificationData);
        }
    });

    // Custom quote form submission handler
    document.getElementById('customQuoteForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!window.projectManager) return;
        
        const quoteText = document.getElementById('customQuoteText').value.trim();
        const author = document.getElementById('customQuoteAuthor').value.trim();
        
        if (quoteText) {
            window.projectManager.addCustomQuote(quoteText, author);
            this.reset(); // Clear the form
        }
    });

    // Setup login form handler after ProjectManager is created
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            console.log('Login attempt:', username); // Debug log
            
            if (username && password && window.projectManager) {
                window.projectManager.handleLogin(username, password);
            } else {
                console.error('Missing username, password, or projectManager not ready');
            }
        });
    }

    // Admin password form submission handler
    document.getElementById('adminPasswordForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const password = document.getElementById('adminPassword').value;
        
        if (password && window.projectManager) {
            window.projectManager.verifyAdminPassword(password);
        }
    });

    // Project notes form submission handler
    document.getElementById('addNoteForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const noteText = document.getElementById('noteText').value;
        if (noteText && window.projectManager && window.projectManager.currentNotesProjectId) {
            await window.projectManager.addProjectNote(window.projectManager.currentNotesProjectId, noteText);
        }
    });

    // Developer notes form submission handler
    document.getElementById('addDeveloperNoteForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const noteText = document.getElementById('developerNoteText').value;
        const noteType = document.getElementById('developerNoteType').value;
        if (noteText && noteType && window.projectManager && window.projectManager.currentDeveloperNotesProjectId) {
            await window.projectManager.addDeveloperNote(window.projectManager.currentDeveloperNotesProjectId, noteText, noteType);
        }
    });

    // Global developer notes functions
    window.deleteDeveloperNote = (noteId) => {
        if (window.projectManager && window.projectManager.currentDeveloperNotesProjectId) {
            window.projectManager.deleteDeveloperNote(window.projectManager.currentDeveloperNotesProjectId, noteId);
        }
    };
});
