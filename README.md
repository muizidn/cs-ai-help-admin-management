# CS AI Admin Management

A comprehensive admin dashboard for managing AI system prompts and monitoring execution logs from the CS AI application.

## Features

### AI Execution Logs

- **Execution Monitoring**: View and analyze execution logs from the AI inference engine
- **Detailed Views**: Step-by-step execution breakdown with timing information
- **Filtering & Search**: Advanced filtering by status, context, date range, and more
- **Statistics Dashboard**: Execution metrics, success rates, and performance analytics
- **Real-time Status**: Live status indicators and duration formatting

### System Prompts (Redis)

- **Redis Integration**: Manage technical and admin behavior prompts stored in Redis
- **Live Editing**: Edit prompts directly in the admin interface without code changes
- **Multi-locale Support**: Support for English and Indonesian prompts
- **Real-time Status**: Visual indicators for prompt existence and size
- **Business-specific Prompts**: Manage prompts for specific business contexts

### Traditional System Prompts

- **CRUD Operations**: Create, read, update, and delete system prompts
- **Query Expansion**: Insert queries to AI based on user queries
- **Industry-Specific Prompts**: Custom prompts tailored for specific industries
- **Content Management**: Manage prompt content, descriptions, and metadata
- **Bulk Operations**: Enable/disable or delete multiple prompts at once
- **Search & Filtering**: Full-text search with advanced filtering options
- **Tagging System**: Organize prompts with custom tags
- **Priority System**: Set priority levels (0-100) for prompt execution order

## Project Structure

```
src/
├── app.css                                    # Global styles
├── lib/
│   ├── types/system-prompts.ts               # Type definitions
│   ├── repositories/                         # Data access layer
│   │   ├── system-prompts-repository.ts      # Repository interface
│   │   └── mongodb-system-prompts-repository.ts # MongoDB implementation
│   ├── services/                             # Business logic layer
│   │   └── system-prompts-service.ts         # Service implementation
│   └── components/                           # UI components
│       ├── SystemPromptsList.svelte          # Prompts table component
│       ├── SystemPromptsForm.svelte          # Create/edit form
│       ├── SystemPromptsStats.svelte         # Statistics dashboard
│       └── SystemPromptsFilters.svelte       # Filtering interface
└── routes/
    ├── api/system-prompts/                   # API endpoints
    ├── system-prompts/                       # UI pages
    ├── +layout.svelte                        # Layout with navigation
    └── +page.svelte                          # Redirect to system prompts
```

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
bun run setup

# Edit the .env file with your configuration
nano .env
```

### 2. Required Configuration

Edit `.env` with your MongoDB and Redis connection details:

```env
# MongoDB (same database as ai-inference)
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=cs_ai_app

# Redis (for system prompts)
REDIS_URL=redis://localhost:6379

# Application settings
NODE_ENV=development
HOST=localhost
PORT=3000
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Start Development Server

```bash
bun run dev
```

### 5. Test Connections

```bash
# Test database connections
bun run test:connections

# Or visit: http://localhost:5173/api/test-connections
```

The application will be available at `http://localhost:5173`

## Application Routes

- **Home**: `http://localhost:5173/`
- **AI Execution Logs**: `http://localhost:5173/ai-execution-log`
- **System Prompts (Redis)**: `http://localhost:5173/system-prompts-redis`
- **System Prompts**: `http://localhost:5173/system-prompts`
- **Library Templates**: `http://localhost:5173/library-templates`

## Usage

### Managing System Prompts

- **Create**: Click "Create New Prompt" to add a new system prompt
- **Edit**: Click the edit icon on any prompt to modify it
- **Delete**: Use the delete button or bulk delete for multiple prompts
- **Search**: Use the search bar to find specific prompts
- **Filter**: Apply filters by type, status, or tags
- **Bulk Actions**: Select multiple prompts for bulk enable/disable or delete

### Prompt Types

- **Query Expansion**: Enhance user queries before AI processing
- **Industry Specific**: Tailored prompts for specific industries
- **General Instruction**: General AI behavior instructions
- **Context Enhancement**: Add context to improve responses
- **Response Formatting**: Control response format and structure
- **Safety Filter**: Content safety and moderation prompts
- **Custom**: Custom prompts for specific use cases

## Environment Configuration

The application supports multiple environment file formats:

1. `.env` - Base configuration
2. `.env.local` - Local overrides (gitignored)
3. System environment variables

See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for detailed configuration guide.

### Available Scripts

```bash
# Development
bun run dev              # Start development server
bun run build            # Build for production
bun run preview          # Preview production build

# Environment
bun run setup            # Create .env from .env.example
bun run test:connections # Test database connections

# Code Quality
bun run check            # Type checking
bun run check:watch      # Type checking in watch mode

# Database
bun run db:init          # Initialize database
bun run db:reset         # Reset database
```

## Data Sources

### MongoDB Collections

- `ai_inference_engine_execution_logs` - Execution logs from ai-inference service

### Redis Keys

- `technical-system-prompt:default:{locale}` - Technical system prompts
- `admin-behavior-system-prompt:default:{locale}` - Admin behavior prompts
- `business-behavior-system-prompt:{businessId}` - Business-specific prompts

## Build for Production

```bash
bun run build
```

The built files will be in the `build/` directory.

## Technologies Used

- **SvelteKit**: Full-stack framework with TypeScript
- **MongoDB**: Document database for prompt storage
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide Svelte**: Icon library
- **Vite**: Build tool and dev server

## Documentation

For detailed documentation, see [SYSTEM_PROMPTS_README.md](./SYSTEM_PROMPTS_README.md).

## Browser Support

Modern browsers that support ES6+ features.
