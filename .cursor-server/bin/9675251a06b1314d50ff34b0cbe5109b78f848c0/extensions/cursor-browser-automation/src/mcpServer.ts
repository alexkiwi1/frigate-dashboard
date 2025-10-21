import express from 'express';
import * as http from 'http';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { z } from 'zod';

interface MCPTool {
	name: string;
	description: string;
	inputSchema: {
		type: string;
		properties: Record<string, unknown>;
		required: string[];
	};
}

interface JSONRPCRequest {
	jsonrpc: '2.0';
	id?: string | number;
	method: string;
	params?: Record<string, unknown>;
}

interface JSONRPCResponse {
	jsonrpc: '2.0';
	id?: string | number;
	result?: unknown;
	error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

interface IframeConnection {
	tabId: string;
	ready: boolean;
	lastSeen: number;
}

// Zod schemas for type-safe validation
const PlaywrightLogConfigsSchema = z.object({
	logSizeThreshold: z.number().positive().optional(),
	logPreviewLines: z.number().positive().optional(),
	logPreviewChars: z.number().positive().optional(),
}).optional();

export class MCPServer {
	private app: express.Application;
	private server: http.Server | null = null;
	private port: number = 0;
	private authToken: string = ''; // Secret token for authenticating MCP requests
	private tools: MCPTool[] = [];
	private iframeConnections = new Map<string, IframeConnection>();
	private authorizedTabs = new Set<string>(); // Track which tabs are allowed to execute commands
	private preAuthorizedTabs = new Set<string>(); // Tabs pre-authorized by the extension (NOT via HTTP)
	private mcpCommandHandlers = new Map<string, (response: { success: boolean; result?: unknown; error?: string }) => void>();
	private mcpCommandCounter = 0;
	private pendingMCPCommands = new Map<string, { commandId: string; command: string; params: Record<string, unknown>; tabId: string }>();
	private vscodeCommands: {
		executeCommand<T>(command: string, ...rest: unknown[]): Thenable<T>;
	};

	// Configuration for log redirection (defaults)
	private readonly DEFAULT_LOG_SIZE_THRESHOLD = 25 * 1024; // 25KB threshold
	private readonly DEFAULT_LOG_PREVIEW_LINES = 25; // Number of lines to preview in log file output
	private readonly DEFAULT_LOG_PREVIEW_CHARS = 25 * 1024; // 25KB character limit for preview
	private readonly TEMP_LOG_DIR = path.join(os.homedir(), '.cursor', 'browser-logs');

	// Dynamic log configuration (can be overridden by enriched configs)
	private logSizeThreshold = this.DEFAULT_LOG_SIZE_THRESHOLD;
	private logPreviewLines = this.DEFAULT_LOG_PREVIEW_LINES;
	private logPreviewChars = this.DEFAULT_LOG_PREVIEW_CHARS;

	constructor(vscodeCommands: { executeCommand<T>(command: string, ...rest: unknown[]): Thenable<T> }) {
		this.vscodeCommands = vscodeCommands;
		// Generate a cryptographically secure random auth token (64 hex chars)
		this.authToken = crypto.randomBytes(32).toString('hex');
		console.log('[MCPServer] Generated auth token for MCP requests');

		this.app = express();
		this.setupMiddleware();
		this.registerTools();
		this.setupRoutes();
	}

	private setupMiddleware(): void {
		this.app.use(express.json({ limit: '50mb' }));

		// CORS - Permissive for all routes (specific routes add their own restrictions)
		this.app.use((req, res, next) => {
			res.header('Access-Control-Allow-Origin', '*');
			res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
			res.header('Access-Control-Allow-Headers', 'Content-Type, X-MCP-Auth-Token, X-Security-Token');

			if (req.method === 'OPTIONS') {
				return res.sendStatus(200);
			}
			next();
		});
	}

