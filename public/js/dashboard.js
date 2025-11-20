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
});
