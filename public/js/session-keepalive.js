/**
 * Session Keep-Alive with Activity Detection
 * Only pings the server when user is actively using the page
 * Redirects to login page if user is inactive for the session timeout duration
 */

(function () {
    let lastActivityTime = Date.now();
    let sessionTimeoutMinutes = 15; // Default
    let pingInterval = null;
    let redirectTimer = null;

    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];

    let throttleTimer = null;
    function updateActivity() {
        if (throttleTimer) return;

        throttleTimer = setTimeout(() => {
            lastActivityTime = Date.now();
            resetRedirectTimer();
            throttleTimer = null;
        }, 1000); // Throttle updates to once per second
    }

    // Listen for user activity
    activityEvents.forEach(event => {
        document.addEventListener(event, updateActivity, true);
    });

    function resetRedirectTimer() {
        if (redirectTimer) clearTimeout(redirectTimer);

        // Set a timer to redirect if no activity occurs
        // We add a small buffer (e.g., 1 second) to ensure server session has likely expired too
        const timeoutMs = sessionTimeoutMinutes * 60 * 1000;

        redirectTimer = setTimeout(() => {
            console.log('Session timed out due to inactivity. Redirecting to login...');
            window.location.href = '/auth/login?error=Session Timed Out';
        }, timeoutMs);
    }

    // Fetch session timeout from server and set ping interval
    async function initializeKeepAlive() {
        try {
            // Get session timeout from server (in minutes)
            const response = await fetch('/api/session-config');
            const config = await response.json();
            sessionTimeoutMinutes = config.sessionTimeout || 15;

            console.log('Keep-alive initialized. Timeout (mins):', sessionTimeoutMinutes);

            // Ping at half the session timeout to ensure we refresh before expiry
            const PING_INTERVAL = (sessionTimeoutMinutes / 2) * 60 * 1000;

            console.log(`Session timeout: ${sessionTimeoutMinutes} minutes`);
            console.log(`Ping interval: ${sessionTimeoutMinutes / 2} minutes (only when active)`);

            // Initialize the redirect timer now that we have the timeout value
            resetRedirectTimer();

            // Ping the server to refresh session (only if user was recently active)
            async function conditionalPing() {
                const timeSinceActivity = Date.now() - lastActivityTime;
                const activityThreshold = sessionTimeoutMinutes * 60 * 1000; // Same as session timeout

                // Only ping if user was active within the session timeout period
                if (timeSinceActivity < activityThreshold) {
                    try {
                        const response = await fetch('/api/ping', {
                            method: 'GET',
                            credentials: 'include'
                        });

                        // Check if the server redirected us to login (meaning session expired)
                        if (response.redirected || response.url.includes('/auth/login')) {
                            console.warn('Session ping returned login page. Session expired.');
                            window.location.href = '/auth/login?error=Session Expired';
                            return;
                        }

                        if (!response.ok) {
                            throw new Error(`Ping failed with status: ${response.status}`);
                        }

                        console.log('Session refreshed (user active)');
                    } catch (err) {
                        console.error('Session ping failed:', err);
                    }
                } else {
                    console.log('Skipping ping - user inactive');
                }
            }

            // Start pinging
            pingInterval = setInterval(conditionalPing, PING_INTERVAL);

            // Initial ping after 30 seconds (if active)
            setTimeout(conditionalPing, 30 * 1000);
        } catch (err) {
            console.error('Failed to initialize session keep-alive:', err);
        }
    }

    // Initialize when page loads
    initializeKeepAlive();
})();
