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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const store_1 = require("./core/store");
const dispatcher_1 = require("./core/dispatcher");
const watcher_1 = require("./core/watcher");
const adapters_1 = require("./adapters");
const inject_1 = require("./core/inject");
const OPEN_COMMANDS = ['composer.startComposerPrompt'];
const FOCUS_COMMANDS = ['aichat.newfollowupaction'];
const SUBMIT_COMMANDS = ['composer.submitComposerPrompt', 'aichat.submitFollowupAction', 'composer.sendPrompt', 'cursor.chat.send'];
const SEND_KEYBIND = 'cursor.sendKeyBinding';
function activate(ctx) {
    console.log('[Autopilot] Extension activation started');
    try {
        // Register the cursorInject.send command with robust injection logic
        const cursorInjectDisposable = vscode.commands.registerCommand('cursorInject.send', async (text) => {
            console.log('[cursorInject] Command executed with text:', text);
            // If no text provided, prompt user for input
            if (!text) {
                text = await vscode.window.showInputBox({
                    prompt: 'Enter text to inject into Cursor Chat',
                    placeHolder: 'Type your message here...'
                });
            }
            // If user cancelled or provided empty text, return
            if (!text || text.trim() === '') {
                console.log('[cursorInject] No text provided, cancelling...');
                return;
            }
            await injectTextToChat(text);
        });
        ctx.subscriptions.push(cursorInjectDisposable);
        console.log('[Autopilot] cursorInject.send command registered successfully');
        // Register a test command for easier testing
        const testDisposable = vscode.commands.registerCommand('autopilot.test', async () => {
            const testMessage = `Test message from Autopilot ${new Date().toLocaleTimeString()} 🚀`;
            vscode.window.showInformationMessage(`Testing injection: ${testMessage}`);
            await injectTextToChat(testMessage);
        });
        ctx.subscriptions.push(testDisposable);
        console.log('[Autopilot] autopilot.test command registered successfully');
        // Load configuration (this will auto-create .autopilot.json if it doesn't exist)
        const store = (0, store_1.load)();
        console.log('[Autopilot] Configuration loaded:', JSON.stringify(store, null, 2));
        const actives = [];
        // Check if user needs to configure adapters
        const needsConfiguration = store.adapters.some((name) => {
            const config = store[name];
            if (name === 'telegram') {
                return !config?.token || config.token === 'YOUR_BOT_TOKEN_HERE';
            }
            if (name === 'email') {
                return !config?.user || config.user === 'your-email@gmail.com';
            }
            if (name === 'feishu') {
                return !config?.appId || config.appId === 'cli_xxxxxxxxxxxxxxxxx';
            }
            return false;
        });
        if (needsConfiguration) {
            vscode.window.showWarningMessage('Cursor Autopilot: Please configure your adapters in .autopilot.json to start receiving notifications.', 'Open Config').then(selection => {
                if (selection === 'Open Config') {
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    if (workspaceFolder) {
                        const configPath = workspaceFolder.uri.fsPath + '/.autopilot.json';
                        vscode.workspace.openTextDocument(configPath).then(doc => {
                            vscode.window.showTextDocument(doc);
                        });
                    }
                }
            });
        }
        store.adapters.forEach((name) => {
            const factory = adapters_1.adapterMap[name];
            if (!factory)
                return vscode.window.showWarningMessage(`Unknown adapter: ${name}`);
            try {
                const adapter = factory(store[name] || {});
                actives.push(adapter);
                console.log(`[Autopilot] Adapter ${name} initialized successfully`);
            }
            catch (err) {
                console.error(`[Autopilot] Adapter ${name} init failed:`, err);
                vscode.window.showErrorMessage(`Adapter ${name} init failed: ${err}`);
            }
        });
        actives.forEach(a => a.onReply(r => {
            const resp = r.trim() === '1' ? 'Continue ✅' : r.trim() === '2' ? 'Stop ❌' : r;
            (0, inject_1.sendToChat)(resp);
        }));
        (0, dispatcher_1.sub)('summary', s => {
            if (!(0, store_1.load)().enabled)
                return;
            console.log('[Autopilot] Processing summary:', s);
            actives.forEach(a => a.send(s).catch(e => console.error('[Autopilot] Send failed:', e)));
        });
        const w = (0, watcher_1.watch)();
        if (w) {
            ctx.subscriptions.push(w);
            console.log('[Autopilot] File watcher initialized');
        }
        else {
            console.log('[Autopilot] File watcher not initialized - no workspace folder');
        }
        // Show status message
        const statusMessage = needsConfiguration
            ? `Autopilot ${store.enabled ? 'ON' : 'OFF'} | adapters: ${store.adapters.join(',')} | ⚠️ Configuration needed`
            : `Autopilot ${store.enabled ? 'ON' : 'OFF'} | adapters: ${store.adapters.join(',')} | ✅ Ready`;
        vscode.window.showInformationMessage(statusMessage);
        console.log('[Autopilot] Extension activation completed successfully');
    }
    catch (error) {
        console.error('[Autopilot] Extension activation failed:', error);
        vscode.window.showErrorMessage(`Cursor Autopilot activation failed: ${error}`);
    }
}
async function injectTextToChat(text) {
    console.log('[cursorInject] Injecting text:', text);
    const cmds = await vscode.commands.getCommands(true);
    // 1️⃣ Open composer
    console.log('[cursorInject] Opening composer...');
    for (const id of OPEN_COMMANDS) {
        if (cmds.includes(id)) {
            await vscode.commands.executeCommand(id);
            console.log(`[cursorInject] Executed: ${id}`);
            break;
        }
    }
    await delay(300);
    // 2️⃣ Focus composer
    console.log('[cursorInject] Focusing composer...');
    for (const id of FOCUS_COMMANDS) {
        if (cmds.includes(id)) {
            await vscode.commands.executeCommand(id);
            console.log(`[cursorInject] Executed: ${id}`);
            break;
        }
    }
    await delay(200);
    // 3️⃣ Paste text
    console.log('[cursorInject] Pasting text...');
    await vscode.env.clipboard.writeText(text);
    if (cmds.includes(SEND_KEYBIND)) {
        await vscode.commands.executeCommand(SEND_KEYBIND, {
            text: process.platform === 'darwin' ? 'cmd+v' : 'ctrl+v'
        });
    }
    else {
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
    }
    await delay(100);
    // 4️⃣ Submit prompt — try in‑IDE routes first
    console.log('[cursorInject] Submitting...');
    let submitted = false;
    for (const id of SUBMIT_COMMANDS) {
        if (cmds.includes(id)) {
            await vscode.commands.executeCommand(id);
            console.log(`[cursorInject] Submitted via: ${id}`);
            submitted = true;
            break;
        }
    }
    if (!submitted && cmds.includes(SEND_KEYBIND)) {
        await vscode.commands.executeCommand(SEND_KEYBIND, {
            text: process.platform === 'darwin' ? 'cmd+enter' : 'ctrl+enter'
        });
        console.log('[cursorInject] Submitted via keybind');
        submitted = true;
    }
    if (!submitted) {
        console.log('[cursorInject] Fallback → OS‑level Cmd/Ctrl+Enter');
        await osLevelSend();
    }
}
function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}
async function osLevelSend() {
    console.log('[cursorInject] Using OS-level fallback...');
    if (process.platform === 'darwin') {
        // First, bring Cursor to front
        await execPromise(`osascript -e 'tell application "Cursor" to activate'`);
        await delay(200); // Wait for app to come to front
        // Then send the keystroke
        await execPromise(`osascript -e 'tell application "System Events" to keystroke return using {command down}'`);
        console.log('[cursorInject] Sent Cmd+Enter via AppleScript');
    }
    else if (process.platform === 'linux') {
        // For Linux, we need to focus the window first
        await execPromise(`wmctrl -a "Cursor"`);
        await delay(200);
        await execPromise(`xdotool key ctrl+Return`);
        console.log('[cursorInject] Sent Ctrl+Enter via xdotool');
    }
    else {
        vscode.window.showWarningMessage('OS‑level fallback not implemented for this platform. Please press Enter manually.');
    }
}
function execPromise(cmd) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(cmd, (err) => (err ? reject(err) : resolve()));
    });
}
const isMac = () => process.platform === 'darwin';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function deactivate() { }
//# sourceMappingURL=extension.js.map