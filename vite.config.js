import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig, loadEnv } from "vite"
import path from "path"
import { createLoggerPlugin } from "./src/lib/vite-logger-plugin.ts"

export default defineConfig(({ mode }) => {
  // Load .env.[mode] and .env files
  const env = loadEnv(mode, process.cwd())

  // In production, prioritize actual environment variables over .env files
  const getEnvVar = (key) => {
    return process.env[key] || env[key]
  }

  return {
    plugins: [sveltekit(), createLoggerPlugin()],

    resolve: {
      alias: {
        $lib: path.resolve("src/lib"),
        $components: path.resolve("src/lib/components"),
      },
    },

    server: {
      allowedHosts: [
        "t470",
        "backoffice-csai.kerjaremoteluarnegeri.com",
        "localhost",
      ],
    },

    // Remove define block - use process.env directly in server-side code
  }
})
