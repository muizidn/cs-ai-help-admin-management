# Environment Setup Guide

This guide will help you set up the environment variables for the CS AI Admin Management application.

## Quick Setup

1. **Copy the example environment file:**
   ```bash
   bun run setup
   # or manually:
   cp .env.example .env
   ```

2. **Edit the `.env` file with your configuration:**
   ```bash
   nano .env
   # or use your preferred editor
   ```

## Required Configuration

### MongoDB (Required)
The application needs access to the same MongoDB database used by the `ai-inference` service:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=cs_ai_app
```

**For different environments:**
- **Local MongoDB**: `mongodb://localhost:27017`
- **Docker**: `mongodb://mongodb:27017`
- **MongoDB Atlas**: `mongodb+srv://username:password@cluster.mongodb.net`

### Redis (Required)
The application needs Redis access to read/write system prompts:

```env
REDIS_URL=redis://localhost:6379
```

**Alternative: Upstash Redis (cloud)**
```env
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

### Basic Application Settings
```env
NODE_ENV=development
HOST=localhost
PORT=3000
```

## Testing Your Configuration

1. **Start the development server:**
   ```bash
   bun run dev
   ```

2. **Test database connections:**
   ```bash
   bun run test:connections
   # or visit: http://localhost:5173/api/test-connections
   ```

3. **Access the application:**
   - Main app: http://localhost:5173
   - AI Execution Logs: http://localhost:5173/ai-execution-log
   - System Prompts (Redis): http://localhost:5173/system-prompts-redis

## Environment File Priority

The application loads environment variables in this order:
1. `process.env` (system environment variables)
2. `.env` (base configuration)
3. `.env.local` (local overrides, gitignored)

## Common Issues

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongosh --eval "db.runCommand('ping')"`
- Check if the database exists and has the `ai_inference_engine_execution_logs` collection
- Verify connection string format and credentials

### Redis Connection Issues
- Test Redis connection: `redis-cli ping`
- For Docker: ensure Redis container is running
- For Upstash: verify URL and token from dashboard

### Missing Data
- **No execution logs**: Ensure the `ai-inference` service has created some execution logs
- **No system prompts**: The Redis keys should follow the pattern:
  - `technical-system-prompt:default:en`
  - `admin-behavior-system-prompt:default:en`
  - etc.

## Docker Setup

If running in Docker, use these service names:

```env
MONGODB_URI=mongodb://mongodb:27017
REDIS_URL=redis://redis:6379
HOST=0.0.0.0
PORT=3000
```

## Production Setup

For production deployment:

1. Use managed database services (MongoDB Atlas, Redis Cloud)
2. Set secure connection strings with authentication
3. Configure proper logging and monitoring
4. Set `NODE_ENV=production`
5. Use environment variables instead of `.env` files

## Security Notes

- Never commit `.env` files to version control
- Use strong passwords and secure connection strings
- Rotate credentials regularly
- Use least-privilege database users
- Enable SSL/TLS for database connections in production

## Support

If you encounter issues:
1. Check the application logs in the terminal
2. Test connections using the `/api/test-connections` endpoint
3. Verify your MongoDB and Redis services are accessible
4. Ensure the `ai-inference` service is properly configured and has created data
