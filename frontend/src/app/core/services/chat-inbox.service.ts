import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { finalize, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ChatConversationItem } from '../models/domain.models';
import { AppLoggerService } from './app-logger.service';
import { AuthService } from './auth.service';
import { ChatApiService } from './chat-api.service';
import { ChatSocketService } from './chat-socket.service';

@Injectable({ providedIn: 'root' })
export class ChatInboxService {
  private readonly authService = inject(AuthService);
  private readonly chatApiService = inject(ChatApiService);
  private readonly chatSocketService = inject(ChatSocketService);
  private readonly logger = inject(AppLoggerService);

  private readonly conversationsSignal = signal<ChatConversationItem[]>([]);
  private initialized = false;
  private refreshing = false;

  readonly conversations = computed(() => this.conversationsSignal());
  readonly unreadCount = computed(() =>
    this.conversationsSignal().reduce(
      (total, conversation) => total + conversation.unreadCount,
      0,
    ),
  );

  constructor() {
    effect(
      () => {
        if (!this.authService.hasSession()) {
          this.clear();
        }
      },
      { allowSignalWrites: true },
    );

    this.chatSocketService.conversationUpdated$.subscribe(() => {
      if (this.initialized) {
        this.refresh();
      }
    });

    this.chatSocketService.message$.subscribe(() => {
      if (this.initialized) {
        this.refresh();
      }
    });

    this.chatSocketService.presenceUpdated$.subscribe((payload) => {
      if (this.initialized) {
        this.updateParticipantPresence(payload.userId, payload.isOnline);
      }
    });
  }

  ensureReady() {
    if (!this.authService.hasSession()) {
      this.clear();
      return of(false);
    }

    if (!this.authService.isAuthenticated()) {
      return this.authService.restoreSession().pipe(
        tap((authenticated) => {
          if (!authenticated) {
            this.clear();
            return;
          }

          this.bootstrap();
        }),
      );
    }

    this.bootstrap();
    return of(true);
  }

  refresh() {
    if (this.refreshing) {
      return;
    }

    if (!this.authService.hasSession()) {
      this.clear();
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.ensureReady().subscribe();
      return;
    }

    this.refreshing = true;
    this.chatSocketService.connect();

    this.chatApiService
      .getMyConversations()
      .pipe(
        finalize(() => {
          this.refreshing = false;
        }),
      )
      .subscribe({
        next: (conversations) => {
          this.syncConversations(conversations);
        },
        error: (error) => {
          this.logger.warn('chat-inbox', 'refresh_failed', {
            message: error?.message ?? 'Erro desconhecido',
          });
        },
      });
  }

  syncConversations(conversations: ChatConversationItem[]) {
    this.conversationsSignal.set([...conversations]);
    this.initialized = true;
  }

  findConversation(vehicleId: string, ownerId: string | null) {
    return (
      this.conversationsSignal().find(
        (conversation) =>
          conversation.vehicle.id === vehicleId &&
          conversation.otherParticipant.id === ownerId,
      ) ?? null
    );
  }

  private bootstrap() {
    this.chatSocketService.connect();

    if (!this.initialized) {
      this.refresh();
    }
  }

  private clear() {
    this.conversationsSignal.set([]);
    this.initialized = false;
    this.refreshing = false;
  }

  private updateParticipantPresence(userId: string, isOnline: boolean) {
    this.conversationsSignal.update((conversations) =>
      conversations.map((conversation) =>
        conversation.otherParticipant.id === userId
          ? {
              ...conversation,
              otherParticipant: {
                ...conversation.otherParticipant,
                isOnline,
              },
            }
          : conversation,
      ),
    );
  }
}
