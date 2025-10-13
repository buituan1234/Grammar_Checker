// frontend/public/js/admin/dashboard.js
class DashboardManager {
    constructor() {
        this.charts = {};
        this.data = {};
        this.isLoading = false;
        this.currentUser = null;

        this.init();
    }

    async init() {
        console.log('Initializing admin dashboard...');

        this.updateConnectionStatus('connecting', 'Connecting to database...');

        // ✅ Kiểm tra quyền admin bằng AuthManager
        if (!this.checkAdminAuth()) {
            this.updateConnectionStatus('error', 'Authentication failed');
            window.location.href = '/login.html';
            return;
        }

        this.setupEventListeners();
        await this.loadDashboardData();
    }

    updateConnectionStatus(status, text) {
        const statusIndicator = document.getElementById('connectionStatus');
        const connectionText = document.getElementById('connectionText');

        if (statusIndicator) {
            statusIndicator.className = 'status-indicator';
            switch (status) {
                case 'connecting':
                    statusIndicator.classList.add('status-loading'); break;
                case 'connected':
                    statusIndicator.classList.add('status-success'); break;
                case 'error':
                    statusIndicator.classList.add('status-error'); break;
            }
        }
        if (connectionText) connectionText.textContent = text;
    }

    /**
     * ✅ Kiểm tra quyền admin qua AuthManager
     */
    checkAdminAuth() {
        if (typeof AuthManager === 'undefined' || typeof AuthManager.getCurrentUser !== 'function') {
            console.error('AuthManager not found or invalid');
            return false;
        }

        const user = AuthManager.getCurrentUser();
        if (!user || user.userRole !== 'admin') {
            console.error('Access denied. Admin privileges required.');
            return false;
        }

        this.currentUser = user;
        console.log('✅ Admin authenticated:', user);

        const nameEl = document.getElementById('adminUsername');
        if (nameEl) nameEl.textContent = user.username || 'Admin';

        return true;
    }

    setupEventListeners() {
        document.getElementById('backToAdminBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/admin.html';
        });

