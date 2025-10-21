"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Feishu;
const Lark = __importStar(require("@larksuiteoapi/node-sdk"));
function Feishu(cfg) {
    let replyHandler = () => { };
    let client;
    let wsClient;
    let lastUserOpenId = '';
    let lastChatId = '';
    // 初始化飞书客户端
    const initializeClient = () => {
        client = new Lark.Client({
            appId: cfg.appId,
            appSecret: cfg.appSecret,
            appType: Lark.AppType.SelfBuild,
            domain: cfg.domain === 'lark' ? Lark.Domain.Lark : Lark.Domain.Feishu,
            loggerLevel: Lark.LoggerLevel.info,
        });
        // 创建WebSocket客户端用于长连接
        wsClient = new Lark.WSClient({
            appId: cfg.appId,
            appSecret: cfg.appSecret,
            domain: cfg.domain === 'lark' ? Lark.Domain.Lark : Lark.Domain.Feishu,
            loggerLevel: Lark.LoggerLevel.info,
        });
        console.log('飞书客户端初始化完成');
    };
    // 启动WebSocket长连接
    const startWebSocketConnection = () => {
        const eventDispatcher = new Lark.EventDispatcher({
            encryptKey: cfg.encryptKey,
        }).register({
            // 监听接收消息事件
            'im.message.receive_v1': async (data) => {
                console.log('收到飞书消息:', data);
                try {
                    const message = data.message;
                    // 跳过机器人自己发送的消息
                    if (message.sender && message.sender.sender_type === 'app') {
                        return;
                    }
                    // 保存用户信息用于回复
                    if (message.sender && message.sender.sender_id) {
                        lastUserOpenId = message.sender.sender_id.open_id || '';
                    }
                    lastChatId = message.chat_id || '';
                    // 解析消息内容
                    let messageText = '';
                    if (message.message_type === 'text') {
                        try {
                            const content = JSON.parse(message.content || '{}');
                            messageText = content.text || '';
                        }
                        catch (error) {
                            console.error('解析消息内容失败:', error);
                            messageText = message.content || '';
                        }
                    }
                    else if (message.message_type === 'post') {
                        // 处理富文本消息
                        try {
                            const content = JSON.parse(message.content || '{}');
                            messageText = extractTextFromPost(content);
                        }
                        catch (error) {
                            console.error('解析富文本消息失败:', error);
                            messageText = '收到富文本消息';
                        }
                    }
                    else {
                        messageText = `收到${message.message_type}类型消息`;
                    }
                    // 调用回复处理器
                    if (messageText && replyHandler) {
                        replyHandler(messageText);
                    }
                }
                catch (error) {
                    console.error('处理飞书消息时发生错误:', error);
                }
            },
        });
        // 启动WebSocket连接
        wsClient.start({
            eventDispatcher,
        });
        console.log('飞书WebSocket长连接已启动');
    };
    // 从富文本消息中提取文本
    const extractTextFromPost = (content) => {
        let text = '';
        if (content.post && content.post.zh_cn && content.post.zh_cn.content) {
            const contentArray = content.post.zh_cn.content;
            contentArray.forEach((item) => {
                if (item.length > 0) {
                    item.forEach((element) => {
                        if (element.tag === 'text') {
                            text += element.text || '';
                        }
                    });
                }
            });
        }
        return text;
    };
    // 发送消息
    const sendMessage = async (content, receiverId) => {
        try {
            const targetChatId = receiverId || lastChatId;
            if (!targetChatId) {
                console.log('飞书：没有可用的接收者，请先与机器人交互');
                return;
            }
            const response = await client.im.message.create({
                params: {
                    receive_id_type: 'chat_id',
                },
                data: {
                    receive_id: targetChatId,
                    content: JSON.stringify({ text: content }),
                    msg_type: 'text',
                },
            });
            if (response.code === 0) {
                console.log('飞书消息发送成功');
            }
            else {
                console.error('飞书消息发送失败:', response.msg);
            }
        }
        catch (error) {
            console.error('发送飞书消息时发生错误:', error);
        }
    };
    // 发送卡片消息
    const sendCardMessage = async (cardContent, receiverId) => {
        try {
            const targetChatId = receiverId || lastChatId;
            if (!targetChatId) {
                console.log('飞书：没有可用的接收者，请先与机器人交互');
                return;
            }
            const response = await client.im.message.create({
                params: {
                    receive_id_type: 'chat_id',
                },
                data: {
                    receive_id: targetChatId,
                    content: JSON.stringify(cardContent),
                    msg_type: 'interactive',
                },
            });
            if (response.code === 0) {
                console.log('飞书卡片消息发送成功');
            }
            else {
                console.error('飞书卡片消息发送失败:', response.msg);
            }
        }
        catch (error) {
            console.error('发送飞书卡片消息时发生错误:', error);
        }
    };
    // 初始化
    initializeClient();
    startWebSocketConnection();
    return {
        send: async (s) => {
            try {
                if (typeof s === 'string') {
                    await sendMessage(s);
                }
                else {
                    // 发送格式化的消息卡片
                    const cardContent = {
                        config: {
                            wide_screen_mode: true,
                        },
                        elements: [
                            {
                                tag: 'div',
                                text: {
                                    content: `📝 **摘要**\n${s.summary}`,
                                    tag: 'lark_md',
                                },
                            },
                            {
                                tag: 'hr',
                            },
                            {
                                tag: 'div',
                                text: {
                                    content: `➡️ **项目进度**\n${s.current_status}`,
                                    tag: 'lark_md',
                                },
                            },
                            {
                                tag: 'div',
                                text: {
                                    content: '\n回复：1=继续 或者回复任何指令 ',
                                    tag: 'plain_text',
                                },
                            },
                        ],
                        header: {
                            template: 'blue',
                            title: {
                                content: '任务进度更新',
                                tag: 'plain_text',
                            },
                        },
                    };
                    await sendCardMessage(cardContent);
                }
            }
            catch (error) {
                console.error('发送消息失败:', error);
            }
        },
        onReply: (h) => {
            replyHandler = h;
        },
        dispose: () => {
            try {
                // WebSocket客户端会自动处理连接关闭
                console.log('飞书WebSocket连接已关闭');
            }
            catch (error) {
                console.error('关闭飞书连接时发生错误:', error);
            }
        }
    };
}
//# sourceMappingURL=feishu.js.map