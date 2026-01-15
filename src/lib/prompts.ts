/**
 * Prompt Configuration File
 * 
 * All AI prompts are centralized here for easy customization.
 * Modify these prompts to adjust AI behavior without changing code.
 */

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

/**
 * System prompt for initial resume modification
 */
export const INITIAL_SYSTEM_PROMPT = `You are an expert resume writer and LaTeX specialist. Your task is to MODIFY an existing LaTeX resume to better match a specific job description.

ABSOLUTE RULES - NEVER VIOLATE THESE:
1. NEVER change the person's name - use their EXACT name from the resume
2. NEVER change contact information (email, phone, LinkedIn, address, etc.)
3. NEVER change company names or employer names - use the EXACT names from the resume
4. NEVER change job titles - use the EXACT titles from the resume
5. NEVER change employment dates - use the EXACT dates from the resume
6. NEVER change school/university names - use the EXACT names from the resume
7. NEVER change degree names or graduation dates
8. NEVER invent, fabricate, or add information that doesn't exist in the original resume
9. You are MODIFYING the given resume, NOT creating a new one from scratch

WHAT YOU CAN MODIFY:
- Rephrase bullet point descriptions to better match job keywords
- Reorder bullet points to prioritize relevant experience
- Condense or remove less relevant bullet points to fit on one page
- Adjust the professional summary/objective to target the specific job
- Emphasize skills that match the job description

CRITICAL CONSTRAINTS:
1. The resume MUST fit on exactly ONE PAGE - this is non-negotiable
2. Be concise - prioritize quality and relevance over quantity
3. Remove or significantly condense less relevant experiences
4. NEVER add new LaTeX commands or packages that weren't in the original
5. NEVER remove or modify \\usepackage declarations, \\documentclass, or preamble commands
6. Only modify the TEXT CONTENT within existing LaTeX commands
7. Keep ALL original formatting commands exactly as they are

ONE-PAGE STRATEGY - BE AGGRESSIVE:
- It is MUCH better to have a slightly short resume than one that overflows to 2 pages
- When in doubt, CUT content rather than risk overflow
- Remove entire job entries or sections if they are not directly relevant to the target job
- Keep bullet points SHORT and impactful - 1-2 lines maximum per bullet
- Proactively remove older experiences (5+ years old) unless highly relevant
- Do NOT add lengthy descriptions hoping they will fit - they often cause overflow
- If the original resume is already dense, you MUST remove content to make room for rephrasing

LATEX SAFETY RULES:
- Do NOT invent new LaTeX commands
- Do NOT remove any \\newcommand or \\renewcommand definitions
- Do NOT modify any custom commands defined in the preamble
- Keep all \\begin{} and \\end{} pairs intact
- Preserve all special characters and escaping (\\&, \\%, etc.)
- If the original uses a command like \\faIcon or \\textbf, keep using it exactly the same way

OUTPUT FORMAT:
You must return a valid JSON object with exactly this structure:
{
  "latex": "<the complete modified LaTeX code>",
  "summary": "<brief 2-4 bullet point summary of changes made>"
}

The "latex" field should contain the complete LaTeX code starting with \\documentclass and ending with \\end{document}.
The "summary" field should briefly describe what was changed, using bullet points (• character).
Example summary: "• Highlighted Python and cloud experience\\n• Condensed older job entries\\n• Added keywords: distributed systems, microservices"

Return ONLY the JSON object, no other text or markdown.`;

/**
 * System prompt for follow-up modifications
 */
