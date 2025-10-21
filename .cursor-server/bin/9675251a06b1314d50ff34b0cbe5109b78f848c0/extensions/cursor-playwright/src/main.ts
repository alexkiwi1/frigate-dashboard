import { McpProvider } from '@cursor/types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createConnection } from '@playwright/mcp';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import type { Browser, BrowserContext } from 'playwright';
import { chromium } from 'playwright';
import * as vscode from 'vscode';
import { z } from 'zod';
import { McpChannel } from './channel.js';
import { PlaywrightLogger } from './utils/logger.js';

// Zod schema for Playwright log configurations
const PlaywrightLogConfigsSchema = z.object({
	logSizeThreshold: z.number(),
	logPreviewLines: z.number(),
	logPreviewChars: z.number(),
});

const deactivateTasks: { (): Promise<any> }[] = [];

/**
 * Determines the Chrome executable path for the current platform
 * @returns Chrome executable path or undefined if not found
 */
async function getChromeExecutablePath(): Promise<string | undefined> {
	const platform = os.platform();
	const possiblePaths: string[] = [];

	switch (platform) {
		case 'darwin': // macOS
			possiblePaths.push(
				'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
				'/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
				'/Applications/Chromium.app/Contents/MacOS/Chromium'
			);
			break;

		case 'win32': {
			// Windows
			const programFiles = process.env['PROGRAMFILES'] || 'C:\\Program Files';
			const programFilesX86 =
				process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
			const localAppData =
				process.env['LOCALAPPDATA'] ||
				path.join(os.homedir(), 'AppData', 'Local');

			possiblePaths.push(
				path.join(
					programFiles,
					'Google',
					'Chrome',
					'Application',
					'chrome.exe'
				),
				path.join(
					programFilesX86,
					'Google',
					'Chrome',
					'Application',
					'chrome.exe'
				),
				path.join(
					localAppData,
					'Google',
					'Chrome',
					'Application',
					'chrome.exe'
				),
				path.join(
					programFiles,
					'Google',
					'Chrome SxS',
					'Application',
					'chrome.exe'
				),
				path.join(
					programFilesX86,
					'Google',
					'Chrome SxS',
					'Application',
					'chrome.exe'
				),
				path.join(
					localAppData,
					'Google',
					'Chrome SxS',
					'Application',
					'chrome.exe'
				),
				path.join(programFiles, 'Chromium', 'Application', 'chrome.exe'),
				path.join(programFilesX86, 'Chromium', 'Application', 'chrome.exe')
			);
			break;
		}

		case 'linux': // Linux
			possiblePaths.push(
				'/usr/bin/google-chrome',
				'/usr/bin/google-chrome-stable',
				'/usr/bin/google-chrome-beta',
				'/usr/bin/google-chrome-unstable',
				'/usr/bin/chromium-browser',
				'/usr/bin/chromium',
				'/snap/bin/chromium',
				'/var/lib/snapd/snap/bin/chromium',
				'/usr/local/bin/chrome',
				'/usr/local/bin/google-chrome'
			);
			break;

		default:
			PlaywrightLogger.warn(`Unsupported platform: ${platform}`);
			return undefined;
	}

	// Check each possible path and return the first one that exists
	for (const executablePath of possiblePaths) {
		try {
			if (await fs.access(executablePath).then(() => true).catch(() => false)) {
				PlaywrightLogger.info(`Found Chrome executable at: ${executablePath}`);
				return executablePath;
			}
		} catch (error) {
			// Continue to next path if there's an error checking this one
			continue;
		}
	}

	PlaywrightLogger.warn(
		`No Chrome executable found on ${platform}. Checked paths: ${possiblePaths.join(
			', '
		)}`
	);
	return undefined;
}

/**
 * Checks and returns the current Playwright browser status
 */
async function checkPlaywrightStatus(): Promise<object> {
	const chromePath = await getChromeExecutablePath();
	return {
		platform: os.platform(),
		chromeFound: !!chromePath,
		chromePath: chromePath || 'bundled',
	};
}

// MCP Provider that wraps the Playwright MCP Server
class PlaywrightMcpProvider implements McpProvider {
	public readonly id = 'cursor-playwright';
	public readonly featureGateName = 'playwright_mcp_provider';

	private mcpChannel: McpChannel | null = null;
	private mcpClient: Client | null = null;
	private activeBrowsers: Set<Browser> = new Set();