	private registerTools(): void {
		this.tools = [
			{
				name: 'browser_navigate',
				description: 'Navigate to a URL',
				inputSchema: {
					type: 'object',
					properties: {
						url: { type: 'string', description: 'The URL to navigate to' }
					},
					required: ['url']
				}
			},
			{
				name: 'browser_click',
				description: 'Perform click on a web page',
				inputSchema: {
					type: 'object',
					properties: {
						element: { type: 'string', description: 'Human-readable element description used to obtain permission to interact with the element' },
						ref: { type: 'string', description: 'Exact target element reference from the page snapshot' },
						doubleClick: { type: 'boolean', description: 'Whether to perform a double click instead of a single click' },
						button: { type: 'string', description: 'Button to click, defaults to left' },
						modifiers: { type: 'array', items: { type: 'string' }, description: 'Modifier keys to press' }
					},
					required: ['element', 'ref']
				}
			},
			{
				name: 'browser_type',
				description: 'Type text into editable element',
				inputSchema: {
					type: 'object',
					properties: {
						element: { type: 'string', description: 'Human-readable element description used to obtain permission to interact with the element' },
						ref: { type: 'string', description: 'Exact target element reference from the page snapshot' },
						text: { type: 'string', description: 'Text to type into the element' },
						submit: { type: 'boolean', description: 'Whether to submit entered text (press Enter after)' },
						slowly: { type: 'boolean', description: 'Whether to type one character at a time. Useful for triggering key handlers in the page. By default entire text is filled in at once.' }
					},
					required: ['element', 'ref', 'text']
				}
			},
			{
				name: 'browser_select_option',
				description: 'Select an option in a dropdown',
				inputSchema: {
					type: 'object',
					properties: {
						element: { type: 'string', description: 'Human-readable element description used to obtain permission to interact with the element' },
						ref: { type: 'string', description: 'Exact target element reference from the page snapshot' },
						values: { type: 'array', items: { type: 'string' }, description: 'Array of values to select in the dropdown. This can be a single value or multiple values.' }
					},
					required: ['element', 'ref', 'values']
				}
			},
			{
				name: 'browser_hover',
				description: 'Hover over element on page',
				inputSchema: {
					type: 'object',
					properties: {
						element: { type: 'string', description: 'Human-readable element description used to obtain permission to interact with the element' },
						ref: { type: 'string', description: 'Exact target element reference from the page snapshot' }
					},
					required: ['element', 'ref']
				}
			},
			{
				name: 'browser_snapshot',
				description: 'Capture accessibility snapshot of the current page, this is better than screenshot',
				inputSchema: {
					type: 'object',
					properties: {},
					required: []
				}
			},
			{
				name: 'browser_wait_for',
				description: 'Wait for text to appear or disappear or a specified time to pass',
				inputSchema: {
					type: 'object',
					properties: {
						time: { type: 'number', description: 'The time to wait in seconds' },
						text: { type: 'string', description: 'The text to wait for' },
						textGone: { type: 'string', description: 'The text to wait for to disappear' }
					},
					required: []
				}
			},
			{
				name: 'browser_take_screenshot',
				description: 'Take a screenshot of the current page. You can\'t perform actions based on the screenshot, use browser_snapshot for actions.',
				inputSchema: {
					type: 'object',
					properties: {
						type: { type: 'string', description: 'Image format for the screenshot. Default is png.' },
						filename: { type: 'string', description: 'File name to save the screenshot to. Defaults to page-{timestamp}.{png|jpeg} if not specified.' },
						element: { type: 'string', description: 'Human-readable element description used to obtain permission to screenshot the element. If not provided, the screenshot will be taken of viewport. If element is provided, ref must be provided too.' },
						ref: { type: 'string', description: 'Exact target element reference from the page snapshot. If not provided, the screenshot will be taken of viewport. If ref is provided, element must be provided too.' },
						fullPage: { type: 'boolean', description: 'When true, takes a screenshot of the full scrollable page, instead of the currently visible viewport. Cannot be used with element screenshots.' }
					},
					required: []
				}
			},
			{
				name: 'browser_press_key',
				description: 'Press a key on the keyboard',
				inputSchema: {
					type: 'object',
					properties: {
						key: { type: 'string', description: 'Name of the key to press or a character to generate, such as ArrowLeft or a' }
					},
					required: ['key']
				}
			},
			{
				name: 'browser_drag',
				description: 'Perform drag and drop between two elements',
				inputSchema: {
					type: 'object',
					properties: {
						startElement: { type: 'string', description: 'Human-readable source element description used to obtain permission to interact with the element' },
						startRef: { type: 'string', description: 'Exact source element reference from the page snapshot' },
						endElement: { type: 'string', description: 'Human-readable target element description used to obtain permission to interact with the element' },
						endRef: { type: 'string', description: 'Exact target element reference from the page snapshot' }
					},
					required: ['startElement', 'startRef', 'endElement', 'endRef']
				}
			}
		];
	}

