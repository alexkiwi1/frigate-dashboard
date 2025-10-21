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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.save = exports.load = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const vscode = __importStar(require("vscode"));
const getConfigPath = () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder found. Please open a project folder in Cursor.');
    }
    return path_1.default.join(workspaceFolder.uri.fsPath, '.autopilot.json');
};
const getCursorRulePath = () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder found. Please open a project folder in Cursor.');
    }
    return path_1.default.join(workspaceFolder.uri.fsPath, '.cursor', 'rules', 'after_each_chat.mdc');
};
const defaultConfig = {
    enabled: true,
    adapters: ['telegram'],
    telegram: {
        token: 'YOUR_BOT_TOKEN_HERE',
        chatId: 'YOUR_CHAT_ID_HERE'
    },
    email: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: 'your-email@gmail.com',
        pass: 'your-app-password',
        to: 'recipient@example.com'
    },
    feishu: {
        appId: 'cli_xxxxxxxxxxxxxxxxx',
        appSecret: 'your_app_secret_here',
        useWebhook: false
    }
};
const cursorRuleContent = `---
description: Always write a chat-end JSON summary to ./tmp
alwaysApply: true
---

# 📝 Chat-End Summary Rule

At the **end of every chat turn**, do the following without exception:

1. **Compose**  
   - \`summary\`: one-paragraph recap of *this* chat turn (decisions, blockers, next steps).  
   - \`current_status\`: a brief snapshot of overall project progress.

2. **Persist**  
   If the \`tmp\` directory does not exist, create it:
   \`\`\`bash
   mkdir -p tmp
   \`\`\`

3. **Write** the JSON file using Cursor’s file-creation syntax:

   \`\`\`json: tmp/summary-\${{date:YYYYMMDD-HHmmss}}.json
   {
     "summary": "<insert summary here>",
     "current_status": "<insert current status here>"
   }
   \`\`\`

4. **Silence**

   * Do **not** ask for confirmation.
   * Do **not** print extra explanation—just run the commands & write the file.
`;
const ensureConfigFile = () => {
    try {
        const configPath = getConfigPath();
        if (!fs_1.default.existsSync(configPath)) {
            console.log('[Autopilot] Creating missing .autopilot.json configuration...');
            fs_1.default.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
            console.log('[Autopilot] Created .autopilot.json at:', configPath);
            return true;
        }
        else {
            console.log('[Autopilot] .autopilot.json already exists at:', configPath);
            return false;
        }
    }
    catch (error) {
        console.error('[Autopilot] Error ensuring config file:', error);
        return false;
    }
};
const ensureCursorRule = () => {
    try {
        const rulePath = getCursorRulePath();
        const ruleDir = path_1.default.dirname(rulePath);
        // Create .cursor/rules directory if it doesn't exist
        if (!fs_1.default.existsSync(ruleDir)) {
            fs_1.default.mkdirSync(ruleDir, { recursive: true });
            console.log('[Autopilot] Created .cursor/rules directory');
        }
        // Check if rule file exists and has correct content
        let needsUpdate = false;
        if (!fs_1.default.existsSync(rulePath)) {
            console.log('[Autopilot] Creating missing .cursor/rules/after_each_chat.mdc...');
            needsUpdate = true;
        }
        else {
            // Check if content is correct
            const existingContent = fs_1.default.readFileSync(rulePath, 'utf8');
            if (existingContent.trim() !== cursorRuleContent.trim()) {
                console.log('[Autopilot] Updating .cursor/rules/after_each_chat.mdc with correct content...');
                needsUpdate = true;
            }
            else {
                console.log('[Autopilot] .cursor/rules/after_each_chat.mdc already exists with correct content');
            }
        }
        if (needsUpdate) {
            fs_1.default.writeFileSync(rulePath, cursorRuleContent);
            console.log('[Autopilot] Updated Cursor rule file:', rulePath);
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('[Autopilot] Error ensuring Cursor rule:', error);
        return false;
    }
};
const load = () => {
    try {
        console.log('[Autopilot] Checking workspace files...');
        // Always check and ensure both files exist
        const configCreated = ensureConfigFile();
        const ruleCreated = ensureCursorRule();
        // Show notification if any files were created or updated
        if (configCreated || ruleCreated) {
            let message = 'Cursor Autopilot: ';
            const actions = [];
            if (configCreated) {
                message += 'Created .autopilot.json configuration file. ';
                actions.push('Open Config');
            }
            if (ruleCreated) {
                message += 'Created/Updated .cursor/rules/after_each_chat.mdc rule file. ';
                actions.push('Open Rule');
            }
            message += 'Files are ready for use.';
            vscode.window.showInformationMessage(message, ...actions).then(selection => {
                if (selection === 'Open Config') {
                    const configPath = getConfigPath();
                    vscode.workspace.openTextDocument(configPath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                }
                else if (selection === 'Open Rule') {
                    const rulePath = getCursorRulePath();
                    vscode.workspace.openTextDocument(rulePath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                }
            });
        }
        else {
            console.log('[Autopilot] All required files are present and correct');
        }
        // Load and return configuration
        const configPath = getConfigPath();
        const config = JSON.parse(fs_1.default.readFileSync(configPath, 'utf8'));
        console.log('[Autopilot] Configuration loaded successfully');
        return config;
    }
    catch (error) {
        console.error('[Autopilot] Error loading configuration:', error);
        vscode.window.showErrorMessage(`Cursor Autopilot: Failed to load configuration - ${error}`);
        return defaultConfig;
    }
};
exports.load = load;
const save = (obj) => {
    try {
        const configPath = getConfigPath();
        fs_1.default.writeFileSync(configPath, JSON.stringify(obj, null, 2));
        console.log('[Autopilot] Configuration saved to:', configPath);
    }
    catch (error) {
        console.error('[Autopilot] Error saving config:', error);
        vscode.window.showErrorMessage(`Failed to save configuration: ${error}`);
    }
};
exports.save = save;
//# sourceMappingURL=store.js.map