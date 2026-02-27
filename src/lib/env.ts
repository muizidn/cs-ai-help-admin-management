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
  const envFiles = [".env"]

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
  const envFiles = loadEnvFiles()

  // Merge order: process.env (highest) > .env files
  const merged = { ...envFiles, ...process.env }

  const result = {
    MONGODB_URI: merged.MONGODB_URI,
    MONGODB_DATABASE: merged.MONGODB_DATABASE,
    REDIS_URL: merged.REDIS_URL,
    UPSTASH_REDIS_REST_URL: merged.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: merged.UPSTASH_REDIS_REST_TOKEN,
    NODE_ENV: merged.NODE_ENV,
    PORT: merged.PORT,
    HOST: merged.HOST,
    ADMIN_USERNAME: merged.ADMIN_USERNAME,
    ADMIN_PASSWORD_HASH_BASE64: merged.ADMIN_PASSWORD_HASH_BASE64,
    INTERNAL_SECRET_TOKEN: merged.INTERNAL_SECRET_TOKEN,
    MAIN_APP_URL: merged.MAIN_APP_URL,
    APP_VERSION: merged.APP_VERSION,
  }

  return result
}

// Log environment variables for debugging
export const logEnvVars = () => {
  const env = getServerEnv()
  console.log("Environment Variables:")
  console.log("MONGODB_URI:", env.MONGODB_URI)
  console.log("MONGODB_DATABASE:", env.MONGODB_DATABASE)
  console.log("APP_VERSION (env):", env.APP_VERSION)
  console.log("APP_VERSION (process):", process.env.APP_VERSION)
  console.log("NODE_ENV:", process.env.NODE_ENV)
}
