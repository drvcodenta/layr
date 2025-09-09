# layr

🚀 **Simplified planning layer for coding agents**

Layr is an AI-powered project planning tool that breaks down development goals into actionable steps, generates code, and helps manage project execution. It uses OpenAI's GPT models to create intelligent development plans with fallback to heuristic planning when no API key is available.

## Features

- 🤖 **AI-Powered Planning**: Generate detailed project plans using OpenAI GPT
- 📝 **Code Generation**: Create code snippets for each plan step
- 🎨 **Beautiful CLI**: Colorful output with spinners and progress indicators
- 💾 **Export Plans**: Save plans as JSON or Markdown
- 🔄 **Fallback Mode**: Works without API key using heuristic planning
- 🧪 **Template System**: Pre-built templates for common patterns

## Installation

```bash
git clone <repository-url>
cd layr
npm install
npm run build
```

## Quick Start

### 1. Set your OpenAI API Key

```bash
npm run dev set-key
```

### 2. Generate a Plan

```bash
npm run dev plan "Build a REST API for users with authentication"
```

### 3. Run a Step

```bash
npm run dev run 1 --apply
```

### 4. Export the Plan

```bash
npm run dev export myplan.md
```

## Usage

### Commands

| Command | Description | Example |
|---------|-------------|---------|
| `set-key` | Set OpenAI API key interactively | `npm run dev set-key` |
| `clear-key` | Clear stored API key | `npm run dev clear-key` |
| `plan <goal>` | Generate project plan | `npm run dev plan "Build a todo app"` |
| `show` | Show current plan | `npm run dev show` |
| `run <stepId> [--apply]` | Generate code for step | `npm run dev run 1 --apply` |
| `export [file]` | Export plan to file | `npm run dev export plan.json` |

### Example Session

```
🚀 Layr - AI-Powered Project Planner

$ npm run dev plan "Build a REST API with user authentication"

✔ Generating AI-powered plan...

📋 REST API with User Authentication
Goal: Build a REST API with user authentication

Steps:
#1: Initialize project structure
   Set up Node.js project with TypeScript and dependencies
   Complexity: low
   Estimated Time: 15 min

#2: Create user model and database schema  
   Define user entity with authentication fields
   Dependencies: 1
   Complexity: medium
   Estimated Time: 30 min

#3: Implement authentication middleware
   Create JWT-based auth system with login/register
   Dependencies: 2
   Complexity: high
   Estimated Time: 60 min

#4: Add protected routes
   Create CRUD endpoints with auth protection
   Dependencies: 3
   Complexity: medium
   Estimated Time: 45 min

$ npm run dev run 1 --apply

✅ Code generated and written to server.ts
```

### Fallback Mode

When no API key is configured, Layr automatically switches to fallback mode:

```
⚠️  Warning: Running in fallback mode
   No valid API key found. Using heuristic plans.
   Run "layr set-key" to configure OpenAI API.

📋 Plan for: Build a REST API
Goal: Build a REST API

Steps:
#1: Initialize project
   Set up project structure

#2: Create model
   Define data model
   Dependencies: 1

#3: Add routes
   Implement API routes
   Dependencies: 2

#4: Test project
   Write and run tests
   Dependencies: 3
```

## Architecture

```
┌─────────────────┐
│      CLI        │  Command line interface
│   (commander)   │  - Argument parsing
└─────────┬───────┘  - User interaction
          │
          ▼
┌─────────────────┐
│    Planner      │  Plan generation & validation
│                 │  - Goal → structured plan
└─────────┬───────┘  - Dependency checking
          │
          ▼
┌─────────────────┐
│   LLM Client    │  AI integration
│   (OpenAI)      │  - Chat completions
└─────────┬───────┘  - Rate limiting & retry
          │
          ▼
┌─────────────────┐
│    Codegen      │  Code generation
│                 │  - Step → code files
└─────────┬───────┘  - Template integration
          │
          ▼
┌─────────────────┐
│   Filewriter    │  File operations
│                 │  - Safe file writing
└─────────────────┘  - Directory creation

Flow: CLI → Planner → LLMClient → Codegen → Filewriter
      ↓
   Templates ← UI (spinners, colors, formatting)
```

## Configuration

### API Key Storage

Layr uses secure key storage with fallbacks:

1. **Keytar** (secure system keychain) - preferred
2. **Local .env file** (`~/.config/layr/.env`) - fallback
3. **Project .env file** - development

### Environment Variables

```bash
OPENAI_API_KEY=your-api-key-here
```

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev <command>
```

## Templates

Built-in templates available:

- `expressServer` - Basic Express.js server setup
- `crudRoutes` - Full CRUD route implementation  
- `reactComponent` - React functional component with hooks

Access templates in code generation or reference in plans.

## Error Handling

- **Rate Limiting**: Automatic retry with exponential backoff
- **Invalid API Key**: Clear error messages with setup instructions
- **Network Issues**: Graceful fallback to heuristic planning
- **Invalid Plans**: JSON validation with cycle detection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

---

*Built with TypeScript, Commander.js, OpenAI API, and ❤️*
