import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatConversationStatus } from '@prisma/client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create a conversation for a user
   */
  async getOrCreateConversation(userId: string, subject?: string) {
    // Check for existing open conversation
    const existing = await this.prisma.chatConversation.findFirst({
      where: {
        userId,
        status: ChatConversationStatus.OPEN,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Create new conversation
    const conversation = await this.prisma.chatConversation.create({
      data: {
        userId,
        subject: subject || 'Support Request',
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    this.logger.log(`Created new chat conversation ${conversation.id} for user ${userId}`);
    return conversation;
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(userId: string) {
    return this.prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: { readAt: null, isFromAdmin: true },
            },
          },
        },
      },
    });
  }

  /**
   * Get messages in a conversation (user access)
   */
  async getConversationMessages(conversationId: string, userId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Mark admin messages as read
    await this.prisma.chatMessage.updateMany({
      where: {
        conversationId,
        isFromAdmin: true,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });
  }

  /**
   * Send a message (user)
   */
  async sendMessage(conversationId: string, userId: string, content: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.status !== ChatConversationStatus.OPEN) {
      throw new ForbiddenException('This conversation is closed');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        isFromAdmin: false,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // Update conversation's last message time
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    this.logger.log(`User ${userId} sent message in conversation ${conversationId}`);
    return message;
  }

  // =============================================
  // ADMIN METHODS
  // =============================================

  /**
   * Get all conversations (admin)
   */
  async getAllConversations(status?: ChatConversationStatus) {
    return this.prisma.chatConversation.findMany({
      where: status ? { status } : undefined,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: { readAt: null, isFromAdmin: false },
            },
          },
        },
      },
    });
  }

  /**
   * Get conversation details (admin)
   */
  async getConversationForAdmin(conversationId: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Mark user messages as read
    await this.prisma.chatMessage.updateMany({
      where: {
        conversationId,
        isFromAdmin: false,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return conversation;
  }

  /**
   * Admin reply to conversation
   */
  async adminReply(conversationId: string, adminId: string, content: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: adminId,
        content,
        isFromAdmin: true,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // Update conversation's last message time and reopen if closed
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        status: ChatConversationStatus.OPEN,
      },
    });

    this.logger.log(`Admin ${adminId} replied to conversation ${conversationId}`);
    return message;
  }

  /**
   * Update conversation status (admin)
   */
  async updateConversationStatus(
    conversationId: string,
    status: ChatConversationStatus,
  ) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        status,
        resolvedAt: status === ChatConversationStatus.RESOLVED ? new Date() : null,
      },
    });
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.chatMessage.count({
      where: {
        conversation: { userId },
        isFromAdmin: true,
        readAt: null,
      },
    });
    return { unreadCount: count };
  }

  /**
   * Get unread message count for admin (all conversations)
   */
  async getAdminUnreadCount() {
    const count = await this.prisma.chatMessage.count({
      where: {
        isFromAdmin: false,
        readAt: null,
      },
    });
    return { unreadCount: count };
  }
}