export const FOLLOWUP_SYSTEM_PROMPT = `You are an expert resume writer and LaTeX specialist. The user has already had their resume modified and is requesting additional changes.

ABSOLUTE RULES - NEVER VIOLATE THESE:
1. NEVER change the person's name - use their EXACT name from the resume
2. NEVER change contact information (email, phone, LinkedIn, address, etc.)
3. NEVER change company names or employer names - use the EXACT names from the resume
4. NEVER change job titles - use the EXACT titles from the resume
5. NEVER change employment dates - use the EXACT dates from the resume
6. NEVER change school/university names - use the EXACT names from the resume
7. NEVER change degree names or graduation dates
8. NEVER invent, fabricate, or add information that doesn't exist in the original resume
9. You are MODIFYING the given resume, NOT creating a new one from scratch

CRITICAL CONSTRAINTS:
1. The resume MUST fit on exactly ONE PAGE - this is non-negotiable
2. Apply ONLY the changes the user requests - don't make unrelated modifications
3. NEVER add new LaTeX commands or packages that weren't in the original
4. NEVER remove or modify \\usepackage declarations, \\documentclass, or preamble commands
5. Only modify the TEXT CONTENT within existing LaTeX commands
6. Keep ALL original formatting commands exactly as they are

LATEX SAFETY RULES:
- Do NOT invent new LaTeX commands
- Do NOT remove any \\newcommand or \\renewcommand definitions
- Do NOT modify any custom commands defined in the preamble
- Keep all \\begin{} and \\end{} pairs intact
- Preserve all special characters and escaping (\\&, \\%, etc.)

OUTPUT FORMAT:
You must return a valid JSON object with exactly this structure:
{
  "latex": "<the complete modified LaTeX code>",
  "summary": "<brief 1-3 bullet point summary of changes made>"
}

The "latex" field should contain the complete LaTeX code starting with \\documentclass and ending with \\end{document}.
The "summary" field should briefly describe what you changed based on the user's request.

Return ONLY the JSON object, no other text or markdown.`;

/**
 * System prompt for LaTeX fix/retry operations (returns plain LaTeX, not JSON)
 */
export const FIX_SYSTEM_PROMPT = `You are an expert LaTeX specialist. Your task is to fix or condense LaTeX resume code.

ABSOLUTE RULES - NEVER VIOLATE THESE:
1. NEVER change the person's name - preserve their EXACT name
2. NEVER change contact information, company names, job titles, dates, or school names
3. NEVER invent or fabricate any information - only work with what exists in the resume
4. You are FIXING/CONDENSING the given resume, NOT creating a new one
5. NEVER strip the resume down to a template - you MUST preserve ALL content sections and details

CRITICAL OUTPUT REQUIREMENTS - FAILURE TO FOLLOW WILL CAUSE ERRORS:
1. You MUST return the COMPLETE LaTeX document from \\documentclass to \\end{document}
2. DO NOT return just the preamble, DO NOT return just a fragment, DO NOT return just the problematic section
3. Return the ENTIRE fixed document - ALL packages, ALL preamble, ALL content, ALL sections
4. The output must be COMPLETE and COMPILABLE standalone LaTeX code
5. Return ONLY raw LaTeX code - no JSON, no explanations, no markdown code blocks, no thinking process
6. Do NOT add new LaTeX commands or packages
7. Do NOT remove \\usepackage declarations or preamble definitions
8. Keep all \\begin{}/\\end{} pairs intact
9. Preserve all custom commands exactly as defined

CONTENT PRESERVATION IS MANDATORY:
- Stripping the resume to a minimal template is NEVER acceptable
- ALL job entries, education, skills, and other sections MUST be preserved
- ALL bullet points and descriptions MUST be preserved (only fix syntax, not content)
- The fixed output MUST contain the same amount of information as the input
- If the input has 5 job entries, the output MUST have 5 job entries
- If the input has 20 bullet points, the output MUST have approximately 20 bullet points

EXAMPLE OF CORRECT OUTPUT LENGTH: The complete document should be around 9000-11000 characters, NOT 500-1000 characters.

If you return anything less than a complete document starting with \\documentclass and ending with \\end{document}, the compilation will fail.`;

// =============================================================================
// USER PROMPT BUILDERS
// =============================================================================

/**
 * Build the user prompt for initial resume modification
 */
