import type {
  ExecutionLog,
  ExecutionStep,
  FinalDecisionExtractor,
  FinalDecisionType,
} from "../types/execution-logs"

/**
 * Utility class for extracting final decision information from execution logs
 */
export class FinalDecisionExtractorImpl implements FinalDecisionExtractor {
  /**
   * Extract the final decision from an execution log
   */
  extractFinalDecision(log: ExecutionLog): string {
    // First try to get decision from final_response
    const responseDecision = this.getFinalDecisionFromResponse(
      log.final_response,
    )
    if (responseDecision !== "UNKNOWN") {
      return responseDecision
    }

    // Then try to get decision from workflow steps
    const stepsDecision = this.getFinalDecisionFromSteps(log.steps)
    if (stepsDecision !== "UNKNOWN") {
      return stepsDecision
    }
    return log.status
  }

  /**
   * Extract AI response text from execution log
   */
  extractAiResponseText(log: ExecutionLog): string {
    // Try to get from final_response first
    if (log.final_response) {
      // Check for final_message in response
      if (
        typeof log.final_response === "object" &&
        log.final_response.final_message
      ) {
        return log.final_response.final_message
      }

      // Check for ai_output.response (NEW PRIORITY SOURCE)
      if (log.final_response.ai_output?.response) {
        return log.final_response.ai_output.response
      }

      // Check for nested response.final_message
      if (log.final_response.response?.final_message) {
        return log.final_response.response.final_message
      }

      // Check for ai_output text
      if (log.final_response.response?.ai_output?.text) {
        return log.final_response.response.ai_output.text
      }

      // If final_response is a string
      if (typeof log.final_response === "string") {
        return log.final_response
      }
    }

    // Try to get from LLM_RESPONSE steps
    const llmResponseSteps = log.steps.filter(
      (step) => step.step_type === "LLM_RESPONSE",
    )
    if (llmResponseSteps.length > 0) {
      const lastLlmResponse = llmResponseSteps[llmResponseSteps.length - 1]
      if (lastLlmResponse.response?.text) {
        return lastLlmResponse.response.text
      }
    }

    return ""
  }

  /**
   * Get final decision from workflow steps
   */
  getFinalDecisionFromSteps(steps: ExecutionStep[]): string {
    // Look for workflow steps that indicate final decision
    const workflowSteps = steps.filter(
      (step) => step.step_type === "WORKFLOW_STEP",
    )

    // Check for specific final decision step types in the message or metadata
    for (const step of workflowSteps.reverse()) {
      // Check from last to first
      const message = step.message.toLowerCase()
      const metadata = step.metadata || {}

      // Check for specific workflow step types
      if (
        message.includes("sent_answer") ||
        metadata.step_type === "SENT_ANSWER"
      ) {
        return "SENT_ANSWER"
      }
      if (
        message.includes("request_human_assistance") ||
        metadata.step_type === "REQUEST_HUMAN_ASSISTANCE"
      ) {
        return "REQUEST_HUMAN_ASSISTANCE"
      }
      if (
        message.includes("no_answer_given") ||
        metadata.step_type === "NO_ANSWER_GIVEN"
      ) {
        return "NO_ANSWER_GIVEN"
      }
    }

    // Check for callback steps that might indicate the decision
    const callbackSteps = steps.filter(
      (step) => step.step_type === "CALLBACK_REQUEST",
    )
    for (const step of callbackSteps.reverse()) {
      if (step.payload?.context) {
        const context = step.payload.context.toUpperCase()
        if (
          [
            "SENT_ANSWER",
            "REQUEST_HUMAN_ASSISTANCE",
            "NO_ANSWER_GIVEN",
          ].includes(context)
        ) {
          return context
        }
      }
    }

    return "UNKNOWN"
  }

  /**
   * Get final decision from final_response object
   */
  getFinalDecisionFromResponse(final_response?: Record<string, any>): string {
    if (!final_response) {
      return "UNKNOWN"
    }

    // Priority 1: Check for ai_output.decision (NEW PRIMARY SOURCE)
    if (final_response.ai_output?.decision) {
      const aiDecision = final_response.ai_output.decision.toUpperCase()
      // Return the decision as-is since it's the most authoritative source
      return aiDecision
    }

    // Priority 3: Check for requires_human_assistance flag
    if (final_response.response?.requires_human_assistance === true) {
      return "REQUEST_HUMAN_ASSISTANCE"
    }

    return "UNKNOWN"
  }
  /**
   * Get human-readable label for final decision
   */
  getFinalDecisionLabel(decision: string): string {
    switch (decision) {
      case "DIRECT_REPLY":
        return "Direct Reply"
      case "FALLBACK_REPLY":
        return "Fallback Reply"
      case "SENT_ANSWER":
        return "Answer Sent"
      case "REQUEST_HUMAN_ASSISTANCE":
        return "Human Assistance"
      case "NO_ANSWER_GIVEN":
        return "No Answer"
      case "FAILED":
        return "Failed"
      case "RUNNING":
        return "Running"
      default:
        return "Unknown"
    }
  }

  /**
   * Get CSS class for final decision styling
   */
  getFinalDecisionClass(decision: string): string {
    switch (decision) {
      case "DIRECT_REPLY":
        return "decision-success"
      case "FALLBACK_REPLY":
        return "decision-info"
      case "SENT_ANSWER":
        return "decision-success"
      case "REQUEST_HUMAN_ASSISTANCE":
        return "decision-warning"
      case "NO_ANSWER_GIVEN":
        return "decision-info"
      case "FAILED":
        return "decision-error"
      case "RUNNING":
        return "decision-pending"
      default:
        return "decision-unknown"
    }
  }
}

// Export singleton instance
export const finalDecisionExtractor = new FinalDecisionExtractorImpl()

// Export utility functions for direct use
export function extractFinalDecision(log: ExecutionLog): string {
  return finalDecisionExtractor.extractFinalDecision(log)
}

export function extractAiResponseText(log: ExecutionLog): string {
  return finalDecisionExtractor.extractAiResponseText(log)
}

export function getFinalDecisionLabel(decision: string): string {
  return finalDecisionExtractor.getFinalDecisionLabel(decision)
}

export function getFinalDecisionClass(decision: string): string {
  return finalDecisionExtractor.getFinalDecisionClass(decision)
}
