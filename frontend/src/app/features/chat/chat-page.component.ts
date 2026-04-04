import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChatConversationItem,
  ChatMessage,
} from '../../core/models/domain.models';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatApiService } from '../../core/services/chat-api.service';
import { ChatInboxService } from '../../core/services/chat-inbox.service';
import { ChatSocketService } from '../../core/services/chat-socket.service';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DatePipe],
  template: `
    <main
      class="page chat-page"
      [class.chat-page--conversation]="isConversationRoute"
    >
      <section
        class="chat-shell"
        [class.chat-shell--conversation]="isConversationRoute"
        *ngIf="authService.isAuthenticated(); else guestState"
      >
        <aside class="chat-sidebar" *ngIf="!isConversationRoute; else conversationView">
          <div class="chat-sidebar__header">
            <div>
              <span class="eyebrow">Chat</span>
              <h1>Conversas</h1>
            </div>
            <span class="connection-pill" [class.connection-pill--active]="socketService.isConfirmedOnline()">
              {{ connectionStatusLabel }}
            </span>
          </div>

          <p class="chat-sidebar__hint">
            Abra uma conversa a partir da tela de um veículo para falar direto com o proprietário.
          </p>

          <div class="chat-empty" *ngIf="!isLoadingConversations && !conversations.length">
            <span class="material-icons" aria-hidden="true">forum</span>
            <strong>Nenhuma conversa ainda</strong>
            <p>Quando você falar com um anfitrião, a conversa aparece aqui.</p>
            <a class="btn btn-primary" routerLink="/search">Buscar carros</a>
          </div>

          <div class="conversation-list" *ngIf="conversations.length">
            <button
              class="conversation-card"
              type="button"
              *ngFor="let conversation of conversations"
              (click)="openConversation(conversation.id)"
            >
              <img
                class="conversation-card__image"
                [src]="conversation.otherParticipant.avatarUrl || fallbackAvatarImage"
                [alt]="conversation.otherParticipant.fullName || conversation.otherParticipant.email"
              />

              <div class="conversation-card__content">
                <div class="conversation-card__top">
                  <strong class="profile-name-text">{{ conversation.otherParticipant.fullName || conversation.otherParticipant.email }}</strong>
                  <span>{{ (conversation.lastMessageAt || conversation.updatedAt) | date: 'HH:mm' }}</span>
                </div>

                <span class="conversation-card__vehicle">{{ conversation.vehicle.title }}</span>
                <p>{{ conversation.lastMessage?.content || 'Conversa iniciada. Envie sua primeira mensagem.' }}</p>
              </div>

              <span class="conversation-card__badge" *ngIf="conversation.unreadCount">
                {{ conversation.unreadCount }}
              </span>
            </button>
          </div>
        </aside>

        <ng-template #conversationView>
          <section class="chat-thread" *ngIf="selectedConversation; else conversationFallback">
            <header class="chat-thread__header chat-thread__header--single">
              <div class="chat-thread__topbar">
                <button
                  class="chat-thread__back"
                  type="button"
                  routerLink="/chat"
                  aria-label="Voltar para conversas"
                >
                  <span class="material-icons" aria-hidden="true">arrow_back</span>
                </button>

                <a
                  class="chat-thread__identity"
                  [routerLink]="['/users', selectedConversation.otherParticipant.id]"
                  aria-label="Abrir perfil do usuário"
                >
                  <img
                    class="chat-thread__avatar"
                    [src]="selectedConversation.otherParticipant.avatarUrl || fallbackAvatarImage"
                    [alt]="selectedConversation.otherParticipant.fullName || selectedConversation.otherParticipant.email"
                  />

                  <div class="chat-thread__summary">
                    <h2 class="profile-name-text">{{ selectedConversation.otherParticipant.fullName || selectedConversation.otherParticipant.email }}</h2>
                    <p>
                      <span
                        class="chat-thread__presence"
                        [class.chat-thread__presence--online]="selectedConversation.otherParticipant.isOnline"
                      >
                        {{ selectedConversation.otherParticipant.isOnline ? 'Online' : 'Offline' }}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>{{ selectedConversation.vehicle.title }}</span>
                    </p>
                  </div>
                </a>

                <div class="chat-thread__actions">
                  <a
                    class="chat-thread__action"
                    [routerLink]="['/vehicles', selectedConversation.vehicle.id]"
                    aria-label="Abrir anúncio"
                  >
                    <span class="material-icons" aria-hidden="true">directions_car</span>
                  </a>

                  <div class="chat-thread__menu">
                    <button
                      class="chat-thread__action"
                      type="button"
                      aria-label="Mais opções"
                      (click)="toggleHeaderMenu()"
                    >
                      <span class="material-icons" aria-hidden="true">more_vert</span>
                    </button>

                    <div class="chat-thread__menu-panel" *ngIf="headerMenuOpen">
                      <a
                        [routerLink]="['/users', selectedConversation.otherParticipant.id]"
                        (click)="closeHeaderMenu()"
                      >
                        Ver perfil
                      </a>
                      <a
                        [routerLink]="['/vehicles', selectedConversation.vehicle.id]"
                        (click)="closeHeaderMenu()"
                      >
                        Abrir anúncio
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </header>

            <div
              #messagesContainer
              class="chat-thread__messages"
              *ngIf="messages.length; else noMessages"
            >
              <article
                class="message"
                *ngFor="let message of messages"
                [class.message--mine]="message.sender.id === currentUserId"
              >
                <div class="message__bubble">
                  <strong class="profile-name-text" *ngIf="message.sender.id !== currentUserId">
                    {{ message.sender.fullName || message.sender.email }}
                  </strong>
                  <p>{{ message.content }}</p>
                  <span>{{ message.createdAt | date: 'dd/MM HH:mm' }}</span>
                </div>
              </article>
            </div>

            <ng-template #noMessages>
              <div class="chat-empty chat-empty--thread">
                <span class="material-icons" aria-hidden="true">mark_chat_read</span>
                <strong>Conversa pronta</strong>
                <p>Envie a primeira mensagem para alinhar retirada, entrega ou tirar dúvidas.</p>
              </div>
            </ng-template>

            <form class="chat-composer" (ngSubmit)="sendMessage()">
              <textarea
                name="draftMessage"
                [(ngModel)]="draftMessage"
                rows="3"
                maxlength="2000"
                placeholder="Escreva sua mensagem"
                [disabled]="isSending || isLoadingMessages"
              ></textarea>

              <button class="btn btn-primary" type="submit" [disabled]="!canSendMessage">
                {{ isSending ? 'Enviando...' : 'Enviar' }}
              </button>
            </form>
          </section>

          <ng-template #conversationFallback>
            <section class="chat-thread chat-thread--empty" *ngIf="isLoadingConversations; else noSelection">
              <div class="chat-empty chat-empty--thread">
                <span class="material-icons" aria-hidden="true">hourglass_top</span>
                <strong>Carregando conversa</strong>
                <p>Estamos buscando as mensagens mais recentes para abrir esse chat.</p>
              </div>
            </section>
          </ng-template>

          <ng-template #noSelection>
            <section class="chat-thread chat-thread--empty">
              <div class="chat-empty chat-empty--thread">
                <span class="material-icons" aria-hidden="true">chat</span>
                <strong>Conversa não encontrada</strong>
                <p>Volte para a lista de conversas para escolher um chat válido.</p>
                <a class="btn btn-secondary" routerLink="/chat">Voltar para conversas</a>
              </div>
            </section>
          </ng-template>
        </ng-template>
      </section>

      <ng-template #guestState>
        <section class="guest-card glass-panel-strong" *ngIf="authService.isRestoringSession(); else loginPrompt">
          <span class="eyebrow">Chat</span>
          <h1>Restaurando sua sessão</h1>
          <p>Estamos confirmando seu login para abrir as conversas.</p>
        </section>

        <ng-template #loginPrompt>
        <section class="guest-card glass-panel-strong">
          <span class="eyebrow">Chat</span>
          <h1>Converse em tempo real com o anfitrião</h1>
          <p>
            Entre na sua conta para acompanhar conversas, combinar retirada e responder mensagens na hora.
          </p>

          <div class="guest-card__actions">
            <a class="btn btn-primary" routerLink="/auth/login">Entrar</a>
            <a class="btn btn-secondary" routerLink="/search">Buscar carros</a>
          </div>
        </section>
        </ng-template>
      </ng-template>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .chat-page {
        box-sizing: border-box;
        padding: 16px 12px 132px;
      }

      .chat-page--conversation {
        height: 100dvh;
        width: 100%;
        max-width: none;
        margin: 0;
        padding: env(safe-area-inset-top, 0px) 0 calc(env(safe-area-inset-bottom, 0px));
        background: #fff;
        overflow: hidden;
      }

      .chat-shell {
        display: grid;
        gap: 18px;
      }

      .chat-shell--conversation {
        height: 100%;
        min-height: 0;
        gap: 0;
        background: #fff;
      }

      .chat-sidebar,
      .chat-thread,
      .guest-card {
        border-radius: 24px;
      }

      .chat-sidebar {
        display: grid;
        gap: 16px;
        padding: 18px;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
      }

      .chat-sidebar__header,
      .conversation-card__top,
      .conversation-card {
        display: flex;
        align-items: center;
      }

      .chat-sidebar__header,
      .conversation-card__top {
        justify-content: space-between;
        gap: 12px;
      }

      .chat-sidebar__hint,
      .guest-card p,
      .chat-empty p,
      .conversation-card p,
      .chat-thread__summary p,
      .message__bubble span {
        color: var(--text-secondary);
      }

      .eyebrow {
        color: var(--primary);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        margin-top: 8px;
        font-size: 28px;
        line-height: 1.05;
      }

      h2 {
        font-size: 18px;
      }

      .connection-pill {
        display: inline-flex;
        align-items: center;
        min-height: 34px;
        padding: 0 14px;
        border-radius: 999px;
        background: var(--surface-muted);
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 700;
      }

      .connection-pill--active {
        background: rgba(34, 197, 94, 0.12);
        color: var(--success);
      }

      .conversation-list {
        display: grid;
        gap: 12px;
      }

      .conversation-card {
        position: relative;
        width: 100%;
        gap: 14px;
        padding: 14px;
        border: 1px solid transparent;
        border-radius: 22px;
        background: var(--surface-muted);
        text-align: left;
      }

      .conversation-card--active {
        border-color: rgba(88, 181, 158, 0.24);
        background: rgba(88, 181, 158, 0.08);
      }

      .conversation-card__image {
        width: 64px;
        height: 64px;
        object-fit: cover;
        border-radius: 20px;
        flex-shrink: 0;
        background: #fff;
      }

      .conversation-card__content {
        min-width: 0;
        flex: 1;
      }

      .conversation-card strong,
      .conversation-card__vehicle,
      .message__bubble strong {
        display: block;
      }

      .conversation-card__vehicle {
        margin-top: 4px;
        color: var(--primary);
        font-size: 12px;
        font-weight: 700;
      }

      .conversation-card p {
        margin-top: 6px;
        font-size: 13px;
        line-height: 1.4;
        display: -webkit-box;
        overflow: hidden;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .conversation-card__top span {
        font-size: 12px;
        white-space: nowrap;
      }

      .conversation-card__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        padding: 0 8px;
        border-radius: 999px;
        background: var(--primary);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }

      .chat-thread {
        display: grid;
        gap: 16px;
        min-height: 520px;
        padding: 18px;
        grid-template-rows: auto minmax(0, 1fr) auto;
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-strong);
        overflow: hidden;
      }

      .chat-page--conversation .chat-thread {
        height: 100%;
        min-height: 0;
        padding: 12px 14px 10px;
        border: 0;
        border-radius: 0;
        background: #fff;
        box-shadow: none;
      }

      .chat-thread--empty {
        grid-template-rows: minmax(0, 1fr);
      }

      .chat-thread__header {
        display: grid;
        gap: 14px;
      }

      .chat-thread__back {
        display: inline-grid;
        place-items: center;
        width: 42px;
        height: 42px;
        padding: 0;
        border: 1px solid var(--glass-border);
        border-radius: 16px;
        background: #fff;
        color: var(--text-primary);
        flex-shrink: 0;
      }

      .chat-thread__topbar {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
      }

      .chat-thread__identity {
        display: grid;
        grid-template-columns: 46px minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        min-width: 0;
        color: inherit;
        text-decoration: none;
      }

      .chat-thread__avatar {
        width: 46px;
        height: 46px;
        border-radius: 14px;
        object-fit: cover;
        background: var(--surface-muted);
      }

      .chat-thread__summary {
        display: grid;
        min-width: 0;
        gap: 2px;
      }

      .chat-thread__summary h2 {
        font-size: 16px;
        line-height: 1.15;
      }

      .chat-thread__summary p {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .chat-thread__actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .chat-thread__action {
        display: inline-grid;
        place-items: center;
        width: 36px;
        height: 36px;
        padding: 0;
        border: 0;
        border-radius: 14px;
        background: transparent;
        color: var(--primary);
        text-decoration: none;
      }

      .chat-thread__menu {
        position: relative;
      }

      .chat-thread__menu-panel {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        z-index: 3;
        min-width: 144px;
        padding: 8px;
        border: 1px solid var(--glass-border);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: var(--shadow-soft);
      }

      .chat-thread__menu-panel a {
        display: block;
        padding: 10px 12px;
        border-radius: 12px;
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
      }

      .chat-thread__presence {
        font-weight: 700;
        color: var(--text-secondary);
      }

      .chat-thread__presence--online {
        color: var(--success);
      }

      .chat-thread__messages {
        display: grid;
        gap: 12px;
        align-content: start;
        min-height: 0;
        height: 100%;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding-right: 6px;
        padding-bottom: 8px;
      }

      .message {
        display: flex;
      }

      .message--mine {
        justify-content: flex-end;
      }

      .message__bubble {
        display: grid;
        gap: 6px;
        max-width: min(88%, 420px);
        padding: 14px 16px;
        border-radius: 22px 22px 22px 8px;
        background: var(--surface-muted);
      }

      .message--mine .message__bubble {
        border-radius: 22px 22px 8px 22px;
        background: linear-gradient(180deg, #8ad8c7 0%, #58b59e 100%);
        color: #123128;
      }

      .message--mine .message__bubble span {
        color: rgba(18, 49, 40, 0.72);
      }

      .message__bubble p {
        line-height: 1.5;
        white-space: pre-wrap;
      }

      .message__bubble span {
        font-size: 11px;
      }

      .chat-composer {
        display: grid;
        gap: 12px;
        margin-top: 0;
        position: sticky;
        bottom: 0;
        z-index: 2;
        padding: 12px 0 calc(6px + env(safe-area-inset-bottom, 0px));
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.94) 26%,
          rgba(255, 255, 255, 0.98) 100%
        );
        border-top: 1px solid rgba(212, 219, 228, 0.7);
      }

      .chat-composer textarea {
        width: 100%;
        min-width: 0;
        min-height: 80px;
        max-height: 80px;
        padding: 16px 18px;
        border: 0;
        resize: none;
      }

      .chat-empty {
        display: grid;
        justify-items: start;
        gap: 8px;
        padding: 14px 0 4px;
      }

      .chat-empty .material-icons {
        width: 48px;
        height: 48px;
        border-radius: 16px;
        background: var(--surface-muted);
        color: var(--primary);
        font-size: 24px;
      }

      .chat-empty--thread {
        align-content: center;
        justify-items: center;
        height: 100%;
        text-align: center;
      }

      .chat-empty--thread .material-icons {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .guest-card {
        display: grid;
        gap: 16px;
        padding: 18px;
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-strong);
      }

      .guest-card__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }

      .guest-card__actions .btn,
      .chat-composer .btn {
        width: 100%;
      }

      .conversation-card {
        align-items: flex-start;
      }

      @media (min-width: 641px) {
        .chat-page {
          padding: 18px 16px 132px;
        }

        .chat-sidebar,
        .chat-thread,
        .guest-card {
          border-radius: 30px;
        }

        .chat-sidebar,
        .chat-thread {
          padding: 22px;
        }

        .guest-card {
          padding: 28px;
        }

        .chat-page--conversation {
          padding-bottom: calc(env(safe-area-inset-bottom, 0px));
        }

        .chat-page--conversation .chat-thread {
          padding: 18px 18px 10px;
        }

        .chat-thread__identity {
          grid-template-columns: 64px minmax(0, 1fr);
          gap: 14px;
        }

        .chat-thread__avatar {
          width: 64px;
          height: 64px;
          border-radius: 22px;
        }

        .chat-thread__summary h2 {
          font-size: 19px;
        }

        .chat-thread__action {
          width: 40px;
          height: 40px;
        }

        .guest-card__actions .btn,
        .chat-composer .btn {
          width: auto;
        }

        .conversation-card {
          align-items: center;
        }

        .chat-composer {
          padding-top: 14px;
        }

        .chat-composer textarea {
          min-height: 96px;
          max-height: 96px;
        }
      }

      @media (min-width: 1024px) {
        .chat-page {
          padding: 28px 20px 148px;
        }

        .chat-shell {
          max-width: 1120px;
          margin: 0 auto;
        }

        .chat-sidebar {
          position: sticky;
          top: 24px;
          padding: 24px;
        }

        .conversation-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .chat-page--conversation {
          padding: 24px 24px 32px;
          background: transparent;
        }

        .chat-page--conversation .chat-shell--conversation {
          max-width: 1180px;
          margin: 0 auto;
          border: 1px solid var(--glass-border);
          border-radius: 32px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: var(--shadow-strong);
          overflow: hidden;
        }

        .chat-page--conversation .chat-thread {
          padding: 22px 24px 14px;
          background: transparent;
        }
      }

    `,
  ],
})
export class ChatPageComponent {
  protected readonly authService = inject(AuthService);
  protected readonly socketService = inject(ChatSocketService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly chatApiService = inject(ChatApiService);
  private readonly chatInboxService = inject(ChatInboxService);
  private readonly logger = inject(AppLoggerService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fallbackAvatarImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' rx='40' fill='%23f3eeee'/%3E%3Ccircle cx='80' cy='60' r='24' fill='%23b7aaac'/%3E%3Cpath d='M40 128c7-22 24-34 40-34s33 12 40 34' fill='%23b7aaac'/%3E%3C/svg%3E";

  protected conversations: ChatConversationItem[] = [];
  protected messages: ChatMessage[] = [];
  protected selectedConversationId: string | null = null;
  protected draftMessage = '';
  protected isLoadingConversations = true;
  protected isLoadingMessages = false;
  protected isSending = false;
  protected headerMenuOpen = false;

  @ViewChild('messagesContainer')
  private messagesContainer?: ElementRef<HTMLDivElement>;

  private requestedConversationId: string | null = null;
  private socketEventsBound = false;

  constructor() {
    this.hydrateConversationsFromInbox();

    if (this.authService.hasSession()) {
      this.chatInboxService
        .ensureReady()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((ready) => {
          if (!ready || !this.authService.isAuthenticated()) {
            this.hydrateConversationsFromInbox();
            this.isLoadingConversations = false;
            return;
          }

          this.bootstrapAuthenticatedChat();
        });
    } else {
      this.isLoadingConversations = false;
    }

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.requestedConversationId = params.get('conversationId');

        if (!this.requestedConversationId) {
          this.selectedConversationId = null;
          this.messages = [];
          return;
        }

        if (
          this.requestedConversationId &&
          this.hasConversation(this.requestedConversationId) &&
          this.requestedConversationId !== this.selectedConversationId
        ) {
          this.selectConversation(this.requestedConversationId);
        }
      });
  }

