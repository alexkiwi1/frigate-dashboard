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
exports.watch = watch;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dispatcher_1 = require("./dispatcher");
function watch() {
    const root = vscode.workspace.workspaceFolders?.[0];
    if (!root)
        return;
    // watch "./tmp/summary-*.json"
    const tmpDir = path.join(root.uri.fsPath, 'tmp');
    const pattern = new vscode.RelativePattern(tmpDir, 'summary-*.json');
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    const safeRead = (u) => {
        try {
            const content = fs.readFileSync(u.fsPath, 'utf8');
            console.log(`[Autopilot] Reading file: ${u.fsPath}, content: ${content}`);
            const parsed = JSON.parse(content);
            // 验证必要字段
            if (!parsed.summary && !parsed.current_status) {
                console.error(`[Autopilot] Invalid JSON structure in ${u.fsPath}: missing summary or current_status`);
                return null;
            }
            return parsed;
        }
        catch (error) {
            console.error(`[Autopilot] Error reading/parsing file ${u.fsPath}:`, error);
            return null;
        }
    };
    // Track processed files to avoid duplicates
    const processedFiles = new Set();
    // Get existing files and mark them as processed (don't send them)
    try {
        if (fs.existsSync(tmpDir)) {
            const existingFiles = fs.readdirSync(tmpDir)
                .filter(file => file.startsWith('summary-') && file.endsWith('.json'))
                .map(file => path.join(tmpDir, file));
            existingFiles.forEach(filePath => {
                processedFiles.add(filePath);
            });
            console.log(`[Autopilot] Marked ${existingFiles.length} existing summary files as processed`);
        }
    }
    catch (error) {
        console.error('[Autopilot] Error reading existing files:', error);
    }
    watcher.onDidCreate(u => {
        if (!processedFiles.has(u.fsPath)) {
            const d = safeRead(u);
            if (d) {
                processedFiles.add(u.fsPath);
                (0, dispatcher_1.pub)('summary', d);
                console.log('[Autopilot] Processing new summary file:', u.fsPath);
            }
        }
    });
    watcher.onDidChange(u => {
        if (!processedFiles.has(u.fsPath)) {
            const d = safeRead(u);
            if (d) {
                processedFiles.add(u.fsPath);
                (0, dispatcher_1.pub)('summary', d);
                console.log('[Autopilot] Processing changed summary file:', u.fsPath);
            }
        }
    });
    return watcher;
}
//# sourceMappingURL=watcher.js.map