import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { Provider } from './models';

// Re-export prompts from the dedicated prompts file
export {
  INITIAL_SYSTEM_PROMPT,
  FOLLOWUP_SYSTEM_PROMPT,
  FIX_SYSTEM_PROMPT,
  buildInitialUserPrompt,
  buildFollowUpPrompt,
  buildCompileErrorFixPrompt,
  buildRetryPrompt,
  buildExpandPrompt,
} from './prompts';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[]; // base64 PNG images
}

export interface AIClient {
  chat(messages: AIMessage[]): Promise<string>;
}

/**
 * Overflow analysis for precise AI guidance
 */
export interface OverflowAnalysis {
  overflowLines: number;
  overflowWords: number;
  totalLines: number;
  totalWords: number;
  overflowPercentage: number; // 0-100
}

/**
 * Page fill analysis for underflow detection
 */
export interface PageFillAnalysis {
  pageHeight: number;
  contentBottom: number;
  blankSpace: number;
  blankPercentage: number; // 0-100
}

/**
 * Chat message for follow-up context
 */
export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Create an AI client for the specified provider
 */
export function createAIClient(
  provider: Provider,
  apiKey: string,
  model: string
): AIClient {
  if (provider === 'openai') {
    return new OpenAIClient(apiKey, model);
  } else {
    return new GoogleClient(apiKey, model);
  }
}

/**
 * OpenAI client implementation with vision support
 */
class OpenAIClient implements AIClient {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async chat(messages: AIMessage[]): Promise<string> {
    const formattedMessages = messages.map((msg) => {
      if (msg.images && msg.images.length > 0) {
        // Message with images - use content array format
        const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
          { type: 'text', text: msg.content },
          ...msg.images.map((img) => ({
            type: 'image_url' as const,
            image_url: {
              url: `data:image/png;base64,${img}`,
              detail: 'high' as const,
            },
          })),
        ];
        return {
          role: msg.role as 'user' | 'assistant' | 'system',
          content,
        };
      } else {
        // Text-only message
        return {
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        };
      }
    });

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: formattedMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      max_tokens: 8192,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || '';
  }
}

/**
 * Google Gemini client implementation with vision support
 */
class GoogleClient implements AIClient {
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async chat(messages: AIMessage[]): Promise<string> {
    // Build parts for Gemini
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    
    // Combine all messages into a single prompt for Gemini
    // (Gemini works better with a single combined prompt for this use case)
    let systemPrompt = '';
    let userPrompt = '';
    const images: string[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += msg.content + '\n\n';
      } else if (msg.role === 'user') {
        userPrompt += msg.content + '\n\n';
        if (msg.images) {
          images.push(...msg.images);
        }
      }
    }

    // Add system prompt first
    if (systemPrompt) {
      parts.push({ text: systemPrompt });
    }

    // Add user prompt
    parts.push({ text: userPrompt });

    // Add images
    for (const img of images) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: img,
        },
      });
    }

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts }],
      config: {
        maxOutputTokens: 8192,
        temperature: 0.7,
      },
    });

    return response.text || '';
  }
}

/**
 * Unescape JSON string escape sequences
 */
function unescapeJsonString(str: string): string {
  // Process escape sequences in correct order
  let result = str;
  
  // Use a state machine approach to handle escaped backslashes correctly
  let output = '';
  let i = 0;
  while (i < result.length) {
    if (result[i] === '\\' && i + 1 < result.length) {
      const nextChar = result[i + 1];
      switch (nextChar) {
        case 'n':
          output += '\n';
          i += 2;
          break;
        case 't':
          output += '\t';
          i += 2;
          break;
        case 'r':
          output += '\r';
          i += 2;
          break;
        case '"':
          output += '"';
          i += 2;
          break;
        case '\\':
          output += '\\';
          i += 2;
          break;
        default:
          // Unknown escape, keep as-is
          output += result[i];
          i += 1;
      }
    } else {
      output += result[i];
      i += 1;
    }
  }
  
  return output;
}

