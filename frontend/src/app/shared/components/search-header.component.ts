import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NotificationsCenterService } from '../../core/services/notifications-center.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-search-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="search-header">
      <div class="search-header__nav-shell">
        <header class="search-header__nav">
          <a
            class="search-header__brand"
            routerLink="/"
            aria-label="Ir para a Home da Velo"
          >
            <img src="assets/logo_velo.png" alt="Velo" />
          </a>

          <form class="search-header__searchbar" (ngSubmit)="submit()">
            <span class="material-icons" aria-hidden="true">search</span>
            <input
              name="query"
              [(ngModel)]="query"
              placeholder="Buscar anúncio, marca ou cidade"
            />
          </form>

          <button
            type="button"
            class="search-header__notifications-trigger"
            aria-label="Abrir notificações"
            (click)="toggleNotifications()"
          >
            <span class="material-icons" aria-hidden="true">notifications</span>

            <span class="search-header__notifications-badge" *ngIf="notificationsService.unreadCount()">
              {{ unreadBadge }}
            </span>
          </button>
        </header>

        <div class="search-header__copy" *ngIf="title || subtitle">
          <span class="search-header__eyebrow">Velo</span>
          <h1>{{ title }}</h1>
          <p *ngIf="subtitle">{{ subtitle }}</p>
        </div>
      </div>

      <div class="notifications-overlay" *ngIf="notificationsOpen">
        <button
          type="button"
          class="notifications-overlay__backdrop"
          (click)="closeNotifications()"
          aria-label="Fechar notificações"
        ></button>

        <aside class="notifications-drawer">
          <header class="notifications-drawer__head">
            <div>
              <span class="search-header__eyebrow">Notificações</span>
              <h2>Central de avisos</h2>
            </div>

            <button
              type="button"
              class="notifications-drawer__close material-icons"
              (click)="closeNotifications()"
              aria-label="Fechar notificações"
            >
              close
            </button>
          </header>

          <p class="notifications-drawer__summary" *ngIf="authService.hasSession()">
            {{ notificationsService.unreadCount() }} não lidas
          </p>

          <section class="notifications-drawer__empty" *ngIf="!authService.hasSession()">
            <strong>Entre para acompanhar suas notificações</strong>
            <p>Atualizações de reserva, chat e status dos seus anúncios vão aparecer aqui.</p>
            <button type="button" class="btn btn-primary" (click)="goToLogin()">Entrar</button>
          </section>

          <p class="notifications-drawer__state" *ngIf="authService.hasSession() && notificationsService.loading()">
            Carregando notificações...
          </p>

          <p
            class="notifications-drawer__state"
            *ngIf="
              authService.hasSession() &&
              !notificationsService.loading() &&
              !notificationsService.notifications().length
            "
          >
            Nenhuma notificação por enquanto.
          </p>

          <div
            class="notifications-drawer__list"
            *ngIf="
              authService.hasSession() &&
              !notificationsService.loading() &&
              notificationsService.notifications().length
            "
          >
            <article
              class="notifications-drawer__item"
              *ngFor="let notification of notificationsService.notifications()"
              [class.notifications-drawer__item--unread]="!notification.isRead"
            >
              <div>
                <strong>{{ notification.title }}</strong>
                <p>{{ notification.message }}</p>
                <small>{{ notification.createdAt | date: 'dd/MM HH:mm' }}</small>
              </div>

              <button
                *ngIf="!notification.isRead"
                type="button"
                class="btn btn-secondary"
                (click)="markNotificationRead(notification.id)"
              >
                Marcar como lida
              </button>
            </article>
          </div>
        </aside>
      </div>
    </section>
  `,
  styles: [
    `
      .search-header {
        display: block;
      }

      .search-header__nav-shell {
        position: relative;
        overflow: hidden;
        display: grid;
        gap: 16px;
        width: 100%;
        padding: 16px 14px 20px;
        border-radius: 24px;
        background: linear-gradient(180deg, #473d3e 0%, #362e2f 100%);
        box-shadow: 0 26px 48px rgba(20, 11, 11, 0.24);
      }

      .search-header__nav-shell::before,
      .search-header__nav-shell::after {
        content: '';
        position: absolute;
        background: linear-gradient(180deg, #ff5b45 0%, #ff2f22 100%);
        pointer-events: none;
      }

      .search-header__nav-shell::before {
        top: -20px;
        right: -22px;
        width: 146px;
        height: 104px;
        border-radius: 0 0 0 88px;
        transform: rotate(-7deg);
      }

      .search-header__nav-shell::after {
        left: -28px;
        bottom: 56px;
        width: 96px;
        height: 36px;
        border-radius: 0 20px 20px 0;
        transform: rotate(-6deg);
      }

      .search-header__nav {
        display: grid;
        grid-template-columns: 54px minmax(0, 1fr) 54px;
        align-items: center;
        gap: 8px;
        width: 100%;
        margin: 0 auto;
        position: relative;
        z-index: 1;
      }

      .search-header__brand {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 54px;
        height: 54px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 16px 28px rgba(28, 17, 18, 0.14);
      }

      .search-header__brand img {
        width: 42px;
        height: 42px;
        object-fit: contain;
      }

      .search-header__searchbar {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        min-width: 0;
        min-height: 54px;
        padding: 0 12px;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: 0 16px 28px rgba(28, 17, 18, 0.12);
        overflow: hidden;
      }

      .search-header__searchbar .material-icons {
        color: var(--primary);
        font-size: 22px;
      }

      .search-header__searchbar input {
        width: 100%;
        min-width: 0;
        height: 100%;
        border: 0;
        outline: 0;
        border-radius: 0;
        padding: 0;
        background: transparent;
        box-shadow: none;
        font: inherit;
        font-size: 15px;
        color: var(--text-primary);
      }

      .search-header__searchbar input::placeholder {
        color: var(--text-secondary);
      }

      .search-header__notifications-trigger {
        position: relative;
        display: inline-grid;
        place-items: center;
        width: 54px;
        height: 54px;
        border: 0;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.98);
        color: var(--primary);
        box-shadow: 0 16px 28px rgba(28, 17, 18, 0.14);
        overflow: hidden;
      }

      .search-header__notifications-trigger .material-icons {
        font-size: 22px;
      }

      .search-header__notifications-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 999px;
        background: var(--error);
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        line-height: 18px;
      }

      .search-header__copy {
        display: grid;
        gap: 8px;
        position: relative;
        z-index: 1;
        padding: 2px 2px 0;
      }

      .search-header__eyebrow {
        display: inline-flex;
        width: fit-content;
        padding: 7px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: rgba(255, 255, 255, 0.92);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        max-width: 13ch;
        font-size: 29px;
        line-height: 0.98;
        color: #fff;
      }

      p {
        margin: 0;
        max-width: 31ch;
        color: rgba(255, 255, 255, 0.76);
        font-size: 13px;
      }

      .notifications-overlay {
        position: fixed;
        inset: 0;
        z-index: 60;
      }

      .notifications-overlay__backdrop {
        position: absolute;
        inset: 0;
        border: 0;
        background: rgba(15, 23, 42, 0.24);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
      }

      .notifications-drawer {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(100vw, 100vw);
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: 16px;
        padding: 22px 16px 28px;
        background: rgba(255, 255, 255, 0.99);
        border-left: 1px solid var(--glass-border);
        box-shadow: -20px 0 40px rgba(90, 115, 145, 0.12);
      }

      .notifications-drawer__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .notifications-drawer__head h2,
      .notifications-drawer__head p,
      .notifications-drawer__item strong,
      .notifications-drawer__item p,
      .notifications-drawer__item small {
        margin: 0;
      }

      .notifications-drawer__close {
        display: inline-grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 14px;
        background: var(--surface-muted);
        color: var(--text-primary);
      }

      .notifications-drawer__summary,
      .notifications-drawer__state {
        margin: 0;
        color: var(--text-secondary);
      }

      .notifications-drawer__empty {
        display: grid;
        gap: 10px;
        align-content: start;
        padding: 18px;
        border-radius: 22px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .notifications-drawer__empty strong,
      .notifications-drawer__empty p {
        margin: 0;
      }

      .notifications-drawer__empty p {
        color: var(--text-secondary);
      }

      .notifications-drawer__list {
        display: grid;
        align-content: start;
        gap: 12px;
        overflow-y: auto;
        padding-right: 4px;
      }

      .notifications-drawer__item {
        display: grid;
        gap: 12px;
        padding: 16px;
        border-radius: 20px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .notifications-drawer__item p,
      .notifications-drawer__item small {
        color: var(--text-secondary);
      }

      .notifications-drawer__item small {
        display: inline-block;
        margin-top: 8px;
      }

      .notifications-drawer__item--unread {
        border-color: rgba(31, 140, 255, 0.2);
        box-shadow: inset 0 0 0 1px rgba(31, 140, 255, 0.08);
      }

      @media (min-width: 481px) {
        .search-header__nav-shell {
          gap: 18px;
          padding: 18px 16px 24px;
          border-radius: 28px;
        }

        .search-header__nav {
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 14px;
        }

        .search-header__brand,
        .search-header__notifications-trigger {
          width: 64px;
          height: 64px;
          border-radius: 18px;
        }

        .search-header__brand img {
          width: 52px;
          height: 52px;
        }

        .search-header__searchbar {
          gap: 10px;
          min-height: 64px;
          padding: 0 18px;
          border-radius: 18px;
        }

        .search-header__searchbar input {
          font-size: 16px;
        }

        .search-header__notifications-trigger .material-icons {
          font-size: 24px;
        }

        .search-header__copy {
          padding: 2px 4px 0;
        }

        h1 {
          font-size: 34px;
        }

        p {
          font-size: 14px;
        }

        .notifications-drawer {
          width: min(92vw, 388px);
          padding: 24px 18px 32px;
        }
      }

      @media (min-width: 960px) {
        .search-header__nav-shell {
          gap: 24px;
          padding: 24px 26px 30px;
          border-radius: 34px;
        }

        .search-header__nav {
          gap: 16px;
        }

        .search-header__brand,
        .search-header__notifications-trigger {
          width: 72px;
          height: 72px;
          border-radius: 22px;
        }

        .search-header__brand img {
          width: 58px;
          height: 58px;
        }

        .search-header__searchbar {
          min-height: 72px;
          padding: 0 22px;
          border-radius: 22px;
        }

        .search-header__copy {
          gap: 10px;
          padding: 6px 6px 0;
        }

        h1 {
          max-width: 16ch;
          font-size: clamp(40px, 4.2vw, 56px);
        }

        p {
          max-width: 56ch;
          font-size: 15px;
        }

        .notifications-drawer {
          width: min(420px, calc(100vw - 56px));
          padding: 28px 22px 32px;
        }
      }
    `,
  ],
})
export class SearchHeaderComponent {
  protected readonly authService = inject(AuthService);
  protected readonly notificationsService = inject(NotificationsCenterService);
  private readonly router = inject(Router);

  @Input() title = 'Encontre um veículo em poucos cliques';
  @Input() subtitle =
    'Pesquise por cidade, período e preço com a mesma agilidade de um app.';
  @Input() query = '';
  @Input() startDate = '';
  @Input() endDate = '';

  @Output() search = new EventEmitter<{
    q: string;
  }>();
  @Output() filters = new EventEmitter<void>();

  protected notificationsOpen = false;

  constructor() {
    if (this.authService.hasSession()) {
      this.notificationsService.ensureLoaded().subscribe();
    }
  }

  get activeFiltersLabel() {
    const period = [this.startDate, this.endDate].filter(Boolean);

    if (!period.length) {
      return '';
    }

    return `Período: ${period.join(' até ')}`;
  }

  submit() {
    this.search.emit({
      q: this.query.trim(),
    });
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