export function buildInitialUserPrompt(
  resume: string,
  jobOffer: string,
  customInstructions?: string
): string {
  return `Here is the candidate's ACTUAL LaTeX resume that you must modify:

${resume}

Here is the job offer they are applying to:

${jobOffer}

${customInstructions ? `Additional instructions from the user:\n${customInstructions}\n\n` : ''}IMPORTANT REMINDERS:
- This is a REAL person's resume - preserve their actual name, employers, schools, and dates
- Only rephrase descriptions and bullet points to match the job - do NOT replace factual information
- Do NOT use placeholder names like "John Doe" or generic company names - use what's in the resume
- The output must fit on exactly ONE page

Return your response as a JSON object with "latex" and "summary" fields as specified in the system prompt.`;
}

/**
 * Build the prompt for follow-up modifications
 */
export function buildFollowUpPrompt(
  currentLatex: string,
  originalLatex: string,
  jobDescription: string,
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  newInstruction: string,
  customInstructions?: string
): string {
  // Build conversation history section (last 5 messages max)
  const recentHistory = chatHistory.slice(-5);
  let historySection = '';
  if (recentHistory.length > 0) {
    historySection = '\nRECENT CONVERSATION:\n';
    for (const msg of recentHistory) {
      const prefix = msg.role === 'user' ? 'User' : 'AI';
      historySection += `${prefix}: ${msg.content}\n`;
    }
    historySection += '\n';
  }

  // Include custom instructions section if provided
  let customSection = '';
  if (customInstructions && customInstructions.trim()) {
    customSection = `
INITIAL CUSTOM INSTRUCTIONS (from the user's original request):
${customInstructions}

`;
  }

  // Include original resume section if different from current
  let originalSection = '';
  if (originalLatex && originalLatex !== currentLatex) {
    originalSection = `
ORIGINAL RESUME (before any AI modifications):
${originalLatex}

Note: If the user asks to "go back to original", "restore original", "use original sections/categories", 
or similar requests, refer to this original version. You can restore content, formatting, or structure from it.

`;
  }

  return `You are modifying this resume for the following job:
${jobDescription}
${customSection}${historySection}${originalSection}CURRENT RESUME LATEX:
${currentLatex}

USER'S NEW REQUEST:
${newInstruction}

IMPORTANT REMINDERS:
- Preserve the candidate's actual name, employers, schools, and dates - do NOT replace with placeholders
- Only modify what the user asks for - don't make unrelated changes
- The resume must fit on exactly ONE PAGE
- Keep ALL original LaTeX formatting, commands, and structure - only modify text content
- If the user wants to restore something from the original, refer to the ORIGINAL RESUME section above.`;
}

/**
 * Build the prompt for fixing LaTeX compilation errors
 */
export function buildCompileErrorFixPrompt(
  latex: string,
  error: string,
  logs: string,
  originalResume?: string
): string {
  // Extract relevant error lines from logs
  const relevantLogs = logs
    .split('\n')
    .filter(line => line.includes('error:') || line.includes('Error') || line.includes('Undefined'))
    .slice(0, 10)
    .join('\n');

  // Include original resume as reference if provided
  let originalSection = '';
  if (originalResume) {
    originalSection = `
ORIGINAL RESUME FOR REFERENCE:
The following is the original resume content that MUST be preserved. Use this as a reference 
to ensure you do not lose any information while fixing the LaTeX errors. Every job entry, 
education item, skill, and bullet point in this original MUST appear in your fixed output.

${originalResume}

=== END OF ORIGINAL RESUME ===

`;
  }

  return `The LaTeX code you generated failed to compile with the following error:

ERROR: ${error}

Relevant log output:
${relevantLogs}

The most common causes are:
1. Using a LaTeX command that doesn't exist or wasn't defined in the original
2. Removing a necessary package import
3. Breaking a \\begin{}/\\end{} pair
4. Syntax errors like unmatched braces
${originalSection}
ABSOLUTE RULES - DO NOT VIOLATE:
- NEVER change the person's name, contact info, company names, job titles, or dates
- Preserve all factual information exactly as it appears
- Only fix the LaTeX syntax errors - do NOT rewrite or remove content
- NEVER strip the resume down to a template - ALL content must be preserved
- Stripping content is NOT a valid fix - you must preserve ALL sections and bullet points

CRITICAL: You MUST return the COMPLETE FIXED DOCUMENT.
- Start your output with \\documentclass
- End your output with \\end{document}
- Include the ENTIRE preamble (all \\usepackage, all definitions)
- Include the ENTIRE document body (all sections, all content)
- Do NOT return just a fragment or just the preamble
- The output should be approximately ${latex.length} characters (similar to the input length)
- If the broken LaTeX is ${latex.length} characters, your fix should be around ${Math.floor(latex.length * 0.9)}-${Math.floor(latex.length * 1.1)} characters

Please fix the LaTeX code below to make it compile successfully. Do NOT add any new packages or commands - only use what was in the original resume. ONLY fix syntax errors - do NOT remove content.

Broken LaTeX:
${latex}

Return ONLY the complete fixed LaTeX code from \\documentclass to \\end{document}. No explanations. No fragments. The entire document with ALL content preserved.`;
}

