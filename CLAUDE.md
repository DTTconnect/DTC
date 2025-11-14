# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Lovable.dev clone built using the Claude Code SDK. The application allows users to input prompts and generates code in isolated Daytona sandboxes with live preview URLs.

## Architecture

### Monorepo Structure
- **Root directory**: Contains standalone test scripts and utilities
  - `generateWithClaudeCode.ts`: Core function for Claude Code SDK integration
  - `test-claude-code.ts`: Example test script for SDK functionality
- **lovable-ui/**: Next.js frontend application (main app)

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **AI Integration**: @anthropic-ai/claude-code SDK (v1.0.39+)
- **Sandboxing**: @daytonaio/sdk for isolated development environments
- **Runtime**: tsx for TypeScript execution

### Key Components

**Frontend Pages** (lovable-ui/app/)
- `/` - Landing page with prompt input
- `/generate` - Code generation UI with real-time streaming
- Auto-generated pages (e.g., /hello-world, /connect4) from Claude generations

**API Routes** (lovable-ui/app/api/)
- `/api/generate` - Original endpoint (modifies website code directly)
- `/api/generate-daytona` - New endpoint (generates in isolated Daytona sandbox)

**Core Library** (lovable-ui/lib/)
- `claude-code.ts` - Wrapper for Claude Code SDK query function with tool permissions

**Utility Scripts** (lovable-ui/scripts/)
- `generate-in-daytona.ts` - Main script: creates sandbox, runs Claude Code SDK, starts dev server
- `test-preview-url.ts` - Tests Daytona preview URL functionality
- `get-preview-url.ts` - Retrieves preview URL for existing sandbox
- `start-dev-server.ts` - Starts dev server in existing sandbox
- `remove-sandbox.ts` - Cleanup utility for Daytona sandboxes

## Development Commands

### Frontend (lovable-ui/)
```bash
npm run dev      # Start Next.js development server (http://localhost:3000)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Root (testing SDK)
```bash
npx tsx test-claude-code.ts                    # Test basic SDK functionality
npx tsx generateWithClaudeCode.ts              # Run code generation
```

### Daytona Scripts (lovable-ui/scripts/)
```bash
# Generate website in new Daytona sandbox
npx tsx scripts/generate-in-daytona.ts "Create a blog website"

# Reuse existing sandbox
npx tsx scripts/generate-in-daytona.ts <sandbox-id> "Add a contact page"

# Test preview URL functionality
npx tsx scripts/test-preview-url.ts

# Get preview URL for existing sandbox
npx tsx scripts/get-preview-url.ts <sandbox-id>

# Start dev server in existing sandbox
npx tsx scripts/start-dev-server.ts <sandbox-id>

# Remove sandbox
npx tsx scripts/remove-sandbox.ts <sandbox-id>
```

## Environment Variables

Required in `.env`:
- `ANTHROPIC_API_KEY` - For Claude Code SDK
- `DAYTONA_API_KEY` - For sandbox creation and management

## Code Generation Flow

### Current Architecture
1. User enters prompt in frontend (lovable-ui/app/page.tsx)
2. Frontend calls `/api/generate-daytona` with streaming
3. API spawns `generate-in-daytona.ts` script as child process
4. Script creates Daytona sandbox (or reuses existing)
5. Installs Claude Code SDK in sandbox
6. Runs Claude Code SDK query with user prompt
7. Claude generates Next.js project files in sandbox
8. Script installs dependencies and starts dev server
9. Returns preview URL using `sandbox.getPreviewLink(3000)`
10. Frontend displays preview URL to user

### Claude Code SDK Configuration
The SDK is configured with:
- `maxTurns: 20` for complex projects
- Allowed tools: Read, Write, Edit, MultiEdit, Bash, LS, Glob, Grep
- Structured logging with `__CLAUDE_MESSAGE__`, `__TOOL_USE__`, `__TOOL_RESULT__` markers

## Development Preferences

**Script Execution**: Do not execute scripts using the Bash tool. Instead, write scripts and ask the user to execute them manually, then request the output. This ensures proper environment setup and allows the user to verify operations.

## Current Development State

- ✅ Basic prompt-to-code generation working
- ✅ Daytona sandbox integration complete
- ✅ Preview URL generation functional (verified by scripts/test-preview-url.ts)
- 🚧 Next task: Improve isolated environment workflow and dev server management
