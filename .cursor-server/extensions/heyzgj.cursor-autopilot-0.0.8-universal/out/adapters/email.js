"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Email;
const nodemailer_1 = __importDefault(require("nodemailer"));
const socks_proxy_agent_1 = require("socks-proxy-agent");
function Email(cfg) {
    /* ---------- resolve runtime cfg ---------- */
    const port = Number(cfg.port) || 587; // Gmail recommend 587 STARTTLS
    const secure = cfg.secure ?? false; // false = plain → STARTTLS
    const agent = cfg.proxy ? new socks_proxy_agent_1.SocksProxyAgent(cfg.proxy) : undefined;
    console.log('[EmailAdapter] Config:', {
        host: cfg.host || 'smtp.gmail.com',
        port,
        secure,
        user: cfg.user ? cfg.user.substring(0, 3) + '***' : 'undefined',
        proxy: cfg.proxy || 'none'
    });
    /* ---------- build transport -------------- */
    const smtp = nodemailer_1.default.createTransport({
        host: cfg.host || 'smtp.gmail.com',
        port,
        secure,
        auth: { user: cfg.user, pass: cfg.pass },
        connectionTimeout: 30000, // Increase to 30 seconds
        socketTimeout: 30000, // Increase to 30 seconds
        greetingTimeout: 10000, // Add greeting timeout
        tls: {
            rejectUnauthorized: false,
            servername: cfg.host || 'smtp.gmail.com' // Explicitly set servername
        },
        agent: agent,
        debug: true, // Enable debug logging
        logger: {
            debug: (msg) => console.log('[EmailAdapter] DEBUG:', msg),
            info: (msg) => console.log('[EmailAdapter] INFO:', msg),
            error: (msg) => console.error('[EmailAdapter] ERROR:', msg)
        }
    });
    // Make verification optional to avoid blocking extension startup
    let isVerified = false;
    // Verify connection asynchronously
    setTimeout(() => {
        smtp.verify((err) => {
            if (err) {
                console.error('[EmailAdapter] SMTP verify failed:', err.message);
                console.error('[EmailAdapter] Full error:', err);
                // Provide helpful debugging information
                if (err.code === 'ETIMEDOUT') {
                    console.error('[EmailAdapter] TROUBLESHOOTING:');
                    console.error('1. Check your internet connection');
                    console.error('2. Verify SMTP server settings (host, port)');
                    console.error('3. Check if firewall is blocking the connection');
                    console.error('4. Try different ports: 587 (STARTTLS), 465 (SSL), 25 (plain)');
                    console.error('5. For Gmail, ensure you have enabled 2FA and created an app password');
                }
            }
            else {
                console.log('[EmailAdapter] SMTP connection verified successfully');
                isVerified = true;
            }
        });
    }, 1000); // Delay verification by 1 second
    let replyHandler = () => { };
    return {
        /** send() returns void → async + await */
        async send(s) {
            try {
                console.log('[EmailAdapter] Attempting to send email...');
                const result = await smtp.sendMail({
                    from: cfg.user,
                    to: cfg.to,
                    subject: '[Cursor] Summary',
                    text: `${s.summary}\nCurrent Status\n${s.current_status}\n\nReply 1=continue or type any instruction to continue building`
                });
                console.log('[EmailAdapter] Email sent successfully, messageId:', result.messageId);
            }
            catch (error) {
                console.error('[EmailAdapter] Send failed:', error.message);
                // Provide specific error handling
                if (error.code === 'ETIMEDOUT') {
                    console.error('[EmailAdapter] Connection timeout - email may not be sent');
                }
                else if (error.code === 'EAUTH') {
                    console.error('[EmailAdapter] Authentication failed - check username/password');
                }
                else if (error.code === 'ECONNREFUSED') {
                    console.error('[EmailAdapter] Connection refused - check host/port settings');
                }
                // Don't throw error to prevent extension from crashing
                console.error('[EmailAdapter] Email sending failed, but continuing...');
            }
        },
        onReply: h => replyHandler = h // TODO: Poll IMAP
    };
}
//# sourceMappingURL=email.js.map