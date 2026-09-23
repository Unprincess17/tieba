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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifyTitle = getNotifyTitle;
exports.sendServerChan = sendServerChan;
exports.sendBark = sendBark;
exports.sendTelegram = sendTelegram;
exports.sendDingTalk = sendDingTalk;
exports.sendWecom = sendWecom;
exports.sendPushPlus = sendPushPlus;
exports.sendNotification = sendNotification;
/**
 * 通知模块 - 支持多种推送渠道发送脚本运行结果通知
 */
const axios_1 = __importDefault(require("axios"));
const utils_1 = require("./utils");
const crypto = __importStar(require("crypto"));
/**
 * 构建通知标题
 * @returns 通知标题
 */
function getNotifyTitle() {
    return `百度贴吧自动签到 - ${(0, utils_1.formatDate)(new Date(), 'Asia/Shanghai', '+8').split(' ')[0]}`;
}
/**
 * 处理通知发送的结果
 * @param platform - 平台名称
 * @param response - 响应结果
 */
function handleNotifyResult(platform, response) {
    if (response && response.status === 200) {
        console.log(`✅ ${platform}通知发送成功`);
    }
    else {
        console.log(`⚠️ ${platform}通知发送失败: ${(response === null || response === void 0 ? void 0 : response.statusText) || '未知错误'}`);
    }
}
/**
 * Server酱通知 (ServerChan)
 * @param options - Server酱配置选项
 * @returns 发送结果
 */
function sendServerChan(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { key, title, content } = options;
        if (!key)
            return { success: false, message: 'Server酱KEY未设置' };
        try {
            const url = `https://sctapi.ftqq.com/${key}.send`;
            const response = yield axios_1.default.post(url, {
                title: title,
                desp: content
            });
            handleNotifyResult('Server酱', response);
            return { success: true, message: 'Server酱通知发送成功', channel: 'ServerChan' };
        }
        catch (error) {
            const err = error;
            console.error(`❌ Server酱通知发送失败: ${err.message}`);
            return { success: false, message: err.message, channel: 'ServerChan' };
        }
    });
}
/**
 * Bark通知
 * @param options - Bark配置选项
 * @returns 发送结果
 */
function sendBark(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { key, title, content } = options;
        if (!key)
            return { success: false, message: 'Bark KEY未设置', channel: 'Bark' };
        try {
            // 处理Bark地址，兼容自建服务和官方服务
            let barkUrl = key;
            if (!barkUrl.startsWith('http')) {
                barkUrl = `https://api.day.app/${key}`;
            }
            if (!barkUrl.endsWith('/')) {
                barkUrl += '/';
            }
            const url = `${barkUrl}${encodeURIComponent(title || '')}/${encodeURIComponent(content)}`;
            const response = yield axios_1.default.get(url);
            handleNotifyResult('Bark', response);
            return { success: true, message: 'Bark通知发送成功', channel: 'Bark' };
        }
        catch (error) {
            const err = error;
            console.error(`❌ Bark通知发送失败: ${err.message}`);
            return { success: false, message: err.message, channel: 'Bark' };
        }
    });
}
/**
 * Telegram Bot通知
 * @param options - Telegram配置选项
 * @returns 发送结果
 */
function sendTelegram(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { botToken, chatId, message, parseMode = 'Markdown' } = options;
        if (!botToken || !chatId)
            return { success: false, message: 'Telegram配置不完整', channel: 'Telegram' };
        try {
            const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
            const response = yield axios_1.default.post(url, {
                chat_id: chatId,
                text: message,
                parse_mode: parseMode
            });
            handleNotifyResult('Telegram', response);
            return { success: true, message: 'Telegram通知发送成功', channel: 'Telegram' };
        }
        catch (error) {
            const err = error;
            console.error(`❌ Telegram通知发送失败: ${err.message}`);
            return { success: false, message: err.message, channel: 'Telegram' };
        }
    });
}
/**
 * 钉钉机器人通知
 * @param options - 钉钉配置选项
 * @returns 发送结果
 */
