import { NextResponse } from 'next/server';

/**
 * API route to check for valid API keys in environment variables
 * Returns the first valid key found, preferring Google over OpenAI
 */

interface EnvKeyResponse {
  provider: 'openai' | 'google' | null;
  apiKey: string | null;
}

function isValidOpenAIKey(key: string | undefined): boolean {
  return !!key && key.trim().startsWith('sk-');
}

function isValidGoogleKey(key: string | undefined): boolean {
  return !!key && key.trim().startsWith('AIza');
}

export async function GET(): Promise<NextResponse<EnvKeyResponse>> {
  // Check for Google API key first (preferred)
  const googleKey = process.env.GOOGLE_API_KEY;
  if (isValidGoogleKey(googleKey)) {
    return NextResponse.json({
      provider: 'google',
      apiKey: googleKey!.trim(),
    });
  }

  // Check for OpenAI API key
  const openaiKey = process.env.OPENAI_API_KEY;
  if (isValidOpenAIKey(openaiKey)) {
    return NextResponse.json({
      provider: 'openai',
      apiKey: openaiKey!.trim(),
    });
  }

  // No valid keys found
  return NextResponse.json({
    provider: null,
    apiKey: null,
  });
}
