/**
 * Debug Logging System
 * 
 * Provides two separate log files:
 * - conversations.json: Full AI conversation context (resume, job, AI responses)
 * - operations.json: Operational logs (actions, errors, timing)
 */

import { promises as fs } from 'fs';
import path from 'path';

// Log directory path (at project root)
const LOGS_DIR = path.join(process.cwd(), 'logs');
const CONVERSATIONS_FILE = path.join(LOGS_DIR, 'conversations.json');
const OPERATIONS_FILE = path.join(LOGS_DIR, 'operations.json');

// Types
export interface ConversationLog {
  id: string;
  timestamp: string;
  type: 'initial' | 'followup' | 'fix' | 'retry' | 'expand';
  input: {
    // For initial/followup
    resume?: string;
    jobDescription?: string;
    customInstructions?: string;
    followUpInstruction?: string;
    chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    originalResume?: string;
    // For fix attempts
    latexBeforeFix?: string;
    compileError?: string;
    compileLogs?: string;
    fixAttempt?: number;
    originalResumeProvided?: boolean;
    // For retry (overflow)
    pageCount?: number;
    overflowPercentage?: number;
    overflowWords?: number;
    // For expand (underflow)
    blankPercentage?: number;
  };
  output: {
    rawResponse: string;
    parsedLatex?: string;
    parsedSummary?: string;
  };
}

export interface OperationLog {
  id: string;
  timestamp: string;
  action: string;
  status: 'success' | 'error';
  details?: string;
  error?: string;
}

/**
 * Ensure logs directory exists
 */
async function ensureLogsDir(): Promise<void> {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  } catch {
    // Directory might already exist
  }
}

/**
 * Read existing logs from a file, or return empty array if file doesn't exist
 */
async function readLogFile<T>(filePath: string): Promise<T[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // File doesn't exist or is invalid JSON
    return [];
  }
}

/**
 * Write logs to a file
 */
async function writeLogFile<T>(filePath: string, logs: T[]): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(logs, null, 2), 'utf-8');
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Log full conversation context (resume, job description, AI response)
 */
export async function logConversation(log: Omit<ConversationLog, 'timestamp'>): Promise<void> {
  try {
    await ensureLogsDir();
    
    const logEntry: ConversationLog = {
      ...log,
      timestamp: new Date().toISOString(),
    };
    
    const existingLogs = await readLogFile<ConversationLog>(CONVERSATIONS_FILE);
    existingLogs.push(logEntry);
    
    // Keep only last 100 conversations to prevent file from growing too large
    const trimmedLogs = existingLogs.slice(-100);
    
    await writeLogFile(CONVERSATIONS_FILE, trimmedLogs);
  } catch (error) {
    // Don't let logging errors affect the main flow
    console.error('Failed to log conversation:', error);
  }
}

/**
 * Log operations and errors
 */
export async function logOperation(log: Omit<OperationLog, 'timestamp'>): Promise<void> {
  try {
    await ensureLogsDir();
    
    const logEntry: OperationLog = {
      ...log,
      timestamp: new Date().toISOString(),
    };
    
    const existingLogs = await readLogFile<OperationLog>(OPERATIONS_FILE);
    existingLogs.push(logEntry);
    
    // Keep only last 500 operations to prevent file from growing too large
    const trimmedLogs = existingLogs.slice(-500);
    
    await writeLogFile(OPERATIONS_FILE, trimmedLogs);
  } catch (error) {
    // Don't let logging errors affect the main flow
    console.error('Failed to log operation:', error);
  }
}