function sendDingTalk(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { webhook, secret, title, content } = options;
        if (!webhook)
            return { success: false, message: '钉钉Webhook未设置', channel: 'DingTalk' };
        try {
            // 如果有安全密钥，需要计算签名
            let url = webhook;
            if (secret) {
                const timestamp = Date.now();
                const hmac = crypto.createHmac('sha256', secret);
                const sign = encodeURIComponent(hmac.update(`${timestamp}\n${secret}`).digest('base64'));
                url = `${webhook}&timestamp=${timestamp}&sign=${sign}`;
            }
            const response = yield axios_1.default.post(url, {
                msgtype: 'markdown',
                markdown: {
                    title: title || '通知',
                    text: `### ${title || '通知'}\n${content}`
                }
            });
            handleNotifyResult('钉钉', response);
            return { success: true, message: '钉钉通知发送成功', channel: 'DingTalk' };
        }
        catch (error) {
            const err = error;
            console.error(`❌ 钉钉通知发送失败: ${err.message}`);
            return { success: false, message: err.message, channel: 'DingTalk' };
        }
    });
}
/**
 * 企业微信通知
 * @param options - 企业微信配置选项
 * @returns 发送结果
 */
function sendWecom(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { key, content, title } = options;
        if (!key)
            return { success: false, message: '企业微信KEY未设置', channel: 'WeCom' };
        try {
            const url = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${key}`;
            const response = yield axios_1.default.post(url, {
                msgtype: 'markdown',
                markdown: {
                    content: `### ${title || '通知'}\n${content}`
                }
            });
            handleNotifyResult('企业微信', response);
            return { success: true, message: '企业微信通知发送成功', channel: 'WeCom' };
        }
        catch (error) {
            const err = error;
            console.error(`❌ 企业微信通知发送失败: ${err.message}`);
            return { success: false, message: err.message, channel: 'WeCom' };
        }
    });
}
/**
 * PushPlus通知
 * @param options - PushPlus配置选项
 * @returns 发送结果
 */
function sendPushPlus(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { token, title, content, template = 'markdown' } = options;
        if (!token)
            return { success: false, message: 'PushPlus Token未设置', channel: 'PushPlus' };
        try {
            const url = 'https://www.pushplus.plus/send';
            const response = yield axios_1.default.post(url, {
                token: token,
                title: title || '通知',
                content: content,
                template: template
            });
            handleNotifyResult('PushPlus', response);
            return { success: true, message: 'PushPlus通知发送成功', channel: 'PushPlus' };
        }
        catch (error) {
            const err = error;
            console.error(`❌ PushPlus通知发送失败: ${err.message}`);
            return { success: false, message: err.message, channel: 'PushPlus' };
        }
    });
}
/**
 * 发送通知到所有已配置的平台
 * @param summary - 要发送的通知内容
 * @returns 是否有任何通知发送成功
 */
function sendNotification(summary) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('📱 开始发送通知...');
        const title = getNotifyTitle();
        const tasks = [];
        // Server酱通知
        if (process.env.SERVERCHAN_KEY) {
            tasks.push(sendServerChan({
                key: process.env.SERVERCHAN_KEY,
                title: title,
                content: summary
            }));
        }
        // Bark通知
        if (process.env.BARK_KEY) {
            tasks.push(sendBark({
                key: process.env.BARK_KEY,
                title: title,
                content: summary
            }));
        }
        // Telegram通知
        if (process.env.TG_BOT_TOKEN && process.env.TG_CHAT_ID) {
            tasks.push(sendTelegram({
                botToken: process.env.TG_BOT_TOKEN,
                chatId: process.env.TG_CHAT_ID,
                message: `${title}\n\n${summary}`
            }));
        }
        // 钉钉通知
        if (process.env.DINGTALK_WEBHOOK) {
            tasks.push(sendDingTalk({
                webhook: process.env.DINGTALK_WEBHOOK,
                secret: process.env.DINGTALK_SECRET,
                title: title,
                content: summary
            }));
        }
        // 企业微信通知
        if (process.env.WECOM_KEY) {
            tasks.push(sendWecom({
                key: process.env.WECOM_KEY,
                title: title,
                content: summary
            }));
        }
        // PushPlus通知
        if (process.env.PUSHPLUS_TOKEN) {
            tasks.push(sendPushPlus({
                token: process.env.PUSHPLUS_TOKEN,
                title: title,
                content: summary
            }));
        }
        if (tasks.length === 0) {
            console.log('⚠️ 没有通知被发送，请检查通知配置');
            return false;
        }
        // 并行发送所有已配置的通知
        const results = yield Promise.all(tasks);
        const anySuccess = results.some(result => result.success);
        if (anySuccess) {
            console.log('✅ 通知发送完成');
        }
        else {
            console.log('⚠️ 所有通知发送失败，请检查通知配置');
        }
        return anySuccess;
    });
}