	private setupRoutes(): void {
		// Health check
		this.app.get('/health', (req, res) => {
			res.json({
				status: 'ok',
				name: 'cursor-browser-automation',
				port: this.port,
				toolCount: this.tools.length
			});
		});

		// SSE endpoint for MCP streamable HTTP
		this.app.get('/sse', (req, res) => {
			res.writeHead(200, {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				'Connection': 'keep-alive',
				'Access-Control-Allow-Origin': '*'
			});

			// Send initial comment to establish connection
			res.write(': mcp server\n\n');

			// Handle client disconnect
			req.on('close', () => {
				res.end();
			});
		});

		// Main MCP endpoint
		this.app.post('/', async (req, res) => {
			// SECURITY: CORS check - only allow localhost origins
			const origin = req.headers.origin;
			if (origin && origin !== 'null' && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
				console.error(`[MCPServer] Blocked external origin attempting MCP request: ${origin}`);
				return res.status(403).json({
					jsonrpc: '2.0',
					id: null,
					error: {
						code: -32600,
						message: 'Forbidden: External origins not allowed'
					}
				});
			}

			// SECURITY: Require auth token to prevent unauthorized MCP requests
			const providedToken = req.headers['x-mcp-auth-token'];
			if (providedToken !== this.authToken) {
				console.error('[MCPServer] Unauthorized MCP request - invalid or missing auth token');
				return res.status(403).json({
					jsonrpc: '2.0',
					id: null,
					error: {
						code: -32600,
						message: 'Forbidden: Invalid or missing authentication token'
					}
				});
			}

			try {
				const request = req.body as JSONRPCRequest;
				const response = await this.handleMCPRequest(request);
				res.json(response);
			} catch (error) {
				res.status(500).json({
					jsonrpc: '2.0',
					id: null,
					error: {
						code: -32603,
						message: error instanceof Error ? error.message : String(error)
					}
				});
			}
		});

		// MCP response handler endpoint (called by iframe via postMessage -> fetch)
		this.app.post('/mcp-response', (req, res) => {
			const { commandId, success, result, error, tabId } = req.body;

			if (!commandId) {
				return res.status(400).json({ error: 'Missing commandId' });
			}

			// SECURITY: tabId is REQUIRED - can't bypass by omitting it
			if (!tabId) {
				console.error('[MCPServer] Response missing tabId');
				return res.status(400).json({ error: 'Missing tabId' });
			}

			// SECURITY: Validate response is from an authorized tab
			if (!this.authorizedTabs.has(tabId)) {
				console.error(`[MCPServer] Unauthorized response attempt from: ${tabId}`);
				return res.status(403).json({ error: 'Unauthorized: Tab not registered' });
			}

			console.log(`[MCPServer] Response received for command ${commandId} (success: ${success})`);
			this.handleMCPResponse(commandId, { success, result, error });
			res.json({ received: true });
		});

		// Iframe registration endpoint
		this.app.post('/register-iframe', (req, res) => {
			const { tabId } = req.body;
			if (!tabId) {
				return res.status(400).json({ error: 'Missing tabId' });
			}

			// SECURITY: Only allow pre-authorized tabs (set by extension, not HTTP)
			if (!this.preAuthorizedTabs.has(tabId)) {
				console.error(`[MCPServer] Registration rejected - tab not pre-authorized: ${tabId}`);
				return res.status(403).json({ error: 'Forbidden: Tab ID not pre-authorized by extension' });
			}

			// SECURITY: Prevent re-registration - check if already registered
			if (this.authorizedTabs.has(tabId)) {
				console.error(`[MCPServer] Registration rejected - tab already registered: ${tabId}`);
				return res.status(403).json({ error: 'Forbidden: Tab ID already registered' });
			}

			// SECURITY: Remove from pre-authorized list (single-use token)
			this.preAuthorizedTabs.delete(tabId);

			// Register the tab as authorized
			this.authorizedTabs.add(tabId);

			this.iframeConnections.set(tabId, {
				tabId,
				ready: true,
				lastSeen: Date.now()
			});

			console.log(`[MCPServer] Iframe registered and consumed pre-authorization: ${tabId}`);
			res.json({ success: true });
		});

		// Poll for pending MCP commands (called by iframe)
		this.app.get('/mcp-poll/:tabId', (req, res) => {
			const tabId = req.params.tabId;

			// Only allow authorized tabs to poll
			if (!this.authorizedTabs.has(tabId)) {
				console.error(`[MCPServer] Unauthorized poll attempt from: ${tabId}`);
				return res.status(403).json({ error: 'Unauthorized: Tab not registered' });
			}

			// Update last seen time
			const connection = this.iframeConnections.get(tabId);
			if (connection) {
				connection.lastSeen = Date.now();
			}

			// Find pending command for this tab
			let pendingCommand = null;
			for (const [key, cmd] of this.pendingMCPCommands.entries()) {
				if (cmd.tabId === tabId) {
					pendingCommand = cmd;
					this.pendingMCPCommands.delete(key);
					console.log(`[MCPServer] 📤 Sending command to authorized tab ${tabId.substring(0, 20)}...`);
					break;
				}
			}

			if (pendingCommand) {
				res.json(pendingCommand);
			} else {
				res.json({ commandId: null });
			}
		});
	}

