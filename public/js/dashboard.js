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
            qrContainer.style.display = 'block';
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
        })
        .catch(err => console.error('Error fetching stats:', err));

    function renderCharts(data) {
        // Login Chart
        const loginCtx = document.getElementById('loginChart').getContext('2d');
        new Chart(loginCtx, {
            type: 'line',
            data: {
                labels: data.successfulLogins.map(d => d.date),
                datasets: [{
                    label: 'Successful Logins',
                    data: data.successfulLogins.map(d => d.count),
                    borderColor: '#3b82f6',
                    tension: 0.4
                }, {
                    label: 'Failed Attempts',
                    data: data.failedLogins ? data.failedLogins.map(d => d.count) : [],
                    borderColor: '#ef4444',
                    tension: 0.4
                }]
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
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
            }
        });

        // OS Chart
        const osCtx = document.getElementById('osChart').getContext('2d');
        new Chart(osCtx, {
            type: 'pie',
            data: {
                labels: data.osDistribution.map(d => d.os),
                datasets: [{
                    data: data.osDistribution.map(d => d.count),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
            }
        });

        // City Chart
        const cityCtx = document.getElementById('cityChart').getContext('2d');
        new Chart(cityCtx, {
            type: 'bar',
            data: {
                labels: data.cityDistribution.map(d => d.city),
                datasets: [{
                    label: 'Logins by City',
                    data: data.cityDistribution.map(d => d.count),
                    backgroundColor: '#3b82f6'
                }]
            }
        });

        // Region Chart
        const regionCtx = document.getElementById('regionChart').getContext('2d');
        new Chart(regionCtx, {
            type: 'bar',
            data: {
                labels: data.regionDistribution.map(d => d.region),
                datasets: [{
                    label: 'Logins by Region',
                    data: data.regionDistribution.map(d => d.count),
                    backgroundColor: '#10b981'
                }]
            }
        });

        // Country Chart
        const countryCtx = document.getElementById('countryChart').getContext('2d');
        new Chart(countryCtx, {
            type: 'pie',
            data: {
                labels: data.countryDistribution.map(d => d.country),
                datasets: [{
                    data: data.countryDistribution.map(d => d.count),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
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
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                }]
            }
        });

        // Hourly Activity Chart
        const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');

        // Process hourly data to ensure all 24 hours are represented
        const hourlyData = new Array(24).fill(0);
        if (data.hourlyActivity) {
            data.hourlyActivity.forEach(item => {
                hourlyData[parseInt(item.hour)] = parseInt(item.count);
            });
        }

        new Chart(hourlyCtx, {
            type: 'bar',
            data: {
                labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Logins',
                    data: hourlyData,
                    backgroundColor: '#8b5cf6',
                    borderRadius: 4
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    function updateRecentLogs(logs) {
        const logContainer = document.getElementById('activity-log');
        logContainer.innerHTML = '';

        if (!logs || logs.length === 0) {
            logContainer.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No recent activity</td></tr>';
            return;
        }

        logs.forEach(log => {
            const row = document.createElement('tr');
            // Format date
            const date = new Date(log.timestamp).toLocaleString();

            row.innerHTML = `
                <td>${date}</td>
                <td>${log.type}</td>
                <td>${log.ip}</td>
                <td>${log.city}</td>
                <td>${log.region}</td>
                <td>${log.country}</td>
                <td>${log.browser}</td>
                <td>${log.os}</td>
                <td>${log.device}</td>
            `;
            logContainer.appendChild(row);
        });
    }
});
