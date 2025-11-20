const TelegramBot = require('node-telegram-bot-api');
const sgMail = require('@sendgrid/mail');

// Telegram Setup
const bot = process.env.TELEGRAM_BOT_TOKEN ? new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false }) : null;

// SendGrid Setup
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const sendNotification = async (type, details) => {
    let locData = {
        city: 'Unknown',
        region: 'Unknown',
        country: 'Unknown',
        org: 'Unknown',
        postal: 'Unknown',
        timezone: 'Unknown',
        loc: 'Unknown',
        map: 'Unknown'
    };

    // Handle Localhost
    if (details.ip === '::1' || details.ip === '127.0.0.1') {
        locData = {
            city: 'Localhost',
            region: 'Local Machine',
            country: 'Local Network',
            org: 'Development Environment',
            postal: '000000',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            loc: '0.0000, 0.0000',
            map: 'https://www.google.com/maps'
        };
    }
    // Fetch IP Info if enabled and not localhost
    else if (process.env.ENABLE_IPINFO === 'true' && process.env.IPINFO_API_KEY) {
        try {
            // Use dynamic import for node-fetch or use built-in fetch if Node 18+
            // Since we didn't install node-fetch, let's use the native fetch API (Node 18+)
            const response = await fetch(`https://ipinfo.io/${details.ip}?token=${process.env.IPINFO_API_KEY}`);
            const data = await response.json();
            if (data && !data.error) {
                locData = {
                    city: data.city || 'Unknown',
                    region: data.region || 'Unknown',
                    country: data.country || 'Unknown',
                    org: data.org || 'Unknown',
                    postal: data.postal || 'Unknown',
                    timezone: data.timezone || 'Unknown',
                    loc: data.loc || 'Unknown',
                    map: data.loc ? `https://www.google.com/maps?q=${data.loc}` : 'Unknown'
                };
            }
        } catch (err) {
            console.error('IPInfo Error:', err.message);
        }
    }

    // Parse User Agent (Basic parsing)
    const ua = details.userAgent || '';
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop'; // Default

    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'MacOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) { os = 'Android'; device = 'Mobile'; }
    else if (ua.includes('iPhone') || ua.includes('iPad')) { os = 'iOS'; device = 'Mobile'; }

    const message = `
🔐 SECURE LOGIN ALERT

✅ ${type}
🕐 Time: ${new Date().toLocaleString()}
🌐 IP: ${details.ip}
🏙️ City: ${locData.city}
🗺️ Region: ${locData.region}
🌍 Country: ${locData.country}
📍 Location: ${locData.city}, ${locData.region}, ${locData.country}
📮 Postal: ${locData.postal}
🕒 Timezone: ${locData.timezone}
📡 ISP: ${locData.org}
🏢 Organization: ${locData.org}
📐 Coordinates: ${locData.loc}
💻 Browser: ${browser}
🖥️ OS: ${os}
📱 Device: ${device}
🌐 User Agent: ${ua.substring(0, 50)}...
🗣️ Language: ${details.language || 'Unknown'}
🔑 Session: ${details.session || 'N/A'}

Secure Webpage - System Notification
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
            subject: `🔐 Security Alert: ${type}`,
            text: message,
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">🔐 SECURE LOGIN ALERT</h2>
                    
                    <h3 style="color: #10b981;">✅ ${type}</h3>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <tr><td style="padding: 5px; font-weight: bold;">🕐 Time:</td><td>${new Date().toLocaleString()}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">🌐 IP:</td><td>${details.ip}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">🏙️ City:</td><td>${locData.city}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">🗺️ Region:</td><td>${locData.region}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">🌍 Country:</td><td>${locData.country}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">📍 Location:</td><td>${locData.city}, ${locData.region}, ${locData.country}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">📮 Postal:</td><td>${locData.postal}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">🕒 Timezone:</td><td>${locData.timezone}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">📡 ISP:</td><td>${locData.org}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">🏢 Org:</td><td>${locData.org}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">📐 Coords:</td><td><a href="${locData.map}">${locData.loc}</a></td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">💻 Browser:</td><td>${browser}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">🖥️ OS:</td><td>${os}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">📱 Device:</td><td>${device}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">🌐 Agent:</td><td>${ua}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">🗣️ Lang:</td><td>${details.language || 'Unknown'}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">🔑 Session:</td><td>${details.session || 'N/A'}</td></tr>
                    </table>

                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="color: #64748b; font-size: 12px; text-align: center;">Secure Webpage - System Notification</p>
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
