import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { VehicleCardItem } from '../../core/models/domain.models';
import { CompareService } from '../../core/services/compare.service';
import { FavoritesService } from '../../core/services/favorites.service';

@Component({
  selector: 'app-vehicle-card',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  template: `
    <article
      class="vehicle-card"
      [routerLink]="['/vehicles', vehicle.id]"
      tabindex="0"
      role="link"
    >
      <div class="vehicle-card__media">
        <div class="vehicle-card__media-top">
          <span class="vehicle-card__badge badge-text">{{ badgeLabel() }}</span>
          <button
            type="button"
            class="vehicle-card__favorite"
            [class.vehicle-card__favorite--active]="isFavorite"
            [disabled]="isFavoritePending"
            [attr.aria-label]="
              isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'
            "
            (click)="toggleFavorite($event)"
          >
            <span class="material-icons" aria-hidden="true">{{
              isFavorite ? 'favorite' : 'favorite_border'
            }}</span>
          </button>
        </div>
        <img
          class="vehicle-card__image"
          [src]="vehicle.coverImage || fallbackImage"
          [alt]="vehicle.title"
        />
        <div class="vehicle-card__media-bottom">
          <span class="vehicle-card__location">
            <span class="material-icons" aria-hidden="true">place</span>
            {{ vehicle.city }}, {{ vehicle.state }}
          </span>
          <strong class="vehicle-card__price price-text">
            {{ vehicle.dailyRate | currency: 'BRL' : 'symbol' : '1.0-0' }}
            <small>/ semana</small>
          </strong>
        </div>
      </div>

      <div class="vehicle-card__copy">
        <div class="vehicle-card__top">
          <h3>{{ vehicle.title }}</h3>
          <div class="vehicle-card__headline-meta">
            <span>
              <span class="material-icons" aria-hidden="true">tune</span>
              {{ transmissionLabel(vehicle.transmission) }}
            </span>
            <span>
              <span class="material-icons" aria-hidden="true">event_seat</span>
              {{ vehicle.seats }} lugares
            </span>
          </div>
        </div>

        <button
          *ngIf="vehicle.owner?.id"
          type="button"
          class="vehicle-card__owner"
          (click)="openOwnerProfile($event)"
          [attr.aria-label]="'Abrir perfil de ' + ownerDisplayName"
        >
          <img
            class="vehicle-card__owner-avatar"
            [src]="vehicle.owner?.avatarUrl || fallbackAvatarImage"
            [alt]="ownerDisplayName"
          />

          <span class="vehicle-card__owner-copy">
            <strong class="profile-name-text">{{ ownerDisplayName }}</strong>
            <small class="vehicle-card__owner-rating">
              <span class="material-icons" aria-hidden="true">star</span>
              {{ ownerRatingLabel }}
            </small>
          </span>
        </button>

        <div class="vehicle-card__footer">
          <button
            type="button"
            class="vehicle-card__compare"
            [class.vehicle-card__compare--active]="isCompared"
            [disabled]="compareDisabled"
            (click)="toggleCompare($event)"
          >
            {{
              isCompared
                ? 'Na comparação'
                : compareDisabled
                  ? 'Lista cheia'
                  : 'Comparar'
            }}
          </button>

          <span class="vehicle-card__cta">Ver anúncio</span>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      .vehicle-card {
        display: grid;
        gap: 14px;
        min-width: 0;
        height: 100%;
        padding: 14px;
        border-radius: 30px;
        border: 1px solid rgba(23, 33, 29, 0.06);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 250, 248, 0.96));
        background-color: rgba(255, 255, 255, 0.96);
        color: inherit;
        text-decoration: none;
        box-shadow:
          0 20px 40px rgba(29, 41, 37, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease,
          border-color 0.2s ease;
      }

      .vehicle-card:hover {
        transform: translateY(-3px);
        border-color: rgba(88, 181, 158, 0.18);
        box-shadow:
          0 26px 56px rgba(29, 41, 37, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.86);
      }

      .vehicle-card__media {
        position: relative;
        min-height: 208px;
        border-radius: 24px;
        overflow: hidden;
        background: linear-gradient(180deg, #edf5f2 0%, #dbe8e3 100%);
      }

      .vehicle-card__media::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          180deg,
          rgba(17, 22, 21, 0.05) 0%,
          rgba(17, 22, 21, 0) 36%,
          rgba(17, 22, 21, 0.34) 100%
        );
      }

      .vehicle-card__media-top,
      .vehicle-card__media-bottom {
        position: absolute;
        left: 12px;
        right: 12px;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .vehicle-card__media-top {
        top: 12px;
      }

      .vehicle-card__media-bottom {
        bottom: 12px;
        align-items: end;
      }

      .vehicle-card__badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 30px;
        padding: 0 13px;
        border-radius: 999px;
        background: rgba(248, 252, 250, 0.92);
        color: #315f53;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        box-shadow: 0 10px 22px rgba(29, 41, 37, 0.08);
        backdrop-filter: blur(10px);
      }

      .vehicle-card__favorite {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border: 0;
        border-radius: 999px;
        background: rgba(248, 252, 250, 0.92);
        color: #33695a;
        box-shadow: 0 10px 22px rgba(29, 41, 37, 0.08);
        backdrop-filter: blur(10px);
      }

      .vehicle-card__favorite--active {
        color: var(--primary);
      }

      .vehicle-card__favorite .material-icons {
        font-size: 18px;
      }

      .vehicle-card__image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .vehicle-card__location {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-height: 32px;
        max-width: min(58%, 190px);
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(13, 18, 16, 0.46);
        color: rgba(255, 255, 255, 0.96);
        font-size: 11px;
        font-weight: 700;
        backdrop-filter: blur(12px);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .vehicle-card__location .material-icons {
        font-size: 15px;
      }

      .vehicle-card__price {
        display: inline-grid;
        gap: 2px;
        justify-items: end;
        color: #ffffff;
        text-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);
        line-height: 1;
      }

      .vehicle-card__price small {
        font-family: var(--font-body);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        opacity: 0.88;
      }

      .vehicle-card__copy {
        display: grid;
        gap: 12px;
        min-width: 0;
      }

      .vehicle-card__top {
        display: grid;
        gap: 8px;
      }

      .vehicle-card__headline-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .vehicle-card__headline-meta span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-height: 30px;
        padding: 0 11px;
        border-radius: 999px;
        background: rgba(88, 181, 158, 0.08);
        color: #4d6761;
        border: 1px solid rgba(88, 181, 158, 0.12);
        font-size: 11px;
        font-weight: 700;
      }

      .vehicle-card__headline-meta .material-icons {
        font-size: 16px;
      }

      .vehicle-card__top h3 {
        margin: 0;
      }

      h3 {
        font-size: 22px;
        line-height: 1;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        color: var(--text-primary);
      }

      p {
        color: var(--text-secondary);
        font-size: 11px;
        white-space: normal;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .vehicle-card__owner {
        appearance: none;
        -webkit-appearance: none;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        width: 100%;
        min-width: 0;
        padding: 12px;
        border: 1px solid rgba(103, 203, 176, 0.1);
        border-radius: 20px;
        background:
          linear-gradient(180deg, rgba(241, 247, 244, 0.96), rgba(233, 242, 239, 0.96));
        background-color: #eef5f2;
        color: inherit;
        text-align: left;
        box-shadow: none;
        cursor: pointer;
      }

      .vehicle-card__owner-avatar {
        width: 40px;
        height: 40px;
        border-radius: 15px;
        object-fit: cover;
        background: #dce8e3;
      }

      .vehicle-card__owner-copy {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .vehicle-card__owner-copy strong,
      .vehicle-card__owner-copy small {
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .vehicle-card__owner-copy strong {
        color: var(--text-primary);
        font-size: 13px;
      }

      .vehicle-card__owner-copy small {
        color: var(--text-secondary);
        font-size: 11px;
      }

      .vehicle-card__owner-rating {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .vehicle-card__owner-rating .material-icons {
        font-size: 18px;
        color: #f59e0b;
      }

      .vehicle-card__cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        padding: 0 16px;
        border-radius: 999px;
        background: linear-gradient(135deg, #8ad8c7 0%, #63c5af 60%, #44947f 100%);
        color: #09100c;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        box-shadow: 0 16px 28px rgba(88, 181, 158, 0.2);
      }

      .vehicle-card__footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }

      .vehicle-card__compare {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        padding: 0 16px;
        border-radius: 999px;
        border: 1px solid rgba(74, 121, 111, 0.14);
        background: rgba(238, 245, 242, 0.92);
        color: var(--text-primary);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      .vehicle-card__compare--active {
        background: rgba(88, 181, 158, 0.18);
        color: var(--primary);
        border-color: rgba(88, 181, 158, 0.28);
      }

      .vehicle-card__compare:disabled {
        opacity: 0.56;
      }

      @media (min-width: 390px) {
        .vehicle-card {
          padding: 16px;
        }
      }

      @media (min-width: 960px) {
        .vehicle-card {
          gap: 16px;
          padding: 18px;
          border-radius: 32px;
        }

        .vehicle-card__media {
          min-height: 224px;
          border-radius: 26px;
        }

        .vehicle-card__top h3 {
          font-size: 24px;
        }

        .vehicle-card__cta {
          min-height: 42px;
        }
      }
    `,
  ],
})
export class VehicleCardComponent {
  private readonly favoritesService = inject(FavoritesService);
  private readonly compareService = inject(CompareService);
  private readonly router = inject(Router);