  protected get isConversationRoute() {
    return !!this.requestedConversationId;
  }

  protected get currentUserId() {
    return this.authService.currentUser()?.id ?? '';
  }

  protected get connectionStatusLabel() {
    if (this.socketService.isConfirmedOnline()) {
      return 'Online';
    }

    return this.socketService.isConnected() ? 'Verificando' : 'Offline';
  }

  protected get selectedConversation() {
    return (
      this.conversations.find(
        (conversation) => conversation.id === this.selectedConversationId,
      ) ?? null
    );
  }

  protected get canSendMessage() {
    return (
      !!this.selectedConversationId &&
      !!this.draftMessage.trim() &&
      !this.isSending &&
      !this.isLoadingMessages
    );
  }

  protected toggleHeaderMenu() {
    this.headerMenuOpen = !this.headerMenuOpen;
  }

  protected closeHeaderMenu() {
    this.headerMenuOpen = false;
  }

  protected openConversation(conversationId: string) {
    this.router.navigate(['/chat', conversationId]);
  }

  protected selectConversation(conversationId: string) {
    if (this.selectedConversationId === conversationId && this.messages.length) {
      return;
    }

    this.logger.info('chat-page', 'conversation_selected', {
      conversationId,
    });
    this.closeHeaderMenu();
    this.selectedConversationId = conversationId;

    this.socketService.joinConversation(conversationId);
    this.zeroUnreadCount(conversationId);
    this.loadMessages(conversationId);
  }

