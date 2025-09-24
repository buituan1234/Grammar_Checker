// frontend/public/js/admin/dashboard.js
class DashboardManager {
    constructor() {
        this.charts = {};
        this.data = {};
        this.isLoading = false;
        
        // Initialize dashboard
        this.init();
    }

    async init() {
        console.log('Initializing dashboard...');
        
        this.updateConnectionStatus('connecting', 'Connecting to database...');
        
        if (!this.checkAdminAuth()) {
            this.updateConnectionStatus('error', 'Authentication failed');
            window.location.href = 'login.html';
            return;
        }
        
        this.setupEventListeners();
        
        await this.loadDashboardData();
    }

    updateConnectionStatus(status, text) {
        const statusIndicator = document.getElementById('connectionStatus');
        const connectionText = document.getElementById('connectionText');
        
        console.log(`Updating connection status to: ${status} - ${text}`);
        
        if (statusIndicator) {
            statusIndicator.className = 'status-indicator';
            switch(status) {
                case 'connecting':
                    statusIndicator.classList.add('status-loading');
                    break;
                case 'connected':
                    statusIndicator.classList.add('status-success');
                    break;
                case 'error':
                    statusIndicator.classList.add('status-error');
                    break;
            }
            console.log('Status indicator classes:', statusIndicator.className);
        } else {
            console.error('Status indicator element not found');
        }
        
        if (connectionText) {
            connectionText.textContent = text;
            console.log('Connection text updated to:', text);
        } else {
            console.error('Connection text element not found');
        }
    }

    checkAdminAuth() {
        const userData = JSON.parse(localStorage.getItem('loggedInAs_admin')) ||
                        JSON.parse(localStorage.getItem('loggedInAs'));
        
        if (!userData || userData.userRole !== 'admin') {
            console.error('Admin authentication required');
            return false;
        }
        
        // Update header username
        document.getElementById('adminUsername').textContent = userData.username || 'Admin';
        return true;
    }

    setupEventListeners() {
        console.log('Setting up dashboard event listeners...');

        document.getElementById('backToAdminBtn')?.addEventListener('click', (e) => {
            console.log('Back to Admin Panel button clicked');
            e.preventDefault();
            window.location.href = 'admin.html';
        });

        document.getElementById('refreshDashboardBtn')?.addEventListener('click', (e) => {
            console.log('Refresh dashboard button clicked');
            e.preventDefault();
            this.loadDashboardData();
        });

        document.getElementById('exportStatsBtn')?.addEventListener('click', (e) => {
            console.log('Export stats button clicked');
            e.preventDefault();
            this.exportStatistics();
        });

        document.getElementById('timeframeSelect')?.addEventListener('change', (e) => {
            console.log('Timeframe changed:', e.target.value);
            this.updateTimelineChart(e.target.value);
        });

        console.log('Dashboard event listeners setup complete');
    }

    async loadDashboardData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoading(true);
        this.updateConnectionStatus('connecting', 'Loading data...');
        
        try {
            console.log('Loading dashboard data...');
            
            const [overviewData, accountTypesData, languagesData, timeframeData] = await Promise.all([
                this.fetchOverviewStats(),
                this.fetchAccountTypesStats(),
                this.fetchLanguageStats(),
                this.fetchTimeframeStats('day')
            ]);

            this.data = {
                overview: overviewData,
                accountTypes: accountTypesData,
                languages: languagesData,
                timeframe: timeframeData
            };

            this.updateOverviewCards();
            this.updateCharts();
            
            console.log('Dashboard data loaded successfully:', this.data);
            this.updateConnectionStatus('connected', 'Connected to Database');

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.updateConnectionStatus('error', 'Connection failed');
            this.showError(true);
            this.showToast('Error', 'Failed to load dashboard data: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    async fetchWithAuth(url, options = {}) {
        const userData = JSON.parse(localStorage.getItem('loggedInAs_admin')) ||
                        JSON.parse(localStorage.getItem('loggedInAs'));
        
        const headers = {
            'Content-Type': 'application/json',
            'x-user-role': 'admin',
            'x-user-id': userData?.userId?.toString() || '',
            ...options.headers
        };

        console.log('Fetching:', url, 'with headers:', headers);

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'API request failed');
        }

