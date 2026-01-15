# AppLytics

An AI-powered web application that automatically modifies LaTeX resumes to better match specific job descriptions. The tool uses AI models (OpenAI or Google GenAI) to intelligently rephrase and optimize resume content while preserving all factual information and ensuring the resume fits on a single page.

## Features

- **AI-Powered Resume Modification**: Automatically tailors your LaTeX resume to match job descriptions
- **LaTeX Editor**: Built-in code editor with LaTeX syntax highlighting
- **PDF Preview**: Real-time PDF preview of your compiled resume
- **Chat Interface**: Follow-up conversations to refine your resume with additional modifications
- **Multi-Provider Support**: Works with OpenAI and Google GenAI models
- **One-Page Optimization**: Automatically ensures your resume fits on exactly one page
- **Custom Instructions**: Add specific instructions for how you want your resume modified

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm, yarn, pnpm, or bun
- **Tectonic** (LaTeX compiler) - required for PDF compilation
- **poppler-utils** (PDF tools: pdfinfo, pdftoppm, pdftotext) - required for PDF analysis
- An API key from OpenAI or Google GenAI

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd resumeModifier
```

2. Install Tectonic (LaTeX compiler):
```bash
chmod +x scripts/install-tectonic.sh
./scripts/install-tectonic.sh
```

   The installer will detect your OS and provide installation options. Alternatively, you can install Tectonic manually:
   - **macOS**: `brew install tectonic` or `cargo install tectonic`
   - **Linux**: `cargo install tectonic` or use your distribution's package manager
   - **Windows**: `cargo install tectonic` or download from [GitHub releases](https://github.com/tectonic-typesetting/tectonic/releases)

3. Install poppler-utils (PDF tools):
   - **macOS**: `brew install poppler`
   - **Linux (Debian/Ubuntu)**: `sudo apt-get install poppler-utils`
   - **Linux (Fedora)**: `sudo dnf install poppler-utils`
   - **Linux (Arch)**: `sudo pacman -S poppler`
   - **Windows**: `choco install poppler` or download from [poppler releases](https://github.com/oschwartz10612/poppler-windows/releases)

4. Install Node.js dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

5. (Optional) Set environment variables in `.env.local`:
```bash
OPENAI_API_KEY=your_openai_key
GOOGLE_GENAI_API_KEY=your_google_key
```

### Running the Application

Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Configure API Access**:
   - Select your AI provider (OpenAI or Google)
   - Choose a model
   - Enter your API key (or it will be loaded from environment variables if set)

2. **Upload Your Resume**:
   - Paste your LaTeX resume code into the editor, or upload a PDF that will be converted to LaTeX

3. **Provide Job Description**:
   - Paste the job offer/description you're applying to

4. **Add Custom Instructions** (Optional):
   - Specify any particular modifications you want (e.g., "emphasize Python experience", "condense older jobs")

5. **Generate Modified Resume**:
   - Click the modify button to generate an AI-tailored version
   - The system will automatically ensure the resume fits on one page

6. **Refine with Chat**:
   - After the initial modification, use the chat interface to request additional changes
   - Examples: "make the summary more technical", "add more metrics to the first job"

7. **Download PDF**:
   - Once satisfied, download the compiled PDF of your modified resume

## Important Notes

- The AI preserves all factual information (name, contact info, companies, dates, education)
- Only the wording and emphasis of descriptions are modified to match job keywords
- The resume is automatically optimized to fit on exactly one page
- All LaTeX formatting and structure are preserved
