document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('.otp-input');
    const message = document.getElementById('message');

    inputs.forEach((input, index) => {
        // Handle input
        input.addEventListener('input', (e) => {
            if (e.target.value.length > 1) {
                e.target.value = e.target.value.slice(0, 1);
            }

            if (e.target.value.length === 1) {
                input.classList.add('filled');
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    // Submit when last digit entered
                    verifyCode();
                }
            } else {
                input.classList.remove('filled');
            }
        });

        // Handle backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });

        // Handle paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            if (!/^\d+$/.test(text)) return;

            const digits = text.split('').slice(0, 6);
            digits.forEach((digit, i) => {
                if (inputs[i]) {
                    inputs[i].value = digit;
                    inputs[i].classList.add('filled');
                }
            });

            if (digits.length === 6) {
                verifyCode();
            } else if (digits.length < 6) {
                inputs[digits.length].focus();
            }
        });
    });

    document.getElementById('google-login').addEventListener('click', () => {
        window.location.href = '/auth/google';
    });

    let countdownInterval;

    function startCountdown(lockedUntil) {
        if (countdownInterval) clearInterval(countdownInterval);

        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, lockedUntil - now);

            if (remaining === 0) {
                clearInterval(countdownInterval);
                message.textContent = 'Lockout expired. You can try again.';
                message.className = 'message';
                inputs.forEach(i => {
                    i.disabled = false;
                    i.classList.remove('error');
                });
                inputs[0].focus();
                return;
            }

            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            message.textContent = `Locked out. Try again in ${timeString}`;
            message.className = 'message error';
            inputs.forEach(i => i.disabled = true);
        };

        updateTimer();
        countdownInterval = setInterval(updateTimer, 1000);
    }

    async function verifyCode() {
        const code = Array.from(inputs).map(i => i.value).join('');
        if (code.length !== 6) return;

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: code })
            });

            const data = await response.json();

            if (data.success) {
                if (countdownInterval) clearInterval(countdownInterval);
                message.textContent = 'Access Granted';
                message.className = 'message success';
                inputs.forEach(i => i.classList.add('filled'));
                setTimeout(() => window.location.href = '/', 1000);
            } else {
                if (data.lockedUntil) {
                    startCountdown(data.lockedUntil);
                } else {
                    message.textContent = data.message || 'Access Denied';
                    message.className = 'message error';
                    inputs.forEach(i => {
                        i.classList.add('error');
                        i.value = '';
                        i.classList.remove('filled');
                    });
                    inputs[0].focus();
                    setTimeout(() => inputs.forEach(i => i.classList.remove('error')), 500);
                }
            }
        } catch (err) {
            console.error(err);
            message.textContent = 'An error occurred';
            message.className = 'message error';
        }
    }
});
