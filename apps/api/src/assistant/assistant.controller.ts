import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { AssistantChatRequest } from '@spendlio/ai';
import { ZodPipe } from '../common/zod.pipe';
import { AuthGuard } from '../common/auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AssistantService } from './assistant.service';

@UseGuards(AuthGuard)
@Controller('assistant')
export class AssistantController {
  constructor(private svc: AssistantService) {}

  @Post()
  async chat(
    @CurrentUser() u: { id: string },
    @Body(new ZodPipe(AssistantChatRequest)) dto: AssistantChatRequest,
    @Res() res: ExpressResponse,
  ) {
    const webResp = this.svc.chatResponse(u.id, dto.messages);
    res.status(webResp.status);
    webResp.headers.forEach((v, k) => res.setHeader(k, v));
    if (!webResp.body) {
      res.end();
      return;
    }
    const { Readable } = await import('node:stream');
    Readable.fromWeb(webResp.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
  }
}