	// Configuration for log redirection - now dynamic
	private logConfig = {
		LOG_SIZE_THRESHOLD: 25 * 1024, // Default 25KB threshold
		LOG_PREVIEW_LINES: 25, // Default number of lines to preview
		LOG_PREVIEW_CHARS: 25 * 1024, // Default 25KB character limit for preview
	};
	private readonly TEMP_LOG_DIR = path.join(os.homedir(), '.cursor', 'browser-logs');

	constructor(private context: vscode.ExtensionContext) { }

	async initialize(): Promise<void> {
		try {
			PlaywrightLogger.info('Initializing Playwright MCP Server');

			// Clean up old log files from previous sessions
			await this.cleanupOldLogFiles();

			// Create the bidirectional channel
			this.mcpChannel = new McpChannel();

			// Define custom context getter that returns our managed context
			const contextGetter = async (): Promise<BrowserContext> => {
				// Get the Chrome executable path for the current platform
				const executablePath = await getChromeExecutablePath();

				// Create our own browser context that we can manage
				const browser = await chromium.launch({
					headless: false,
					executablePath, // Will use Playwright's bundled Chromium if undefined
				});

				// Track the browser instance for proper cleanup
				this.activeBrowsers.add(browser);

				// Listen for browser close events to remove from tracking
				browser.on('disconnected', () => {
					this.activeBrowsers.delete(browser);
					PlaywrightLogger.info('Browser disconnected and removed from tracking');
				});

				const context = await browser.newContext({
					viewport: null,
				});

				// Also listen for context close events
				context.on('close', async () => {
					PlaywrightLogger.info('Browser context closed, closing browser');
					try {
						const contextBrowser = context.browser();
						if (contextBrowser) {
							await contextBrowser.close();
							this.activeBrowsers.delete(contextBrowser);
						}
					} catch (error) {
						PlaywrightLogger.error('Error closing browser on context close', error as Error);
					}
				});

				return context;
			};


			// Create the Playwright MCP server with custom context getter
			const mcpServer = await createConnection(
				{
					browser: {
						isolated: true, // Use isolated mode to avoid conflicts with existing Chrome
					},
				},
				contextGetter
			);

			// Connect the MCP server to the server-side transport
			await mcpServer.connect(this.mcpChannel.serverTransport);

			// Create MCP client using the client-side transport
			this.mcpClient = new Client(
				{
					name: 'cursor-playwright-client',
					version: '1.0.0',
				},
				{
					capabilities: {},
				}
			);

			// Connect the client to the client-side transport
			await this.mcpClient.connect(this.mcpChannel.clientTransport);

			PlaywrightLogger.info(
				'Playwright MCP Server and Client initialized successfully'
			);
		} catch (error) {
			PlaywrightLogger.error(
				'Failed to initialize Playwright MCP Server',
				error as Error
			);
			throw error;
		}
	}

	async listOfferings(): Promise<
		{ tools: any[]; prompts: any[]; resources?: any[] } | undefined
	> {
		if (!this.mcpClient) {
			throw new Error('MCP Client not initialized');
		}

		PlaywrightLogger.info('Calling listOfferings on MCP Client');

		try {
			// Get tools, prompts, and resources from the MCP client
			const [toolsResult, promptsResult, resourcesResult] =
				await Promise.allSettled([
					this.mcpClient.listTools(),
					this.mcpClient.listPrompts?.() || Promise.resolve({ prompts: [] }),
					this.mcpClient.listResources?.() ||
					Promise.resolve({ resources: [] }),
				]);

			const rawTools =
				toolsResult.status === 'fulfilled' ? toolsResult.value.tools || [] : [];
			const rawPrompts =
				promptsResult.status === 'fulfilled'
					? promptsResult.value.prompts || []
					: [];
			const resources =
				resourcesResult.status === 'fulfilled'
					? resourcesResult.value.resources || []
					: [];

			// Transform tools to match expected format
			const tools = rawTools.filter((tool) => tool.name !== 'browser_close').map((tool) => {
				const parameters =
					tool.inputSchema !== undefined && tool.inputSchema !== null
						? JSON.stringify(tool.inputSchema)
						: '{}';

				return {
					name: tool.name,
					description: tool.description || '',
					parameters,
				};
			});

			// Transform prompts to match expected format
			const prompts = rawPrompts.map((prompt) => ({
				name: prompt.name,
				description: prompt.description || '',
				// Only stringify if arguments exists, otherwise provide "{}"
				parameters:
					prompt.arguments !== undefined
						? JSON.stringify(prompt.arguments)
						: '{}',
			}));

			return {
				tools,
				prompts,
				resources,
			};
		} catch (error) {
			PlaywrightLogger.error('Error listing offerings', error as Error);
			throw error;
		}
	}