/**
 * Build the prompt for retry when resume overflows to multiple pages
 */
export function buildRetryPrompt(
  pageCount: number,
  currentLatex: string,
  overflow?: {
    overflowLines: number;
    overflowWords: number;
    overflowPercentage: number;
  }
): string {
  // Calculate precise cut target with a small buffer
  const overflowPct = overflow?.overflowPercentage ?? 10;
  const cutTarget = Math.min(overflowPct + 5, 30); // Add 5% buffer, cap at 30%
  
  // Build overflow analysis section if available
  let overflowSection = '';
  if (overflow) {
    overflowSection = `
PRECISE CUT TARGET:
- The overflow is ~${overflow.overflowPercentage}% of the page
- You must cut EXACTLY ${cutTarget}% of content (${overflow.overflowPercentage}% overflow + small buffer)
- DO NOT cut more than ${cutTarget + 5}% - over-cutting creates too much blank space
- This means removing approximately ${overflow.overflowWords} words plus a small buffer

OVERFLOW DETAILS:
- Page 2+ contains approximately ${overflow.overflowLines} lines / ${overflow.overflowWords} words
`;
  }

  return `The resume you generated overflowed to ${pageCount} pages. This is unacceptable - it MUST fit on exactly ONE page.

I'm attaching screenshots of the rendered PDF:
- The first image shows Page 1 (what currently fits)
- The subsequent image(s) show the overflow content that must be eliminated
${overflowSection}
VISUAL ANALYSIS INSTRUCTIONS:
Look at the attached PDF screenshots and identify these opportunities for efficient cuts:

1. ORPHAN LINES: Look for lines with only 1-3 words at the end of a bullet point.
   These can often be eliminated by removing just 1-3 words from the previous line.
   Example: If a bullet ends with "...improved system" on one line and "performance." alone on the next,
   reword to "...improved performance." to eliminate the orphan line.

2. SHORT FINAL LINES: Bullet points where the last line has significant empty space.
   Reword the entire bullet to be more concise and eliminate that line.

3. NEAR-FULL LINES: Lines that are almost full but have a few words on the next line.
   Condense by 2-3 words to fit everything on one line.

4. LOW-VALUE BULLETS: Only if the above strategies are insufficient, identify and remove 
   entire bullet points that add the least value.

PRIORITY ORDER: Fix orphan lines first (most efficient), then condense near-full lines, 
then remove entire bullets only as a last resort.

ABSOLUTE RULES - DO NOT VIOLATE:
- NEVER change the person's name, contact info, company names, job titles, or dates
- Only condense or remove bullet point descriptions - preserve all factual information
- Do NOT replace real information with placeholders or generic content
- Do NOT over-cut - removing too much creates wasted blank space

CRITICAL OUTPUT REQUIREMENTS:
- You MUST return the COMPLETE LaTeX document from \\documentclass to \\end{document}
- Include ALL packages, ALL preamble definitions, ALL content sections
- Do NOT return just a fragment or just the problematic section
- The output should be a COMPLETE, COMPILABLE document
- Your previous output may have had LaTeX errors - make sure to fix them while condensing
- Do NOT add any new LaTeX commands that weren't in the original
- Do NOT remove any package imports or preamble definitions
- Only modify the TEXT CONTENT to reduce length, not the LaTeX structure
- Keep all custom commands exactly as defined

Current LaTeX that needs to be shortened:
${currentLatex}

Return ONLY the modified LaTeX code that will fit on one page. No explanations, no markdown code blocks.`;
}

