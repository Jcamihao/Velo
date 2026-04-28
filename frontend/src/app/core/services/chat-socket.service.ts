import { inject, Injectable, NgZone, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import type { Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { ChatMessage } from '../models/domain.models';
import { AppLoggerService } from './app-logger.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  private readonly authService = inject(AuthService);
  private readonly logger = inject(AppLoggerService);
  private readonly zone = inject(NgZone);

  private socket?: Socket;
  private socketBootstrapPromise: Promise<void> | null = null;
  private socketBootstrapToken = 0;
  private readonly pendingConversationJoins = new Set<string>();
  private readonly messageSubject = new Subject<ChatMessage>();
  private readonly conversationUpdatedSubject = new Subject<{
    conversationId: string;
  }>();
  private readonly presenceUpdatedSubject = new Subject<{
    userId: string;
    isOnline: boolean;
  }>();
  private readonly readReceiptSubject = new Subject<{
    conversationId: string;
    readerId: string;
    readAt: string;
  }>();
  private readonly selfPresenceSignal = signal(false);
  private readonly transportConnectedSignal = signal(false);

  readonly message$: Observable<ChatMessage> =
    this.messageSubject.asObservable();
  readonly conversationUpdated$: Observable<{ conversationId: string }> =
    this.conversationUpdatedSubject.asObservable();
  readonly presenceUpdated$: Observable<{ userId: string; isOnline: boolean }> =
    this.presenceUpdatedSubject.asObservable();
  readonly readReceipt$: Observable<{
    conversationId: string;
    readerId: string;
    readAt: string;
  }> = this.readReceiptSubject.asObservable();

  connect() {
    const token = this.authService.getAccessToken();

    if (!token) {
      this.logger.warn('chat-socket', 'connect_skipped_without_token');
      this.disconnect();
      return;
    }

    if (this.socket) {
      if (!this.socket.connected) {
        this.transportConnectedSignal.set(false);
        this.selfPresenceSignal.set(false);
        this.socket.auth = { token };
        this.logger.info('chat-socket', 'reconnect_requested');
        this.socket.connect();
      }
      return;
    }

    if (this.socketBootstrapPromise) {
      return;
    }

    this.transportConnectedSignal.set(false);
    this.selfPresenceSignal.set(false);

    const bootstrapToken = ++this.socketBootstrapToken;
    this.socketBootstrapPromise = this.bootstrapSocket(bootstrapToken);
  }

  joinConversation(conversationId: string) {
    this.connect();
    this.pendingConversationJoins.add(conversationId);
    this.logger.info('chat-socket', 'join_conversation_requested', {
      conversationId,
    });

    if (this.socket?.connected) {
      this.flushPendingConversationJoins();
    }
  }

  isConnected() {
    return this.transportConnectedSignal();
  }

  isConfirmedOnline() {
    return this.selfPresenceSignal();
  }

  disconnect() {
    this.logger.info('chat-socket', 'disconnect_requested');
    this.socketBootstrapToken += 1;
    this.socketBootstrapPromise = null;
    this.pendingConversationJoins.clear();
    this.transportConnectedSignal.set(false);
    this.selfPresenceSignal.set(false);
    this.socket?.disconnect();
    this.socket = undefined;
  }

  private async bootstrapSocket(bootstrapToken: number) {
    try {
      const { io } = await import('socket.io-client');
      const token = this.authService.getAccessToken();

      if (
        !token ||
        bootstrapToken !== this.socketBootstrapToken ||
        this.socket
      ) {
        return;
      }

      const socket = io(environment.wsBaseUrl, {
        transports: ['websocket'],
        auth: {
          token,
        },
        withCredentials: true,
      });

      this.socket = socket;
      this.bindSocketEvents(socket);
    } finally {
      if (bootstrapToken === this.socketBootstrapToken) {
        this.socketBootstrapPromise = null;
      }
    }
  }

  private bindSocketEvents(socket: Socket) {
    socket.on('connect', () => {
      this.zone.run(() => {
        this.transportConnectedSignal.set(true);
        this.logger.info('chat-socket', 'connected', {
          socketId: socket.id ?? null,
        });
        this.flushPendingConversationJoins();
      });
    });

    socket.on('disconnect', (reason) => {
      this.zone.run(() => {
        this.transportConnectedSignal.set(false);
        this.selfPresenceSignal.set(false);
        this.logger.warn('chat-socket', 'disconnected', {
          reason,
        });
      });
    });

    socket.on('connect_error', (error) => {
      this.zone.run(() => {
        this.transportConnectedSignal.set(false);
        this.selfPresenceSignal.set(false);
        this.logger.error('chat-socket', 'connect_error', {
          message: error.message,
        });
      });
    });

    socket.on('chat:error', (payload: { message?: string }) => {
      this.zone.run(() => {
        this.logger.warn('chat-socket', 'server_error', {
          message: payload?.message ?? 'Erro desconhecido',
        });
      });
    });

    socket.on('chat:presence:self', (payload: { isOnline?: boolean }) => {
      this.zone.run(() => {
        this.selfPresenceSignal.set(!!payload?.isOnline);
        this.logger.debug('chat-socket', 'self_presence_updated', {
          isOnline: !!payload?.isOnline,
        });
      });
    });

    socket.on(
      'chat:presence-updated',
      (payload: { userId?: string; isOnline?: boolean }) => {
        this.zone.run(() => {
          if (!payload?.userId) {
            return;
          }

          this.logger.debug('chat-socket', 'participant_presence_updated', {
            userId: payload.userId,
            isOnline: !!payload.isOnline,
          });
          this.presenceUpdatedSubject.next({
            userId: payload.userId,
            isOnline: !!payload.isOnline,
          });
        });
      },
    );

    socket.on('chat:message', (message: ChatMessage) => {
      this.zone.run(() => {
        this.logger.debug('chat-socket', 'message_received', {
          conversationId: message.conversationId,
          messageId: message.id,
          senderId: message.sender.id,
        });
        this.messageSubject.next(message);
      });
    });

    socket.on(
      'chat:conversation-updated',
      (payload: { conversationId: string }) => {
        this.zone.run(() => {
          this.logger.debug('chat-socket', 'conversation_updated', payload);
          this.conversationUpdatedSubject.next(payload);
        });
      },
    );

    socket.on(
      'chat:read',
      (payload: {
        conversationId?: string;
        readerId?: string;
        readAt?: string;
      }) => {
        this.zone.run(() => {
          if (!payload?.conversationId || !payload.readerId || !payload.readAt) {
            return;
          }

          this.logger.debug('chat-socket', 'read_receipt_received', payload);
          this.readReceiptSubject.next({
            conversationId: payload.conversationId,
            readerId: payload.readerId,
            readAt: payload.readAt,
          });
        });
      },
    );
  }

  private flushPendingConversationJoins() {
    if (!this.socket?.connected || !this.pendingConversationJoins.size) {
      return;
    }

    const pendingConversationIds = [...this.pendingConversationJoins];
    this.pendingConversationJoins.clear();

    pendingConversationIds.forEach((conversationId) => {
      this.socket?.emit('chat:join', { conversationId });
    });
  }
}
