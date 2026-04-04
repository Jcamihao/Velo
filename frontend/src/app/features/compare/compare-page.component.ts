import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompareService } from '../../core/services/compare.service';

@Component({
  selector: 'app-compare-page',
  standalone: true,
  imports: [CommonModule, RouterLink, CurrencyPipe],
  template: `
    <main class="page compare-page">
      <section class="compare-page__hero glass-panel-strong">
        <div>
          <span class="eyebrow">Comparador</span>
          <h1>Veja lado a lado o que realmente muda entre os anúncios</h1>
          <p>
            Compare preço, câmbio, assentos, política de cancelamento e perfil
            do anunciante antes de decidir.
          </p>
        </div>

        <div class="compare-page__hero-actions">
          <a class="btn btn-secondary" routerLink="/search">Adicionar mais</a>
          <button
            type="button"
            class="btn btn-ghost"
            *ngIf="compareService.count()"
            (click)="compareService.clear()"
          >
            Limpar seleção
          </button>
        </div>
      </section>

      <section
        class="compare-page__empty glass-panel-strong"
        *ngIf="!compareService.count()"
      >
        <strong>Nenhum veículo selecionado</strong>
        <p>
          Vá para a busca, favoritos ou perfil público e toque em "Comparar"
          nos anúncios que quiser colocar lado a lado.
        </p>
        <a class="btn btn-primary" routerLink="/search">Ir para a busca</a>
      </section>

      <section
        class="compare-page__hint glass-panel-strong"
        *ngIf="compareService.count() === 1"
      >
        <strong>Falta mais um veículo</strong>
        <p>
          A comparação fica mais útil com pelo menos dois anúncios na mesa.
        </p>
      </section>

      <section class="compare-grid" *ngIf="compareService.count()">
        <article
          class="compare-column glass-panel-strong"
          *ngFor="let vehicle of compareService.items(); trackBy: trackById"
        >
          <div class="compare-column__media">
            <img [src]="vehicle.coverImage || fallbackImage" [alt]="vehicle.title" />
            <button
              type="button"
              class="compare-column__remove"
              (click)="compareService.remove(vehicle.id)"
            >
              <span class="material-icons" aria-hidden="true">close</span>
            </button>
          </div>

          <div class="compare-column__head">
            <h2>{{ vehicle.title }}</h2>
            <p>{{ vehicle.city }}, {{ vehicle.state }}</p>
          </div>

          <div class="compare-column__price price-text">
            {{ vehicle.dailyRate | currency: 'BRL' : 'symbol' : '1.0-0' }} /
            semana
          </div>

          <dl class="compare-specs">
            <div>
              <dt>Categoria</dt>
              <dd>{{ categoryLabel(vehicle.category) }}</dd>
            </div>
            <div>
              <dt>Câmbio</dt>
              <dd>{{ transmissionLabel(vehicle.transmission) }}</dd>
            </div>
            <div>
              <dt>Combustível</dt>
              <dd>{{ fuelTypeLabel(vehicle.fuelType) }}</dd>
            </div>
            <div>
              <dt>Assentos</dt>
              <dd>{{ vehicle.seats }} lugares</dd>
            </div>
            <div>
              <dt>Reserva</dt>
              <dd>{{ approvalModeLabel(vehicle.bookingApprovalMode) }}</dd>
            </div>
            <div>
              <dt>Cancelamento</dt>
              <dd>{{ cancellationLabel(vehicle.cancellationPolicy) }}</dd>
            </div>
            <div>
              <dt>Avaliação</dt>
              <dd>{{ ratingLabel(vehicle.owner?.ratingAverage, vehicle.owner?.reviewsCount) }}</dd>
            </div>
            <div>
              <dt>Anunciante</dt>
              <dd class="profile-name-text">{{ vehicle.owner?.fullName || 'Usuário Triluga' }}</dd>
            </div>
          </dl>

          <a class="btn btn-primary compare-column__cta" [routerLink]="['/vehicles', vehicle.id]">
            Ver anúncio
          </a>
        </article>
      </section>
    </main>
  `,
  styles: [
    `
      .compare-page {
        display: grid;
        gap: 18px;
        padding: 18px 12px 148px;
      }

      .compare-page__hero,
      .compare-page__empty,
      .compare-page__hint,
      .compare-column {
        display: grid;
        gap: 14px;
      }

      .compare-page__hero h1,
      .compare-page__hero p,
      .compare-page__empty p,
      .compare-page__hint p,
      .compare-column h2,
      .compare-column p,
      .compare-specs dd,
      .compare-specs dt {
        margin: 0;
      }

      .compare-page__hero h1,
      .compare-column h2 {
        color: var(--text-primary);
      }

      .compare-page__hero-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .compare-grid {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(280px, 1fr);
        gap: 16px;
        overflow-x: auto;
        padding-bottom: 4px;
      }

      .compare-column {
        min-width: 0;
      }

      .compare-column__media {
        position: relative;
        min-height: 180px;
        border-radius: 24px;
        overflow: hidden;
        background: #edf6f3;
      }

      .compare-column__media img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .compare-column__remove {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.92);
        color: var(--text-primary);
      }

      .compare-column__price {
        color: var(--primary);
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.04em;
      }

      .compare-specs {
        display: grid;
        gap: 10px;
      }

      .compare-specs div {
        display: grid;
        gap: 4px;
        padding: 12px 14px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.84);
        border: 1px solid rgba(74, 121, 111, 0.1);
      }

      .compare-specs dt {
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .compare-specs dd {
        color: var(--text-primary);
        font-weight: 600;
      }

      .compare-column__cta {
        justify-self: start;
      }

      @media (min-width: 960px) {
        .compare-page {
          padding-inline: 20px;
        }

        .compare-grid {
          grid-auto-columns: minmax(300px, 1fr);
        }
      }
    `,
  ],
})
export class ComparePageComponent {
  protected readonly compareService = inject(CompareService);
  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';

  protected trackById(_index: number, item: { id: string }) {
    return item.id;
  }

  protected categoryLabel(category: string) {
    const labels: Record<string, string> = {
      ECONOMY: 'Econômico',
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
      AUTOMATIC: 'Automático',
      MANUAL: 'Manual',
      CVT: 'CVT',
    };

    return labels[transmission] || transmission;
  }

  protected fuelTypeLabel(fuelType: string) {
    const labels: Record<string, string> = {
      FLEX: 'Flex',
      GASOLINE: 'Gasolina',
      ETHANOL: 'Etanol',
      DIESEL: 'Diesel',
      ELECTRIC: 'Elétrico',
      HYBRID: 'Híbrido',
    };

    return labels[fuelType] || fuelType;
  }

  protected approvalModeLabel(mode: string) {
    return mode === 'INSTANT' ? 'Instantânea' : 'Manual';
  }

  protected cancellationLabel(policy: string) {
    const labels: Record<string, string> = {
      FLEXIBLE: 'Flexível',
      MODERATE: 'Moderada',
      STRICT: 'Rígida',
    };

    return labels[policy] || policy;
  }

  protected ratingLabel(ratingAverage?: number, reviewsCount?: number) {
    if (!reviewsCount) {
      return 'Novo anunciante';
    }

    return `${(ratingAverage ?? 0).toFixed(1)} em ${reviewsCount} avaliação${
      reviewsCount > 1 ? 'ões' : ''
    }`;
  }
}
