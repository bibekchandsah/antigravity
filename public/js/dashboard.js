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
                labels: data.loginsOverTime.map(d => d.date),
                datasets: [{
                    label: 'Logins',
                    data: data.loginsOverTime.map(d => d.count),
                    borderColor: '#3b82f6',
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
                <td>${log.city}, ${log.country}</td>
                <td>${log.browser} on ${log.os}</td>
            `;
            logContainer.appendChild(row);
        });
    }
});
