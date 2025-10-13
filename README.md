# System Prompts Management

A comprehensive backoffice system for managing CS AI general prompts used in the backend, eliminating the need to change prompts directly in source code.

## Features

- **CRUD Operations**: Create, read, update, and delete system prompts
- **Query Expansion**: Insert queries to AI based on user queries
- **Industry-Specific Prompts**: Custom prompts tailored for specific industries
- **Content Management**: Manage prompt content, descriptions, and metadata
- **Bulk Operations**: Enable/disable or delete multiple prompts at once
- **Search & Filtering**: Full-text search with advanced filtering options
- **Tagging System**: Organize prompts with custom tags
- **Priority System**: Set priority levels (0-100) for prompt execution order
- **Statistics Dashboard**: View usage statistics and prompt distribution

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

## Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Initialize database**:

   ```bash
   npm run db:init
   ```

3. **Start development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:5173`

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

## Configuration

### Environment Variables

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/cs-ai-prompts

# Application Settings
NODE_ENV=development
```

## Build for Production

```bash
npm run build
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
