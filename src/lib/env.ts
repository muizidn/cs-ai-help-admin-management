// Environment configuration for the chat client
// This module handles loading environment variables in a SvelteKit-compatible way

import { readFileSync } from "fs"
import { join } from "path"

// Try to load environment variables from .env.local file
function loadEnvLocal(): Record<string, string> {
  try {
    const envPath = join(process.cwd(), ".env.local")
    const envContent = readFileSync(envPath, "utf-8")
    const envVars: Record<string, string> = {}

    envContent.split("\n").forEach((line) => {
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
  } catch (error) {
    console.log(
      "Could not load .env.local file:",
      error instanceof Error ? error.message : "Unknown error",
    )
    return {}
  }
}

// For server-side environment variables
export const getServerEnv: any = () => {
  console.log("getServerEnv called, NODE_ENV:", process.env.NODE_ENV)
  console.log("Raw process.env.MONGODB_URI:", process.env.MONGODB_URI)
  console.log("Raw process.env.MONGODB_DATABASE:", process.env.MONGODB_DATABASE)

  // In production/Docker, prioritize process.env over .env.local
  if (process.env.NODE_ENV === 'production') {
    const result = {
      MONGODB_URI: process.env.MONGODB_URI,
      MONGODB_DATABASE: process.env.MONGODB_DATABASE,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HOST: process.env.HOST,
    }
    console.log("Production mode result:", result)
    return result
  }

  // In development, try .env.local first, then fall back to process.env
  const envLocal = loadEnvLocal()
  const result = {
    MONGODB_URI: envLocal.MONGODB_URI || process.env.MONGODB_URI,
    MONGODB_DATABASE: envLocal.MONGODB_DATABASE || process.env.MONGODB_DATABASE,
    NODE_ENV: envLocal.NODE_ENV || process.env.NODE_ENV,
    PORT: envLocal.PORT || process.env.PORT,
    HOST: envLocal.HOST || process.env.HOST,
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