	private async handleMCPRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
		const { method, params, id } = request;

		try {
			let result: unknown;

			switch (method) {
				case 'initialize':
					result = {
						protocolVersion: '2024-11-05',
						serverInfo: {
							name: 'cursor-browser-automation',
							version: '1.0.0'
						},
						capabilities: {
							tools: {}
						}
					};
					break;

				case 'tools/list':
					result = { tools: this.tools };
					break;

				case 'tools/call': {
					if (!params || typeof params !== 'object') {
						return {
							jsonrpc: '2.0',
							id,
							error: {
								code: -32602,
								message: 'Invalid params'
							}
						};
					}

					const callParams = params as { name?: string; arguments?: Record<string, unknown> };
					if (!callParams.name || !callParams.arguments) {
						return {
							jsonrpc: '2.0',
							id,
							error: {
								code: -32602,
								message: 'Missing tool name or arguments'
							}
						};
					}

					result = await this.executeTool(callParams.name, callParams.arguments);
					break;
				}

				default:
					return {
						jsonrpc: '2.0',
						id,
						error: {
							code: -32601,
							message: `Method not found: ${method}`
						}
					};
			}

			return {
				jsonrpc: '2.0',
				id,
				result
			};

		} catch (error) {
			return {
				jsonrpc: '2.0',
				id,
				error: {
					code: -32603,
					message: error instanceof Error ? error.message : String(error)
				}
			};
		}
	}