        return data.data;
    }

    async fetchOverviewStats() {
        return await this.fetchWithAuth('/api/stats/overview');
    }

    async fetchAccountTypesStats() {
        return await this.fetchWithAuth('/api/stats/account-types');
    }

    async fetchLanguageStats(days = 30) {
        return await this.fetchWithAuth(`/api/stats/languages?days=${days}`);
    }

    async fetchTimeframeStats(range = 'day') {
        return await this.fetchWithAuth(`/api/stats/timeframe?range=${range}&action=grammar_check`);
    }

    updateOverviewCards() {
        console.log('Updating overview cards with data:', this.data.overview);
        
        const { overview } = this.data;
        if (!overview) {
            console.warn('No overview data available');
            return;
        }

        // Update user stats
        document.getElementById('totalUsersCount').textContent = overview.total_users || 0;
        document.getElementById('activeUsersCount').textContent = overview.active_users || 0;

        // Calculate mock data if needed
        const totalUsers = overview.total_users || 0;
        const grammarChecks = Math.floor(totalUsers * 25) || 0;
        const todayChecks = Math.floor(grammarChecks * 0.1) || 0;

        document.getElementById('grammarChecksCount').textContent = grammarChecks;
        document.getElementById('todayChecksCount').textContent = todayChecks;

        // Update language stats
        const languageCount = this.data.languages?.languages?.length || 0;
        document.getElementById('languagesCount').textContent = languageCount;
        document.getElementById('mostUsedLanguage').textContent = 
            this.data.languages?.most_used?.language_name || 'N/A';

        // Update notification stats
        document.getElementById('totalNotificationsCount').textContent = overview.total_notifications || 0;
        document.getElementById('unreadNotificationsCount').textContent = overview.unread_notifications || 0;
    }

    updateCharts() {
        console.log('Updating charts...');
        this.updateAccountTypesChart();
        this.updateLanguagesChart();
        this.updateTimelineChart();
    }

    updateAccountTypesChart() {
        const canvas = document.getElementById('accountTypesChart');
        const { accountTypes } = this.data;
        
        if (!canvas || !accountTypes?.breakdown) {
            console.warn('Cannot update account types chart: missing canvas or data');
            return;
        }

        // Destroy existing chart
        if (this.charts.accountTypes) {
            this.charts.accountTypes.destroy();
        }

        const ctx = canvas.getContext('2d');
        
        this.charts.accountTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: accountTypes.breakdown.map(item => 
                    item.type.charAt(0).toUpperCase() + item.type.slice(1)
                ),
                datasets: [{
                    data: accountTypes.breakdown.map(item => item.count),
                    backgroundColor: [
                        '#28a745',
                        '#ffc107',
                        '#17a2b8',
                        '#dc3545'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label;
                                const value = context.parsed;
                                const percentage = accountTypes.breakdown[context.dataIndex].percentage;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateLanguagesChart() {
        const canvas = document.getElementById('languagesChart');
        const { languages } = this.data;
        
        if (!canvas || !languages?.languages) {
            console.warn('Cannot update languages chart: missing canvas or data');
            return;
        }

        // Destroy existing chart
        if (this.charts.languages) {
            this.charts.languages.destroy();
        }

        const ctx = canvas.getContext('2d');
        
        // Take top 6 languages
        const topLanguages = languages.languages.slice(0, 6);
        
        this.charts.languages = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topLanguages.map(item => item.language_name),
                datasets: [{
                    label: 'Usage Count',
                    data: topLanguages.map(item => item.usage_count),
                    backgroundColor: [
                        '#007bff',
                        '#28a745',
                        '#ffc107',
                        '#dc3545',
                        '#17a2b8',
                        '#6f42c1'
                    ],
                    borderWidth: 1,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: (context) => {
                                const lang = topLanguages[context.dataIndex];
                                return `Percentage: ${lang.percentage}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateTimelineChart(range = null) {
        const canvas = document.getElementById('timelineChart');
        let { timeframe } = this.data;
        
        if (!canvas) {
            console.warn('Timeline chart canvas not found');
            return;
        }

        // If range is specified, fetch new data
        if (range && range !== timeframe?.range) {
            this.fetchTimeframeStats(range).then(data => {
                this.data.timeframe = data;
                this.updateTimelineChart();
            }).catch(console.error);
            return;
        }

        if (!timeframe?.data) {
            console.warn('No timeline data available');
            return;
        }

        // Destroy existing chart
        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        const ctx = canvas.getContext('2d');
        
        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeframe.data.map(item => item.period),
                datasets: [{
                    label: 'Activities',
                    data: timeframe.data.map(item => item.count),
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        titleCallback: (tooltipItems) => {
                            return `Period: ${tooltipItems[0].label}`;
                        }
                    }
                }
            }
        });
    }

    async exportStatistics() {
        try {
            console.log('Starting export...');
            this.showExportLoading(true);
            
            const exportData = await this.fetchWithAuth('/api/stats/export');
            
            // Convert to CSV and download
            this.downloadAsExcel(exportData);
            
            this.showToast('Success', 'Statistics exported successfully', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Error', 'Error exporting statistics: ' + error.message, 'error');
        } finally {
            this.showExportLoading(false);
        }
    }

    downloadAsExcel(data) {
        // Create CSV content
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Add headers
        csvContent += "User ID,Username,Email,Role,Account Type,Status,Created At,Total Notifications,Unread Notifications\n";
        
        // Add data rows
        data.data.forEach(user => {
            const row = [
                user.user_id,
                user.username,
                user.email,
                user.role,
                user.account_type,
                user.status,
                user.created_at,
                user.notification_count,
                user.unread_notifications
            ];
            csvContent += row.map(field => `"${field}"`).join(',') + '\n';
        });

        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `grammar_checker_stats_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showLoading(show) {
        const loading = document.getElementById('dashboardLoading');
        const error = document.getElementById('dashboardError');
        
        if (loading) {
            loading.classList.toggle('hidden', !show);
        }
        if (error) {
            error.classList.add('hidden');
        }
    }

    showError(show) {
        const loading = document.getElementById('dashboardLoading');
        const error = document.getElementById('dashboardError');
        
        if (loading) {
            loading.classList.add('hidden');
        }
        if (error) {
            error.classList.toggle('hidden', !show);
        }
    }

    showExportLoading(show) {
        const exportBtn = document.getElementById('exportStatsBtn');
        if (exportBtn) {
            const icon = exportBtn.querySelector('i');
            
            if (show) {
                exportBtn.disabled = true;
                icon.className = 'fas fa-spinner fa-spin';
                exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            } else {
                exportBtn.disabled = false;
                icon.className = 'fas fa-download';
                exportBtn.innerHTML = '<i class="fas fa-download"></i> Export Excel';
            }
        }
    }

    // Toast notification function
    showToast(title, message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.log('Toast:', title, '-', message);
            return;
        }

        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        
        const icons = {
            success: '✅',
            error: '❌', 
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${icons[type] || icons.info}</div>
                <div class="toast-message">
                    <div class="toast-title">${title}</div>
                    <div class="toast-text">${message}</div>
                </div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="toast-progress ${type}"></div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            if (document.getElementById(toastId)) {
                document.getElementById(toastId).remove();
            }
        }, duration);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing dashboard...');
  if (!window.__dashboardInitialized) {
    window.__dashboardInitialized = true;
    new DashboardManager();
  }
});