	async callTool(
		toolName: string,
		args: Record<string, unknown>,
	): Promise<unknown> {
		if (!this.mcpClient) {
			await this.initialize();
		}

		if (!this.mcpClient) {
			throw new Error('MCP Client not initialized');
		}

		try {
			// Validate browser_navigate tool to reject file:// URLs
			if (toolName === 'browser_navigate' && args.url) {
				try {
					const urlString = String(args.url);
					const parsedUrl = new URL(urlString);

					if (parsedUrl.protocol === 'file:') {
						const message = `Security restriction: file:// URLs are not allowed for security reasons. The browser_navigate tool can only access web URLs (http:// or https://). If you need to test with local files, consider using a local web server instead.`;
						PlaywrightLogger.warn(`Blocked file:// URL navigation attempt: ${urlString}`);
						return {
							content: [{
								type: 'text',
								text: message
							}]
						};
					}
				} catch (error) {
					// If URL parsing fails, let it through - the underlying tool will handle invalid URLs
					if (error instanceof TypeError) {
						PlaywrightLogger.warn(`Failed to parse URL for security check: ${args.url}`);
					}
					// Don't re-throw, just let the tool handle it
				}
			}


			// Extract and apply log configs if present
			let toolArgs = { ...args };
			if (args.__playwrightLogConfigs) {
				try {
					const configs = PlaywrightLogConfigsSchema.parse(args.__playwrightLogConfigs);
					this.logConfig.LOG_SIZE_THRESHOLD = configs.logSizeThreshold
					this.logConfig.LOG_PREVIEW_LINES = configs.logPreviewLines
					this.logConfig.LOG_PREVIEW_CHARS = configs.logPreviewChars

					PlaywrightLogger.info(`Applied log configs: threshold=${this.logConfig.LOG_SIZE_THRESHOLD}, lines=${this.logConfig.LOG_PREVIEW_LINES}, chars=${this.logConfig.LOG_PREVIEW_CHARS}`);
				} catch (error) {
					PlaywrightLogger.warn('Invalid playwrightLogConfigs format, using defaults');
				}

				// Remove the config from args before passing to the actual tool
				const { __playwrightLogConfigs, ...cleanArgs } = toolArgs;
				toolArgs = cleanArgs;
			}

			PlaywrightLogger.info(`Calling tool ${toolName} on MCP Client`);
			const result = await this.mcpClient.callTool({
				name: toolName,
				arguments: toolArgs,
			});

			PlaywrightLogger.info(`Result: ${JSON.stringify(result, null, 2)}`);

			// Handle large log output for any Playwright tool
			const processedResult = await this.handleLargeLogOutput(result, toolName);
			return processedResult;
		} catch (error) {
			PlaywrightLogger.error(`Error calling tool ${toolName}`, error as Error);
			throw error;
		}
	}

	/**
	 * Handles large log outputs from any Playwright tool by redirecting them to temporary files
	 */
	private async handleLargeLogOutput(result: unknown, toolName: string): Promise<unknown> {
		// Define Zod schema for the expected result structure
		const resultSchema = z.object({
			content: z.array(z.object({
				type: z.literal('text'),
				text: z.string()
			}))
		});

		try {
			// Validate and parse the result
			const validatedResult = resultSchema.parse(result);
			const textContent = validatedResult.content[0].text;

			PlaywrightLogger.info(`Processing text content for tool ${toolName}: ${textContent.substring(0, 100)}...`);

			// Check if the content is large enough to warrant file redirection
			const size = Buffer.byteLength(textContent, 'utf8');

			// Use dynamic config value instead of hardcoded
			if (size > this.logConfig.LOG_SIZE_THRESHOLD) {
				PlaywrightLogger.info(`Large output detected for tool ${toolName} (${size} bytes), redirecting to file`);
				return await this.redirectToFile(textContent, size, toolName);
			}

			return result;
		} catch (error) {
			// If validation fails, return the original result
			PlaywrightLogger.warn('Failed to validate result structure, returning original result');
			return result;
		}
	}

