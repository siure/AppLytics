import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

// Timeout for compilation (30 seconds)
const COMPILATION_TIMEOUT = 30000;

// Uploaded image interface (must match client)
interface UploadedImage {
  id: string;
  filename: string;
  data: string;
  mimeType: string;
  originalName: string;
  size: number;
}

export async function POST(request: NextRequest) {
  let tempDir: string | null = null;

  try {
    const { latex, images } = await request.json() as { 
      latex: string; 
      images?: UploadedImage[];
    };

    if (!latex || typeof latex !== 'string') {
      return NextResponse.json(
        { error: 'LaTeX source code is required' },
        { status: 400 }
      );
    }

    // Create a unique temp directory for this compilation
    const uniqueId = randomUUID();
    tempDir = join(tmpdir(), `latex-compile-${uniqueId}`);
    await mkdir(tempDir, { recursive: true });

    const texFilePath = join(tempDir, 'document.tex');
    const pdfFilePath = join(tempDir, 'document.pdf');

    // Write uploaded images to temp directory
    if (images && Array.isArray(images)) {
      for (const image of images) {
        if (image.filename && image.data) {
          const imageBuffer = Buffer.from(image.data, 'base64');
          const imagePath = join(tempDir, image.filename);
          await writeFile(imagePath, imageBuffer);
        }
      }
    }

    // Write the LaTeX source to a temp file
    await writeFile(texFilePath, latex, 'utf-8');

    // Run tectonic to compile the LaTeX
    // -X compile: use the V2 interface
    // --outdir: output directory
    // --keep-logs: keep log files for debugging
    try {
      const { stderr } = await execAsync(
        `tectonic -X compile "${texFilePath}" --outdir "${tempDir}" --keep-logs`,
        {
          timeout: COMPILATION_TIMEOUT,
          env: {
            ...process.env,
            // Tectonic will auto-download packages to its cache
            HOME: process.env.HOME || '/tmp',
          },
        }
      );

      // Check if PDF was generated
      try {
        const pdfBuffer = await readFile(pdfFilePath);
        
        // Return the PDF
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="document.pdf"',
            'Cache-Control': 'no-cache',
          },
        });
      } catch {
        // PDF not generated, return the error logs
        let logs = stderr || 'Unknown compilation error';
        
        // Try to read the log file for more details
        try {
          const logFilePath = join(tempDir, 'document.log');
          const logContent = await readFile(logFilePath, 'utf-8');
          logs = logContent;
        } catch {
          // Log file not available
        }

        return NextResponse.json(
          { 
            error: 'LaTeX compilation failed',
            logs: logs.slice(-5000), // Last 5000 chars of logs
          },
          { status: 422 }
        );
      }
    } catch (execError: unknown) {
      // Compilation command failed
      let errorMessage = 'Compilation process failed';
      let logs = '';

      if (execError instanceof Error) {
        errorMessage = execError.message;
        
        // Try to extract stderr from exec error
        const execErr = execError as Error & { stderr?: string; stdout?: string };
        if (execErr.stderr) {
          logs = execErr.stderr;
        }
      }

      // Check if tectonic is installed
      if (errorMessage.includes('not found') || errorMessage.includes('ENOENT')) {
        return NextResponse.json(
          { 
            error: 'Tectonic is not installed on the server',
            logs: 'Please install tectonic: https://tectonic-typesetting.github.io/book/latest/installation.html',
          },
          { status: 500 }
        );
      }

      // Try to read log file for more details
      try {
        const logFilePath = join(tempDir, 'document.log');
        const logContent = await readFile(logFilePath, 'utf-8');
        logs = logContent;
      } catch {
        // Log file not available
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          logs: logs.slice(-5000) || 'No detailed logs available',
        },
        { status: 422 }
      );
    }
  } catch (error: unknown) {
    console.error('Error in compile-latex:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        logs: '',
      },
      { status: 500 }
    );
  } finally {
    // Clean up temp directory
    if (tempDir) {
      try {
        // Remove all files in temp directory
        const { readdir } = await import('fs/promises');
        const files = await readdir(tempDir);
        await Promise.all(
          files.map(file => unlink(join(tempDir!, file)).catch(() => {}))
        );
        // Remove the directory
        const { rmdir } = await import('fs/promises');
        await rmdir(tempDir).catch(() => {});
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
