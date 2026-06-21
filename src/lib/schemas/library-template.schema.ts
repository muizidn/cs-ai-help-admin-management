import { z } from "zod"

export const TestMessageSchema = z.object({
  customer: z.string(),
  ai_response_eval: z.string(),
})

export const TestScenarioSchema = z.object({
  flowName: z.string(),
  messages: z.array(TestMessageSchema),
})

export const KnowledgeBaseContentSchema = z.object({
  sections: z.array(
    z.object({
      content: z.string(),
    }),
  ),
  keywords: z.array(z.string()),
  questions: z.array(TestScenarioSchema).optional(),
})

export type ValidatedKnowledgeBaseContent = z.infer<typeof KnowledgeBaseContentSchema>
