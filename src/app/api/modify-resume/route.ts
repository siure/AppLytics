import { NextRequest } from 'next/server';
import { getModelById, Provider } from '@/lib/models';
import { 
  createAIClient, 
  INITIAL_SYSTEM_PROMPT,
  FOLLOWUP_SYSTEM_PROMPT,
  FIX_SYSTEM_PROMPT,
  buildInitialUserPrompt,
  buildFollowUpPrompt,
  buildCompileErrorFixPrompt,
  buildRetryPrompt,
  buildExpandPrompt,
  parseAIResponse,
  AIMessage,
  ChatHistoryMessage
} from '@/lib/ai-client';
import { 
  compileLatex, 
  getPageCount, 
  pdfToImages, 
  saveTempPdf,
  analyzeOverflow,
  analyzePageFill
} from '@/lib/pdf-utils';
import { generateRequestId, logConversation, logOperation } from '@/lib/logger';

const MAX_RETRY_ATTEMPTS = 3;
const MAX_COMPILE_FIX_ATTEMPTS = 2;
const UNDERFLOW_THRESHOLD = 10; // Trigger expansion if >10% blank space
const SMALL_OVERFLOW_THRESHOLD = 10; // Ask user for choice if overflow is ≤10%

// SSE Event types
type SSEEvent = 
  | { type: 'status'; message: string }
  | { type: 'attempt'; current: number; max: number }
  | { type: 'compiling' }
  | { type: 'complete'; latex: string; summary: string; pageCount: number; attempts: number; pdfPath?: string }
  | { type: 'error'; message: string }
  | { type: 'overflow_choice'; latex: string; summary: string; pageCount: number; overflowPercentage: number; attempts: number; pdfPath?: string };

