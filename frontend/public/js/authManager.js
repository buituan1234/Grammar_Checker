'use strict';

const AuthManager = {
    getTabId() {
        let tabId = sessionStorage.getItem('tabId');
        if (!tabId) {
            tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('tabId', tabId);
            console.log('🆔 New Tab ID created:', tabId);
        }
        return tabId;
    },

    getAllSessions() {
        const sessions = localStorage.getItem('userSessions');
        return sessions ? JSON.parse(sessions) : {};
    },

    getCurrentUser() {
        const tabId = this.getTabId();
        const allSessions = this.getAllSessions();
        const userData = allSessions[tabId];
        return userData ? { ...userData, _tabId: tabId } : null;
    },

    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    isAdmin() {
        const user = this.getCurrentUser();
        return user?.userRole === 'admin';
    },

    canAccessGrammarChecker() {
        return this.isLoggedIn();
    },

    canAccessAdminPanel() {
        return this.isAdmin();
    },

    login(userData) {
        if (!userData || !userData.userRole) {
            throw new Error('Invalid user data');
        }

        const tabId = this.getTabId();
        const allSessions = this.getAllSessions();
        allSessions[tabId] = {
            ...userData,
            loginTime: Date.now(),
            lastActive: Date.now()
        };

        localStorage.setItem('userSessions', JSON.stringify(allSessions));
        console.log(`✅ ${userData.userRole} logged in on tab ${tabId}:`, userData.username);
        window.dispatchEvent(new CustomEvent('auth-login', {
            detail: { user: userData, tabId: tabId }
        }));

        return userData;
    },

    logout() {
        const user = this.getCurrentUser();

        if (!user) {
            console.warn('No user to logout');
            return false;
        }

        const tabId = this.getTabId();
        const allSessions = this.getAllSessions();
        delete allSessions[tabId];
        localStorage.setItem('userSessions', JSON.stringify(allSessions));
        sessionStorage.removeItem('wasLoggedIn');

        console.log(`✅ ${user.userRole} logged out from tab ${tabId}:`, user.username);

        localStorage.setItem('logout_sync', JSON.stringify({
            userId: user.userId,
            sessionId: tabId,
            time: Date.now()
        }));

        window.dispatchEvent(new CustomEvent('auth-logout', {
            detail: { user, tabId }
        }));

        return true;
    },

    logoutAll() {
        localStorage.removeItem('userSessions');
        sessionStorage.removeItem('wasLoggedIn');
        this.broadcastLogoutAll();
        window.dispatchEvent(new CustomEvent('auth-logout-all'));
        return true;
    },

    broadcastLogoutAll() {
        localStorage.setItem('logout_sync_all', Date.now());
    },

    updateActivity() {
        const tabId = this.getTabId();
        const allSessions = this.getAllSessions();
        if (allSessions[tabId]) {
            allSessions[tabId].lastActive = Date.now();
            localStorage.setItem('userSessions', JSON.stringify(allSessions));
        }
    },

    cleanupOldSessions(maxAge = 24 * 60 * 60 * 1000) {
        const allSessions = this.getAllSessions();
        const now = Date.now();
        const currentTabId = this.getTabId();

        let cleaned = 0;
        Object.keys(allSessions).forEach(tabId => {
            const s = allSessions[tabId];
            const lastActive = s.lastActive || s.loginTime || 0;
            if (tabId !== currentTabId && now - lastActive > maxAge) {
                delete allSessions[tabId];
                cleaned++;
            }
        });
        if (cleaned > 0) {
            localStorage.setItem('userSessions', JSON.stringify(allSessions));
            console.log(`🧹 Cleaned up ${cleaned} old sessions`);
        }
        return cleaned;
    },

    getSessionsInfo() {
        const allSessions = this.getAllSessions();
        const currentTabId = this.getTabId();
        return Object.keys(allSessions).map(tabId => ({
            tabId,
            isCurrent: tabId === currentTabId,
            username: allSessions[tabId].username,
            userRole: allSessions[tabId].userRole,
            loginTime: new Date(allSessions[tabId].loginTime).toLocaleString(),
            lastActive: new Date(allSessions[tabId].lastActive).toLocaleString()
        }));
    },

    validatePageAccess() {
        const path = window.location.pathname;
        if (path.includes('admin') && !this.canAccessAdminPanel()) {
            console.warn('⚠️ Access denied to admin panel');
            window.location.href = '/login.html?message=admin_required';
            return false;
        }
        if (path.includes('GrammarChecker1') && !this.canAccessGrammarChecker()) {
            console.warn('⚠️ Access denied to grammar checker');
            window.location.href = '/login.html?message=login_required';
            return false;
        }
        return true;
    },

    setupActivityTracking() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        let lastUpdate = Date.now();
        const updateInterval = 60000;

        events.forEach(eName => {
            document.addEventListener(eName, () => {
                const now = Date.now();
                if (now - lastUpdate > updateInterval) {
                    this.updateActivity();
                    lastUpdate = now;
                }
            }, { passive: true });
        });

        setInterval(() => {
            if (!document.hidden && this.isLoggedIn()) {
                this.updateActivity();
            }
        }, updateInterval);
    },

    setupLogoutSync() {
        window.addEventListener('storage', (event) => {
            if (event.key !== 'logout_sync') return;

            try {
                const data = JSON.parse(event.newValue);
                if (!data?.userId) return;

                const currentUser = this.getCurrentUser();
                if (currentUser && currentUser.userId === data.userId) {
                    console.log('📢 Logout sync received:', data);
                    this.localLogout();
                }
            } catch (err) {
                console.warn('⚠️ Error handling logout_sync event:', err);
            }
        });
    },

    localLogout() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return;

        const tabId = this.getTabId();
        const allSessions = this.getAllSessions();
        delete allSessions[tabId];
        localStorage.setItem('userSessions', JSON.stringify(allSessions));

        console.log(`🚪 [SYNC] Tab ${tabId} auto-logged out for userId: ${currentUser.userId}`);
        window.dispatchEvent(new CustomEvent('auth-logout-sync', {
            detail: { userId: currentUser.userId, tabId }
        }));

        window.location.href = '/login.html?message=logout_sync';
    },
};

// Initialize
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;

    window.addEventListener('load', () => {
        AuthManager.cleanupOldSessions();
        AuthManager.setupActivityTracking();
        AuthManager.setupLogoutSync();
        AuthManager.validatePageAccess();
    });
}
