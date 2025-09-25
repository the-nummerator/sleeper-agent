# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "sleeper-agent" - a TypeScript backend application that provides an abstraction of the Sleeper Fantasy Football API. The project includes:
- Express.js REST API server
- Model Context Protocol (MCP) server for AI integrations
- Fantasy football data analysis tools
- Slack interface capabilities

## Development Setup

### Prerequisites
- Node.js and npm
- TypeScript

### Build Commands
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Start development server with hot reload (tsx watch)
- `npm start` - Start production server
- `npm run lint` - Run ESLint on TypeScript files
- `npm test` - Run Jest tests

### Key Scripts
Always run linting after making code changes to ensure code quality.

## Architecture

### Project Structure
```
src/
├── controllers/          # Express route controllers
├── routes/              # API route definitions
├── middleware/          # Express middleware (error handling, etc.)
├── types/               # TypeScript type definitions
├── Agents/              # Base agent classes
└── MCP/                 # Model Context Protocol server
    ├── Sleeper/         # Sleeper API MCP tools and resources
    │   ├── files/       # Static data files (player database, etc.)
    │   └── prompts/     # AI prompt templates
    └── types.ts         # MCP type definitions
```

### Key Components

#### MCP Server
- **Location**: `src/MCP/Sleeper/sleeper_mcp.ts`
- **Purpose**: Provides AI-accessible tools for Sleeper API interactions
- **Transport**: Supports both HTTP (SSE) and stdio transports
- **Tools**: League data, roster management, matchup analysis, user lookup

#### API Server
- **Main Entry**: `src/index.ts`
- **Framework**: Express.js with TypeScript
- **Features**: CORS, Helmet security, Morgan logging, error handling

#### Fantasy Football Analysis
- **Prompts**: Comprehensive prompt templates for league analysis
- **Tools**: Automated matchup summaries, standings analysis, player performance

## Getting Started

### Development Workflow
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Make code changes
4. Run linting: `npm run lint`
5. Test changes: `npm test`
6. Build for production: `npm run build`

### MCP Server Usage
The MCP server can run in two modes:
- **HTTP Mode**: Accessible via `/mcp` endpoint with Server-Sent Events
- **Stdio Mode**: For direct integration with Claude Desktop client

### Common Tasks
- Fantasy league analysis prompts are available in `src/MCP/Sleeper/prompts/`
- Sleeper API tools are defined in `src/MCP/Sleeper/files/sleeper_tools_def.json`
- Player database is available as MCP resource at `src/MCP/Sleeper/files/sleeper_players_def.json`

## Important Notes
- Always use ESLint before committing changes
- MCP server supports dual transport detection for maximum compatibility
- Project follows TypeScript strict mode conventions