import { z } from 'zod';

/**
 * The POST /assistant request body. The API validates this with Zod before
 * handing the messages to `streamAssistant` (Golden Rule 3: validate every input).
 * Tools and userId scoping are supplied server-side, never by the client.
 *
 * The caps bound cost/abuse and shrink the prompt-injection surface: a single
 * message is <= 4000 chars and a conversation is <= 50 turns.
 */
export const AssistantChatRequest = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(50),
});
export type AssistantChatRequest = z.infer<typeof AssistantChatRequest>;
