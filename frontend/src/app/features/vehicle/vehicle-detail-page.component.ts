import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatApiService } from '../../core/services/chat-api.service';
import { ChatInboxService } from '../../core/services/chat-inbox.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';
import { VehicleDetail } from '../../core/models/domain.models';
import { FixedActionButtonComponent } from '../../shared/components/fixed-action-button.component';
import { ImageGalleryComponent } from '../../shared/components/image-gallery.component';

type DetailFactItem = {
  icon: string;
  label: string;
  value: string;
};

type PromotionDetailItem = {
  title: string;
  description: string;
  code: string | null;
};

type PricingRuleHighlightItem = {
  title: string;
  description: string;
};

type RatingDistributionItem = {
  stars: number;
  count: number;
  percentage: number;
};

type StarIcon = 'star' | 'star_half' | 'star_border';

@Component({
  selector: 'app-vehicle-detail-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, ImageGalleryComponent, FixedActionButtonComponent],
  template: `
    <main class="page vehicle-detail-page" *ngIf="vehicle">
      <section class="detail-stage">
        <div class="detail-stage__toolbar">
          <button class="icon-chip" type="button" (click)="router.navigate(['/search'])" aria-label="Voltar para busca">
            <span class="material-icons" aria-hidden="true">arrow_back</span>
          </button>
          <span>{{ vehicle.title }}</span>
          <button
            class="icon-chip icon-chip--ghost"
            type="button"
            [class.icon-chip--active]="isFavorite"
            [disabled]="isFavoritePending"
            [attr.aria-label]="isFavorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'"
            (click)="toggleFavorite()"
          >
            <span class="material-icons" aria-hidden="true">{{
              isFavorite ? 'favorite' : 'favorite_border'
            }}</span>
          </button>
        </div>

        <section class="detail-stage__pickup-card">
          <span class="material-icons" aria-hidden="true">location_on</span>
          <div>
            <strong>{{ pickupTitle }}</strong>
            <p>{{ pickupSubtitle }}</p>
          </div>
          <span class="material-icons detail-stage__pickup-close" aria-hidden="true">close</span>
        </section>

        <section class="detail-stage__meta">
          <div class="detail-stage__meta-strip">
            <span>
              <span class="material-icons" aria-hidden="true">tune</span>
              {{ transmissionLabel(vehicle.transmission) }}
            </span>
            <span>
              <span class="material-icons" aria-hidden="true">local_gas_station</span>
              {{ fuelTypeLabel(vehicle.fuelType) }}
            </span>
            <span>
              <span class="material-icons" aria-hidden="true">more_horiz</span>
            </span>
          </div>

          <strong class="detail-stage__price">
            {{ vehicle.dailyRate | currency: 'BRL' : 'symbol' : '1.0-0' }} / semana
          </strong>
        </section>

        <div class="detail-stage__promotions" *ngIf="promotionHighlights.length">
          <span
            class="detail-stage__promo"
            *ngFor="let promotion of promotionHighlights; trackBy: trackByString"
          >
            {{ promotion }}
          </span>
        </div>

        <app-image-gallery [images]="vehicle.images"></app-image-gallery>
      </section>

      <section class="detail-panels">
        <header class="detail-panels__header">
          <h2>Detalhes</h2>
        </header>

        <div class="detail-facts">
          <article class="detail-fact" *ngFor="let detail of visibleDetailItems; trackBy: trackByDetailLabel">
            <span class="material-icons" aria-hidden="true">{{ detail.icon }}</span>
            <small>{{ detail.label }}</small>
            <strong>{{ detail.value }}</strong>
          </article>
        </div>

        <button
          type="button"
          class="detail-facts__toggle"
          *ngIf="detailItems.length > collapsedDetailCount"
          (click)="toggleDetails()"
        >
          <span class="material-icons" aria-hidden="true">list</span>
          {{ showAllDetails ? 'Exibir menos' : 'Exibir todos (' + detailItems.length + ')' }}
        </button>

        <section class="detail-info-card">
          <span class="detail-info-card__eyebrow">Descrição</span>
          <p>{{ vehicle.description }}</p>
        </section>

        <section class="detail-info-card" *ngIf="promotionDetails.length">
          <span class="detail-info-card__eyebrow">Promoções ativas</span>
          <div class="detail-promo-list">
            <article class="detail-promo" *ngFor="let promotion of promotionDetails; trackBy: trackByTitle">
              <strong>{{ promotion.title }}</strong>
              <p>{{ promotion.description }}</p>
              <span *ngIf="promotion.code">{{ promotion.code }}</span>
            </article>
          </div>
        </section>

        <section class="detail-info-card" *ngIf="pricingRuleHighlights.length">
          <span class="detail-info-card__eyebrow">Preço dinâmico</span>
          <div class="detail-promo-list">
            <article class="detail-promo" *ngFor="let rule of pricingRuleHighlights; trackBy: trackByTitle">
              <strong>{{ rule.title }}</strong>
              <p>{{ rule.description }}</p>
            </article>
          </div>
        </section>

        <section class="detail-info-card" *ngIf="vehicle.addons.length">
          <span class="detail-info-card__eyebrow">Itens extras</span>
          <div class="detail-addon-list">
            <article class="detail-addon" *ngFor="let addon of vehicle.addons; trackBy: trackByAddon">
              <strong>{{ addon.name }}</strong>
              <p>{{ addon.description || 'Adicional opcional para a reserva.' }}</p>
              <span>{{ addon.price | currency: 'BRL' : 'symbol' : '1.2-2' }}</span>
            </article>
          </div>
        </section>

        <section class="detail-info-card" *ngIf="vehicle.latitude && vehicle.longitude">
          <span class="detail-info-card__eyebrow">Mapa</span>
          <p>Veja o ponto aproximado de retirada no mapa antes de reservar.</p>
          <a class="detail-map-link" [href]="mapLink" target="_blank" rel="noreferrer">
            Abrir no mapa
          </a>
        </section>

        <section class="detail-info-card">
          <span class="detail-info-card__eyebrow">Proprietário</span>
          <h3>{{ vehicle.owner?.fullName || 'Anfitrião Velo' }}</h3>
          <p>{{ vehicle.owner?.city }}, {{ vehicle.owner?.state }}</p>
          <span class="detail-info-card__meta" *ngIf="showChatAction">
            Responde direto no chat da Velo
          </span>
        </section>

        <section class="detail-info-card detail-info-card--reviews" *ngIf="totalReviewCount; else emptyReviews">
          <div class="review-summary">
            <h3>Opiniões do carro</h3>

            <div class="review-summary__grid">
              <div class="review-summary__score-block">
                <strong class="review-summary__score">{{ displayRating | number: '1.1-1' }}</strong>

                <div class="review-summary__stars" aria-label="Nota média do carro">
                  <span
                    class="material-icons"
                    *ngFor="let star of averageRatingStars; trackBy: trackByIndex"
                    aria-hidden="true"
                  >
                    {{ star }}
                  </span>
                </div>

                <p>{{ totalReviewCount }} avaliações</p>

                <button
                  type="button"
                  class="review-summary__recommendation"
                  *ngIf="totalReviewCount"
                >
                  Recomendado por {{ recommendationPercentage }}%
                  <span class="material-icons" aria-hidden="true">expand_more</span>
                </button>
              </div>

              <div class="review-summary__distribution">
                <div
                  class="review-summary__bar-row"
                  *ngFor="let item of ratingDistribution; trackBy: trackByStars"
                >
                  <div class="review-summary__bar-track">
                    <span
                      class="review-summary__bar-fill"
                      [style.width.%]="item.percentage"
                    ></span>
                  </div>
                  <span class="review-summary__bar-label">{{ item.stars }}</span>
                  <span class="material-icons" aria-hidden="true">star</span>
                </div>
              </div>
            </div>
          </div>

          <section class="review-highlight">
            <div class="review-highlight__head">
              <div>
                <h4>Opiniões em destaque</h4>
                <small>{{ totalReviewCount }} comentários</small>
              </div>
            </div>

            <p class="review-highlight__summary">{{ reviewHighlightSummary }}</p>

            <div class="review-highlight__meta">
              <span class="material-icons" aria-hidden="true">auto_awesome</span>
              <span>Resumo baseado nas avaliações enviadas</span>
            </div>
          </section>

          <div class="review-list" *ngIf="highlightedReviews.length">
            <article class="review review--snippet" *ngFor="let review of highlightedReviews; trackBy: trackById">
              <div class="review__rating-row">
                <div class="review__stars">
                  <span
                    class="material-icons"
                    *ngFor="let star of reviewStars(review.rating); trackBy: trackByIndex"
                    aria-hidden="true"
                  >
                    {{ star }}
                  </span>
                </div>
                <span class="review__date">{{ review.createdAt | date: 'dd MMM, y' }}</span>
              </div>

              <p>{{ excerptReview(review.comment) }}</p>
              <strong class="review__author">{{ review.author.fullName || 'Usuário' }}</strong>
            </article>
          </div>
        </section>

        <ng-template #emptyReviews>
          <section class="detail-info-card detail-info-card--reviews">
            <div class="review-summary">
              <h3>Opiniões do carro</h3>

              <div class="review-summary__grid">
                <div class="review-summary__score-block">
                  <strong class="review-summary__score">0.0</strong>

                  <div class="review-summary__stars" aria-label="Sem avaliações">
                    <span
                      class="material-icons"
                    *ngFor="let star of emptyRatingStars; trackBy: trackByIndex"
                      aria-hidden="true"
                    >
                      {{ star }}
                    </span>
                  </div>

                  <p>Ainda sem avaliações</p>
                </div>

                <div class="review-summary__distribution">
                  <div
                    class="review-summary__bar-row"
                    *ngFor="let item of emptyRatingDistribution; trackBy: trackByStars"
                  >
                    <div class="review-summary__bar-track"></div>
                    <span class="review-summary__bar-label">{{ item.stars }}</span>
                    <span class="material-icons" aria-hidden="true">star</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ng-template>

        <section class="detail-info-card detail-info-card--trust">
          <div class="detail-info-card__head">
            <span class="detail-info-card__eyebrow">Reserva protegida</span>
            <span class="material-icons" aria-hidden="true">check_circle</span>
          </div>
          <p>Cancelamento grátis até 24h antes da retirada.</p>
          <span class="detail-info-card__meta">Termos e condições</span>
        </section>
      </section>

      <app-fixed-action-button
        [helper]="footerHelper"
        [label]="(vehicle.dailyRate | currency: 'BRL' : 'symbol' : '1.0-0') + ' / semana'"
        [actionLabel]="ctaLabel"
        [actionIcon]="ctaIcon"
        [secondaryActionLabel]="footerChatLabel"
        [secondaryActionIcon]="'chat_bubble'"
        [secondaryBadgeCount]="footerChatUnreadCount"
        (action)="goToBooking()"
        (secondaryAction)="openChat()"
      />
    </main>
  `,
  styles: [
    `
      .vehicle-detail-page {
        display: grid;
        gap: 16px;
        width: 100%;
        margin: 0 auto;
        padding: 18px 12px 220px;
      }

      .detail-stage {
        position: relative;
        display: grid;
        gap: 14px;
        padding: 18px 16px 20px;
        border-radius: 28px;
        background: linear-gradient(180deg, #4f4445 0%, #383031 100%);
        box-shadow: 0 30px 54px rgba(20, 11, 11, 0.24);
        overflow: hidden;
      }

      .detail-stage::before,
      .detail-stage::after {
        content: '';
        position: absolute;
        background: linear-gradient(180deg, #ff5b45 0%, #ff2f22 100%);
      }

      .detail-stage::before {
        top: -18px;
        right: -12px;
        width: 126px;
        height: 92px;
        border-radius: 0 0 0 70px;
        transform: rotate(-8deg);
      }

      .detail-stage::after {
        left: -28px;
        top: 114px;
        width: 82px;
        height: 30px;
        border-radius: 0 18px 18px 0;
        transform: rotate(-7deg);
      }

      .detail-stage__toolbar {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
        gap: 12px;
        position: relative;
        z-index: 1;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
      }

      .detail-stage__toolbar > span {
        min-width: 0;
        line-height: 1.3;
      }

      .icon-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        min-width: 42px;
        padding: 0 14px;
        border-radius: 999px;
        border: 0;
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
        font: inherit;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      .icon-chip--ghost {
        background: rgba(255, 255, 255, 0.95);
        color: var(--text-primary);
      }

      .icon-chip--active {
        color: var(--primary);
      }

      .detail-stage__pickup-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        position: relative;
        z-index: 1;
        padding: 16px 14px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border-soft);
        box-shadow: var(--shadow-soft);
      }

      .detail-stage__pickup-card .material-icons {
        color: var(--primary);
      }

      .detail-stage__pickup-card strong,
      .detail-stage__pickup-card p {
        margin: 0;
      }

      .detail-stage__pickup-card strong {
        display: block;
      }

      .detail-stage__pickup-card p {
        margin-top: 4px;
        color: var(--text-secondary);
        font-size: 12px;
      }

      .detail-stage__pickup-close {
        color: var(--text-disabled) !important;
      }

      .detail-stage__meta {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
        justify-content: space-between;
        gap: 16px;
        position: relative;
        z-index: 1;
      }

      h2,
      p {
        margin: 0;
      }

      .detail-stage__meta-strip {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.96);
        box-shadow: var(--shadow-soft);
      }

      .detail-stage__meta-strip span {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 600;
      }

      .detail-stage__meta-strip .material-icons {
        font-size: 16px;
        color: var(--text-secondary);
      }

      .detail-stage__price {
        min-width: 92px;
        display: inline-flex;
        justify-content: flex-start;
        color: var(--primary);
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.04em;
      }

      .detail-stage__promotions {
        position: relative;
        z-index: 1;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .detail-stage__promo {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(255, 236, 179, 0.98);
        color: #8a5200;
        font-size: 12px;
        font-weight: 700;
      }

      .detail-panels {
        display: grid;
        gap: 14px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
        padding: 18px 16px;
        border-radius: 24px;
      }

      .detail-panels__header h2 {
        margin: 0;
        font-size: 16px;
        color: var(--text-primary);
      }

      .detail-facts {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
      }

      .detail-fact {
        display: grid;
        gap: 8px;
        align-content: start;
        min-height: 108px;
        padding: 14px 12px;
        border-radius: 16px;
        background: #fff;
        border: 1px solid var(--glass-border-soft);
      }

      .detail-fact .material-icons {
        justify-self: start;
        color: var(--text-primary);
        font-size: 22px;
      }

      .detail-fact small,
      .detail-fact strong {
        margin: 0;
      }

      .detail-fact small {
        color: var(--text-secondary);
        font-size: 12px;
      }

      .detail-fact strong {
        color: var(--text-primary);
        font-size: 14px;
        line-height: 1.25;
      }

      .detail-facts__toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        min-height: 42px;
        padding: 0 16px;
        border: 1px solid rgba(58, 47, 48, 0.35);
        border-radius: 999px;
        background: #fff;
        color: var(--accent);
        font-size: 14px;
        font-weight: 600;
      }

      .detail-facts__toggle .material-icons {
        font-size: 18px;
      }

      .detail-info-card {
        display: grid;
        gap: 12px;
        padding: 18px 16px;
        border-radius: 22px;
        background: rgba(249, 244, 244, 0.7);
        border: 1px solid var(--glass-border-soft);
      }

      .detail-addon-list {
        display: grid;
        gap: 10px;
      }

      .detail-promo-list {
        display: grid;
        gap: 10px;
      }

      .detail-promo {
        display: grid;
        gap: 4px;
        padding: 12px;
        border-radius: 14px;
        background: #fff;
        border: 1px solid var(--glass-border-soft);
      }

      .detail-promo span {
        color: var(--primary);
        font-weight: 700;
      }

      .detail-addon {
        display: grid;
        gap: 4px;
        padding: 12px;
        border-radius: 14px;
        background: #fff;
        border: 1px solid var(--glass-border-soft);
      }

      .detail-addon span {
        color: var(--primary);
        font-weight: 700;
      }

      .detail-map-link {
        color: var(--primary);
      }

      .detail-info-card__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .detail-info-card__eyebrow {
        display: inline-flex;
        color: var(--primary);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .detail-info-card h3 {
        margin: 0;
        font-size: 20px;
        line-height: 1.1;
        color: var(--text-primary);
      }

      .detail-info-card__meta {
        color: var(--text-secondary);
        font-size: 13px;
      }

      .detail-info-card--reviews {
        gap: 18px;
      }

      .review-summary {
        display: grid;
        gap: 16px;
      }

      .review-summary h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 500;
        color: var(--text-primary);
      }

      .review-summary__grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 20px;
      }

      .review-summary__score-block {
        display: grid;
        align-content: start;
        gap: 8px;
      }

      .review-summary__score {
        color: #3b82f6;
        font-size: 58px;
        font-weight: 700;
        line-height: 0.95;
      }

      .review-summary__stars {
        display: flex;
        align-items: center;
        gap: 2px;
        color: #3b82f6;
      }

      .review-summary__stars .material-icons {
        font-size: 22px;
      }

      .review-summary__score-block p {
        color: var(--text-secondary);
        font-size: 14px;
      }

      .review-summary__recommendation {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        width: fit-content;
        padding: 0;
        border: 0;
        background: transparent;
        color: #3b82f6;
        font-size: 14px;
        font-weight: 600;
      }

      .review-summary__recommendation .material-icons {
        font-size: 18px;
      }

      .review-summary__distribution {
        display: grid;
        gap: 10px;
        align-content: start;
        padding-top: 6px;
      }

      .review-summary__bar-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 8px;
        color: var(--text-disabled);
      }

      .review-summary__bar-track {
        position: relative;
        height: 5px;
        border-radius: 999px;
        background: #e5e7eb;
        overflow: hidden;
      }

      .review-summary__bar-fill {
        position: absolute;
        inset: 0 auto 0 0;
        border-radius: inherit;
        background: #737373;
      }

      .review-summary__bar-label,
      .review-summary__bar-row .material-icons {
        font-size: 14px;
      }

      .review-list {
        display: grid;
        gap: 12px;
      }

      .review-highlight {
        display: grid;
        gap: 12px;
        padding-bottom: 4px;
        border-bottom: 1px solid var(--glass-border-soft);
      }

      .review-highlight__head h4,
      .review-highlight__head small {
        margin: 0;
      }

      .review-highlight__head h4 {
        font-size: 18px;
        color: var(--text-primary);
      }

      .review-highlight__head small {
        color: var(--text-secondary);
        font-size: 13px;
      }

      .review-highlight__summary {
        color: var(--text-primary);
        font-size: 16px;
        line-height: 1.45;
      }

      .review-highlight__meta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--text-secondary);
        font-size: 14px;
      }

      .review-highlight__meta .material-icons {
        color: #3b82f6;
        font-size: 18px;
      }

      .rating-pill {
        display: inline-flex;
        align-items: center;
        padding: 8px 12px;
        border-radius: 999px;
        background: var(--primary-light);
        border: 1px solid rgba(255, 59, 48, 0.12);
        color: var(--primary);
        font-size: 12px;
        font-weight: 700;
      }

      .review {
        padding: 14px;
        border-radius: 16px;
        background: #fff;
        border: 1px solid var(--glass-border-soft);
      }

      .review--snippet {
        gap: 10px;
      }

      .review__rating-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .review__stars {
        display: inline-flex;
        align-items: center;
        gap: 1px;
        color: #3b82f6;
      }

      .review__stars .material-icons {
        font-size: 20px;
      }

      .review__date {
        color: var(--text-secondary);
        font-size: 13px;
      }

      .review__author {
        color: #3b82f6;
        font-size: 14px;
        font-weight: 700;
      }

      .detail-info-card--trust .material-icons {
        color: var(--primary);
        font-size: 20px;
      }

      .review__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      @media (min-width: 481px) {
        .vehicle-detail-page {
          padding: 20px 16px 220px;
        }

        .detail-facts {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .detail-facts {
          gap: 14px;
        }

        .detail-fact {
          min-height: 118px;
          padding: 16px;
        }

        .detail-fact strong {
          font-size: 16px;
        }
      }

      @media (min-width: 641px) {
        .detail-stage__meta {
          flex-direction: row;
          align-items: flex-start;
        }

        .detail-stage__price {
          justify-content: flex-end;
          font-size: 30px;
        }

        .review-summary__grid {
          grid-template-columns: minmax(0, 1fr) minmax(132px, 0.95fr);
        }
      }

      @media (min-width: 1024px) {
        .vehicle-detail-page {
          grid-template-columns: minmax(0, 1.02fr) minmax(360px, 0.98fr);
          align-items: start;
          gap: 20px;
          padding: 28px 20px 176px;
        }

        .detail-stage {
          position: sticky;
          top: 24px;
          padding: 22px 20px 24px;
          border-radius: 32px;
        }

        .detail-stage__meta {
          align-items: center;
        }

        .detail-stage__price {
          font-size: 36px;
        }

        .detail-panels {
          gap: 16px;
          padding: 22px 20px;
          border-radius: 28px;
        }

        .detail-facts {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .review-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      .detail-stage__meta-strip {
        gap: 10px;
      }

      @media (min-width: 481px) {
        .detail-stage__meta-strip {
          gap: 16px;
        }
      }
    `,
  ],
})
export class VehicleDetailPageComponent {
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly vehiclesApiService = inject(VehiclesApiService);
  private readonly authService = inject(AuthService);
  private readonly chatApiService = inject(ChatApiService);
  private readonly chatInboxService = inject(ChatInboxService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly logger = inject(AppLoggerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly idleScheduler = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void) => number;
    }
  ).requestIdleCallback;
  private readonly emptyStarIcons = this.buildStarIcons(0);
  private readonly emptyRatingDistributionValue: RatingDistributionItem[] = [5, 4, 3, 2, 1].map(
    (stars) => ({
      stars,
      count: 0,
      percentage: 0,
    }),
  );
  private readonly reviewStarsCache = new Map<number, StarIcon[]>();
  private detailItemsCacheVehicle?: VehicleDetail;
  private detailItemsCache: DetailFactItem[] = [];
  private visibleDetailItemsCacheSource: DetailFactItem[] | null = null;
  private visibleDetailItemsCacheShowAll = false;
  private visibleDetailItemsCache: DetailFactItem[] = [];
  private promotionHighlightsCacheVehicle?: VehicleDetail;
  private promotionHighlightsCache: string[] = [];
  private promotionDetailsCacheVehicle?: VehicleDetail;
  private promotionDetailsCache: PromotionDetailItem[] = [];
  private pricingRuleHighlightsCacheVehicle?: VehicleDetail;
  private pricingRuleHighlightsCache: PricingRuleHighlightItem[] = [];
  private reviewAnalyticsCacheVehicle?: VehicleDetail;
  private reviewAnalyticsCache = {
    totalReviewCount: 0,
    displayRating: 0,
    recommendationPercentage: 0,
    ratingDistribution: this.emptyRatingDistributionValue,
    highlightedReviews: [] as VehicleDetail['reviews'],
    reviewHighlightSummary: '',
    averageRatingStars: this.emptyStarIcons,
  };

  protected vehicle?: VehicleDetail;
  protected readonly collapsedDetailCount = 6;
  protected showAllDetails = false;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const vehicleId = params.get('id');

      if (!vehicleId) {
        return;
      }

      this.vehiclesApiService
        .getById(vehicleId)
        .subscribe((vehicle) => {
          this.vehicle = vehicle;
          this.scheduleInboxWarmup();
        });
    });
  }

  protected get ctaLabel() {
    const user = this.authService.currentUser();

    if (!user) {
      return 'Entrar para reservar';
    }

    if (user.role === 'OWNER') {
      return this.isOwnVehicle ? 'Gerenciar meu anúncio' : 'Reservar agora';
    }

    if (user.role === 'ADMIN') {
      return 'Abrir admin';
    }

    return this.vehicle?.bookingApprovalMode === 'INSTANT'
      ? 'Reservar agora'
      : 'Solicitar reserva';
  }

  protected get ctaIcon() {
    const user = this.authService.currentUser();

    if (!user) {
      return 'login';
    }

    if (user.role === 'OWNER' && this.isOwnVehicle) {
      return 'edit_square';
    }

    if (user.role === 'ADMIN') {
      return 'admin_panel_settings';
    }

    return 'event_available';
  }

  protected get footerHelper() {
    if (this.showChatAction) {
      return 'Converse com o anunciante e reserve com segurança';
    }

    if (this.isOwnVehicle) {
      return 'Gerencie seu anúncio em tempo real';
    }

    return 'Reserva protegida pela Velo';
  }

  protected get pickupTitle() {
    if (!this.vehicle) {
      return '';
    }

    return this.vehicle.addressLine?.trim() || `${this.vehicle.city}, ${this.vehicle.state}`;
  }

  protected get pickupSubtitle() {
    if (!this.vehicle) {
      return '';
    }

    return this.vehicle.addressLine?.trim()
      ? `${this.vehicle.city}, ${this.vehicle.state}`
      : 'Retirada combinada com o anfitrião';
  }

  protected get detailItems() {
    if (!this.vehicle) {
      return [];
    }

    if (this.detailItemsCacheVehicle === this.vehicle) {
      return this.detailItemsCache;
    }

    const items: DetailFactItem[] = [
      {
        icon: 'category',
        label: 'Categoria',
        value: this.categoryLabel(this.vehicle.category),
      },
      {
        icon: 'directions_car',
        label: 'Modelo',
        value: this.vehicle.model,
      },
      {
        icon: 'workspace_premium',
        label: 'Marca',
        value: this.vehicle.brand,
      },
      {
        icon: 'event_seat',
        label: 'Capacidade',
        value: `${this.vehicle.seats} lugares`,
      },
      {
        icon: 'tune',
        label: 'Transmissão',
        value: this.transmissionLabel(this.vehicle.transmission).toUpperCase(),
      },
      {
        icon: 'local_gas_station',
        label: 'Combustível',
        value: this.fuelTypeLabel(this.vehicle.fuelType).toUpperCase(),
      },
      {
        icon: 'calendar_month',
        label: 'Ano',
        value: String(this.vehicle.year),
      },
      {
        icon: 'location_on',
        label: 'Localização',
        value: `${this.vehicle.city}, ${this.vehicle.state}`,
      },
      {
        icon: 'bolt',
        label: 'Reserva',
        value:
          this.vehicle.bookingApprovalMode === 'INSTANT'
            ? 'Confirmação instantânea'
            : 'Aprovação manual',
      },
      {
        icon: 'policy',
        label: 'Cancelamento',
        value: this.cancellationPolicyLabel(this.vehicle.cancellationPolicy),
      },
    ];

    if (this.vehicle.vehicleType === 'MOTORCYCLE') {
      if (this.vehicle.motorcycleStyle) {
        items.push({
          icon: 'two_wheeler',
          label: 'Estilo',
          value: this.motorcycleStyleLabel(this.vehicle.motorcycleStyle),
        });
      }

      if (this.vehicle.engineCc) {
        items.push({
          icon: 'speed',
          label: 'Cilindrada',
          value: `${this.vehicle.engineCc} cc`,
        });
      }

      items.push({
        icon: 'verified',
        label: 'Freio ABS',
        value: this.vehicle.hasAbs ? 'Sim' : 'Não',
      });
    }

    this.detailItemsCacheVehicle = this.vehicle;
    this.detailItemsCache = items;

    return this.detailItemsCache;
  }

  protected get promotionHighlights() {
    if (!this.vehicle) {
      return [];
    }

    if (this.promotionHighlightsCacheVehicle === this.vehicle) {
      return this.promotionHighlightsCache;
    }

    this.promotionHighlightsCacheVehicle = this.vehicle;
    this.promotionHighlightsCache = [
      this.vehicle.firstBookingDiscountPercent
        ? `Primeira reserva ${this.vehicle.firstBookingDiscountPercent}% off`
        : '',
      this.vehicle.weeklyDiscountPercent
        ? `Pacote semanal ${this.vehicle.weeklyDiscountPercent}% off`
        : '',
      this.vehicle.couponCode && this.vehicle.couponDiscountPercent
        ? `Cupom ${this.vehicle.couponDiscountPercent}% off`
        : '',
    ].filter(Boolean);

    return this.promotionHighlightsCache;
  }

  protected get promotionDetails() {
    if (!this.vehicle) {
      return [];
    }

    if (this.promotionDetailsCacheVehicle === this.vehicle) {
      return this.promotionDetailsCache;
    }

    this.promotionDetailsCacheVehicle = this.vehicle;
    this.promotionDetailsCache = [
      this.vehicle.firstBookingDiscountPercent
        ? {
            title: 'Desconto de primeira reserva',
            description: `Novos locatários recebem ${this.vehicle.firstBookingDiscountPercent}% de desconto no valor base da reserva.`,
            code: null,
          }
        : null,
      this.vehicle.weeklyDiscountPercent
        ? {
            title: 'Pacote semanal automático',
            description: `Reservas com 7 dias ou mais recebem ${this.vehicle.weeklyDiscountPercent}% de desconto automaticamente.`,
            code: null,
          }
        : null,
      this.vehicle.couponCode && this.vehicle.couponDiscountPercent
        ? {
            title: 'Cupom promocional',
            description: `Use este código para aplicar ${this.vehicle.couponDiscountPercent}% de desconto no valor base da reserva.`,
            code: this.vehicle.couponCode,
          }
        : null,
    ].filter((promotion): promotion is PromotionDetailItem => !!promotion);

    return this.promotionDetailsCache;
  }

  protected get pricingRuleHighlights() {
    if (!this.vehicle) {
      return [];
    }

    if (this.pricingRuleHighlightsCacheVehicle === this.vehicle) {
      return this.pricingRuleHighlightsCache;
    }

    this.pricingRuleHighlightsCacheVehicle = this.vehicle;
    this.pricingRuleHighlightsCache = [
      this.vehicle.weekendSurchargePercent
        ? {
            title: 'Fim de semana',
            description: `${this.vehicle.weekendSurchargePercent}% de acréscimo automático nas diárias de sábado e domingo.`,
          }
        : null,
      this.vehicle.holidaySurchargePercent
        ? {
            title: 'Feriados',
            description: `${this.vehicle.holidaySurchargePercent}% de ajuste para datas de feriado nacional.`,
          }
        : null,
      this.vehicle.highDemandSurchargePercent
        ? {
            title: 'Alta demanda',
            description: `${this.vehicle.highDemandSurchargePercent}% extra quando o mês já estiver com ocupação elevada.`,
          }
        : null,
      this.vehicle.advanceBookingDiscountPercent
        ? {
            title: 'Antecedência',
            description: `${this.vehicle.advanceBookingDiscountPercent}% de desconto para reservas feitas com ${this.vehicle.advanceBookingDaysThreshold} dia(s) ou mais.`,
          }
        : null,
    ].filter((rule): rule is PricingRuleHighlightItem => !!rule);

    return this.pricingRuleHighlightsCache;
  }

  protected get visibleDetailItems() {
    const detailItems = this.detailItems;

    if (
      this.visibleDetailItemsCacheSource === detailItems &&
      this.visibleDetailItemsCacheShowAll === this.showAllDetails
    ) {
      return this.visibleDetailItemsCache;
    }

    this.visibleDetailItemsCacheSource = detailItems;
    this.visibleDetailItemsCacheShowAll = this.showAllDetails;
    this.visibleDetailItemsCache = this.showAllDetails
      ? detailItems
      : detailItems.slice(0, this.collapsedDetailCount);

    return this.visibleDetailItemsCache;
  }

  protected get totalReviewCount() {
    return this.reviewAnalytics.totalReviewCount;
  }

  protected get displayRating() {
    return this.reviewAnalytics.displayRating;
  }

  protected get averageRatingStars() {
    return this.reviewAnalytics.averageRatingStars;
  }

  protected get emptyRatingStars() {
    return this.emptyStarIcons;
  }

  protected get recommendationPercentage() {
    return this.reviewAnalytics.recommendationPercentage;
  }

  protected get ratingDistribution() {
    return this.reviewAnalytics.ratingDistribution;
  }

  protected get emptyRatingDistribution() {
    return this.emptyRatingDistributionValue;
  }

  protected get highlightedReviews() {
    return this.reviewAnalytics.highlightedReviews;
  }

  protected get reviewHighlightSummary() {
    return this.reviewAnalytics.reviewHighlightSummary;
  }

  protected toggleDetails() {
    this.showAllDetails = !this.showAllDetails;
  }

  protected transmissionLabel(transmission: string) {
    const labels: Record<string, string> = {
      AUTOMATIC: 'Auto',
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

  protected cancellationPolicyLabel(policy: VehicleDetail['cancellationPolicy']) {
    const labels = {
      FLEXIBLE: 'Flexível',
      MODERATE: 'Moderada',
      STRICT: 'Rígida',
    } as const;

    return labels[policy] || policy;
  }

  protected motorcycleStyleLabel(style: string) {
    const labels: Record<string, string> = {
      SCOOTER: 'Scooter',
      STREET: 'Street',
      SPORT: 'Sport',
      TRAIL: 'Trail',
      CUSTOM: 'Custom',
      TOURING: 'Touring',
    };

    return labels[style] || style;
  }

  protected get mapLink() {
    if (!this.vehicle?.latitude || !this.vehicle?.longitude) {
      return 'https://www.openstreetmap.org';
    }

    return `https://www.openstreetmap.org/?mlat=${this.vehicle.latitude}&mlon=${this.vehicle.longitude}#map=15/${this.vehicle.latitude}/${this.vehicle.longitude}`;
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

  protected reviewStars(rating: number) {
    const normalizedRating = Math.max(0, Math.min(5, rating));

    if (!this.reviewStarsCache.has(normalizedRating)) {
      this.reviewStarsCache.set(normalizedRating, this.buildStarIcons(normalizedRating));
    }

    return this.reviewStarsCache.get(normalizedRating) ?? this.emptyStarIcons;
  }

  protected excerptReview(comment?: string | null, maxLength = 180) {
    const text = comment?.trim() || 'Sem comentário adicional.';

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength).trimEnd()}...`;
  }

  private buildStarIcons(rating: number): StarIcon[] {
    const normalizedRating = Math.max(0, Math.min(5, rating));
    const fullStars = Math.floor(normalizedRating);
    const hasHalfStar = normalizedRating - fullStars >= 0.5;

    return Array.from({ length: 5 }, (_, index) => {
      if (index < fullStars) {
        return 'star';
      }

      if (index === fullStars && hasHalfStar) {
        return 'star_half';
      }

      return 'star_border';
    });
  }

  protected goToBooking() {
    if (!this.vehicle) {
      return;
    }

    const user = this.authService.currentUser();

    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (user.role === 'OWNER' && this.isOwnVehicle) {
      this.router.navigate(['/anunciar-carro']);
      return;
    }

    if (user.role === 'ADMIN') {
      this.router.navigate(['/admin']);
      return;
    }

    this.router.navigate(['/bookings/new', this.vehicle.id]);
  }

  protected get showChatAction() {
    const user = this.authService.currentUser();

    if (!this.vehicle) {
      return false;
    }

    if (!user) {
      return true;
    }

    if (user.role === 'ADMIN') {
      return false;
    }

    return !this.isOwnVehicle;
  }

  protected get chatLabel() {
    return this.authService.currentUser()
      ? 'Conversar com o proprietário'
      : 'Entrar para conversar';
  }

  protected get footerChatLabel() {
    return this.showChatAction ? 'Conversar' : undefined;
  }

  protected get footerChatUnreadCount() {
    if (!this.vehicle || !this.showChatAction) {
      return 0;
    }

    return (
      this.chatInboxService.findConversation(
        this.vehicle.id,
        this.vehicle.owner?.id ?? null,
      )?.unreadCount ?? 0
    );
  }

  protected openChat() {
    if (!this.vehicle) {
      return;
    }

    this.logger.info('vehicle-detail', 'open_chat_requested', {
      vehicleId: this.vehicle.id,
      ownerId: this.vehicle.owner?.id ?? null,
    });

    const user = this.authService.currentUser();

    if (!this.authService.hasSession()) {
      this.logger.warn('vehicle-detail', 'open_chat_requires_login', {
        vehicleId: this.vehicle.id,
      });
      this.router.navigate(['/auth/login']);
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.authService
        .restoreSession()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((authenticated) => {
          if (!authenticated) {
            this.router.navigate(['/auth/login']);
            return;
          }

          this.chatInboxService.ensureReady().subscribe();
          this.startChatFlow();
        });
      return;
    }

    this.startChatFlow();
  }

  private get isOwnVehicle() {
    const userId = this.authService.getSessionUserId();
    return !!userId && !!this.vehicle && this.vehicle.owner?.id === userId;
  }

  protected get isFavorite() {
    return !!this.vehicle && this.favoritesService.isFavorite(this.vehicle.id);
  }

  protected get isFavoritePending() {
    return !!this.vehicle && this.favoritesService.isPending(this.vehicle.id);
  }

  protected toggleFavorite() {
    if (!this.vehicle) {
      return;
    }

    this.favoritesService.toggleFavorite(this.vehicle);
  }

  protected trackByIndex(index: number) {
    return index;
  }

  protected trackById(_index: number, item: { id: string }) {
    return item.id;
  }

  protected trackByString(_index: number, value: string) {
    return value;
  }

  protected trackByTitle(_index: number, item: { title: string }) {
    return item.title;
  }

  protected trackByStars(_index: number, item: { stars: number }) {
    return item.stars;
  }

  protected trackByDetailLabel(_index: number, item: DetailFactItem) {
    return item.label;
  }

  protected trackByAddon(index: number, item: { id?: string; name: string }) {
    return item.id || `${item.name}-${index}`;
  }

  private startChatFlow() {
    if (!this.vehicle) {
      return;
    }

    const userId = this.authService.getSessionUserId();

    if (this.isOwnVehicle) {
      this.logger.warn('vehicle-detail', 'open_chat_blocked_own_vehicle', {
        vehicleId: this.vehicle.id,
        userId,
      });
      this.router.navigate(['/anunciar-carro']);
      return;
    }

    this.chatApiService
      .startVehicleConversation(this.vehicle.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversation) => {
          this.logger.info('vehicle-detail', 'open_chat_succeeded', {
            vehicleId: this.vehicle?.id ?? null,
            conversationId: conversation.id,
          });
          this.chatInboxService.refresh();
          this.router.navigate(['/chat', conversation.id]);
        },
        error: (error) => {
          this.logger.error('vehicle-detail', 'open_chat_failed', {
            vehicleId: this.vehicle?.id ?? null,
            message: error?.message ?? 'Erro desconhecido',
          });
        },
      });
  }

  private scheduleInboxWarmup() {
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
    }, 900);
  }

  private get reviewAnalytics() {
    if (!this.vehicle) {
      return {
        totalReviewCount: 0,
        displayRating: 0,
        recommendationPercentage: 0,
        ratingDistribution: this.emptyRatingDistributionValue,
        highlightedReviews: [] as VehicleDetail['reviews'],
        reviewHighlightSummary: '',
        averageRatingStars: this.emptyStarIcons,
      };
    }

    if (this.reviewAnalyticsCacheVehicle === this.vehicle) {
      return this.reviewAnalyticsCache;
    }

    const totalReviewCount = this.vehicle.reviewsCount || this.vehicle.reviews.length;
    const displayRating = this.vehicle.ratingAverage
      ? this.vehicle.ratingAverage
      : this.vehicle.reviews.length
        ? this.vehicle.reviews.reduce((sum, review) => sum + review.rating, 0) /
          this.vehicle.reviews.length
        : 0;
    const recommendationPercentage = this.vehicle.reviews.length
      ? Math.round(
          (this.vehicle.reviews.filter((review) => review.rating >= 4).length /
            this.vehicle.reviews.length) *
            100,
        )
      : Math.round((displayRating / 5) * 100);
    const ratingDistribution = this.vehicle.reviews.length
      ? [5, 4, 3, 2, 1].map((stars) => {
          const count = this.vehicle!.reviews.filter((review) => review.rating === stars).length;
          return {
            stars,
            count,
            percentage: Math.round((count / this.vehicle!.reviews.length) * 100),
          };
        })
      : this.emptyRatingDistributionValue;
    const highlightedReviews = [...this.vehicle.reviews]
      .filter((review) => review.comment?.trim())
      .sort((left, right) => {
        if (right.rating !== left.rating) {
          return right.rating - left.rating;
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      })
      .slice(0, 2);
    const tone =
      recommendationPercentage >= 85
        ? 'muito positiva'
        : recommendationPercentage >= 65
          ? 'positiva'
          : 'mista';
    const topExcerpt = highlightedReviews[0]?.comment?.trim();
    const leadSnippet = topExcerpt
      ? `Destaque recorrente: ${this.excerptReview(topExcerpt, 120)}`
      : '';

    this.reviewAnalyticsCacheVehicle = this.vehicle;
    this.reviewAnalyticsCache = {
      totalReviewCount,
      displayRating,
      recommendationPercentage,
      ratingDistribution,
      highlightedReviews,
      reviewHighlightSummary: [
        `Com base nas avaliações recebidas, a percepção sobre este carro é ${tone}.`,
        `${recommendationPercentage}% das notas ficaram entre 4 e 5 estrelas.`,
        leadSnippet,
      ]
        .filter(Boolean)
        .join(' '),
      averageRatingStars: this.reviewStars(displayRating),
    };

    return this.reviewAnalyticsCache;
  }
}
