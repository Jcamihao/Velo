import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ChatPresenceService } from './chat-presence.service';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayConnection<Socket>, OnGatewayDisconnect<Socket>
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly chatPresenceService: ChatPresenceService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        throw new Error('Token ausente.');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      client.data.user = payload;
      this.logger.log(
        `socket_connected socketId=${client.id} userId=${payload.sub}`,
      );

      client.join(this.getUserRoom(payload.sub));

      const conversationIds = await this.chatService.listConversationIdsForUser(
        payload.sub,
      );

      conversationIds.forEach((conversationId) => {
        client.join(this.getConversationRoom(conversationId));
      });

      const becameOnline = this.chatPresenceService.registerConnection(
        payload.sub,
        client.id,
      );

      client.emit('chat:presence:self', {
        isOnline: this.chatPresenceService.isUserOnline(payload.sub),
      });

      if (becameOnline) {
        await this.broadcastPresence(payload.sub, true);
      }

      this.logger.debug(
        `socket_rooms_bound socketId=${client.id} userId=${payload.sub} conversations=${conversationIds.length}`,
      );
    } catch (error) {
      this.logger.warn(`Conexao de chat recusada: ${client.id}`);
      client.emit('chat:error', { message: 'Nao autorizado.' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as AuthenticatedUser | undefined;

    if (user) {
      const wentOffline = this.chatPresenceService.unregisterConnection(
        user.sub,
        client.id,
      );

      if (wentOffline) {
        void this.broadcastPresence(user.sub, false);
      }
    }

    this.logger.log(
      `socket_disconnected socketId=${client.id} userId=${user?.sub ?? 'anonymous'}`,
    );
  }

  async broadcastMessage(result: {
    conversationId: string;
    participantIds: string[];
    message: any;
  }) {
    this.logger.log(
      `socket_broadcast_message conversationId=${result.conversationId} recipients=${result.participantIds.length}`,
    );
    result.participantIds.forEach((participantId) => {
      this.server
        .to(this.getUserRoom(participantId))
        .emit('chat:message', result.message);

      this.server
        .to(this.getUserRoom(participantId))
        .emit('chat:conversation-updated', {
          conversationId: result.conversationId,
        });
    });
  }

  broadcastReadReceipt(payload: {
    conversationId: string;
    readerId: string;
    readAt: Date;
  }) {
    this.server.to(this.getConversationRoom(payload.conversationId)).emit(
      'chat:read',
      {
        conversationId: payload.conversationId,
        readerId: payload.readerId,
        readAt: payload.readAt,
      },
    );
  }

  @SubscribeMessage('chat:join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string },
  ) {
    const user = this.getAuthenticatedUser(client);
    const conversationId = body?.conversationId;

    if (!conversationId) {
      throw new WsException('Conversa invalida.');
    }

    await this.chatService.assertConversationParticipant(
      user.sub,
      conversationId,
    );

    client.join(this.getConversationRoom(conversationId));
    this.logger.debug(
      `socket_join_conversation socketId=${client.id} userId=${user.sub} conversationId=${conversationId}`,
    );

    return {
      ok: true,
      conversationId,
    };
  }

  @SubscribeMessage('chat:send')
  async handleSend(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId?: string; content?: string },
  ) {
    const user = this.getAuthenticatedUser(client);
    const conversationId = body?.conversationId;
    const content = body?.content ?? '';

    if (!conversationId) {
      throw new WsException('Conversa invalida.');
    }

    try {
      this.logger.debug(
        `socket_send_attempt socketId=${client.id} userId=${user.sub} conversationId=${conversationId}`,
      );
      const result = await this.chatService.sendMessage(
        user.sub,
        conversationId,
        content,
      );

      await this.broadcastMessage(result);

      return result.message;
    } catch (error) {
      throw new WsException(
        error instanceof Error ? error.message : 'Nao foi possivel enviar.',
      );
    }
  }

  private extractToken(client: Socket) {
    const authToken =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : null;
    const authorizationHeader = client.handshake.headers.authorization;

    if (authToken) {
      return authToken;
    }

    if (
      typeof authorizationHeader === 'string' &&
      authorizationHeader.startsWith('Bearer ')
    ) {
      return authorizationHeader.slice(7);
    }

    return null;
  }

  private getAuthenticatedUser(client: Socket): AuthenticatedUser {
    const user = client.data.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new WsException('Nao autorizado.');
    }

    return user;
  }

  private getConversationRoom(conversationId: string) {
    return `chat:${conversationId}`;
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  private async broadcastPresence(userId: string, isOnline: boolean) {
    const contactIds = await this.chatService.listContactIdsForUser(userId);

    this.server.to(this.getUserRoom(userId)).emit('chat:presence:self', {
      isOnline,
    });

    contactIds.forEach((contactId) => {
      this.server
        .to(this.getUserRoom(contactId))
        .emit('chat:presence-updated', {
          userId,
          isOnline,
        });
    });

    this.logger.debug(
      `socket_presence_broadcast userId=${userId} isOnline=${isOnline} recipients=${contactIds.length}`,
    );
  }
}
