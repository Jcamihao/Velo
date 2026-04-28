import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatPresenceService } from './chat-presence.service';

type SendMessageResult = {
  conversationId: string;
  participantIds: string[];
  message: {
    id: string;
    conversationId: string;
    content: string;
    createdAt: Date;
    sender: {
      id: string;
      email: string;
      fullName: string | null;
      avatarUrl: string | null;
    };
  };
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly chatPresenceService: ChatPresenceService,
  ) {}

  async startVehicleConversation(userId: string, vehicleId: string) {
    this.logger.log(
      `chat_start_attempt userId=${userId} vehicleId=${vehicleId}`,
    );
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        isActive: true,
        isPublished: true,
      },
      include: {
        images: {
          orderBy: {
            position: 'asc',
          },
          take: 1,
        },
        owner: {
          include: {
            profile: true,
          },
        },
      },
    });

    if (!vehicle) {
      this.logger.warn(
        `chat_start_vehicle_not_found userId=${userId} vehicleId=${vehicleId}`,
      );
      throw new NotFoundException('Veiculo nao encontrado.');
    }

    if (vehicle.ownerId === userId) {
      this.logger.warn(
        `chat_start_own_vehicle_blocked userId=${userId} vehicleId=${vehicleId}`,
      );
      throw new ForbiddenException(
        'Voce nao pode abrir chat para o proprio veiculo.',
      );
    }

    const participantIds = [userId, vehicle.ownerId].sort();
    const participantKey = `${vehicleId}:${participantIds.join(':')}`;

    const conversation = await this.prisma.chatConversation.upsert({
      where: {
        participantKey,
      },
      update: {},
      create: {
        vehicleId,
        createdById: userId,
        participantKey,
        participants: {
          create: participantIds.map((participantId) => ({
            userId: participantId,
            lastReadAt: participantId === userId ? new Date() : null,
          })),
        },
      },
      include: {
        vehicle: {
          include: {
            images: {
              orderBy: {
                position: 'asc',
              },
              take: 1,
            },
          },
        },
        participants: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    await this.prisma.chatParticipant.createMany({
      data: participantIds.map((participantId) => ({
        conversationId: conversation.id,
        userId: participantId,
        lastReadAt: participantId === userId ? new Date() : null,
      })),
      skipDuplicates: true,
    });

    this.logger.log(
      `chat_start_success userId=${userId} vehicleId=${vehicleId} conversationId=${conversation.id}`,
    );
    return this.getConversationSummary(userId, conversation.id);
  }

  async getMyConversations(userId: string) {
    const [conversations, memberships] = await Promise.all([
      this.prisma.chatConversation.findMany({
        where: {
          participants: {
            some: {
              userId,
            },
          },
        },
        include: {
          vehicle: {
            include: {
              images: {
                orderBy: {
                  position: 'asc',
                },
                take: 1,
              },
            },
          },
          participants: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      }),
      this.prisma.chatParticipant.findMany({
        where: {
          userId,
        },
        select: {
          conversationId: true,
          lastReadAt: true,
        },
      }),
    ]);

    const lastReadAtMap = new Map(
      memberships.map((membership) => [
        membership.conversationId,
        membership.lastReadAt,
      ]),
    );

    const unreadCounts = await Promise.all(
      conversations.map((conversation) =>
        this.prisma.chatMessage.count({
          where: {
            conversationId: conversation.id,
            senderId: {
              not: userId,
            },
            createdAt: {
              gt: lastReadAtMap.get(conversation.id) ?? new Date(0),
            },
          },
        }),
      ),
    );

    const payload = conversations.map((conversation, index) =>
      this.mapConversationSummary(conversation, userId, unreadCounts[index]),
    );

    this.logger.debug(
      `chat_list_loaded userId=${userId} conversations=${payload.length}`,
    );

    return payload;
  }

  async getConversationMessages(userId: string, conversationId: string) {
    await this.ensureParticipant(userId, conversationId);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
      },
      include: {
        sender: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 100,
    });

    await this.updateLastReadAt(userId, conversationId);

    this.logger.debug(
      `chat_messages_loaded userId=${userId} conversationId=${conversationId} messages=${messages.length}`,
    );

    return messages.map((message) => this.mapMessage(message));
  }

  async markConversationRead(userId: string, conversationId: string) {
    await this.ensureParticipant(userId, conversationId);
    const readAt = await this.updateLastReadAt(userId, conversationId);
    this.logger.debug(
      `chat_mark_read userId=${userId} conversationId=${conversationId} readAt=${readAt.toISOString()}`,
    );

    return {
      success: true,
      conversationId,
      readAt,
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
  ): Promise<SendMessageResult> {
    const normalizedContent = content.trim();

    if (!normalizedContent) {
      this.logger.warn(
        `chat_send_empty_blocked userId=${userId} conversationId=${conversationId}`,
      );
      throw new BadRequestException('A mensagem nao pode estar vazia.');
    }

    const conversation = await this.ensureParticipant(userId, conversationId);
    const participantIds = conversation.participants.map(
      (participant) => participant.userId,
    );

    const message = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.chatMessage.create({
        data: {
          conversationId,
          senderId: userId,
          content: normalizedContent,
        },
        include: {
          sender: {
            include: {
              profile: true,
            },
          },
        },
      });

      await Promise.all([
        tx.chatConversation.update({
          where: {
            id: conversationId,
          },
          data: {
            lastMessageAt: createdMessage.createdAt,
          },
        }),
        tx.chatParticipant.update({
          where: {
            conversationId_userId: {
              conversationId,
              userId,
            },
          },
          data: {
            lastReadAt: createdMessage.createdAt,
          },
        }),
      ]);

      return createdMessage;
    });

    await Promise.all(
      conversation.participants
        .filter((participant) => participant.userId !== userId)
        .map((participant) =>
          this.notificationsService.create({
            userId: participant.userId,
            type: NotificationType.CHAT_MESSAGE,
            title: 'Nova mensagem no chat',
            message: `Voce recebeu uma nova mensagem sobre ${conversation.vehicle.title}.`,
            metadata: {
              conversationId,
              vehicleId: conversation.vehicle.id,
            },
          }),
        ),
    );

    this.logger.log(
      `chat_message_sent userId=${userId} conversationId=${conversationId} recipients=${participantIds.length} messageId=${message.id}`,
    );

    return {
      conversationId,
      participantIds,
      message: this.mapMessage(message),
    };
  }

  async listConversationIdsForUser(userId: string) {
    const conversations = await this.prisma.chatParticipant.findMany({
      where: {
        userId,
      },
      select: {
        conversationId: true,
      },
    });

    const ids = conversations.map(
      (conversation) => conversation.conversationId,
    );
    this.logger.debug(
      `chat_room_list userId=${userId} conversations=${ids.length}`,
    );
    return ids;
  }

  async listContactIdsForUser(userId: string) {
    const conversations = await this.prisma.chatConversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      select: {
        participants: {
          where: {
            userId: {
              not: userId,
            },
          },
          select: {
            userId: true,
          },
        },
      },
    });

    const contactIds = [
      ...new Set(
        conversations.flatMap((conversation) =>
          conversation.participants.map((participant) => participant.userId),
        ),
      ),
    ];

    this.logger.debug(
      `chat_contact_list userId=${userId} contacts=${contactIds.length}`,
    );

    return contactIds;
  }

  async assertConversationParticipant(userId: string, conversationId: string) {
    await this.ensureParticipant(userId, conversationId);
    return {
      success: true,
      conversationId,
    };
  }

  private async getConversationSummary(userId: string, conversationId: string) {
    const membership = await this.prisma.chatParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      include: {
        conversation: {
          include: {
            vehicle: {
              include: {
                images: {
                  orderBy: {
                    position: 'asc',
                  },
                  take: 1,
                },
              },
            },
            participants: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
            messages: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('Conversa nao encontrada.');
    }

    const unreadCount = await this.prisma.chatMessage.count({
      where: {
        conversationId,
        senderId: {
          not: userId,
        },
        createdAt: {
          gt: membership.lastReadAt ?? new Date(0),
        },
      },
    });

    return this.mapConversationSummary(
      membership.conversation,
      userId,
      unreadCount,
    );
  }

  private async ensureParticipant(userId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        vehicle: true,
        participants: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa nao encontrada.');
    }

    return conversation;
  }

  private async updateLastReadAt(userId: string, conversationId: string) {
    const readAt = new Date();

    await this.prisma.chatParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: readAt,
      },
    });

    return readAt;
  }

  private mapConversationSummary(
    conversation: any,
    currentUserId: string,
    unreadCount: number,
  ) {
    const otherMembership = conversation.participants.find(
      (participant: any) => participant.userId !== currentUserId,
    );
    const otherParticipant = otherMembership?.user;
    const lastMessage = conversation.messages[0] ?? null;

    return {
      id: conversation.id,
      vehicle: {
        id: conversation.vehicle.id,
        title: conversation.vehicle.title,
        coverImage: conversation.vehicle.images[0]?.url ?? null,
        city: conversation.vehicle.city,
        state: conversation.vehicle.state,
        dailyRate: conversation.vehicle.dailyRate,
      },
      otherParticipant: {
        id: otherParticipant?.id ?? '',
        email: otherParticipant?.email ?? '',
        fullName: otherParticipant?.profile?.fullName ?? null,
        avatarUrl: otherParticipant?.profile?.avatarUrl ?? null,
        isOnline: this.chatPresenceService.isUserOnline(otherParticipant?.id),
        lastReadAt: otherMembership?.lastReadAt ?? null,
      },
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            senderId: lastMessage.senderId,
          }
        : null,
      unreadCount,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
    };
  }

  private mapMessage(message: any) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      createdAt: message.createdAt,
      sender: {
        id: message.sender.id,
        email: message.sender.email,
        fullName: message.sender.profile?.fullName ?? null,
        avatarUrl: message.sender.profile?.avatarUrl ?? null,
      },
    };
  }
}
