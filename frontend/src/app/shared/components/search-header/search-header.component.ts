import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NotificationsCenterService } from '../../../core/services/notifications-center.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-search-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './search-header.component.html',
  styleUrls: ['./search-header.component.scss'],
  host: {
    '[class.sh-host--sticky]': 'sticky',
    '[class.sh-host--sticky-actions]': 'stickyActions',
  },
})
export class SearchHeaderComponent {
  protected readonly authService = inject(AuthService);
  protected readonly notificationsService = inject(NotificationsCenterService);
  private readonly router = inject(Router);

  @Input() title = 'Escolha seu próximo carro';
  @Input() subtitle =
    'Pesquise por cidade, modelo e faixa de preço.';
  @Input() query = '';
  @Input() showFiltersAction = true;
  @Input() showNotifications = true;
  @Input() showMeta = true;
  @Input() minimal = false;
  @Input() sticky = false;
  @Input() stickyActions = false;
  @Input() inlineFilters = false;

  @Output() search = new EventEmitter<{
    q: string;
  }>();
  @Output() filters = new EventEmitter<void>();

  protected notificationsOpen = false;
  protected recentSearches: string[] = [];
  protected showRecentSearches = false;

  constructor() {
    if (this.authService.hasSession()) {
      this.notificationsService.ensureLoaded().subscribe();
    }
    this.loadRecentSearches();
  }

  submit() {
    const q = this.query.trim();
    this.saveRecentSearch(q);
    this.search.emit({ q });
    this.showRecentSearches = false;
  }

  protected removeRecentSearch(event: Event, search: string) {
    event.stopPropagation();
    this.recentSearches = this.recentSearches.filter(s => s !== search);
    localStorage.setItem('triluga_recent_searches', JSON.stringify(this.recentSearches));
  }

  protected selectRecentSearch(search: string) {
    this.query = search;
    this.submit();
  }

  private loadRecentSearches() {
    try {
      const stored = localStorage.getItem('triluga_recent_searches');
      if (stored) {
        this.recentSearches = JSON.parse(stored);
      }
    } catch {
      // ignore
    }
  }

  private saveRecentSearch(query: string) {
    if (!query) return;
    this.recentSearches = [
      query,
      ...this.recentSearches.filter(s => s !== query)
    ].slice(0, 5);
    localStorage.setItem('triluga_recent_searches', JSON.stringify(this.recentSearches));
  }

  private blurTimeout?: any;

  protected onSearchFocus() {
    if (this.blurTimeout) {
      clearTimeout(this.blurTimeout);
      this.blurTimeout = undefined;
    }
    // Recarrega sempre para garantir a versão mais recente e resolver eventuais bugs de estado visual
    this.loadRecentSearches();
    this.showRecentSearches = true;
  }

  protected onSearchBlur() {
    this.blurTimeout = setTimeout(() => {
      this.showRecentSearches = false;
      this.blurTimeout = undefined;
    }, 200);
  }

  protected toggleNotifications() {
    this.notificationsOpen = !this.notificationsOpen;

    if (this.notificationsOpen && this.authService.hasSession()) {
      this.notificationsService.ensureLoaded(true).subscribe();
    }
  }

  protected closeNotifications() {
    this.notificationsOpen = false;
  }

  protected goToLogin() {
    this.notificationsOpen = false;
    this.router.navigate(['/auth/login']);
  }

  protected markNotificationRead(notificationId: string) {
    this.notificationsService.markRead(notificationId).subscribe();
  }

  protected get unreadBadge() {
    const unreadCount = this.notificationsService.unreadCount();
    return unreadCount > 99 ? '99+' : String(unreadCount);
  }
}
