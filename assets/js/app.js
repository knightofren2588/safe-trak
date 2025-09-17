// Project data management
class ProjectManager {
    constructor() {
        this.cloudStorage = new CloudStorageService();
        this.projects = [];
        this.users = [];
        this.categories = [];
        this.roles = [];
        this.departments = [];
        this.currentUser = 'all';
        this.currentEditId = null;
        this.currentUserEditId = null;
        this.currentProgressEditId = null;
        this.currentCategoryEditId = null;
        this.currentRoleEditId = null;
        this.currentDepartmentEditId = null;
        this.hasUserInteracted = localStorage.getItem('safetrack_user_interacted') === 'true'; // Flag to track if user has interacted with the app
        this.init();
    }

    async init() {
        // Force cleanup of old default users immediately
        this.forceCleanupOldUsers();
        
        // Wait for cloud storage to be ready before loading data
        await this.waitForCloudStorage();
        
        // Remove old debugging code - not needed anymore
        
        // Force reset cloud storage to remove old users and projects (DISABLED for production)
        // if (this.cloudStorage.isConnected) {
        //     await this.cloudStorage.forceResetCloudUsers();
        //     await this.cloudStorage.forceResetCloudProjects();
        // }
        
        // Load data from cloud storage
        await this.loadAllData();
        
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
        this.populateCategoryDropdowns();
        this.populateRoleDropdowns();
        this.populateDepartmentDropdowns();
        
        // Show connection status
        this.showConnectionStatus();
    }
    
    forceCleanupOldUsers() {
        // This method is no longer needed since we removed hardcoded users from HTML
        // Keeping it for compatibility but it does nothing now
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
        console.log('MANUAL - Force updating dropdown');
        console.log('MANUAL - Current users:', this.users);
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
                await this.cloudStorage.saveToCloud('users', { admin: { id: "admin", name: "Admin User", email: "admin@equitashealth.com", avatar: "A" } });
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
        this.users = [{ id: "admin", name: "Admin User", email: "admin@equitashealth.com", avatar: "A" }];
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
            console.log('Loading data from cloud storage...');
            
            // Load all data in parallel
            const [projects, users, categories, roles, departments, currentUser] = await Promise.all([
                this.cloudStorage.loadProjects(),
                this.cloudStorage.loadUsers(),
                this.cloudStorage.loadCategories(),
                this.cloudStorage.loadRoles(),
                this.cloudStorage.loadDepartments(),
                this.cloudStorage.loadCurrentUser()
            ]);
            
            console.log('DEBUG - Projects loaded from cloud:', projects);
            console.log('DEBUG - Users loaded from cloud:', users);
            
            this.projects = projects;
            this.users = users;
            this.categories = categories;
            this.roles = roles;
            this.departments = departments;
            this.currentUser = currentUser;
            
            console.log('Data loaded successfully from cloud storage');
            
            // Update connection status after successful data load
            this.showConnectionStatus();
        } catch (error) {
            console.error('Error loading data from cloud storage:', error);
            // Fallback to local storage
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        console.log('Falling back to local storage...');
        this.projects = this.loadProjectsLocal();
        this.users = this.loadUsersLocal();
        this.categories = this.loadCategoriesLocal();
        this.roles = this.loadRolesLocal();
        this.departments = this.loadDepartmentsLocal();
        this.currentUser = this.loadCurrentUserLocal();
    }

    loadProjects() {
        const stored = localStorage.getItem('safetrack_projects');
        return stored ? JSON.parse(stored) : [];
    }

