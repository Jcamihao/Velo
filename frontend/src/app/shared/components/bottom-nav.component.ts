import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ChatInboxService } from '../../core/services/chat-inbox.service';
import { AppLoggerService } from '../../core/services/app-logger.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav
      class="bottom-nav"
      [style.--nav-count]="items.length"
      [style.--active-index]="activeIndex()"
    >
      <div class="bottom-nav__track">
        <span class="bottom-nav__indicator" aria-hidden="true"></span>

        <button
          type="button"
          *ngFor="let item of items"
          [class.is-active]="isItemActive(item)"
          [attr.aria-label]="item.label"
          [attr.title]="item.label"
          (click)="handleItemClick(item)"
        >
          <span class="nav-icon-wrap">
            <span class="nav-icon material-icons" aria-hidden="true">{{ item.icon }}</span>
            <span
              class="nav-badge"
              *ngIf="item.key === 'chat' && unreadChatCount"
            >
              {{ unreadChatBadge }}
            </span>
          </span>

          <span class="nav-label">{{ item.label }}</span>
        </button>
      </div>
    </nav>
  `,
  styleUrls: ['./bottom-nav.component.scss'],
})
export class BottomNavComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly chatInboxService = inject(ChatInboxService);
  private readonly logger = inject(AppLoggerService);
  private readonly idleScheduler = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void) => number;
    }
  ).requestIdleCallback;
  private inboxWarmupScheduled = false;

  @Input() menuOpen = false;
  @Output() menuToggle = new EventEmitter<void>();

  protected readonly items = [
    { key: 'home', label: 'Início', link: '/', icon: 'home' },
    { key: 'search', label: 'Buscar', link: '/search', icon: 'search' },
    { key: 'host', label: 'Anunciar', link: '/anunciar', icon: 'add_circle' },
    { key: 'chat', label: 'Chat', link: '/chat', icon: 'chat_bubble_outline' },
    { key: 'menu', label: 'Menu', icon: 'menu' },
  ] as const;

  constructor() {
    effect(() => {
      if (!this.authService.hasSession()) {
        this.inboxWarmupScheduled = false;
        return;
      }

      if (this.inboxWarmupScheduled) {
        return;
      }

      this.inboxWarmupScheduled = true;
      this.scheduleInboxWarmup();
    });
  }

  private scheduleInboxWarmup() {
    if (this.idleScheduler) {
      this.idleScheduler(() => {
        this.warmupInbox();
      });
      return;
    }

    globalThis.setTimeout(() => {
      this.warmupInbox();
    }, 1200);
  }

  private warmupInbox() {
    try {
      this.chatInboxService
        .ensureReady()
        .pipe(
          catchError((error) => {
            this.logger.warn('bottom-nav', 'chat_inbox_warmup_failed', {
              message: error?.message ?? 'Erro desconhecido',
            });
            return of(false);
          }),
        )
        .subscribe();
    } catch (error) {
      this.logger.warn('bottom-nav', 'chat_inbox_warmup_failed_sync', {
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  protected handleItemClick(item: (typeof this.items)[number]) {
    if (item.key === 'menu') {
      this.menuToggle.emit();
      return;
    }

    if (item.key === 'host') {
      this.router.navigateByUrl(
        this.authService.hasSession() ? '/anunciar-carro' : item.link,
      );
      return;
    }

    this.router.navigateByUrl(item.link);
  }

  protected isItemActive(item: (typeof this.items)[number]) {
    const currentUrl = this.router.url;

    if (item.key === 'menu') {
      return this.menuOpen;
    }

    if (item.key === 'home') {
      return currentUrl === '/';
    }

    if (item.key === 'host') {
      return currentUrl.startsWith('/anunciar');
    }

    return currentUrl.startsWith(item.link);
  }

  protected activeIndex() {
    const activeIndex = this.items.findIndex((item) => this.isItemActive(item));
    return activeIndex === -1 ? 0 : activeIndex;
  }

  protected get unreadChatCount() {
    return this.chatInboxService.unreadCount();
  }

  protected get unreadChatBadge() {
    return this.unreadChatCount > 99 ? '99+' : String(this.unreadChatCount);
  }
}