function sendSSE(controller: ReadableStreamDefaultController, event: SSEEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

function cleanResponse(response: string): string {
  let cleaned = response;
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith('```latex')) {
    cleaned = cleaned.slice(8);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  
  return cleaned.trim();
}

// Minimum ratio threshold for content validation (60% of original length)
const CONTENT_VALIDATION_THRESHOLD = 0.6;

/**
 * Validates that a "fixed" LaTeX resume hasn't been gutted/stripped down.
 * Returns an object with validation status and reason.
 */
function validateFixedLatex(
  original: string, 
  fixed: string
): { isValid: boolean; reason?: string } {
  // Check 1: Length ratio - fixed should be at least 60% of original length
  const lengthRatio = fixed.length / original.length;
  if (lengthRatio < CONTENT_VALIDATION_THRESHOLD) {
    return { 
      isValid: false, 
      reason: `Fixed LaTeX is only ${Math.round(lengthRatio * 100)}% of original length (${fixed.length} vs ${original.length} chars). This indicates content was stripped.`
    };
  }

  // Check 2: Count \section commands - shouldn't have significantly fewer sections
  const originalSections = (original.match(/\\section\s*\{/g) || []).length;
  const fixedSections = (fixed.match(/\\section\s*\{/g) || []).length;
  if (originalSections > 0 && fixedSections < originalSections * 0.5) {
    return {
      isValid: false,
      reason: `Fixed LaTeX has ${fixedSections} sections but original had ${originalSections}. Content was stripped.`
    };
  }

  // Check 3: Check for \\item count (bullet points) - shouldn't lose most of them
  const originalItems = (original.match(/\\item/g) || []).length;
  const fixedItems = (fixed.match(/\\item/g) || []).length;
  if (originalItems > 5 && fixedItems < originalItems * 0.4) {
    return {
      isValid: false,
      reason: `Fixed LaTeX has ${fixedItems} bullet points but original had ${originalItems}. Content was stripped.`
    };
  }

  // Check 4: Ensure document has both preamble and body
  if (!fixed.includes('\\begin{document}') || !fixed.includes('\\end{document}')) {
    return {
      isValid: false,
      reason: 'Fixed LaTeX is missing \\begin{document} or \\end{document}.'
    };
  }

  return { isValid: true };
}

export async function POST(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      // Generate unique request ID for logging
      const requestId = generateRequestId();
      
      try {
        const { 
          resume, 
          jobOffer, 
          customInstructions, 
          apiKey, 
          provider, 
          model,
          // Follow-up specific fields
          isFollowUp,
          followUpInstruction,
          chatHistory,
          originalResume,
          // Force condense flag - bypasses small overflow user choice
          forceCondense
        } = await request.json();

        await logOperation({
          id: requestId,
          action: 'request_received',
          status: 'success',
          details: `Type: ${isFollowUp ? 'followup' : 'initial'}, Provider: ${provider}, Model: ${model}`
        });

        // Validation
        if (!resume) {
          sendSSE(controller, { type: 'error', message: 'Resume is required' });
          controller.close();
          return;
        }

        if (!isFollowUp && !jobOffer) {
          sendSSE(controller, { type: 'error', message: 'Job offer is required' });
          controller.close();
          return;
        }

        if (isFollowUp && !followUpInstruction) {
          sendSSE(controller, { type: 'error', message: 'Follow-up instruction is required' });
          controller.close();
          return;
        }

        if (!apiKey) {
          sendSSE(controller, { type: 'error', message: 'API key is required' });
          controller.close();
          return;
        }

        if (!provider || !model) {
          sendSSE(controller, { type: 'error', message: 'Provider and model are required' });
          controller.close();
          return;
        }

        // Validate that model belongs to the provider
        const modelConfig = getModelById(model);
        if (!modelConfig || modelConfig.provider !== provider) {
          sendSSE(controller, { type: 'error', message: 'Invalid model for the selected provider' });
          controller.close();
          return;
        }

        // Create AI client
        const aiClient = createAIClient(provider as Provider, apiKey, model);
        
        let currentLatex = '';
        let currentSummary = '';
        let pageCount = 0;
        let attempt = 0;
        let lastPdfPath = '';

        // Build initial messages based on whether this is a follow-up
        if (isFollowUp) {
          // Follow-up modification
          sendSSE(controller, { type: 'status', message: 'Processing your feedback...' });
          await sleep(100);
          
          const followUpMessages: AIMessage[] = [
            { role: 'system', content: FOLLOWUP_SYSTEM_PROMPT },
            { 
              role: 'user', 
              content: buildFollowUpPrompt(
                resume,
                originalResume || resume, // Fall back to current if no original provided
                jobOffer || '', 
                (chatHistory || []) as ChatHistoryMessage[], 
                followUpInstruction,
                customInstructions || ''
              ) 
            }
          ];
          
          try {
            const response = await aiClient.chat(followUpMessages);
            const parsed = parseAIResponse(response);
            currentLatex = parsed.latex;
            currentSummary = parsed.summary;
            
            // Log the follow-up conversation
            await logConversation({
              id: requestId,
              type: 'followup',
              input: {
                resume,
                jobDescription: jobOffer || '',
                customInstructions,
                followUpInstruction,
                chatHistory,
                originalResume
              },
              output: {
                rawResponse: response,
                parsedLatex: currentLatex,
                parsedSummary: currentSummary
              }
            });
            
            await logOperation({
              id: requestId,
              action: 'ai_followup_response',
              status: 'success',
              details: `Summary: ${currentSummary.substring(0, 100)}...`
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await logOperation({
              id: requestId,
              action: 'ai_followup_response',
              status: 'error',
              error: errorMessage
            });
            sendSSE(controller, { type: 'error', message: `AI Error: ${errorMessage}` });
            controller.close();
            return;
          }
        } else {
          // Initial modification
          sendSSE(controller, { type: 'status', message: 'Analyzing job description...' });
          await sleep(100);
          
          sendSSE(controller, { type: 'status', message: 'Generating modified resume...' });
          
          const initialMessages: AIMessage[] = [
            { role: 'system', content: INITIAL_SYSTEM_PROMPT },
            { role: 'user', content: buildInitialUserPrompt(resume, jobOffer, customInstructions) }
          ];
          
          try {
            const response = await aiClient.chat(initialMessages);
            const parsed = parseAIResponse(response);
            currentLatex = parsed.latex;
            currentSummary = parsed.summary;
            
            // Log the initial conversation
            await logConversation({
              id: requestId,
              type: 'initial',
              input: {
                resume,
                jobDescription: jobOffer,
                customInstructions
              },
              output: {
                rawResponse: response,
                parsedLatex: currentLatex,
                parsedSummary: currentSummary
              }
            });
            
            await logOperation({
              id: requestId,
              action: 'ai_initial_response',
              status: 'success',
              details: `Summary: ${currentSummary.substring(0, 100)}...`
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await logOperation({
              id: requestId,
              action: 'ai_initial_response',
              status: 'error',
              error: errorMessage
            });
            sendSSE(controller, { type: 'error', message: `AI Error: ${errorMessage}` });
            controller.close();
            return;
          }
        }

        // Store original resume for reference during fixes
        // Use the user-provided original (for follow-ups) or the initial resume input
        const referenceOriginalResume = originalResume || resume;
        
        // Retry loop
        while (attempt < MAX_RETRY_ATTEMPTS) {
          attempt++;
          sendSSE(controller, { type: 'attempt', current: attempt, max: MAX_RETRY_ATTEMPTS });
          
          // Compile LaTeX with error recovery
          sendSSE(controller, { type: 'compiling' });
          
          let compileResult = await compileLatex(currentLatex);
          
          await logOperation({
            id: requestId,
            action: 'latex_compile',
            status: compileResult.success ? 'success' : 'error',
            details: `Attempt ${attempt}`,
            error: compileResult.success ? undefined : compileResult.error
          });
          
          // If compilation fails, try to fix it
          let compileFixAttempt = 0;
          // Store the LaTeX before any fix attempts as a fallback
          const latexBeforeFixLoop = currentLatex;
          
          while (!compileResult.success && compileFixAttempt < MAX_COMPILE_FIX_ATTEMPTS) {
            compileFixAttempt++;
            sendSSE(controller, { 
              type: 'status', 
              message: `LaTeX error detected. Asking AI to fix (attempt ${compileFixAttempt}/${MAX_COMPILE_FIX_ATTEMPTS})...` 
            });
            
            const fixMessages: AIMessage[] = [
              { role: 'system', content: FIX_SYSTEM_PROMPT },
              { 
                role: 'user', 
                content: buildCompileErrorFixPrompt(
                  currentLatex, 
                  compileResult.error || 'Unknown error',
                  compileResult.logs || '',
                  referenceOriginalResume // Pass original resume for context
                )
              }
            ];
            
            try {
              const fixResponse = await aiClient.chat(fixMessages);
              const fixedLatex = cleanResponse(fixResponse);
              
              // Log the fix conversation
              await logConversation({
                id: requestId,
                type: 'fix',
                input: {
                  latexBeforeFix: currentLatex,
                  compileError: compileResult.error || 'Unknown error',
                  compileLogs: compileResult.logs || '',
                  fixAttempt: compileFixAttempt,
                  originalResumeProvided: !!referenceOriginalResume
                },
                output: {
                  rawResponse: fixResponse,
                  parsedLatex: fixedLatex
                }
              });
              
              // Validate that the fix didn't gut the resume
              const validation = validateFixedLatex(latexBeforeFixLoop, fixedLatex);
              
              if (!validation.isValid) {
                await logOperation({
                  id: requestId,
                  action: 'latex_fix_validation_failed',
                  status: 'error',
                  error: validation.reason,
                  details: `Fix attempt ${compileFixAttempt}/${MAX_COMPILE_FIX_ATTEMPTS} - content was stripped`
                });
                
                sendSSE(controller, { 
                  type: 'status', 
                  message: `Fix attempt stripped content. Rejecting and keeping original...` 
                });
                
                // Don't use the gutted fix - restore pre-fix version and break out
                currentLatex = latexBeforeFixLoop;
                break;
              }
              
              currentLatex = fixedLatex;
              
              await logOperation({
                id: requestId,
                action: 'latex_fix_attempt',
                status: 'success',
                details: `Fix attempt ${compileFixAttempt}/${MAX_COMPILE_FIX_ATTEMPTS}`
              });
              
              sendSSE(controller, { type: 'compiling' });
              compileResult = await compileLatex(currentLatex);
              
              await logOperation({
                id: requestId,
                action: 'latex_compile_after_fix',
                status: compileResult.success ? 'success' : 'error',
                details: `Fix attempt ${compileFixAttempt}`,
                error: compileResult.success ? undefined : compileResult.error
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              await logOperation({
                id: requestId,
                action: 'latex_fix_attempt',
                status: 'error',
                error: errorMessage
              });
              sendSSE(controller, { type: 'error', message: `AI Error while fixing LaTeX: ${errorMessage}` });
              controller.close();
              return;
            }
          }
          
          // If still failing after fix attempts, return the LaTeX anyway so user can fix it
          // Use latexBeforeFixLoop if current was reset due to validation failure
          if (!compileResult.success || !compileResult.pdfBuffer) {
            // Return the version with content (pre-fix) rather than potentially gutted version
            const latexToReturn = currentLatex === latexBeforeFixLoop ? currentLatex : latexBeforeFixLoop;
            
            await logOperation({
              id: requestId,
              action: 'latex_compile_final',
              status: 'error',
              error: `Failed after ${compileFixAttempt} fix attempts: ${compileResult.error}`
            });
            sendSSE(controller, { 
              type: 'complete', 
              latex: latexToReturn,
              summary: `• LaTeX compilation failed after ${compileFixAttempt} fix attempts\n• Error: ${compileResult.error || 'Unknown error'}\n• Please review and fix the code manually`,
              pageCount: 0, 
              attempts: attempt,
              pdfPath: ''
            });
            controller.close();
            return;
          }
          
          // Save PDF for debugging
          lastPdfPath = await saveTempPdf(compileResult.pdfBuffer, 'resume', attempt);
          
          // Check page count
          pageCount = await getPageCount(compileResult.pdfBuffer);
          
          sendSSE(controller, { 
            type: 'status', 
            message: `PDF compiled: ${pageCount} page${pageCount > 1 ? 's' : ''}` 
          });
          
          // If it fits on one page, check for underflow (too much blank space)
          if (pageCount === 1) {
            // Analyze page fill to detect underflow
            const pageFill = await analyzePageFill(compileResult.pdfBuffer);
            
            // If there's significant blank space and we haven't tried expanding yet
            if (pageFill.blankPercentage > UNDERFLOW_THRESHOLD && attempt === 1) {
              sendSSE(controller, { 
                type: 'status', 
                message: `Resume has ~${pageFill.blankPercentage}% unused space. Expanding content...` 
              });
              
              // Get page image for AI
              const pageImages = await pdfToImages(compileResult.pdfBuffer);
              
              // Ask AI to expand
              const expandMessages: AIMessage[] = [
                { role: 'system', content: FIX_SYSTEM_PROMPT },
                { 
                  role: 'user', 
                  content: buildExpandPrompt(currentLatex, pageFill, jobOffer),
                  images: pageImages
                }
              ];
              
              try {
                const expandResponse = await aiClient.chat(expandMessages);
                const expandedLatex = cleanResponse(expandResponse);
                
                // Log the expand conversation
                await logConversation({
                  id: requestId,
                  type: 'expand',
                  input: {
                    latexBeforeFix: currentLatex,
                    blankPercentage: pageFill.blankPercentage,
                    jobDescription: jobOffer
                  },
                  output: {
                    rawResponse: expandResponse,
                    parsedLatex: expandedLatex
                  }
                });
                
                // Compile expanded version
                sendSSE(controller, { type: 'compiling' });
                const expandedCompileResult = await compileLatex(expandedLatex);
                
                if (expandedCompileResult.success && expandedCompileResult.pdfBuffer) {
                  const expandedPageCount = await getPageCount(expandedCompileResult.pdfBuffer);
                  
                  // Only use expanded version if it still fits on one page
                  if (expandedPageCount === 1) {
                    currentLatex = expandedLatex;
                    lastPdfPath = await saveTempPdf(expandedCompileResult.pdfBuffer, 'resume_expanded', attempt);
                    
                    sendSSE(controller, { 
                      type: 'status', 
                      message: 'Content expanded successfully!' 
                    });
                    
                    sendSSE(controller, { 
                      type: 'complete', 
                      latex: currentLatex,
                      summary: currentSummary + '\n• Expanded to fill page',
                      pageCount: 1, 
                      attempts: attempt,
                      pdfPath: lastPdfPath
                    });
                    controller.close();
                    return;
                  } else {
                    // Expanded version overflowed, keep original
                    sendSSE(controller, { 
                      type: 'status', 
                      message: 'Expansion caused overflow. Keeping original version.' 
                    });
                  }
                }
              } catch (error) {
                // Expansion failed, continue with original
                sendSSE(controller, { 
                  type: 'status', 
                  message: 'Could not expand content. Using current version.' 
                });
              }
            }
            
            // Return the current (possibly unexpanded) version
            await logOperation({
              id: requestId,
              action: 'complete',
              status: 'success',
              details: `Pages: 1, Attempts: ${attempt}`
            });
            sendSSE(controller, { 
              type: 'complete', 
              latex: currentLatex,
              summary: currentSummary,
              pageCount: 1, 
              attempts: attempt,
              pdfPath: lastPdfPath
            });
            controller.close();
            return;
          }
          
          // If we've exhausted retries, return what we have
          if (attempt >= MAX_RETRY_ATTEMPTS) {
            await logOperation({
              id: requestId,
              action: 'complete_max_retries',
              status: 'success',
              details: `Pages: ${pageCount}, Attempts: ${attempt} (max retries reached)`
            });
            sendSSE(controller, { 
              type: 'complete', 
              latex: currentLatex,
              summary: currentSummary,
              pageCount, 
              attempts: attempt,
              pdfPath: lastPdfPath
            });
            controller.close();
            return;
          }
          
          // Need to retry - get images and ask AI to condense
          sendSSE(controller, { 
            type: 'status', 
            message: `Resume overflowed to ${pageCount} pages. Analyzing overflow...` 
          });
          
          // Analyze overflow to give AI precise guidance
          const overflowAnalysis = await analyzeOverflow(compileResult.pdfBuffer, pageCount);
          
          // Check if this is the first attempt and overflow is small (≤5%)
          // If so, ask the user if they want to fix it manually (unless forceCondense is set)
          if (attempt === 1 && overflowAnalysis.overflowPercentage <= SMALL_OVERFLOW_THRESHOLD && !forceCondense) {
            await logOperation({
              id: requestId,
              action: 'small_overflow_choice',
              status: 'success',
              details: `Small overflow detected: ${overflowAnalysis.overflowPercentage}%. Asking user for choice.`
            });
            
            sendSSE(controller, { 
              type: 'overflow_choice', 
              latex: currentLatex,
              summary: currentSummary,
              pageCount,
              overflowPercentage: overflowAnalysis.overflowPercentage,
              attempts: attempt,
              pdfPath: lastPdfPath
            });
            controller.close();
            return;
          }
          
          sendSSE(controller, { 
            type: 'status', 
            message: `Overflow: ~${overflowAnalysis.overflowPercentage}% (${overflowAnalysis.overflowWords} words). Asking AI to condense...` 
          });
          
          // Convert PDF pages to images
          const pageImages = await pdfToImages(compileResult.pdfBuffer);
          
          // Build retry message with images and overflow analysis
          const retryMessages: AIMessage[] = [
            { role: 'system', content: FIX_SYSTEM_PROMPT },
            { 
              role: 'user', 
              content: buildRetryPrompt(pageCount, currentLatex, overflowAnalysis),
              images: pageImages
            }
          ];
          
          try {
            const retryResponse = await aiClient.chat(retryMessages);
            const condensedLatex = cleanResponse(retryResponse);
            
            // Log the retry conversation
            await logConversation({
              id: requestId,
              type: 'retry',
              input: {
                latexBeforeFix: currentLatex,
                pageCount,
                overflowPercentage: overflowAnalysis.overflowPercentage,
                overflowWords: overflowAnalysis.overflowWords
              },
              output: {
                rawResponse: retryResponse,
                parsedLatex: condensedLatex
              }
            });
            
            currentLatex = condensedLatex;
            
            await logOperation({
              id: requestId,
              action: 'overflow_retry',
              status: 'success',
              details: `Retry attempt ${attempt}, overflow was ${pageCount} pages`
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await logOperation({
              id: requestId,
              action: 'overflow_retry',
              status: 'error',
              error: errorMessage
            });
            sendSSE(controller, { type: 'error', message: `AI Error on retry: ${errorMessage}` });
            controller.close();
            return;
          }
        }
        
        // Should not reach here, but just in case
        await logOperation({
          id: requestId,
          action: 'complete_fallback',
          status: 'success',
          details: `Pages: ${pageCount}, Attempts: ${attempt}`
        });
        sendSSE(controller, { 
          type: 'complete', 
          latex: currentLatex,
          summary: currentSummary,
          pageCount, 
          attempts: attempt,
          pdfPath: lastPdfPath
        });
        controller.close();
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logOperation({
          id: requestId,
          action: 'unhandled_error',
          status: 'error',
          error: errorMessage
        });
        sendSSE(controller, { type: 'error', message: errorMessage });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
