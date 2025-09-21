// frontend/public/js/notifications.js
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.userId = null;
        this.userRole = null;
        
        // DOM elements
        this.notificationIcon = document.querySelector('.notification-icon');
        this.notificationDropdown = document.getElementById('notificationDropdown');
        this.notificationList = document.getElementById('notificationList');
        this.seeAllBtn = document.getElementById('seeAllBtn');
        
        // Create badge element
        this.createNotificationBadge();
        
        // Bind events
        this.bindEvents();
        
        console.log('📱 NotificationManager initialized');
    }

    createNotificationBadge() {
        // Create notification badge (red dot with number)
        this.badge = document.createElement('span');
        this.badge.className = 'notification-badge hidden';
        this.badge.id = 'notificationBadge';
        this.notificationIcon.appendChild(this.badge);
        
        // Add CSS for badge (inject into head)
        const style = document.createElement('style');
        style.textContent = `
            .notification-icon {
                position: relative;
                cursor: pointer;
                padding: 10px;
                border-radius: 50%;
                transition: background-color 0.3s;
            }
            
            .notification-icon:hover {
                background-color: rgba(0, 0, 0, 0.1);
            }
            
            .notification-badge {
                position: absolute;
                top: 5px;
                right: 5px;
                background-color: #ff4444;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                animation: pulse 2s infinite;
            }
            
            .notification-badge.hidden {
                display: none !important;
            }
            
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
            
            .notification-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                width: 350px;
                max-height: 400px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 1000;
                overflow: hidden;
            }
            
            .notification-dropdown.hidden {
                display: none;
            }
            
            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid #eee;
                background-color: #f8f9fa;
            }
            
            .notification-header h4 {
                margin: 0;
                font-size: 16px;
                color: #333;
            }
            
            .notification-list {
                list-style: none;
                margin: 0;
                padding: 0;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .notification-item {
                padding: 12px 15px;
                border-bottom: 1px solid #eee;
                cursor: pointer;
                transition: background-color 0.2s;
                position: relative;
            }
            
            .notification-item:hover {
                background-color: #f8f9fa;
            }
            
            .notification-item.unread {
                background-color: #e3f2fd;
                border-left: 3px solid #2196f3;
            }
            
            .notification-item.unread::before {
                content: '';
                position: absolute;
                top: 15px;
                right: 15px;
                width: 8px;
                height: 8px;
                background-color: #2196f3;
                border-radius: 50%;
            }
            
            .notification-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                margin-bottom: 4px;
            }
            
            .notification-message {
                font-size: 13px;
                color: #666;
                margin-bottom: 6px;
                line-height: 1.4;
            }
            
            .notification-time {
                font-size: 11px;
                color: #999;
            }
            
            .notification-actions {
                padding: 10px 15px;
                border-top: 1px solid #eee;
                background-color: #f8f9fa;
                display: flex;
                gap: 10px;
            }
            
            .btn-link {
                background: none;
                border: none;
                color: #007bff;
                cursor: pointer;
                font-size: 12px;
                text-decoration: underline;
            }
            
            .btn-link:hover {
                color: #0056b3;
            }
            
            .no-notifications {
                padding: 30px;
                text-align: center;
                color: #666;
            }
            
            .no-notifications i {
                font-size: 24px;
                margin-bottom: 10px;
                color: #ccc;
            }
        `;
        document.head.appendChild(style);
    }

    bindEvents() {
        // Toggle dropdown
        this.notificationIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.notificationIcon.contains(e.target) && 
                !this.notificationDropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });
        
        // See All button
        this.seeAllBtn.addEventListener('click', () => {
              this.markAllAsRead();
        });
    }

    async init(userId, userRole) {
        this.userId = userId;
        this.userRole = userRole;
        
        console.log(`📱 Initializing notifications for user ${userId}`);
        
        // Load initial notifications
        await this.loadNotifications();
        
        // Set up periodic refresh (every 30 seconds)
        this.startPeriodicRefresh();
    }

    async loadNotifications() {
        if (!this.userId) {
            console.warn('⚠️ No user ID available for loading notifications');
            return;
        }

        try {
            const response = await fetch(`/api/notifications/user/${this.userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': this.userId.toString(),
                    'x-user-role': this.userRole
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.notifications = data.notifications;
                this.unreadCount = data.meta.unreadCount;
                
                console.log(`📱 Loaded ${this.notifications.length} notifications, ${this.unreadCount} unread`);
                
                this.updateUI();
            } else {
                console.error('❌ Failed to load notifications:', data.error);
            }

        } catch (error) {
            console.error('❌ Error loading notifications:', error);
        }
    }

    updateUI() {
        this.updateBadge();
        this.renderNotifications();
    }

    updateBadge() {
        if (this.unreadCount > 0) {
            this.badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount.toString();
            this.badge.classList.remove('hidden');
        } else {
            this.badge.classList.add('hidden');
        }
    }

    renderNotifications() {
        if (this.notifications.length === 0) {
            this.notificationList.innerHTML = `
                <li class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications yet</p>
                </li>
            `;
            return;
        }

        this.notificationList.innerHTML = this.notifications
            .slice(0, 10) // Show only latest 10
            .map(notification => this.createNotificationHTML(notification))
            .join('');

        const existingActions = document.querySelector('.notification-actions');
        if (existingActions) {
        existingActions.remove();
        }

        this.bindNotificationItemEvents();
    }
    createNotificationHTML(notification) {
        const isUnread = !notification.IsRead;
        const timeAgo = this.getTimeAgo(new Date(notification.CreatedAt));
        
        return `
            <li class="notification-item ${isUnread ? 'unread' : ''}" 
                data-notification-id="${notification.NotificationID}">
                <div class="notification-title">${this.escapeHtml(notification.Title)}</div>
                <div class="notification-message">${this.escapeHtml(notification.Message)}</div>
                <div class="notification-time">${timeAgo}</div>
            </li>
        `;
    }

    bindNotificationItemEvents() {
        const items = this.notificationList.querySelectorAll('.notification-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const notificationId = item.dataset.notificationId;
                this.markAsRead(notificationId);
            });
        });
    }

    async markAsRead(notificationId) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': this.userId.toString(),
                    'x-user-role': this.userRole
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                // Update local state
                const notification = this.notifications.find(n => n.NotificationID == notificationId);
                if (notification && !notification.IsRead) {
                    notification.IsRead = true;
                    notification.ReadAt = new Date().toISOString();
                    this.unreadCount = Math.max(0, this.unreadCount - 1);
                    
                    console.log(`✅ Marked notification ${notificationId} as read`);
                    this.updateUI();
                }
            }

        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        if (this.unreadCount === 0) return;

        try {
            const response = await fetch(`/api/notifications/user/${this.userId}/mark-all-read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': this.userId.toString(),
                    'x-user-role': this.userRole
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                // Update local state
                this.notifications.forEach(notification => {
                    if (!notification.IsRead) {
                        notification.IsRead = true;
                        notification.ReadAt = new Date().toISOString();
                    }
                });
                
                this.unreadCount = 0;
                
                console.log(`✅ Marked all notifications as read`);
                this.updateUI();
                this.closeDropdown();
                
                // Show success message
                this.showToast('All notifications marked as read', 'success');
            }

        } catch (error) {
            console.error('❌ Error marking all notifications as read:', error);
            this.showToast('Error marking notifications as read', 'error');
        }
    }

    toggleDropdown() {
        const isHidden = this.notificationDropdown.classList.contains('hidden');
        
        if (isHidden) {
            this.openDropdown();
        } else {
            this.closeDropdown();
        }
    }

    openDropdown() {
        this.notificationDropdown.classList.remove('hidden');
        
        // Refresh notifications when opening
        this.loadNotifications();
    }

    closeDropdown() {
        this.notificationDropdown.classList.add('hidden');
    }

    startPeriodicRefresh() {
        // Refresh every 30 seconds
        setInterval(() => {
            if (this.userId) {
                this.loadNotifications();
            }
        }, 30000);
    }

    showToast(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}-circle"></i>
            <span>${message}</span>
        `;
        
        // Add toast styles
        const style = document.createElement('style');
        style.textContent = `
            .notification-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 6px;
                color: white;
                font-size: 14px;
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 8px;
                animation: slideInRight 0.3s ease-out;
            }
            
            .notification-toast-success { background-color: #28a745; }
            .notification-toast-error { background-color: #dc3545; }
            .notification-toast-info { background-color: #17a2b8; }
            
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        
        if (!document.querySelector('style[data-toast-styles]')) {
            style.setAttribute('data-toast-styles', 'true');
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return date.toLocaleDateString();
    }
}

// Initialize notification manager globally
window.notificationManager = new NotificationManager();

// Export for ES6 modules
export { NotificationManager };