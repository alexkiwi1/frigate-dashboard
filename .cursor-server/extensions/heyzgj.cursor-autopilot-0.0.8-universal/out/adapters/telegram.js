"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Telegram;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
function Telegram(cfg) {
    console.log('[Telegram] Initializing adapter with config:', {
        hasToken: !!cfg.token,
        chatId: cfg.chatId,
        tokenPrefix: cfg.token ? cfg.token.substring(0, 10) + '...' : 'none'
    });
    // 验证配置
    if (!cfg.token || cfg.token === 'YOUR_BOT_TOKEN_HERE') {
        console.error('[Telegram] Invalid token configuration');
        return {
            send: async () => { console.error('[Telegram] Cannot send - invalid token'); },
            onReply: () => { },
            dispose: () => { }
        };
    }
    if (!cfg.chatId || cfg.chatId === 'YOUR_CHAT_ID_HERE') {
        console.error('[Telegram] Invalid chat ID configuration');
        return {
            send: async () => { console.error('[Telegram] Cannot send - invalid chat ID'); },
            onReply: () => { },
            dispose: () => { }
        };
    }
    // 配置选项
    const botOptions = {
        polling: {
            interval: 1000,
            autoStart: true,
            params: {
                timeout: 10
            }
        },
        request: {
            agentOptions: {
                keepAlive: true,
                family: 4
            }
        }
    };
    // 如果配置了代理，添加代理设置
    if (cfg.proxy) {
        console.log('[Telegram] Using proxy:', cfg.proxy);
        botOptions.request.proxy = cfg.proxy;
    }
    let bot;
    let replyHandler = () => { };
    let isDisposed = false;
    try {
        bot = new node_telegram_bot_api_1.default(cfg.token, botOptions);
        console.log('[Telegram] Bot created successfully');
    }
    catch (error) {
        console.error('[Telegram] Failed to create bot:', error);
        return {
            send: async () => { console.error('[Telegram] Cannot send - bot creation failed'); },
            onReply: () => { },
            dispose: () => { }
        };
    }
    // 错误处理
    bot.on('error', (error) => {
        console.error('[Telegram] Bot error:', error);
        // 如果是网络错误，尝试重连
        if (error.message.includes('ETIMEOUT') ||
            error.message.includes('ECONNRESET') ||
            error.message.includes('socket disconnected')) {
            console.log('[Telegram] Network error detected, will retry automatically');
        }
    });
    bot.on('polling_error', (error) => {
        console.error('[Telegram] Polling error:', error);
        // 常见的轮询错误处理
        if (error.message.includes('ETIMEOUT')) {
            console.log('[Telegram] Polling timeout, will retry automatically');
        }
        else if (error.message.includes('Unauthorized')) {
            console.error('[Telegram] Bot token is invalid or expired');
        }
        else if (error.message.includes('socket disconnected')) {
            console.log('[Telegram] Socket disconnected, will retry automatically');
        }
    });
    // 消息处理
    bot.on('message', (m) => {
        if (isDisposed)
            return;
        console.log('[Telegram] Received message:', {
            chatId: m.chat.id,
            text: m.text,
            expectedChatId: cfg.chatId
        });
        if (m.chat.id.toString() === cfg.chatId) {
            replyHandler(m.text || '');
        }
    });
    return {
        send: async (s) => {
            if (isDisposed) {
                console.error('[Telegram] Cannot send - adapter disposed');
                return;
            }
            try {
                console.log('[Telegram] Sending message:', s);
                const message = `📝 *Summary*\n${s.summary}\n\n➡️ *Current Status*\n${s.current_status}\n\nReply 1=continue or type any instruction to continue building`;
                const result = await bot.sendMessage(cfg.chatId, message, {
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true
                });
                console.log('[Telegram] Message sent successfully:', result.message_id);
            }
            catch (error) {
                console.error('[Telegram] Failed to send message:', error);
                // 提供更友好的错误信息
                if (error.response && error.response.body) {
                    const errorInfo = error.response.body;
                    if (errorInfo.error_code === 400) {
                        console.error('[Telegram] Bad request - check chat ID and message format');
                    }
                    else if (errorInfo.error_code === 401) {
                        console.error('[Telegram] Unauthorized - check bot token');
                    }
                    else if (errorInfo.error_code === 403) {
                        console.error('[Telegram] Forbidden - bot may be blocked or chat not found');
                    }
                }
            }
        },
        onReply: (h) => {
            replyHandler = h;
        },
        dispose: () => {
            isDisposed = true;
            try {
                if (bot) {
                    bot.stopPolling();
                    console.log('[Telegram] Polling stopped');
                }
            }
            catch (error) {
                console.error('[Telegram] Error stopping polling:', error);
            }
        }
    };
}
//# sourceMappingURL=telegram.js.map