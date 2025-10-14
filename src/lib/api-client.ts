import { browser } from "$app/environment"

interface ApiRequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: any
}

interface ApiResponse<T = any> {
  data?: T
  status: number
  statusText: string
  headers: Headers
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl
  }

  private log(level: "info" | "warn" | "error", message: string, data?: any) {
    if (!browser) return

    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      service: "admin-management-client",
      ...data,
    }

    // Log to console with structured format
    console[level](`[${timestamp}] ${message}`, logData)

    // In a real application, you might want to send these logs to a logging service
    // this.sendToLoggingService(level, message, logData)
  }

  private async makeRequest<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const start = Date.now()
    const url = `${this.baseUrl}${endpoint}`
    const method = options.method || "GET"

    const requestId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)

    this.log("info", `API Request Started`, {
      requestId,
      method,
      url,
      type: "api_request_start",
    })

    try {
      const requestOptions: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
          ...options.headers,
        },
      }

      if (options.body && method !== "GET") {
        requestOptions.body = JSON.stringify(options.body)
      }

      const response = await fetch(url, requestOptions)
      const duration = Date.now() - start

      let responseData: T | undefined
      try {
        responseData = await response.json()
      } catch (e) {
        // Response might not be JSON
      }

      const apiResponse: ApiResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }

      if (response.ok) {
        this.log("info", `API Request Successful`, {
          requestId,
          method,
          url,
          status: response.status,
          duration,
          type: "api_request_success",
        })
      } else {
        this.log("warn", `API Request Failed`, {
          requestId,
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          duration,
          responseData,
          type: "api_request_failed",
        })
      }

      return apiResponse
    } catch (error) {
      const duration = Date.now() - start

      this.log("error", `API Request Error`, {
        requestId,
        method,
        url,
        duration,
        error: error instanceof Error ? error.message : String(error),
        type: "api_request_error",
      })

      throw error
    }
  }

  // Convenience methods
  async get<T = any>(
    endpoint: string,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: "GET", headers })
  }

  async post<T = any>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: "POST", body, headers })
  }

  async put<T = any>(
    endpoint: string,
    body?: any,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: "PUT", body, headers })
  }

  async delete<T = any>(
    endpoint: string,
    headers?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: "DELETE", headers })
  }

  // Helper method to build query strings
  buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        if (Array.isArray(value)) {
          searchParams.set(key, value.join(","))
        } else {
          searchParams.set(key, String(value))
        }
      }
    })

    const queryString = searchParams.toString()
    return queryString ? `?${queryString}` : ""
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Export types for use in components
export type { ApiResponse, ApiRequestOptions }