/**
 * Build the prompt for expanding resume when there's too much blank space
 */
export function buildExpandPrompt(
  currentLatex: string,
  pageFill: {
    blankPercentage: number;
  },
  jobDescription: string
): string {
  return `The resume fits on one page, but there is approximately ${pageFill.blankPercentage}% blank space at the bottom. This is wasted space that could showcase more of your qualifications.

I'm attaching a screenshot of the current PDF so you can see the unused space at the bottom.

UNDERFLOW ANALYSIS:
- Approximately ${pageFill.blankPercentage}% of the page is empty
- You have room to add roughly ${Math.round(pageFill.blankPercentage / 3)}-${Math.round(pageFill.blankPercentage / 2)} more bullet points worth of content
- The goal is to fill the page WITHOUT overflowing to page 2

JOB DESCRIPTION (for context on what to emphasize):
${jobDescription}

VISUAL ANALYSIS INSTRUCTIONS - CRITICAL FOR AVOIDING OVERFLOW:
Look at the attached PDF screenshot and consider line breaks before adding content:

1. IDENTIFY EXPANDABLE LINES: Look for bullet points where the last line has significant 
   empty space (half a line or more). These are SAFE to expand - you can add words without 
   creating a new line.

2. AVOID CREATING ORPHAN LINES: Before adding words to a bullet point, estimate if it will 
   wrap to a new line. If adding 3-4 words would only fill 20% of a new line, DON'T add them.
   Only expand if you can fill most of the new line.

3. PREFER FILLING PARTIAL LINES: If a bullet ends with half a line empty, add words to fill 
   that space rather than adding content elsewhere that might create new lines.

4. BE CONSERVATIVE: It's better to leave 10% blank than to add content that causes overflow.
   The blank space at the bottom is less problematic than a 2-page resume.

5. COUNT YOUR ADDITIONS: For every bullet you expand, mentally estimate the new line count.
   If you're adding content that creates more than ${Math.round(pageFill.blankPercentage / 8)} new lines total, 
   you're probably adding too much.

ABSOLUTE RULES - DO NOT VIOLATE:
- NEVER change the person's name, contact info, company names, job titles, or dates
- NEVER invent fake experiences, achievements, or information
- Only elaborate on existing content - do NOT add fictional accomplishments

EXPANSION GUIDELINES:
1. Add more bullet points to existing job entries with relevant achievements
2. Expand descriptions with quantifiable results (numbers, percentages, metrics)
3. Add technical details that align with the job description keywords
4. Elaborate on projects or accomplishments that match the target role
5. DO NOT invent fake experiences or achievements - only expand on what's there
6. DO NOT add new job entries or sections that weren't in the original
7. Keep all LaTeX formatting exactly as-is

CRITICAL OUTPUT REQUIREMENTS:
- You MUST return the COMPLETE LaTeX document from \\documentclass to \\end{document}
- Include ALL packages, ALL preamble definitions, ALL content (existing + new)
- Do NOT return just a fragment - return the ENTIRE expanded document
- Do NOT add any new LaTeX commands or packages
- Do NOT modify the document structure or preamble
- Only add/expand TEXT CONTENT within existing commands
- Preserve all formatting commands exactly as they are

Current LaTeX to expand:
${currentLatex}

Return ONLY the complete modified LaTeX code from \\documentclass to \\end{document} with expanded content. No explanations, no markdown code blocks, no fragments. The entire document.`;
}
