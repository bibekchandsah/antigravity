document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const setupTotpBtn = document.getElementById('setup-totp');
    const qrContainer = document.getElementById('qr-container');
    const qrCode = document.getElementById('qr-code');
    const secretKey = document.getElementById('secret-key');

    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/auth/logout', { method: 'POST' });
            window.location.href = '/auth/login';
        } catch (err) {
            console.error('Logout failed', err);
        }
    });

    setupTotpBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/admin/setup-totp');
            const data = await response.json();

            qrCode.src = data.qr_code;
            secretKey.textContent = data.secret;

            // Hide placeholders
            const qrPlaceholder = document.getElementById('qr-placeholder');
            const secretPlaceholder = document.getElementById('secret-placeholder');
            if (qrPlaceholder) qrPlaceholder.classList.add('hidden');
            if (secretPlaceholder) secretPlaceholder.classList.add('hidden');

            // Show content
            qrContainer.classList.add('active');

            // Show the secret text
            const secretText = secretKey.closest('.secret-text');
            if (secretText) {
                secretText.classList.add('active');
            }
        } catch (err) {
            console.error('Failed to setup TOTP', err);
        }
    });


    // Fetch and Render Charts
    fetch('/admin/stats')
        .then(response => response.json())
        .then(data => {
            renderCharts(data);
            updateRecentLogs(data.recentLogs);
            updateUptime(data.uptime);
        })
        .catch(err => console.error('Error fetching stats:', err));

    function updateUptime(seconds) {
        const uptimeElement = document.getElementById('uptime');
        if (!uptimeElement) return;

        if (typeof seconds !== 'number') return;

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        uptimeElement.textContent = `${hours}h ${minutes}m`;
    }

    // Helper function to hide loading indicator and show chart
    function hideLoading(chartId) {
        const container = document.getElementById(chartId).closest('.chart-container');
        const loading = container.querySelector('.chart-loading');
        const canvas = document.getElementById(chartId);

        if (loading) {
            loading.classList.add('hidden');
            setTimeout(() => loading.remove(), 300);
        }
        canvas.classList.add('loaded');
    }

    function renderCharts(data) {
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.borderColor = '#334155';

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

        // Login Chart
        const loginCtx = document.getElementById('loginChart').getContext('2d');
        new Chart(loginCtx, {
            type: 'line',
            data: {
                labels: data.successfulLogins.map(d => new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
                datasets: [{
                    label: 'Successful',
                    data: data.successfulLogins.map(d => d.count),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#1e293b',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }, {
                    label: 'Failed',
                    data: data.failedLogins ? data.failedLogins.map(d => d.count) : [],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#1e293b',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { usePointStyle: true, boxWidth: 8 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#334155', drawBorder: false },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        grid: { display: false, drawBorder: false }
                    }
                },
                animation: {
                    onComplete: () => hideLoading('loginChart')
                }
            }
        });

        // Browser Chart
        const browserCtx = document.getElementById('browserChart').getContext('2d');
        new Chart(browserCtx, {
            type: 'doughnut',
            data: {
                labels: data.browserDistribution.map(d => d.browser),
                datasets: [{
                    data: data.browserDistribution.map(d => d.count),
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                },
                animation: {
                    onComplete: () => hideLoading('browserChart')
                }
            }
        });

        // OS Chart
        const osCtx = document.getElementById('osChart').getContext('2d');
        new Chart(osCtx, {
            type: 'doughnut',
            data: {
                labels: data.osDistribution.map(d => d.os),
                datasets: [{
                    data: data.osDistribution.map(d => d.count),
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                },
                animation: {
                    onComplete: () => hideLoading('osChart')
                }
            }
        });

        // City Chart
        const cityCtx = document.getElementById('cityChart').getContext('2d');
        new Chart(cityCtx, {
            type: 'bar',
            data: {
                labels: data.cityDistribution.map(d => d.city),
                datasets: [{
                    label: 'Logins',
                    data: data.cityDistribution.map(d => d.count),
                    backgroundColor: '#3b82f6',
                    borderRadius: 4,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                },
                animation: {
                    onComplete: () => hideLoading('cityChart')
                }
            }
        });

        // Region Chart
        const regionCtx = document.getElementById('regionChart').getContext('2d');
        new Chart(regionCtx, {
            type: 'bar',
            data: {
                labels: data.regionDistribution.map(d => d.region),
                datasets: [{
                    label: 'Logins',
                    data: data.regionDistribution.map(d => d.count),
                    backgroundColor: '#10b981',
                    borderRadius: 4,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                },
                animation: {
                    onComplete: () => hideLoading('regionChart')
                }
            }
        });

        // Country Chart
        const countryCtx = document.getElementById('countryChart').getContext('2d');
        new Chart(countryCtx, {
            type: 'bar',
            data: {
                labels: data.countryDistribution.map(d => d.country),
                datasets: [{
                    label: 'Logins',
                    data: data.countryDistribution.map(d => d.count),
                    backgroundColor: '#f59e0b',
                    borderRadius: 4,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                },
                animation: {
                    onComplete: () => hideLoading('countryChart')
                }
            }
        });

        // Device Chart
        const deviceCtx = document.getElementById('deviceChart').getContext('2d');
        new Chart(deviceCtx, {
            type: 'doughnut',
            data: {
                labels: data.deviceDistribution.map(d => d.device),
                datasets: [{
                    data: data.deviceDistribution.map(d => d.count),
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                },
                animation: {
                    onComplete: () => hideLoading('deviceChart')
                }
            }
        });

        // Hourly Chart
        const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
        new Chart(hourlyCtx, {
            type: 'bar',
            data: {
                labels: data.hourlyActivity.map(d => {
                    const date = new Date();
                    date.setHours(d.hour, 0, 0, 0);
                    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                }),
                datasets: [{
                    label: 'Activity',
                    data: data.hourlyActivity.map(d => d.count),
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#334155', drawBorder: false }, ticks: { stepSize: 1 } },
                    x: { grid: { display: false, drawBorder: false } }
                },
                animation: {
                    onComplete: () => hideLoading('hourlyChart')
                }
            }
        });
    }

    // Infinite Scroll Logic
    let currentOffset = 20; // Initial load is 20
    let isLoading = false;
    let hasMore = true;
    const tableContainer = document.getElementById('activity-table-container');
    const tableLoading = document.getElementById('table-loading');

    tableContainer.addEventListener('scroll', () => {
        if (isLoading || !hasMore) return;

        // Check if scrolled to bottom (with 50px threshold)
        if (tableContainer.scrollTop + tableContainer.clientHeight >= tableContainer.scrollHeight - 50) {
            loadMoreLogs();
        }
    });

    async function loadMoreLogs() {
        isLoading = true;
        tableLoading.style.display = 'block';

        try {
            const response = await fetch(`/admin/activity-logs?offset=${currentOffset}&limit=10`);
            const data = await response.json();

            if (data.logs && data.logs.length > 0) {
                appendLogs(data.logs);
                currentOffset += 10;

                // If we got fewer logs than limit, we've reached the end
                if (data.logs.length < 10) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        } catch (err) {
            console.error('Error loading more logs:', err);
        } finally {
            isLoading = false;
            tableLoading.style.display = 'none';
        }
    }

    function appendLogs(logs) {
        const tbody = document.getElementById('activity-log');

        logs.forEach(log => {
            const row = document.createElement('tr');
            const date = new Date(log.timestamp).toLocaleString();
            const statusClass = log.success ? 'event-success' : 'event-error'; // Note: Check if 'success' property exists or derive from 'type'

            // Fix: 'success' might not be in the raw log object from /activity-logs if it's just SELECT *
            // The getStats one might have processed it or the DB has 'type' column.
            // Let's check DB schema. 'type' is TEXT. 'Successful' or 'Failed...'

            let isSuccess = false;
            let eventText = log.type;

            if (log.type && log.type.startsWith('Successful')) {
                isSuccess = true;
            }

            if (log.type === 'Successful Login') {
                eventText = 'TOTP Login Success';
            } else if (log.type === 'Successful Google Login') {
                eventText = 'Google Login Success';
            } else if (log.type === 'Failed Login Attempt') {
                eventText = 'Login Failed';
            } else if (log.type === 'Unauthorized Google Login Attempt') {
                eventText = 'Google Login Failed';
            }

            const rowStatusClass = isSuccess ? 'event-success' : 'event-error';

            row.innerHTML = `
                <td>${date}</td>
                <td class="${rowStatusClass}">${eventText}</td>
                <td>${log.ip || 'Unknown'}</td>
                <td>${log.city || '-'}</td>
                <td>${log.region || '-'}</td>
                <td>${log.country || '-'}</td>
                <td>${log.browser || '-'}</td>
                <td>${log.os || '-'}</td>
                <td>${log.device || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    function updateRecentLogs(logs) {
        const tbody = document.getElementById('activity-log');
        tbody.innerHTML = '';

        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No recent activity</td></tr>';
            return;
        }

        logs.forEach(log => {
            const row = document.createElement('tr');
            const date = new Date(log.timestamp).toLocaleString();

            // Logic to determine success/failure from 'type'
            let isSuccess = false;
            let eventText = log.type;

            if (log.type && log.type.startsWith('Successful')) {
                isSuccess = true;
            }

            if (log.type === 'Successful Login') {
                eventText = 'TOTP Login Success';
            } else if (log.type === 'Successful Google Login') {
                eventText = 'Google Login Success';
            } else if (log.type === 'Failed Login Attempt') {
                eventText = 'Login Failed';
            } else if (log.type === 'Unauthorized Google Login Attempt') {
                eventText = 'Google Login Failed';
            }

            const statusClass = isSuccess ? 'event-success' : 'event-error';

            row.innerHTML = `
                <td>${date}</td>
                <td class="${statusClass}">${eventText}</td>
                <td>${log.ip || 'Unknown'}</td>
                <td>${log.city || '-'}</td>
                <td>${log.region || '-'}</td>
                <td>${log.country || '-'}</td>
                <td>${log.browser || '-'}</td>
                <td>${log.os || '-'}</td>
                <td>${log.device || '-'}</td>
            `;
            tbody.appendChild(row);
        });
    }
});