	/**
	 * Redirects content to a file and returns redirect information
	 */
	private async redirectToFile(content: string, size: number, toolName: string): Promise<{
		content: [{ type: 'log_file', file: string, size: number, totalLines: number, previewLines: string[] }]
	}> {
		await fs.mkdir(this.TEMP_LOG_DIR, { recursive: true });

		// Generate a unique filename for the log file
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const fileName = `${toolName}-${timestamp}.log`;
		const filePath = path.join(this.TEMP_LOG_DIR, fileName);

		// Calculate total lines in the content and get preview lines
		const lines = content.split('\n');
		const totalLines = lines.length;

		// Get preview lines based on dynamic config values
		let previewLines: string[] = [];
		let previewChars = 0;

		for (let i = 0; i < Math.min(this.logConfig.LOG_PREVIEW_LINES, lines.length); i++) {
			const line = lines[i];
			const lineChars = Buffer.byteLength(line, 'utf8');

			// Check if adding this line would exceed the character limit
			if (previewChars + lineChars > this.logConfig.LOG_PREVIEW_CHARS) {
				break;
			}

			previewLines.push(line);
			previewChars += lineChars;
		}

		// Write the log content to the file
		await fs.writeFile(filePath, content, 'utf8');

		PlaywrightLogger.info(`Large output from ${toolName} redirected to: ${filePath} (${totalLines} lines, ${previewLines.length} preview lines)`);

		// Return a special file type with file information including total lines and preview
		return {
			content: [{
				type: 'log_file',
				file: filePath,
				size: size,
				totalLines: totalLines,
				previewLines: previewLines,
			}]
		};
	}



	/**
	 * Cleans up old log files from the temporary directory
	 */
	private async cleanupOldLogFiles(): Promise<void> {
		try {
			// Check if the temp directory exists
			const dirExists = await fs.access(this.TEMP_LOG_DIR).then(() => true).catch(() => false);
			if (!dirExists) {
				return;
			}

			const files = await fs.readdir(this.TEMP_LOG_DIR);
			const now = Date.now();
			const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

			for (const file of files) {
				if (file.endsWith('.log')) {
					const filePath = path.join(this.TEMP_LOG_DIR, file);
					try {
						const stats = await fs.stat(filePath);
						if (now - stats.mtimeMs > maxAge) {
							await fs.unlink(filePath);
							PlaywrightLogger.info(`Cleaned up old log file: ${file}`);
						}
					} catch (error) {
						PlaywrightLogger.error(`Failed to clean up log file ${file}`, error as Error);
					}
				}
			}
		} catch (error) {
			PlaywrightLogger.error('Failed to cleanup old log files', error as Error);
		}
	}

	async dispose(): Promise<void> {
		// Close all active browsers first
		if (this.activeBrowsers.size > 0) {
			PlaywrightLogger.info(`Closing ${this.activeBrowsers.size} active browser(s)`);
			const closeBrowserPromises = Array.from(this.activeBrowsers).map(async (browser) => {
				try {
					await browser.close();
					PlaywrightLogger.info('Browser closed successfully');
				} catch (error) {
					PlaywrightLogger.error('Error closing browser', error as Error);
				}
			});
			await Promise.allSettled(closeBrowserPromises);
			this.activeBrowsers.clear();
		}

		// Clean up old log files before disposing
		await this.cleanupOldLogFiles();

		if (this.mcpClient) {
			await this.mcpClient.close();
			this.mcpClient = null;
		}
		if (this.mcpChannel) {
			await this.mcpChannel.close();
			this.mcpChannel = null;
		}
		PlaywrightLogger.info('Playwright MCP Provider disposed');
	}
}

// this method is called when vs code is activated
export async function activate(context: vscode.ExtensionContext) {
	PlaywrightLogger.init();
	PlaywrightLogger.info('Activating Cursor Playwright MCP Provider');

	// Create and initialize the MCP provider
	const mcpProvider = new PlaywrightMcpProvider(context);

	try {
		await mcpProvider.initialize();
		PlaywrightLogger.info('Playwright MCP Provider initialized successfully');
	} catch (error) {
		PlaywrightLogger.error(
			'Failed to initialize Playwright MCP Provider',
			error as Error
		);
		// Still register the provider even if initialization fails - it can retry later
	}

	const mcpDisposable = vscode.cursor.registerMcpProvider(mcpProvider);

	// Register the status command
	const statusCommand = vscode.commands.registerCommand(
		'cursor-playwright.status',
		checkPlaywrightStatus
	);

	deactivateTasks.push(async () => {
		await mcpProvider.dispose();
		mcpDisposable.dispose();
		statusCommand.dispose();
	});

	PlaywrightLogger.info(
		'Cursor Playwright MCP Provider registered successfully'
	);
}

export async function deactivate(): Promise<void> {
	PlaywrightLogger.info('Deactivating Cursor Playwright MCP Provider');

	for (const task of deactivateTasks) {
		await task();
	}
}
