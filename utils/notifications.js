const TelegramBot = require('node-telegram-bot-api');
const sgMail = require('@sendgrid/mail');

// Telegram Setup
const bot = process.env.TELEGRAM_BOT_TOKEN ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false }) : null;

// SendGrid Setup
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendNotification = async (type, details) => {
    let locationInfo = '';

    if (process.env.ENABLE_IPINFO === 'true' && process.env.IPINFO_API_KEY) {
        try {
            // Use dynamic import for node-fetch or use built-in fetch if Node 18+
            // Since we didn't install node-fetch, let's use the native fetch API (Node 18+)
            const response = await fetch(`https://ipinfo.io/${details.ip}?token=${process.env.IPINFO_API_KEY}`);
            const data = await response.json();
            if (data && !data.error) {
                locationInfo = `
    Location: ${data.city}, ${data.region}, ${data.country}
    Org: ${data.org}
    Map: https://www.google.com/maps?q=${data.loc}`;
            }
        } catch (err) {
            console.error('IPInfo Error:', err.message);
        }
    }

    const message = `
    🔐 Security Alert: ${type}
    
    Time: ${new Date().toLocaleString()}
    IP: ${details.ip}
    User Agent: ${details.userAgent}${locationInfo}
    `;

    // Send Telegram
    if (process.env.ENABLE_TELEGRAM === 'true' && bot && process.env.TELEGRAM_CHAT_ID) {
        try {
            await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
            console.log('Telegram message sent');
        } catch (err) {
            console.error('Telegram Error:', err.message);
        }
    }
    else {
        if (process.env.ENABLE_TELEGRAM !== 'true') console.log('Telegram notification disabled in .env');
    }

    // Send Email (SendGrid)
    if (process.env.ENABLE_EMAIL === 'true' && process.env.SENDGRID_API_KEY && process.env.EMAIL_USER) {
        const msg = {
            to: process.env.ALLOWED_EMAIL,
            from: process.env.EMAIL_USER, // Verified sender
            subject: `Security Alert: ${type}`,
            text: message,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #1e293b;">🔐 Security Alert: ${type}</h2>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>IP:</strong> ${details.ip}</p>
                    <p><strong>User Agent:</strong> ${details.userAgent}</p>
                    ${locationInfo ? `<p><strong>Location:</strong> <pre>${locationInfo}</pre></p>` : ''}
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="color: #64748b; font-size: 12px;">This is an automated security notification.</p>
                </div>
            `
        };
        try {
            await sgMail.send(msg);
            console.log('Email sent via SendGrid');
        } catch (error) {
            console.error('SendGrid Error:', error);
            if (error.response) {
                console.error(error.response.body);
            }
        }
    } else {
        if (process.env.ENABLE_EMAIL !== 'true') console.log('Email notification disabled in .env');
        else console.log('Email notification skipped: SENDGRID_API_KEY or EMAIL_USER missing');
    }
};

module.exports = { sendNotification };
