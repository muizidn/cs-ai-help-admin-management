// Environment configuration for the admin management application
// This module handles loading environment variables in a SvelteKit-compatible way

import { readFileSync } from "fs"
import { join } from "path"

// Try to load dotenv as fallback for additional .env support
try {
  require("dotenv").config()
} catch (error) {
  // dotenv not available or failed to load, continue with manual parsing
}

// Parse environment file content
function parseEnvFile(content: string): Record<string, string> {
  const envVars: Record<string, string> = {}

  content.split("\n").forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=")
      if (key && valueParts.length > 0) {
        let value = valueParts.join("=")
        // Remove quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        envVars[key.trim()] = value
      }
    }
  })

  return envVars
}

// Try to load environment variables from .env files
function loadEnvFiles(): Record<string, string> {
  const envVars: Record<string, string> = {}

  // Load in order of precedence: .env.local > .env
  const envFiles = [".env", ".env.local"]

  for (const envFile of envFiles) {
    try {
      const envPath = join(process.cwd(), envFile)
      const envContent = readFileSync(envPath, "utf-8")
      const fileVars = parseEnvFile(envContent)

      // Merge variables (later files override earlier ones)
      Object.assign(envVars, fileVars)

      console.log(`✅ Loaded environment variables from ${envFile}`)
    } catch (error) {
      console.log(
        `Could not load ${envFile} file:`,
        error instanceof Error ? error.message : "Unknown error",
      )
    }
  }

  return envVars
}

// For server-side environment variables
export const getServerEnv: any = () => {
  console.log("getServerEnv called, NODE_ENV:", process.env.NODE_ENV)
  console.log("Raw process.env.MONGODB_URI:", process.env.MONGODB_URI)
  console.log("Raw process.env.MONGODB_DATABASE:", process.env.MONGODB_DATABASE)

  // In production/Docker, prioritize process.env over .env.local
  if (process.env.NODE_ENV === "production") {
    const result = {
      MONGODB_URI: process.env.MONGODB_URI,
      MONGODB_DATABASE: process.env.MONGODB_DATABASE,
      REDIS_URL: process.env.REDIS_URL,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HOST: process.env.HOST,
    }
    console.log("Production mode result:", result)
    return result
  }

  // In development, try .env files first, then fall back to process.env
  const envFiles = loadEnvFiles()
  const result = {
    MONGODB_URI: envFiles.MONGODB_URI || process.env.MONGODB_URI,
    MONGODB_DATABASE: envFiles.MONGODB_DATABASE || process.env.MONGODB_DATABASE,
    REDIS_URL: envFiles.REDIS_URL || process.env.REDIS_URL,
    UPSTASH_REDIS_REST_URL:
      envFiles.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN:
      envFiles.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
    NODE_ENV: envFiles.NODE_ENV || process.env.NODE_ENV,
    PORT: envFiles.PORT || process.env.PORT,
    HOST: envFiles.HOST || process.env.HOST,
  }
  console.log("Development mode result:", result)
  return result
}

// Log environment variables for debugging
export const logEnvVars = () => {
  const env = getServerEnv()
  console.log("Environment Variables:")
  console.log("MONGODB_URI:", env.MONGODB_URI)
  console.log("MONGODB_DATABASE:", env.MONGODB_DATABASE)
  console.log("NODE_ENV:", process.env.NODE_ENV)
}
