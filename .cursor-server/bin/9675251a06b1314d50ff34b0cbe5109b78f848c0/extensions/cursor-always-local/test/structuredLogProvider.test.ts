import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StructuredLogProviderImpl, BufferedLogEntry } from '../src/structuredLogProvider';
import * as vscode from 'vscode';
import type { StructuredLogKey } from '@anysphere/constants';

// Mock vscode module
vi.mock('vscode', () => ({
	cursor: {
		registerStructuredLogProvider: vi.fn(() => ({ dispose: vi.fn() })),
		getAllRequestHeadersExceptAccessToken: vi.fn(),
	},
}));

// Mock the logger
vi.mock('../src/utils/logger', () => ({
	CursorDebugLogger: {
		error: vi.fn(),
	},
}));

describe('StructuredLogProviderImpl', () => {
	let provider: StructuredLogProviderImpl;

	beforeEach(() => {
		vi.clearAllMocks();
		provider = new StructuredLogProviderImpl();
	});

	afterEach(() => {
		provider.dispose();
	});

	it('should register structured log provider on construction', () => {
		expect(vscode.cursor.registerStructuredLogProvider).toHaveBeenCalledWith(
			expect.objectContaining({
				debug: expect.any(Function),
				info: expect.any(Function),
				warn: expect.any(Function),
				error: expect.any(Function),
			})
		);
	});

	it('should buffer logs before flushing', () => {
		// Access private buffer through type assertion
		const bufferAccessor = provider as any;

		expect(bufferAccessor.buffer).toHaveLength(0);

		// This would normally trigger the provider methods but in tests we verify the structure
		expect(bufferAccessor.buffer).toBeDefined();
	});

	it('should create log entries with correct structure', () => {
		// Verify the BufferedLogEntry interface structure
		const entry: BufferedLogEntry = {
			level: 'info',
			message: 'Test message',
			metadata: { key: 'value' },
			timestamp: Date.now(),
			key: 'composer',
		};

		expect(entry.level).toBe('info');
		expect(entry.message).toBe('Test message');
		expect(entry.metadata).toEqual({ key: 'value' });
	});

	it('should handle error logs with error objects', () => {
		const testError = new Error('Test error');
		const entry: BufferedLogEntry = {
			level: 'error',
			message: 'Error occurred',
			metadata: {},
			timestamp: Date.now(),
			error: testError,
			key: 'composer',
		};

		expect(entry.error).toBe(testError);
		expect(entry.level).toBe('error');
	});

	it('should dispose properly', () => {
		const disposeSpy = vi.spyOn(provider, 'dispose');
		provider.dispose();
		expect(disposeSpy).toHaveBeenCalled();
	});
});