	private async executeTool(toolName: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: 'text'; text: string } | { type: 'resource'; resource: { mimeType: string; text: string; uri?: string } } | { type: 'resource_link'; uri: string; name: string; description?: string; mimeType?: string } | { type: 'image'; data: string; mimeType: string }> }> {
		// Extract and apply enriched log configs if provided
		if ('__playwrightLogConfigs' in args) {
			try {
				// Validate and parse the log configs using Zod
				const logConfigs = PlaywrightLogConfigsSchema.parse(args.__playwrightLogConfigs);

				if (logConfigs) {
					// Apply log configs with type safety
					this.logSizeThreshold = logConfigs.logSizeThreshold ?? this.DEFAULT_LOG_SIZE_THRESHOLD;
					this.logPreviewLines = logConfigs.logPreviewLines ?? this.DEFAULT_LOG_PREVIEW_LINES;
					this.logPreviewChars = logConfigs.logPreviewChars ?? this.DEFAULT_LOG_PREVIEW_CHARS;

				}
			} catch (error) {
				// Log validation error but continue with defaults
			}

			// Remove the internal config from args before passing to tools
			const { __playwrightLogConfigs, ...cleanArgs } = args;
			args = cleanArgs;
		}

		// Get the first active iframe connection that is AUTHORIZED
		const allConnections = Array.from(this.iframeConnections.entries());
		console.log('[MCPServer] All registered connections:', allConnections.map(([id, conn]) => ({
			tabId: id,
			ready: conn.ready,
			authorized: this.authorizedTabs.has(id),
			lastSeen: new Date(conn.lastSeen).toISOString(),
			ageSeconds: Math.round((Date.now() - conn.lastSeen) / 1000)
		})));

		// Only use authorized tabs
		const activeConnections = allConnections
			.map(([_, conn]) => conn)
			.filter(conn =>
				conn.ready &&
				this.authorizedTabs.has(conn.tabId) &&
				Date.now() - conn.lastSeen < 10000
			);

		console.log('[MCPServer] Active connections (within 10s):', activeConnections.length);

		if (activeConnections.length === 0) {
			const errorMsg = allConnections.length === 0
				? 'No browser tabs have registered with the MCP server. The iframe may have failed to inject the automation script (likely due to cross-origin restrictions).'
				: `Found ${allConnections.length} registered tab(s), but none are active and authorized (last seen > 10s ago). The page may have been closed or script failed to load.`;
			console.error('[MCPServer]', errorMsg);
			throw new Error(errorMsg);
		}

		const targetTabId = activeConnections[0].tabId;
		console.log('[MCPServer] Using authorized tab:', targetTabId);

		try {
			let result: unknown;
			let command: string;
			let params: Record<string, unknown>;

			switch (toolName) {
				case 'browser_navigate': {
					// Validate URL scheme - only allow http and https
					const urlString = args.url as string;
					try {
						const parsedUrl = new URL(urlString);
						const scheme = parsedUrl.protocol.replace(':', '').toLowerCase();
						if (scheme !== 'http' && scheme !== 'https') {
							throw new Error(`Invalid URL scheme '${scheme}'. Only 'http' and 'https' URLs are allowed for security reasons.`);
						}
					} catch (error) {
						if (error instanceof TypeError) {
							throw new Error(`Invalid URL format: ${urlString}`);
						}
						throw error;
					}

					command = 'navigate';
					params = { url: args.url };
					const navInfo = await this.executeMCPCommand(targetTabId, command, params) as {
						navigationType: 'url';
						url: string;
					};

					// Call internal workbench command directly (bypasses extension forwarding layer)
					// This ensures reliability even if the extension is restarted
					const navResult = await this.vscodeCommands.executeCommand<{
						success: boolean;
						url?: string;
						error?: string;
					}>('cursor.browserAutomation.internal.navigateWebview', targetTabId, navInfo);

					if (!navResult.success) {
						throw new Error(navResult.error || 'Navigation failed');
					}

					// Format result according to schema (snapshot will be captured on next interaction)
					result = {
						action: 'navigate',
						success: true,
						details: {
							url: navResult.url
						}
					};
					break;
				}

				case 'browser_click':
					command = 'click';
					params = {
						element: args.element,
						ref: args.ref,
						doubleClick: args.doubleClick,
						button: args.button,
						modifiers: args.modifiers
					};
					result = await this.executeMCPCommand(targetTabId, command, params);
					break;

				case 'browser_type':
					command = 'type';
					params = {
						element: args.element,
						ref: args.ref,
						text: args.text,
						submit: args.submit,
						slowly: args.slowly
					};
					result = await this.executeMCPCommand(targetTabId, command, params);
					break;

				case 'browser_select_option':
					command = 'select_option';
					params = {
						element: args.element,
						ref: args.ref,
						values: args.values
					};
					result = await this.executeMCPCommand(targetTabId, command, params);
					break;

				case 'browser_hover':
					command = 'hover';
					params = {
						element: args.element,
						ref: args.ref
					};
					result = await this.executeMCPCommand(targetTabId, command, params);
					break;

				case 'browser_snapshot':
					command = 'snapshot';
					params = {};
					result = await this.executeMCPCommand(targetTabId, command, params);
					break;

				case 'browser_wait_for':
					command = 'wait_for';
					params = {
						time: args.time,
						text: args.text,
						textGone: args.textGone
					};
					result = await this.executeMCPCommand(targetTabId, command, params);
					break;

				case 'browser_take_screenshot': {
					command = 'screenshot';
					params = {
						type: args.type || 'png',
						filename: args.filename,
						element: args.element,
						ref: args.ref,
						fullPage: args.fullPage || false
					};

					const screenshotInfo = await this.executeMCPCommand(targetTabId, command, params) as {
						screenshotType: 'viewport' | 'element' | 'fullPage';
						bounds?: { x: number; y: number; width: number; height: number };
						filename?: string;
						format?: string;
					};

					// Call internal workbench command directly (bypasses extension forwarding layer)
					// This ensures reliability even if the extension is restarted
					const captureResult = await this.vscodeCommands.executeCommand<{
						success: boolean;
						filename?: string;
						dataUrl?: string;
						error?: string;
						savedPath?: string;
					}>('cursor.browserAutomation.internal.captureScreenshot', targetTabId, screenshotInfo);

					if (!captureResult.success) {
						throw new Error(captureResult.error || 'Screenshot capture failed');
					}

					// Extract base64 data from dataUrl (remove "data:image/png;base64," prefix)
					const imageFormat = (args.type as string) || 'png';
					const mimeType = imageFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
					let base64Data = '';

					if (captureResult.dataUrl) {
						// Remove data URL prefix to get pure base64
						const dataUrlMatch = captureResult.dataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
						base64Data = dataUrlMatch ? dataUrlMatch[1] : captureResult.dataUrl;
					}

					// Format response according to spec - image data + optional text report
					const content: Array<{ type: 'image'; data: string; mimeType: string } | { type: 'text'; text: string }> = [
						{
							type: 'image',
							data: base64Data,
							mimeType: mimeType
						}
					];

					// Add optional text report with file info
					if (captureResult.savedPath || captureResult.filename) {
						const screenshotTypeDesc = screenshotInfo.screenshotType === 'fullPage' ? 'Full page' :
							screenshotInfo.screenshotType === 'element' ? 'Element' : 'Viewport';
						const textReport = `### Screenshot captured
- Type: ${screenshotTypeDesc}
- Format: ${imageFormat}
${captureResult.savedPath ? `- Saved to: ${captureResult.savedPath}` : ''}
${captureResult.filename ? `- Filename: ${captureResult.filename}` : ''}`;

						content.push({
							type: 'text',
							text: textReport
						});
					}

					return { content } as any;
				}

				case 'browser_press_key':
					command = 'press_key';
					params = {
						key: args.key
					};
					result = await this.executeMCPCommand(targetTabId, command, params);
					break;

				case 'browser_drag':
					command = 'drag';
					params = {
						startElement: args.startElement,
						startRef: args.startRef,
						endElement: args.endElement,
						endRef: args.endRef
					};
					result = await this.executeMCPCommand(targetTabId, command, params);
					break;

				default:
					throw new Error(`Unknown tool: ${toolName}`);
			}

			// Format result according to MCP schema
			const mcpResult = this.formatMCPResult(result, toolName);

			// Handle large log outputs if needed
			const processedResult = await this.handleLargeLogOutput(mcpResult, toolName);
			return processedResult;

		} catch (error) {
			throw error;
		}
	}

	/**
	 * Format browser automation results according to MCP response schema
	 */
	private formatMCPResult(result: any, toolName: string): { content: Array<{ type: 'text'; text: string } | { type: 'resource'; resource: { mimeType: string; text: string; uri?: string } }> } {
		// Extract common fields
		const action = result.action || toolName;
		const success = result.success ?? true;
		const pageState = result.pageState;
		const details = result.details;

		// Build human-readable report
		let report = `## ${action}\n\n`;
		report += `**Status:** ${success ? '✓ Success' : '✗ Failed'}\n\n`;

		// Add page state info
		if (pageState) {
			report += `### Page State\n`;
			report += `- **URL:** ${pageState.url}\n`;
			report += `- **Title:** ${pageState.title}\n\n`;
		}

		// Add action-specific details
		if (details && Object.keys(details).length > 0) {
			report += `### Details\n`;
			for (const [key, value] of Object.entries(details)) {
				report += `- **${key}:** ${JSON.stringify(value)}\n`;
			}
			report += '\n';
		}

		// Build MCP response content array
		const content: Array<{ type: 'text'; text: string } | { type: 'resource'; resource: { mimeType: string; text: string; uri?: string } }> = [];

		// For snapshot tool, the snapshot is the primary content (resource first, optional text)
		if (action === 'snapshot' && pageState?.snapshot) {
			// Optional brief report
			content.push({
				type: 'text',
				text: `Captured accessibility snapshot of ${pageState.url}`
			});

			// Required: structured accessibility tree
			content.push({
				type: 'resource',
				resource: {
					mimeType: 'application/json',
					text: JSON.stringify(pageState.snapshot, null, 2),
					uri: `snapshot://${pageState.url}`
				}
			});
		} else {
			// For all other tools: text report + optional snapshot resource
			content.push({
				type: 'text',
				text: report.trim()
			});

			// Add snapshot as resource if available
			if (pageState?.snapshot) {
				content.push({
					type: 'resource',
					resource: {
						mimeType: 'application/json',
						text: JSON.stringify(pageState.snapshot, null, 2),
						uri: `snapshot://${pageState.url}`
					}
				});
			}
		}

		return { content };
	}

	public async executeMCPCommand(tabId: string, command: string, params: Record<string, unknown>, timeoutMs = 30000): Promise<unknown> {
		return new Promise((resolve, reject) => {
			const commandId = `mcp-${++this.mcpCommandCounter}-${Date.now()}`;
			console.log(`[MCPServer] Executing command: ${command} for tab ${tabId} (${commandId})`);

			const timeoutHandle = setTimeout(() => {
				console.error(`[MCPServer] Command timeout after ${timeoutMs}ms: ${command} (${commandId})`);
				this.mcpCommandHandlers.delete(commandId);
				this.pendingMCPCommands.delete(commandId);
				reject(new Error(`Command timeout after ${timeoutMs}ms: ${command}`));
			}, timeoutMs);

			this.mcpCommandHandlers.set(commandId, (response) => {
				clearTimeout(timeoutHandle);
				this.mcpCommandHandlers.delete(commandId);

				if (response.success) {
					console.log(`[MCPServer] Command succeeded: ${command} (${commandId})`);
					resolve(response.result);
				} else {
					console.error(`[MCPServer] Command failed: ${command} (${commandId}): ${response.error}`);
					reject(new Error(response.error || 'Unknown error'));
				}
			});

			// Store the command for the iframe to poll
			this.pendingMCPCommands.set(commandId, { commandId, command, params, tabId });
		});
	}

	public handleMCPResponse(commandId: string, response: { success: boolean; result?: unknown; error?: string }): void {
		const handler = this.mcpCommandHandlers.get(commandId);
		if (handler) {
			handler(response);
		} else {
			console.warn(`[MCPServer] No handler found for commandId: ${commandId} (may have timed out)`);
		}
	}

	/**
	 * Check if a server is already running on the given port and is a valid MCP server
	 */
	private async checkExistingServer(port: number): Promise<boolean> {
		try {
			const response = await fetch(`http://127.0.0.1:${port}/health`, {
				method: 'GET',
				signal: AbortSignal.timeout(1000)
			});

			if (response.ok) {
				const data = await response.json() as { status: 'ok'; port: number; name: string };
				// Check if it's our MCP server by verifying the response structure
				return data.status === 'ok' && typeof data.port === 'number' && data.name === 'cursor-browser-automation';
			}
			return false;
		} catch (error) {
			return false;
		}
	}

	async start(preferredPort?: number, reuseExisting = true): Promise<{ port: number; reused: boolean; authToken?: string }> {
		// If a preferred port is specified and reuse is enabled, check if server exists
		if (preferredPort && reuseExisting) {
			const exists = await this.checkExistingServer(preferredPort);
			if (exists) {
				console.log(`[MCPServer] Found existing MCP server on port ${preferredPort}, reusing it`);
				this.port = preferredPort;
				// Note: this.server remains null since we're not managing this server
				// Return existing auth token when reusing
				return { port: this.port, reused: true, authToken: this.authToken };
			}
		}

		return new Promise((resolve, reject) => {
			const attemptStart = (port: number) => {
				this.server = this.app.listen(port, '127.0.0.1', () => {
					const address = this.server!.address() as { port: number };
					this.port = address.port;
					console.log(`[MCPServer] MCP server started on port ${this.port}`);
					console.log(`[MCPServer] Auth token: ${this.authToken.substring(0, 16)}...`);
					resolve({ port: this.port, reused: false, authToken: this.authToken });
				});

				this.server.on('error', (error: NodeJS.ErrnoException) => {
					if (error.code === 'EADDRINUSE' && preferredPort && port === preferredPort) {
						this.server = null;
						attemptStart(0);
					} else {
						reject(error);
					}
				});
			};

			attemptStart(preferredPort || 0);
		});
	}

	stop(): void {
		if (this.server) {
			this.server.close();
			this.server = null;
			this.port = 0;
			console.log('[MCPServer] MCP server stopped');
		}

		// Clear all authorized tabs and connections on shutdown
		this.authorizedTabs.clear();
		this.preAuthorizedTabs.clear();
		this.iframeConnections.clear();
		console.log('[MCPServer] Cleared all authorized tabs and connections');
	}

	getPort(): number {
		return this.port;
	}

	getAuthToken(): string {
		return this.authToken;
	}

	/**
	 * Pre-authorize a tabId (called by extension, NOT via HTTP)
	 * This prevents external scripts from registering arbitrary tabIds
	 */
	preAuthorizeTab(tabId: string): void {
		this.preAuthorizedTabs.add(tabId);
		console.log(`[MCPServer] Total pre-authorized: ${this.preAuthorizedTabs.size}`);
	}

	/**
	 * Handles large log outputs from any browser tool by redirecting them to temporary files
	 */
	private async handleLargeLogOutput(result: {
		content: Array<{ type: 'text'; text: string } | { type: 'resource'; resource: { mimeType: string; text: string; uri?: string } } | { type: 'image'; data: string; mimeType: string }>
	}, toolName: string): Promise<{ content: Array<{ type: 'text'; text: string } | { type: 'resource'; resource: { mimeType: string; text: string; uri?: string } } | { type: 'resource_link'; uri: string; name: string; description?: string; mimeType?: string } | { type: 'image'; data: string; mimeType: string }> }> {
		try {
			// Check if we have large resource content that should be redirected
			const content = result.content;
			const newContent: Array<{ type: 'text'; text: string } | { type: 'resource'; resource: { mimeType: string; text: string; uri?: string } } | { type: 'resource_link'; uri: string; name: string; description?: string; mimeType?: string } | { type: 'image'; data: string; mimeType: string }> = [];

			for (const item of content) {
				if (item.type === 'resource' && item.resource.mimeType === 'application/json') {
					// Check if the JSON snapshot is too large
					const size = Buffer.byteLength(item.resource.text, 'utf8');
					if (size > this.logSizeThreshold) {
						// Redirect large snapshot to file
						const redirected = await this.redirectToFile(item.resource.text, size, `${toolName}-snapshot`);
						newContent.push(...redirected.content);
					} else {
						newContent.push(item);
					}
				} else {
					newContent.push(item);
				}
			}

			return { content: newContent };
		} catch (error) {
			return result;
		}
	}

	/**
	 * Redirects content to a file and returns redirect information
	 */
	private async redirectToFile(content: string, size: number, toolName: string): Promise<{
		content: Array<{ type: 'resource_link'; uri: string; name: string; description?: string; mimeType?: string }>
	}> {
		await fs.mkdir(this.TEMP_LOG_DIR, { recursive: true });

		// Generate a unique filename for the log file
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const fileName = `${toolName}-${timestamp}.log`;
		const filePath = path.join(this.TEMP_LOG_DIR, fileName);

		// Calculate total lines in the content and get preview lines
		const lines = content.split('\n');
		const totalLines = lines.length;

		// Get preview lines based on either line count or character limit, whichever comes first
		const previewLines: string[] = [];
		let previewChars = 0;

		for (let i = 0; i < Math.min(this.logPreviewLines, lines.length); i++) {
			const line = lines[i];
			const lineChars = Buffer.byteLength(line, 'utf8');

			// Check if adding this line would exceed the character limit
			if (previewChars + lineChars > this.logPreviewChars) {
				break;
			}

			previewLines.push(line);
			previewChars += lineChars;
		}

		// Write the log content to the file
		await fs.writeFile(filePath, content, 'utf8');

		console.log(`[MCPServer] Large output from ${toolName} redirected to: ${filePath} (${totalLines} lines, ${previewLines.length} preview lines)`);

		// Encode log metadata as JSON in the description field
		// This will be parsed by mcpHandler to convert to log_file type
		const logMetadata = {
			isLogFile: true,
			file: filePath,
			size: size,
			totalLines: totalLines,
			previewLines: previewLines
		};

		return {
			content: [{
				type: 'resource_link',
				uri: `file://${filePath}`,
				name: path.basename(filePath),
				description: JSON.stringify(logMetadata),
				mimeType: 'application/x-cursor-log',
			}]
		};
	}
}