    async saveProjects() {
        await this.cloudStorage.saveProjects(this.projects);
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
        return stored ? JSON.parse(stored) : 'all';
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
                email: "admin@equitashealth.com",
                avatar: "A"
            }
        ];
        this.projects = []; // Start with empty projects
        this.saveUsers();
        this.saveProjects();
        
        // Reload the page to reset everything
        location.reload();
    }

    loadSampleData() {
        // Start with empty projects array - no hardcoded data
        this.projects = [];
        this.saveProjects();
    }

    loadSampleUsers() {
        console.log('WARNING - loadSampleUsers() called! This will overwrite existing users!');
        console.log('WARNING - Current users before reset:', this.users);
        
        // Clear existing users and reset to new defaults
        this.users = [
            {
                id: "admin",
                name: "Admin User",
                email: "admin@equitashealth.com",
                avatar: "A"
            }
        ];
        
        console.log('WARNING - Users after reset:', this.users);
        this.saveUsers();
        console.log('WARNING - loadSampleUsers() completed and saved to cloud');
        
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

        // User form
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserFormSubmit();
        });
    }

    generateId() {
        return Math.max(0, ...this.projects.map(p => p.id)) + 1;
    }

    addProject(projectData) {
        // Mark that user has interacted with the app
        this.hasUserInteracted = true;
        localStorage.setItem('safetrack_user_interacted', 'true');
        
        const assignedTo = projectData.assignedTo || this.currentUser;
        
        const project = {
            id: this.generateId(),
            ...projectData,
            status: 'active',
            progress: 0,
            createdBy: this.currentUser,
            assignedTo: assignedTo,
            createdAt: new Date().toISOString()
        };
        this.projects.unshift(project);
        this.saveProjects();
        this.render();
        this.closeModal();
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
            assignedTo: formData.get('assignedTo'),
            status: formData.get('status'),
            screenshots: screenshots
        };

        if (this.currentEditId) {
            this.editProject(this.currentEditId, projectData);
        } else {
            this.addProject(projectData);
        }
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
        
        let filteredProjects = this.projects;
        
        // Filter by current user if not viewing all projects
        if (this.currentUser !== 'all') {
            filteredProjects = filteredProjects.filter(project => 
                project.createdBy === this.currentUser
            );
        }
        
        if (searchTerm) {
            filteredProjects = filteredProjects.filter(project => 
                project.name.toLowerCase().includes(searchTerm) ||
                project.description.toLowerCase().includes(searchTerm)
            );
        }
        
        if (statusFilter) {
            filteredProjects = filteredProjects.filter(project => 
                project.status === statusFilter
            );
        }
        
        this.renderProjectTable(filteredProjects);
    }

    render() {
        this.renderDashboardStats();
        this.renderRecentProjects();
        this.renderProjectTable();
        this.populateUserDropdowns(); // Update user dropdowns when rendering
    }

    renderDashboardStats() {
        let projectsToCount = this.projects;
        
        // Filter by current user if not viewing all projects
        if (this.currentUser !== 'all') {
            projectsToCount = projectsToCount.filter(p => p.createdBy === this.currentUser);
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
                        <h6 class="mb-1 fw-bold">${project.name}</h6>
                        <small class="text-muted">Due: ${this.formatDate(project.dueDate)}</small>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-${this.getStatusColor(project)}">
                        ${this.getStatusText(project)}
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
        const projects = projectsToRender || this.projects;
        
        if (projects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">No safety projects found. <button onclick="openProjectModal()" class="btn btn-link p-0">Create your first safety project</button></td></tr>';
            return;
        }

        tbody.innerHTML = projects.map(project => {
            const creator = this.users.find(u => u.id === project.createdBy);
            const creatorName = creator ? creator.name : 'Unknown';
            const creatorAvatar = creator ? creator.avatar : '?';
            
            const assignedTo = this.users.find(u => u.id === project.assignedTo);
            const assignedToName = assignedTo ? assignedTo.name : (project.assignedTo || 'Unassigned');
            const assignedToAvatar = assignedTo ? assignedTo.avatar : '?';
            
            const screenshotCount = project.screenshots ? project.screenshots.length : 0;
            const screenshotThumbnails = project.screenshots ? project.screenshots.slice(0, 3).map(screenshot => 
                `<img src="${screenshot.data}" class="screenshot-thumbnail" alt="${screenshot.name}" 
                      onclick="projectManager.showScreenshots(${project.id})" title="${screenshot.name}">`
            ).join('') : '';
            
            return `
            <tr class="fade-in">
                <td>
                    <div class="d-flex align-items-center">
                        <div class="bg-${this.getCategoryColor(project.category)} text-white p-2 rounded me-3">
                            <i class="fas ${this.getCategoryIcon(project.category)} small"></i>
                        </div>
                        <div>
                            <div class="fw-bold">${project.name}</div>
                            <small class="text-muted">${project.description || 'No description'}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <span class="status-badge bg-${this.getStatusColor(project)} text-white me-2">
                            ${this.getStatusDisplayText(project.status)}
                        </span>
                        <select class="form-select form-select-sm status-dropdown" onchange="projectManager.changeProjectStatus(${project.id}, this.value)">
                            <option value="active" ${project.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="on-hold" ${project.status === 'on-hold' ? 'selected' : ''}>On Hold</option>
                            <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${project.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress me-2 progress-clickable" style="width: 120px; height: 12px;" 
                             onclick="projectManager.openProgressModal(${project.id})" title="Click to update progress">
                            <div class="progress-bar bg-${this.getProgressColor(project.progress)} progress-bar-enhanced" 
                                 style="width: ${project.progress}%"></div>
                        </div>
                        <div class="d-flex flex-column">
                            <span class="text-muted small fw-bold">${project.progress}%</span>
                            <span class="progress-status text-${this.getProgressColor(project.progress)}">${this.getProgressStatus(project.progress)}</span>
                        </div>
                    </div>
                </td>
                <td class="text-muted">${this.formatDate(project.startDate)}</td>
                <td class="text-muted">${this.formatDate(project.dueDate)}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="user-avatar me-2" title="${assignedToName}">${assignedToAvatar}</div>
                        <div>
                            <small class="text-muted">${assignedToName}</small>
                            <br><small class="text-muted" style="font-size: 0.75rem;">by ${creatorName}</small>
                        </div>
                    </div>
                </td>
                <td>
                    ${screenshotCount > 0 ? `
                        <div class="screenshot-gallery">
                            ${screenshotThumbnails}
                            ${screenshotCount > 3 ? `<span class="badge bg-secondary ms-1">+${screenshotCount - 3}</span>` : ''}
                        </div>
                    ` : '<span class="text-muted small">No screenshots</span>'}
                </td>
                <td>
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
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button onclick="projectManager.editProjectModal(${project.id})" class="btn btn-outline-primary" title="Edit Project">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="projectManager.openProgressModal(${project.id})" class="btn btn-outline-success" title="Update Progress">
                            <i class="fas fa-chart-line"></i>
                        </button>
                        ${screenshotCount > 0 ? `<button onclick="projectManager.showScreenshots(${project.id})" class="btn btn-outline-info" title="View Screenshots">
                            <i class="fas fa-images"></i>
                        </button>` : ''}
                        <button onclick="projectManager.deleteProject(${project.id})" class="btn btn-outline-danger" title="Delete Project">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
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
        document.getElementById('projectDueDate').value = project.dueDate;
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

    getStatusText(project) {
        if (project.status === 'completed') return 'Safety Complete';
        if (this.isProjectOverdue(project)) return 'Safety Overdue';
        if (this.isProjectAtRisk(project)) return 'Safety Risk';
        return 'Safety On Track';
    }

    getStatusDisplayText(status) {
        const statusMap = {
            'active': 'Active',
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
        console.log('DEBUG - Before adding user, users.length:', this.users.length);
        this.users.push(user);
        console.log('DEBUG - After adding user locally, users.length:', this.users.length);
        console.log('DEBUG - New user added:', user);
        
        try {
            await this.saveUsers(); // Wait for save to complete!
            console.log('DEBUG - User successfully saved to cloud');
        } catch (error) {
            console.error('DEBUG - Error saving user to cloud:', error);
        }
        
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
        await this.saveUsers(); // Wait for save to complete!
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
        this.currentUser = userId;
        this.saveCurrentUser();
        this.updateUserInterface();
        this.render();
    }

    updateUserInterface() {
        const currentUserName = document.getElementById('currentUserName');
        if (this.currentUser === 'all') {
            currentUserName.textContent = 'All Projects View';
        } else {
            const user = this.users.find(u => u.id === this.currentUser);
            currentUserName.textContent = user ? user.name : 'Select User';
        }
    }

    updateUserDropdown() {
        // Update the project assigned to dropdown
        this.populateUserDropdowns();
        
        // Update the user management table if it's open
        this.renderUserManagementTable();
        
        // Update the current user interface
        this.updateUserInterface();
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
                            <div class="fw-bold">${user.name}</div>
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
        
        // Update main user dropdown in header
        const dropdown = document.querySelector('.dropdown-menu');
        console.log('DEBUG - Updating dropdown, found element:', dropdown);
        console.log('DEBUG - Current users:', this.users);
        console.log('DEBUG - Users count:', this.users.length);
        
        if (dropdown) {
            // Clear existing content
            dropdown.innerHTML = '';
            
            // Add header
            dropdown.innerHTML += '<li><h6 class="dropdown-header">Safety Team Members</h6></li>';
            dropdown.innerHTML += '<li><a class="dropdown-item" href="#" onclick="switchUser(\'all\')"><i class="fas fa-users me-2"></i>All Projects View</a></li>';
            dropdown.innerHTML += '<li><hr class="dropdown-divider"></li>';
            
            // Add each user
            this.users.forEach(user => {
                console.log('DEBUG - Adding user to dropdown:', user.name);
                dropdown.innerHTML += `<li><a class="dropdown-item" href="#" onclick="switchUser('${user.id}')"><i class="fas fa-user me-2"></i>${user.name}</a></li>`;
            });
            
            // Add management options
            dropdown.innerHTML += '<li><hr class="dropdown-divider"></li>';
            dropdown.innerHTML += '<li><a class="dropdown-item" href="#" onclick="openUserModal()"><i class="fas fa-plus me-2"></i>Add New User</a></li>';
            dropdown.innerHTML += '<li><a class="dropdown-item" href="#" onclick="openUserManagement()"><i class="fas fa-users-cog me-2"></i>Manage Users</a></li>';
            dropdown.innerHTML += '<li><hr class="dropdown-divider"></li>';
            dropdown.innerHTML += '<li><a class="dropdown-item text-danger" href="#" onclick="resetAllData()"><i class="fas fa-redo-alt me-2"></i>Reset All Data</a></li>';
            
            console.log('DEBUG - Dropdown updated with HTML:', dropdown.innerHTML);
        } else {
            console.error('DEBUG - Dropdown element not found!');
        }
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
        document.getElementById('progressNotes').value = project.progressNotes || '';
        
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
        const progressNotes = document.getElementById('progressNotes').value;

        // Update project progress
        project.progress = newProgress;
        project.progressNotes = progressNotes;
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
}

// Modal functions
function openProjectModal() {
    // Reset form for new project
    document.getElementById('projectForm').reset();
    document.getElementById('modalTitle').textContent = 'New Safety Project';
    document.getElementById('submitText').textContent = 'Create Safety Project';
    projectManager.currentEditId = null;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('projectModal'));
    modal.show();
}

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
    projectManager.syncData();
}

function switchUser(userId) {
    projectManager.switchUser(userId);
}

function updateProjectProgress() {
    projectManager.updateProjectProgress();
}

function addCategory() {
    projectManager.addCategory();
}

function openCategoryModal() {
    projectManager.openCategoryModal();
}

function addRole() {
    projectManager.addRole();
}

function openRoleModal() {
    projectManager.openRoleModal();
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

// User management is now handled by the dropdown

// Initialize the project manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.projectManager = new ProjectManager();
    
    // Make emergency clear function available globally
    window.emergencyClear = () => {
        window.projectManager.emergencyClearAll();
    };
    
    // Make force dropdown update available globally for testing
    window.forceDropdownUpdate = () => {
        window.projectManager.forceUpdateDropdown();
    };
});
