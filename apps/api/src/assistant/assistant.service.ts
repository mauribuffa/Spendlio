import { Inject, Injectable } from '@nestjs/common';
import { createDbTools, streamAssistant, type ChatMessage } from '@spendlio/ai';
import { DB } from '../db/db.module';

@Injectable()
export class AssistantService {
  constructor(@Inject(DB) private db: any) {}

  /**
   * One assistant turn, streamed. The tools are built server-side, scoped to the
   * user (convention B — no selfPersonId), so every number the model renders is
   * exact DB-computed cents. Returns the AI-SDK web Response the controller pipes.
   */
  chatResponse(userId: string, messages: ChatMessage[]): Response {
    const tools = createDbTools(this.db, userId);
    return streamAssistant({ messages, tools }).toUIMessageStreamResponse();
  }
}
