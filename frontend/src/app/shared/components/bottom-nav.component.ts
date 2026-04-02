import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ChatInboxService } from '../../core/services/chat-inbox.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="bottom-nav">
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
    </nav>
  `,
  styleUrls: ['./bottom-nav.component.scss'],
})
export class BottomNavComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly chatInboxService = inject(ChatInboxService);
  private readonly idleScheduler = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void) => number;
    }
  ).requestIdleCallback;

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
    if (!this.authService.hasSession()) {
      return;
    }

    if (this.idleScheduler) {
      this.idleScheduler(() => {
        this.chatInboxService.ensureReady().subscribe();
      });
      return;
    }

    globalThis.setTimeout(() => {
      this.chatInboxService.ensureReady().subscribe();
    }, 1200);
  }

  protected handleItemClick(item: (typeof this.items)[number]) {
    if (item.key === 'menu') {
      this.menuToggle.emit();
      return;
    }

    if (item.key === 'host') {
      const role = this.authService.currentUser()?.role ?? this.authService.getSessionRole();
      this.router.navigateByUrl(role === 'OWNER' ? '/owner-dashboard' : item.link);
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
      return currentUrl.startsWith('/anunciar') || currentUrl.startsWith('/owner-dashboard');
    }

    return currentUrl.startsWith(item.link);
  }

  protected get unreadChatCount() {
    return this.chatInboxService.unreadCount();
  }

  protected get unreadChatBadge() {
    return this.unreadChatCount > 99 ? '99+' : String(this.unreadChatCount);
  }
}