  protected sendMessage() {
    const conversationId = this.selectedConversationId;
    const content = this.draftMessage.trim();

    if (!conversationId || !content) {
      this.logger.warn('chat-page', 'send_message_blocked', {
        conversationId,
        hasContent: !!content,
      });
      return;
    }

    this.logger.info('chat-page', 'send_message_requested', {
      conversationId,
      length: content.length,
    });
    this.isSending = true;

    this.chatApiService
      .sendMessage(conversationId, content)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (message) => {
          this.appendMessage(message);
          this.draftMessage = '';
          this.isSending = false;
          this.logger.info('chat-page', 'send_message_succeeded', {
            conversationId,
            messageId: message.id,
          });
          this.refreshConversations(conversationId);
        },
        error: (error) => {
          this.isSending = false;
          this.logger.error('chat-page', 'send_message_failed', {
            conversationId,
            message: error?.message ?? 'Erro desconhecido',
          });
        },
      });
  }

  private bindSocketEvents() {
    if (this.socketEventsBound) {
      return;
    }

    this.socketEventsBound = true;

    this.socketService.message$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => {
        if (message.conversationId === this.selectedConversationId) {
          this.appendMessage(message);
          this.zeroUnreadCount(message.conversationId);
          this.chatApiService
            .markAsRead(message.conversationId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
        }

        this.logger.debug('chat-page', 'socket_message_applied', {
          conversationId: message.conversationId,
          messageId: message.id,
        });
        this.refreshConversations(message.conversationId);
      });

    this.socketService.conversationUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        if (payload.conversationId === this.selectedConversationId) {
          this.loadMessages(payload.conversationId, { silent: true });
        }

        this.refreshConversations(payload.conversationId);
      });
  }

  private loadConversations(preferredConversationId?: string) {
    this.isLoadingConversations = true;
    this.hydrateConversationsFromInbox(preferredConversationId);

    this.chatApiService
      .getMyConversations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversations) => {
          this.chatInboxService.syncConversations(conversations);
          this.applyConversations(conversations, preferredConversationId);
          this.isLoadingConversations = false;
        },
        error: (error) => {
          this.logger.warn('chat-page', 'load_conversations_failed', {
            message: error?.message ?? 'Erro desconhecido',
          });
          this.hydrateConversationsFromInbox(preferredConversationId);
          this.isLoadingConversations = false;
        },
      });
  }

  private loadMessages(
    conversationId: string,
    options?: { silent?: boolean },
  ) {
    const silent = options?.silent ?? false;

    if (!silent) {
      this.isLoadingMessages = true;
    }

    this.chatApiService
      .getMessages(conversationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (messages) => {
          if (this.selectedConversationId !== conversationId) {
            if (!silent) {
              this.isLoadingMessages = false;
            }
            return;
          }

          this.messages = messages;
          this.zeroUnreadCount(conversationId);
          this.chatInboxService.syncConversations(this.conversations);
          this.scrollMessagesToBottom(silent ? 'smooth' : 'auto');
          if (!silent) {
            this.isLoadingMessages = false;
          }
        },
        error: (error) => {
          this.logger.warn('chat-page', 'load_messages_failed', {
            conversationId,
            message: error?.message ?? 'Erro desconhecido',
          });
          if (!silent) {
            this.isLoadingMessages = false;
          }
        },
      });
  }

  private refreshConversations(preferredConversationId?: string) {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.chatApiService
      .getMyConversations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversations) => {
          this.chatInboxService.syncConversations(conversations);
          this.applyConversations(conversations, preferredConversationId);
        },
        error: (error) => {
          this.logger.warn('chat-page', 'refresh_conversations_failed', {
            message: error?.message ?? 'Erro desconhecido',
          });
          this.hydrateConversationsFromInbox(preferredConversationId);
        },
      });
  }

  private appendMessage(message: ChatMessage) {
    if (this.messages.some((currentMessage) => currentMessage.id === message.id)) {
      return;
    }

    this.messages = [...this.messages, message];
    this.scrollMessagesToBottom('smooth');
  }

  private scrollMessagesToBottom(behavior: ScrollBehavior) {
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        const container = this.messagesContainer?.nativeElement;

        if (!container) {
          return;
        }

        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      });
    });
  }

  private zeroUnreadCount(conversationId: string) {
    this.conversations = this.conversations.map((conversation) =>
      conversation.id === conversationId
        ? {
            ...conversation,
            unreadCount: 0,
          }
        : conversation,
    );
  }

  private bootstrapAuthenticatedChat() {
    this.socketService.connect();
    this.bindSocketEvents();
    this.loadConversations(this.requestedConversationId ?? undefined);
  }

  private hydrateConversationsFromInbox(preferredConversationId?: string) {
    const inboxConversations = this.chatInboxService.conversations();

    if (!inboxConversations.length) {
      return false;
    }

    this.applyConversations(inboxConversations, preferredConversationId);
    return true;
  }

  private applyConversations(
    conversations: ChatConversationItem[],
    preferredConversationId?: string,
  ) {
    this.conversations = [...conversations];

    if (!this.isConversationRoute) {
      this.selectedConversationId = null;
      this.messages = [];
      return;
    }

    const targetConversationId =
      this.requestedConversationId ??
      preferredConversationId ??
      this.selectedConversationId ??
      null;

    if (!targetConversationId || !this.hasConversation(targetConversationId)) {
      this.selectedConversationId = null;
      this.messages = [];
      return;
    }

    this.selectConversation(targetConversationId);
  }

  private hasConversation(conversationId: string) {
    return this.conversations.some(
      (conversation) => conversation.id === conversationId,
    );
  }
}
