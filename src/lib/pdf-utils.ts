import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// Directory for storing intermediate PDFs
const TMP_DIR = path.join(process.cwd(), 'src', 'tmp');

// Ensure tmp directory exists
async function ensureTmpDir(): Promise<void> {
  try {
    await fs.mkdir(TMP_DIR, { recursive: true });
  } catch (error) {
    // Directory may already exist
  }
}

/**
 * Get the page count of a PDF buffer using pdfinfo (poppler-utils)
 */
export async function getPageCount(pdfBuffer: Buffer): Promise<number> {
  const tempPath = path.join(os.tmpdir(), `pagecount_${Date.now()}.pdf`);
  
  try {
    await fs.writeFile(tempPath, pdfBuffer);
    const { stdout } = await execAsync(`pdfinfo "${tempPath}"`);
    
    const match = stdout.match(/Pages:\s+(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    throw new Error('Could not parse page count from pdfinfo output');
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Convert PDF buffer to base64-encoded PNG images (one per page)
 * Uses pdftoppm from poppler-utils
 */
export async function pdfToImages(pdfBuffer: Buffer): Promise<string[]> {
  const tempPdfPath = path.join(os.tmpdir(), `convert_${Date.now()}.pdf`);
  const outputPrefix = path.join(os.tmpdir(), `page_${Date.now()}`);
  
  try {
    await fs.writeFile(tempPdfPath, pdfBuffer);
    
    // Convert PDF to PNG images (300 DPI for good quality)
    await execAsync(`pdftoppm -png -r 150 "${tempPdfPath}" "${outputPrefix}"`);
    
    // Read all generated PNG files
    const tmpDir = os.tmpdir();
    const files = await fs.readdir(tmpDir);
    const pageFiles = files
      .filter(f => f.startsWith(path.basename(outputPrefix)) && f.endsWith('.png'))
      .sort(); // Ensure pages are in order
    
    const images: string[] = [];
    for (const file of pageFiles) {
      const imagePath = path.join(tmpDir, file);
      const imageBuffer = await fs.readFile(imagePath);
      images.push(imageBuffer.toString('base64'));
      
      // Clean up image file
      await fs.unlink(imagePath);
    }
    
    return images;
  } finally {
    // Clean up temp PDF
    try {
      await fs.unlink(tempPdfPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Save a PDF buffer to the tmp directory for debugging/storage
 * Returns the path to the saved file
 */
export async function saveTempPdf(
  pdfBuffer: Buffer, 
  prefix: string = 'resume',
  attempt: number = 1
): Promise<string> {
  await ensureTmpDir();
  
  const timestamp = Date.now();
  const filename = `${prefix}_attempt${attempt}_${timestamp}.pdf`;
  const filepath = path.join(TMP_DIR, filename);
  
  await fs.writeFile(filepath, pdfBuffer);
  
  return filepath;
}

/**
 * Overflow analysis result
 */
export interface OverflowAnalysis {
  overflowLines: number;
  overflowWords: number;
  totalLines: number;
  totalWords: number;
  overflowPercentage: number; // 0-100
}

/**
 * Analyze overflow content in a multi-page PDF
 * Uses pdftotext to extract and count content from each page
 */
export async function analyzeOverflow(pdfBuffer: Buffer, pageCount: number): Promise<OverflowAnalysis> {
  const tempPath = path.join(os.tmpdir(), `overflow_${Date.now()}.pdf`);
  
  try {
    await fs.writeFile(tempPath, pdfBuffer);
    
    // Extract text from page 1
    const { stdout: page1Text } = await execAsync(
      `pdftotext -f 1 -l 1 -layout "${tempPath}" -`
    );
    
    // Extract text from overflow pages (page 2+)
    let overflowText = '';
    if (pageCount > 1) {
      const { stdout } = await execAsync(
        `pdftotext -f 2 -layout "${tempPath}" -`
      );
      overflowText = stdout;
    }
    
    // Count lines (non-empty lines only for accuracy)
    const countLines = (text: string): number => {
      return text.split('\n').filter(line => line.trim().length > 0).length;
    };
    
    // Count words
    const countWords = (text: string): number => {
      return text.split(/\s+/).filter(word => word.trim().length > 0).length;
    };
    
    const page1Lines = countLines(page1Text);
    const page1Words = countWords(page1Text);
    const overflowLines = countLines(overflowText);
    const overflowWords = countWords(overflowText);
    
    const totalLines = page1Lines + overflowLines;
    const totalWords = page1Words + overflowWords;
    
    // Calculate percentage (avoid division by zero)
    const overflowPercentage = totalWords > 0 
      ? Math.round((overflowWords / totalWords) * 100) 
      : 0;
    
    return {
      overflowLines,
      overflowWords,
      totalLines,
      totalWords,
      overflowPercentage,
    };
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Page fill analysis result
 */
export interface PageFillAnalysis {
  pageHeight: number;      // Total page height in points
  contentBottom: number;   // Y position of lowest content
  blankSpace: number;      // Empty space at bottom (points)
  blankPercentage: number; // 0-100
}

/**
 * Analyze how much of page 1 is filled with content
 * Uses pdftotext -bbox to get word bounding boxes
 */
export async function analyzePageFill(pdfBuffer: Buffer): Promise<PageFillAnalysis> {
  const tempPath = path.join(os.tmpdir(), `pagefill_${Date.now()}.pdf`);
  
  try {
    await fs.writeFile(tempPath, pdfBuffer);
    
    // Get bounding box data as HTML (only page 1)
    const { stdout } = await execAsync(
      `pdftotext -f 1 -l 1 -bbox "${tempPath}" -`
    );
    
    // Parse page dimensions from: <page width="612" height="792">
    const pageMatch = stdout.match(/<page\s+width="([\d.]+)"\s+height="([\d.]+)">/);
    if (!pageMatch) {
      // Fallback to standard US Letter dimensions
      return {
        pageHeight: 792,
        contentBottom: 792,
        blankSpace: 0,
        blankPercentage: 0,
      };
    }
    
    const pageHeight = parseFloat(pageMatch[2]);
    const pageWidth = parseFloat(pageMatch[1]);
    
    // Parse all word elements with their positions and content
    // Format: <word xMin="..." yMin="..." xMax="..." yMax="...">content</word>
    const wordRegex = /<word\s+xMin="([\d.]+)"\s+yMin="([\d.]+)"\s+xMax="([\d.]+)"\s+yMax="([\d.]+)">([^<]*)<\/word>/g;
    
    let maxYBottom = 0;
    const bottomThreshold = pageHeight * 0.90; // Bottom 10% of page
    
    for (const match of stdout.matchAll(wordRegex)) {
      const xMin = parseFloat(match[1]);
      const xMax = parseFloat(match[3]);
      const yMax = parseFloat(match[4]);
      const content = match[5].trim();
      
      // Skip likely page numbers:
      // - Single number or small page indicator (1, 2, "1/2", "Page 1", etc.)
      // - Located in bottom 10% of page
      // - Horizontally centered (roughly middle third of page)
      const isInBottomMargin = yMax > bottomThreshold;
      const isHorizontallyCentered = xMin > pageWidth * 0.3 && xMax < pageWidth * 0.7;
      const isPageNumber = /^(\d{1,2}|page\s*\d+|\d+\s*\/\s*\d+)$/i.test(content);
      
      if (isInBottomMargin && isHorizontallyCentered && isPageNumber) {
        // Skip this - it's likely a page number
        continue;
      }
      
      if (yMax > maxYBottom) {
        maxYBottom = yMax;
      }
    }
    
    // If no words found, assume page is empty
    if (maxYBottom === 0) {
      return {
        pageHeight,
        contentBottom: 0,
        blankSpace: pageHeight,
        blankPercentage: 100,
      };
    }
    
    // Calculate blank space at bottom
    const blankSpace = pageHeight - maxYBottom;
    const blankPercentage = Math.round((blankSpace / pageHeight) * 100);
    
    return {
      pageHeight,
      contentBottom: maxYBottom,
      blankSpace,
      blankPercentage,
    };
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Compile LaTeX to PDF using Tectonic
 * Returns the PDF buffer
 */
export async function compileLatex(latexContent: string): Promise<{ 
  success: boolean; 
  pdfBuffer?: Buffer; 
  error?: string;
  logs?: string;
}> {
  const tempDir = path.join(os.tmpdir(), `latex_${Date.now()}`);
  const texPath = path.join(tempDir, 'resume.tex');
  const pdfPath = path.join(tempDir, 'resume.pdf');
  
  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(texPath, latexContent);
    
    // Run tectonic with a timeout
    const { stdout, stderr } = await execAsync(
      `tectonic -X compile "${texPath}" --outdir "${tempDir}"`,
      { timeout: 60000 } // 60 second timeout
    );
    
    // Check if PDF was created
    try {
      const pdfBuffer = await fs.readFile(pdfPath);
      return { success: true, pdfBuffer, logs: stdout + stderr };
    } catch {
      return { 
        success: false, 
        error: 'PDF was not generated', 
        logs: stdout + stderr 
      };
    }
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string };
    return { 
      success: false, 
      error: err.message,
      logs: (err.stdout || '') + (err.stderr || '')
    };
  } finally {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