        document.getElementById('refreshDashboardBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.loadDashboardData();
        });

        document.getElementById('exportStatsBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.exportStatistics();
        });

        document.getElementById('timeframeSelect')?.addEventListener('change', (e) => {
            this.updateTimelineChart(e.target.value);
        });
    }

    async loadDashboardData() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading(true);
        this.updateConnectionStatus('connecting', 'Loading data...');

        try {
            const [overview, accountTypes, languages, timeframe] = await Promise.all([
                this.fetchOverviewStats(),
                this.fetchAccountTypesStats(),
                this.fetchLanguageStats(),
                this.fetchTimeframeStats('day')
            ]);

            this.data = { overview, accountTypes, languages, timeframe };

            this.updateOverviewCards();
            this.updateCharts();
            this.updateConnectionStatus('connected', 'Connected to Database');

        } catch (err) {
            console.error('❌ Error loading dashboard data:', err);
            this.updateConnectionStatus('error', 'Connection failed');
            this.showError(true);
            this.showToast('Error', 'Failed to load dashboard data: ' + err.message, 'error');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    /**
     * ✅ Fetch có xác thực (dựa trên AuthManager)
     */
    async fetchWithAuth(url, options = {}) {
        if (!this.currentUser) {
            throw new Error('Unauthorized: missing admin session');
        }

        const headers = {
            'Content-Type': 'application/json',
            'x-user-id': this.currentUser.userId?.toString() || '',
            'x-user-role': this.currentUser.userRole || 'admin',
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const json = await response.json();
        if (!json.success) throw new Error(json.error || 'API request failed');
        return json.data;
    }

    // === API LAYER ===
    async fetchOverviewStats() { return await this.fetchWithAuth('/api/stats/overview'); }
    async fetchAccountTypesStats() { return await this.fetchWithAuth('/api/stats/account-types'); }
    async fetchLanguageStats(days = 30) { return await this.fetchWithAuth(`/api/stats/languages?days=${days}`); }
    async fetchTimeframeStats(range = 'day') { return await this.fetchWithAuth(`/api/stats/timeframe?range=${range}&action=grammar_check`); }

    // === UI UPDATE ===
    updateOverviewCards() {
        const o = this.data.overview || {};
        document.getElementById('totalUsersCount').textContent = o.total_users || 0;
        document.getElementById('activeUsersCount').textContent = o.active_users || 0;

        const total = o.total_users || 0;
        const grammarChecks = Math.floor(total * 25);
        const todayChecks = Math.floor(grammarChecks * 0.1);

        document.getElementById('grammarChecksCount').textContent = grammarChecks;
        document.getElementById('todayChecksCount').textContent = todayChecks;
        document.getElementById('languagesCount').textContent = this.data.languages?.languages?.length || 0;
        document.getElementById('mostUsedLanguage').textContent = this.data.languages?.most_used?.language_name || 'N/A';
        document.getElementById('totalNotificationsCount').textContent = o.total_notifications || 0;
        document.getElementById('unreadNotificationsCount').textContent = o.unread_notifications || 0;
    }

    updateCharts() {
        this.updateAccountTypesChart();
        this.updateLanguagesChart();
        this.updateTimelineChart();
    }

    updateAccountTypesChart() {
        const canvas = document.getElementById('accountTypesChart');
        const data = this.data.accountTypes?.breakdown;
        if (!canvas || !data) return;

        if (this.charts.accountTypes) this.charts.accountTypes.destroy();

        const ctx = canvas.getContext('2d');
        this.charts.accountTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.type),
                datasets: [{
                    data: data.map(d => d.count),
                    backgroundColor: ['#28a745', '#ffc107', '#17a2b8', '#dc3545'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
        });
    }

    updateLanguagesChart() {
        const canvas = document.getElementById('languagesChart');
        const langs = this.data.languages?.languages;
        if (!canvas || !langs) return;

        if (this.charts.languages) this.charts.languages.destroy();

        const ctx = canvas.getContext('2d');
        const topLangs = langs.slice(0, 6);

        this.charts.languages = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topLangs.map(l => l.language_name),
                datasets: [{
                    label: 'Usage Count',
                    data: topLangs.map(l => l.usage_count),
                    backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1']
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    updateTimelineChart(range = null) {
        const canvas = document.getElementById('timelineChart');
        if (!canvas) return;

        const timeframe = this.data.timeframe;
        if (range && range !== timeframe?.range) {
            this.fetchTimeframeStats(range).then(data => {
                this.data.timeframe = data;
                this.updateTimelineChart();
            });
            return;
        }

        if (!timeframe?.data) return;
        if (this.charts.timeline) this.charts.timeline.destroy();

        const ctx = canvas.getContext('2d');
        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeframe.data.map(t => t.period),
                datasets: [{
                    label: 'Activities',
                    data: timeframe.data.map(t => t.count),
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });
    }

    async exportStatistics() {
        try {
            this.showExportLoading(true);
            const data = await this.fetchWithAuth('/api/stats/export');
            this.downloadAsExcel(data);
            this.showToast('Success', 'Statistics exported successfully', 'success');
        } catch (err) {
            this.showToast('Error', 'Error exporting statistics: ' + err.message, 'error');
        } finally {
            this.showExportLoading(false);
        }
    }

    downloadAsExcel(data) {
        let csv = "data:text/csv;charset=utf-8,";
        csv += "User ID,Username,Email,Role,Account Type,Status,Created At,Total Notifications,Unread Notifications\n";
        data.data.forEach(u => {
            csv += [
                u.user_id, u.username, u.email, u.role,
                u.account_type, u.status, u.created_at,
                u.notification_count, u.unread_notifications
            ].map(v => `"${v}"`).join(',') + '\n';
        });
        const uri = encodeURI(csv);
        const a = document.createElement('a');
        a.href = uri;
        a.download = `grammar_checker_stats_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    showLoading(show) {
        document.getElementById('dashboardLoading')?.classList.toggle('hidden', !show);
        document.getElementById('dashboardError')?.classList.add('hidden');
    }

    showError(show) {
        document.getElementById('dashboardLoading')?.classList.add('hidden');
        document.getElementById('dashboardError')?.classList.toggle('hidden', !show);
    }

    showExportLoading(show) {
        const btn = document.getElementById('exportStatsBtn');
        if (!btn) return;
        btn.disabled = show;
        btn.innerHTML = show
            ? '<i class="fas fa-spinner fa-spin"></i> Exporting...'
            : '<i class="fas fa-download"></i> Export Excel';
    }

    showToast(title, msg, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        if (!container) return console.log(`${title}: ${msg}`);
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<div class="toast-content"><strong>${title}</strong><p>${msg}</p></div>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (!window.__dashboardInitialized) {
        window.__dashboardInitialized = true;
        new DashboardManager();
    }
});