/**
 * Extract LaTeX content from a potentially malformed or truncated JSON response
 */
function extractLatexFromJson(response: string): string | null {
  // Look for "latex": " pattern
  const latexKeyPatterns = ['"latex": "', '"latex":"', "'latex': '", "'latex':'"];
  
  let contentStart = -1;
  let quoteChar = '"';
  
  for (const pattern of latexKeyPatterns) {
    const idx = response.indexOf(pattern);
    if (idx !== -1) {
      contentStart = idx + pattern.length;
      quoteChar = pattern.endsWith('"') ? '"' : "'";
      break;
    }
  }
  
  if (contentStart === -1) return null;
  
  // Find where the latex value ends
  // Look for the pattern: closing quote followed by comma or closing brace (with possible whitespace)
  // But we need to skip escaped quotes
  let contentEnd = -1;
  let i = contentStart;
  
  while (i < response.length) {
    if (response[i] === '\\' && i + 1 < response.length) {
      // Skip escaped character
      i += 2;
      continue;
    }
    
    if (response[i] === quoteChar) {
      // Check if this looks like the end of the latex value
      // It should be followed by comma, whitespace+comma, or closing brace
      const remaining = response.slice(i + 1).trimStart();
      if (remaining.startsWith(',') || remaining.startsWith('}') || remaining === '') {
        contentEnd = i;
        break;
      }
    }
    i++;
  }
  
  // If we didn't find a proper end, the response might be truncated
  // Take everything from contentStart to end
  if (contentEnd === -1) {
    contentEnd = response.length;
  }
  
  const escapedLatex = response.substring(contentStart, contentEnd);
  
  // Try JSON.parse first for proper unescaping
  try {
    const unescaped = JSON.parse(`"${escapedLatex}"`);
    if (unescaped && unescaped.includes('\\documentclass')) {
      return unescaped;
    }
  } catch {
    // JSON.parse failed, use manual unescaping
  }
  
  // Manual unescape
  const unescaped = unescapeJsonString(escapedLatex);
  if (unescaped && unescaped.includes('\\documentclass')) {
    return unescaped;
  }
  
  return null;
}

/**
 * Parse AI response that should contain JSON with latex and summary
 */
export function parseAIResponse(response: string): { latex: string; summary: string } {
  // Remove potential markdown code blocks
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();
  
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.latex && typeof parsed.latex === 'string') {
      return {
        latex: parsed.latex,
        summary: parsed.summary || '• Resume modified successfully',
      };
    }
  } catch {
    // JSON parsing failed - response might be truncated or malformed
  }
  
  // Try to extract LaTeX from malformed/truncated JSON
  const extractedLatex = extractLatexFromJson(cleaned);
  if (extractedLatex) {
    // Also try to extract summary if present
    let summary = '• Resume modified successfully';
    const summaryMatch = cleaned.match(/"summary"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    if (summaryMatch) {
      try {
        summary = JSON.parse(`"${summaryMatch[1]}"`);
      } catch {
        summary = unescapeJsonString(summaryMatch[1]);
      }
    }
    
    return {
      latex: extractedLatex,
      summary,
    };
  }

  // Fallback: treat the entire response as LaTeX (for backwards compatibility with retry prompts)
  let latex = response.trim();
  
  // Remove markdown code blocks if present
  if (latex.startsWith('```latex')) {
    latex = latex.slice(8);
  } else if (latex.startsWith('```')) {
    latex = latex.slice(3);
  }
  if (latex.endsWith('```')) {
    latex = latex.slice(0, -3);
  }
  
  // Final check: if it still looks like JSON wrapper, something went wrong
  // Try one more time to extract just the LaTeX part
  latex = latex.trim();
  if (latex.startsWith('{') && latex.includes('"latex"')) {
    const lastAttempt = extractLatexFromJson(latex);
    if (lastAttempt) {
      return {
        latex: lastAttempt,
        summary: '• Resume modified successfully',
      };
    }
  }

  return {
    latex: latex.trim(),
    summary: '• Resume modified successfully',
  };
}