  @Input({ required: true }) vehicle!: VehicleCardItem;

  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';
  protected readonly fallbackAvatarImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' rx='40' fill='%23f3eeee'/%3E%3Ccircle cx='80' cy='60' r='24' fill='%23b7aaac'/%3E%3Cpath d='M40 128c7-22 24-34 40-34s33 12 40 34' fill='%23b7aaac'/%3E%3C/svg%3E";

  protected categoryLabel(category: string) {
    const labels: Record<string, string> = {
      ECONOMY: 'Econ.',
      HATCH: 'Hatch',
      SEDAN: 'Sedan',
      SUV: 'SUV',
      PICKUP: 'Pickup',
      VAN: 'Van',
      LUXURY: 'Luxo',
    };

    return labels[category] || category;
  }

  protected badgeLabel() {
    return this.vehicle.vehicleType === 'MOTORCYCLE'
      ? 'Moto'
      : this.categoryLabel(this.vehicle.category);
  }

  protected transmissionLabel(transmission: string) {
    const labels: Record<string, string> = {
      AUTOMATIC: 'Auto',
      MANUAL: 'Manual',
      CVT: 'CVT',
    };

    return labels[transmission] || transmission;
  }

  protected get isFavorite() {
    return this.favoritesService.isFavorite(this.vehicle.id);
  }

  protected get isFavoritePending() {
    return this.favoritesService.isPending(this.vehicle.id);
  }

  protected get ownerDisplayName() {
    return this.vehicle.owner?.fullName?.trim() || 'Anunciante Triluga';
  }

  protected get ownerRatingLabel() {
    const reviewsCount = this.vehicle.owner?.reviewsCount ?? 0;
    const ratingAverage = this.vehicle.owner?.ratingAverage ?? 0;

    if (!reviewsCount) {
      return 'Novo usuário';
    }

    return `${ratingAverage.toFixed(1)} de média`;
  }

  protected get isCompared() {
    return this.compareService.isSelected(this.vehicle.id);
  }

  protected get compareDisabled() {
    return !this.isCompared && this.compareService.isFull();
  }

  protected toggleFavorite(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.favoritesService.toggleFavorite(this.vehicle);
  }

  protected toggleCompare(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.compareService.toggle(this.vehicle);
  }

  protected openOwnerProfile(event: Event) {
    const ownerId = this.vehicle.owner?.id;

    if (!ownerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.router.navigate(['/users', ownerId]);
  }
}
