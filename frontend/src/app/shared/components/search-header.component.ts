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
    <section class="search-header" [class.search-header--minimal]="minimal">
      <div class="search-header__nav-shell">
        <div class="search-header__signals" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </div>

        <header class="search-header__nav">
          <a
            class="search-header__brand"
            routerLink="/"
            aria-label="Ir para a Home da Triluga"
          >
            <span class="search-header__brand-mark">
              <img src="assets/branding/triluga-mark.svg" alt="Triluga" />
            </span>
          </a>

          <form class="search-header__searchbar" (ngSubmit)="submit()">
            <span class="material-icons" aria-hidden="true">travel_explore</span>
            <input
              name="query"
              [(ngModel)]="query"
              placeholder="Buscar anúncio, marca ou cidade"
            />
            <button *ngIf="!minimal" type="submit" class="search-header__search-submit">
              Buscar
            </button>
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

        <div class="search-header__copy" *ngIf="!minimal && (title || subtitle)">
          <div class="search-header__copy-top">
            <span class="search-header__eyebrow">Linha de saída</span>

            <button
              *ngIf="showFiltersAction"
              type="button"
              class="search-header__filters-link"
              (click)="filters.emit()"
            >
              Tunar busca
            </button>
          </div>

          <h1>{{ title }}</h1>
          <p *ngIf="subtitle">{{ subtitle }}</p>

          <div class="search-header__meta" *ngIf="showMeta">
            <span *ngIf="query">Termo: {{ query }}</span>
            <span *ngIf="activeFiltersLabel">{{ activeFiltersLabel }}</span>
            <span *ngIf="!query && !activeFiltersLabel">Explore por cidade, estilo ou período</span>
          </div>
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
        gap: 20px;
        width: 100%;
        padding: calc(16px + env(safe-area-inset-top, 0px)) 12px 22px;
        border: 1px solid rgba(103, 203, 176, 0.12);
        border-radius: 32px;
        background:
          linear-gradient(135deg, rgba(88, 181, 158, 0.1), transparent 44%),
          radial-gradient(circle at top right, rgba(88, 181, 158, 0.14), transparent 34%),
          linear-gradient(180deg, #fbfdfc 0%, #eef5f2 100%);
        box-shadow: 0 32px 60px rgba(29, 41, 37, 0.12);
      }

      .search-header__signals {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .search-header__signals span {
        position: absolute;
        border-radius: 999px;
        background: linear-gradient(90deg, transparent, rgba(103, 203, 176, 0.34), transparent);
      }

      .search-header__signals span:nth-child(1) {
        top: 24px;
        right: -24px;
        width: 156px;
        height: 2px;
        transform: rotate(-12deg);
      }

      .search-header__signals span:nth-child(2) {
        left: -22px;
        bottom: 70px;
        width: 124px;
        height: 2px;
        transform: rotate(14deg);
      }

      .search-header__signals span:nth-child(3) {
        right: 60px;
        bottom: 20px;
        width: 88px;
        height: 88px;
        border: 1px solid rgba(103, 203, 176, 0.16);
        background: transparent;
        opacity: 0.6;
      }

      .search-header__nav {
        display: grid;
        gap: 10px;
        position: relative;
        z-index: 1;
      }

      .search-header--minimal .search-header__nav-shell {
        gap: 0;
        padding-bottom: 14px;
      }

      .search-header--minimal .search-header__nav {
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
      }

      .search-header--minimal .search-header__brand-mark {
        width: clamp(42px, 8vw, 54px);
      }

      .search-header--minimal .search-header__brand-copy {
        display: none;
      }

      .search-header__brand {
        display: inline-flex;
        align-items: center;
        gap: 0;
        width: fit-content;
        min-width: 0;
        color: var(--text-primary);
        text-decoration: none;
      }

      .search-header__brand-mark {
        display: inline-flex;
        align-items: center;
        justify-content: flex-start;
        width: clamp(48px, 9vw, 64px);
        height: auto;
        min-width: 0;
        flex: 0 1 auto;
      }

      .search-header__brand-mark img {
        width: 100%;
        height: auto;
        display: block;
        object-fit: contain;
        object-position: left center;
        filter: drop-shadow(0 14px 20px rgba(50, 128, 106, 0.16));
      }

      .search-header__searchbar {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        min-width: 0;
        min-height: 62px;
        padding: 0 14px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.82);
        border: 1px solid rgba(103, 203, 176, 0.14);
        box-shadow: none;
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
        color: var(--text-primary);
        font-size: 13px;
      }

      .search-header__searchbar input::placeholder {
        color: var(--text-secondary);
      }

      .search-header__search-submit {
        display: none;
        align-items: center;
        justify-content: center;
        min-width: 118px;
        min-height: 44px;
        padding: 0 18px;
        border: 0;
        border-radius: 999px;
        background: linear-gradient(135deg, #8ad8c7 0%, #58b59e 100%);
        color: #0b110d;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 12px 24px rgba(88, 181, 158, 0.18);
      }

      .search-header__notifications-trigger {
        position: relative;
        display: inline-grid;
        place-items: center;
        width: 58px;
        height: 58px;
        border: 1px solid rgba(103, 203, 176, 0.14);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.84);
        color: var(--text-primary);
        box-shadow: none;
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
        position: relative;
        z-index: 1;
        display: grid;
        gap: 10px;
        min-width: 0;
      }

      .search-header__copy-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .search-header__eyebrow {
        display: inline-flex;
        width: fit-content;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(88, 181, 158, 0.1);
        border: 1px solid rgba(103, 203, 176, 0.14);
        color: #427a6d;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .search-header__filters-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        padding: 0 14px;
        border: 1px solid rgba(103, 203, 176, 0.14);
        border-radius: 999px;
        background: rgba(88, 181, 158, 0.08);
        color: #335d53;
        font-size: 12px;
        font-weight: 700;
      }

      h1 {
        margin: 0;
        max-width: 13ch;
        font-size: 34px;
        line-height: 0.94;
        color: var(--text-primary);
        overflow-wrap: anywhere;
      }

      p {
        margin: 0;
        max-width: 42ch;
        color: rgba(64, 84, 79, 0.76);
        font-size: 13px;
        line-height: 1.55;
      }

      .search-header__meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .search-header__meta span {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: 0 12px;
        border-radius: 999px;
        background: #eef5f2;
        border: 1px solid rgba(103, 203, 176, 0.1);
        color: #537069;
        font-size: 11px;
        font-weight: 500;
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
        background: rgba(36, 49, 45, 0.18);
      }

      .notifications-drawer {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(100vw, 100vw);
        display: grid;
        grid-template-rows: auto auto 1fr;
        gap: 18px;
        padding: calc(18px + env(safe-area-inset-top, 0px)) 16px calc(20px + env(safe-area-inset-bottom, 0px));
        background:
          radial-gradient(circle at top, rgba(88, 181, 158, 0.08), transparent 26%),
          linear-gradient(180deg, rgba(251, 253, 252, 0.98), rgba(237, 245, 242, 0.98));
        border-left: 1px solid rgba(103, 203, 176, 0.12);
        box-shadow: -20px 0 40px rgba(29, 41, 37, 0.1);
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
        background: #edf4f1;
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
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(103, 203, 176, 0.1);
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
        padding-bottom: 6px;
      }

      .notifications-drawer__item {
        display: grid;
        gap: 12px;
        padding: 16px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(70, 89, 83, 0.08);
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
        border-color: rgba(103, 203, 176, 0.28);
        box-shadow: inset 0 0 0 1px rgba(103, 203, 176, 0.08);
      }

      @media (min-width: 640px) {
        .search-header__nav-shell {
          gap: 22px;
          padding: 22px 20px 28px;
        }

        .search-header__nav {
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
        }

        .search-header__searchbar {
          grid-template-columns: auto minmax(0, 1fr) auto;
          padding: 0 18px;
        }

        .search-header__search-submit {
          display: inline-flex;
        }

        .search-header--minimal .search-header__nav-shell {
          gap: 0;
          padding-bottom: 20px;
        }

        .search-header--minimal .search-header__searchbar {
          grid-template-columns: auto minmax(0, 1fr);
        }

        h1 {
          max-width: 15ch;
          font-size: 44px;
        }

        .notifications-drawer {
          width: min(92vw, 400px);
          padding: 24px 18px 32px;
        }
      }

      @media (min-width: 960px) {
        .search-header__nav-shell {
          gap: 26px;
          padding: 28px 30px 32px;
          border-radius: 38px;
        }

        .search-header__brand-mark {
          width: 190px;
        }

        .search-header__notifications-trigger {
          width: 68px;
          height: 68px;
          border-radius: 22px;
        }

        .search-header__searchbar {
          min-height: 72px;
          padding: 0 22px;
          border-radius: 24px;
        }

        .search-header__searchbar input {
          font-size: 16px;
        }

        .search-header--minimal .search-header__nav-shell {
          padding-bottom: 24px;
        }

        h1 {
          font-size: clamp(48px, 4.6vw, 64px);
        }

        p {
          max-width: 58ch;
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

  @Input() title = 'Escolha seu próximo volante com energia de pista';
  @Input() subtitle =
    'Pesquise por cidade, período e faixa de preço em uma vitrine mais leve, menta e precisa.';
  @Input() query = '';
  @Input() startDate = '';
  @Input() endDate = '';
  @Input() showFiltersAction = true;
  @Input() showMeta = true;
  @Input() minimal = false;

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
