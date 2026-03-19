import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VehicleCardItem } from '../../core/models/domain.models';
import { FavoritesService } from '../../core/services/favorites.service';

@Component({
  selector: 'app-vehicle-card',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  template: `
    <article class="vehicle-card" [routerLink]="['/vehicles', vehicle.id]" tabindex="0" role="link">
      <div class="vehicle-card__media">
        <span class="vehicle-card__badge">{{
          categoryLabel(vehicle.category)
        }}</span>
        <button
          type="button"
          class="vehicle-card__favorite"
          [class.vehicle-card__favorite--active]="isFavorite"
          [disabled]="isFavoritePending"
          [attr.aria-label]="isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'"
          (click)="toggleFavorite($event)"
        >
          <span class="material-icons" aria-hidden="true">{{
            isFavorite ? 'favorite' : 'favorite_border'
          }}</span>
        </button>
        <img
          class="vehicle-card__image"
          [src]="vehicle.coverImage || fallbackImage"
          [alt]="vehicle.title"
        />
      </div>

      <div class="vehicle-card__copy">
        <div class="vehicle-card__top">
          <h3>{{ vehicle.title }}</h3>
          <strong>{{
            vehicle.dailyRate | currency: 'BRL' : 'symbol' : '1.0-0'
          }}</strong>
        </div>

        <div class="vehicle-card__specs">
          <span>
            <span class="material-icons" aria-hidden="true">tune</span>
            {{ transmissionLabel(vehicle.transmission) }}
          </span>
          <span>
            <span class="material-icons" aria-hidden="true">event_seat</span>
            {{ vehicle.seats }} lugares
          </span>
        </div>

        <p>{{ vehicle.city }}, {{ vehicle.state }}</p>

        <span class="vehicle-card__cta">Ver detalhes</span>
      </div>
    </article>
  `,
  styles: [
    `
      .vehicle-card {
        display: grid;
        gap: 10px;
        min-width: 0;
        height: 100%;
        padding: 14px;
        border-radius: 18px;
        border: 1px solid var(--glass-border-soft);
        background: rgba(255, 255, 255, 0.98);
        color: inherit;
        text-decoration: none;
        box-shadow: 0 12px 24px rgba(28, 17, 18, 0.08);
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }

      .vehicle-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-strong);
      }

      .vehicle-card__media {
        position: relative;
        min-height: 148px;
        border-radius: 14px;
        overflow: hidden;
        background: linear-gradient(180deg, #fffdfd 0%, #f5efef 100%);
      }

      .vehicle-card__badge {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        box-shadow: 0 8px 18px rgba(28, 17, 18, 0.08);
      }

      .vehicle-card__favorite {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        color: var(--text-secondary);
        box-shadow: 0 8px 18px rgba(28, 17, 18, 0.08);
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

      .vehicle-card__copy {
        display: grid;
        gap: 8px;
        min-width: 0;
      }

      .vehicle-card__top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .vehicle-card__top strong {
        color: var(--primary);
        font-size: 18px;
        font-weight: 800;
        letter-spacing: -0.03em;
      }

      .vehicle-card__top h3,
      .vehicle-card__copy p {
        margin: 0;
      }

      .vehicle-card__specs {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 600;
      }

      .vehicle-card__specs span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .vehicle-card__specs .material-icons {
        font-size: 15px;
        color: var(--text-secondary);
      }

      h3 {
        font-size: 15px;
        line-height: 1.2;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        color: var(--text-primary);
      }

      p {
        color: var(--text-secondary);
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .vehicle-card__cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
        min-height: 38px;
        padding: 0 14px;
        border-radius: 999px;
        background: var(--primary);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }

      @media (max-width: 420px) {
        .vehicle-card__specs {
          gap: 6px;
        }

        .vehicle-card__specs span {
          font-size: 11px;
        }
      }
    `,
  ],
})
export class VehicleCardComponent {
  private readonly favoritesService = inject(FavoritesService);

  @Input({ required: true }) vehicle!: VehicleCardItem;

  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';

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

  protected toggleFavorite(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.favoritesService.toggleFavorite(this.vehicle);
  }
}
