import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController, AdminChatController } from './chat.controller';

@Module({
  controllers: [ChatController, AdminChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
