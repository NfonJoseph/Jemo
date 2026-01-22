import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ChatConversationStatus } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

class CreateConversationDto {
  @IsOptional()
  @IsString()
  subject?: string;
}

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}

class UpdateStatusDto {
  @IsString()
  @IsIn(['OPEN', 'RESOLVED', 'CLOSED'])
  status!: ChatConversationStatus;
}

// User-facing chat endpoints
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get or create a conversation for the current user
   */
  @Post('conversations')
  @HttpCode(HttpStatus.OK)
  async getOrCreateConversation(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.getOrCreateConversation(user.id, dto.subject);
  }

  /**
   * Get user's conversations
   */
  @Get('conversations')
  async getMyConversations(@CurrentUser() user: { id: string }) {
    return this.chatService.getUserConversations(user.id);
  }

  /**
   * Get messages in a conversation
   */
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.chatService.getConversationMessages(id, user.id);
  }

  /**
   * Send a message
   */
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, user.id, dto.content);
  }

  /**
   * Get unread message count
   */
  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: { id: string }) {
    return this.chatService.getUnreadCount(user.id);
  }
}

// Admin chat endpoints
@Controller('admin/chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get all conversations
   */
  @Get('conversations')
  async getAllConversations(
    @Query('status') status?: ChatConversationStatus,
  ) {
    return this.chatService.getAllConversations(status);
  }

  /**
   * Get conversation details
   */
  @Get('conversations/:id')
  async getConversation(@Param('id') id: string) {
    return this.chatService.getConversationForAdmin(id);
  }

  /**
   * Reply to a conversation
   */
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async replyToConversation(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.adminReply(id, user.id, dto.content);
  }

  /**
   * Update conversation status
   */
  @Patch('conversations/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.chatService.updateConversationStatus(id, dto.status);
  }

  /**
   * Get unread count for admin
   */
  @Get('unread-count')
  async getUnreadCount() {
    return this.chatService.getAdminUnreadCount();
  }
}
