import type { Plugin } from 'vite'
import pino from 'pino'

// Create a separate logger for build events
const buildLogger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  },
  base: {
    service: 'system-prompts-build'
  }
})

export function createLoggerPlugin(): Plugin {
  let buildStartTime: number
  let isFirstBuild = true

  return {
    name: 'logger-plugin',
    
    buildStart() {
      buildStartTime = Date.now()
      
      if (isFirstBuild) {
        buildLogger.info({
          event: 'build_start',
          type: 'build_event',
          timestamp: new Date().toISOString()
        }, 'Initial build started')
        isFirstBuild = false
      } else {
        buildLogger.info({
          event: 'rebuild_triggered',
          type: 'build_event',
          timestamp: new Date().toISOString()
        }, 'Rebuild triggered (file change detected)')
      }
    },

    buildEnd() {
      const duration = Date.now() - buildStartTime
      
      buildLogger.info({
        event: 'build_complete',
        type: 'build_event',
        duration,
        timestamp: new Date().toISOString()
      }, `Build completed in ${duration}ms`)
    },

    handleHotUpdate(ctx) {
      buildLogger.debug({
        event: 'hot_update',
        type: 'build_event',
        file: ctx.file,
        timestamp: new Date().toISOString()
      }, `Hot update: ${ctx.file}`)
    },

    configureServer(server) {
      // Log when dev server starts
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' && req.method === 'GET') {
          buildLogger.debug({
            event: 'dev_server_request',
            type: 'build_event',
            url: req.url,
            method: req.method,
            timestamp: new Date().toISOString()
          }, 'Dev server request')
        }
        next()
      })

      // Log server startup
      const originalListen = server.listen
      server.listen = function(...args) {
        buildLogger.info({
          event: 'dev_server_start',
          type: 'build_event',
          timestamp: new Date().toISOString()
        }, 'Development server started')
        
        return originalListen.apply(this, args)
      }
    }
  }
}
