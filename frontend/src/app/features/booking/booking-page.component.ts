import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { AvailabilityApiService } from '../../core/services/availability-api.service';
import { AuthService } from '../../core/services/auth.service';
import { BookingsApiService } from '../../core/services/bookings-api.service';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';
import {
  AppliedPromotion,
  VehicleAddon,
  VehicleAvailabilityResponse,
  VehicleDetail,
  VehiclePricingPreview,
} from '../../core/models/domain.models';

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  template: `
    <main class="page booking-page" *ngIf="vehicle">
      <section class="booking-card">
        <div class="booking-card__copy">
          <span class="eyebrow">Reserva</span>
          <h1>{{ vehicle.title }}</h1>
          <p>{{ vehicle.city }}, {{ vehicle.state }}</p>
          <strong class="price-text">{{ vehicle.dailyRate | currency: 'BRL' : 'symbol' : '1.0-0' }} / semana</strong>
          <span class="booking-chip">
            {{ vehicle.bookingApprovalMode === 'INSTANT' ? 'Confirmação instantânea' : 'Aprovação manual' }}
          </span>
        </div>

        <img
          class="booking-card__image"
          [src]="vehicle.coverImage || fallbackImage"
          [alt]="vehicle.title"
        />
      </section>

      <section class="booking-form">
        <label>
          <span>Data de retirada</span>
          <input [(ngModel)]="startDate" (ngModelChange)="refreshPricingPreview()" type="date" [min]="today" />
        </label>

        <label>
          <span>Data de devolução</span>
          <input [(ngModel)]="endDate" (ngModelChange)="refreshPricingPreview()" type="date" [min]="startDate || today" />
        </label>

        <label>
          <span>Observações</span>
          <textarea [(ngModel)]="notes" rows="4" placeholder="Combine detalhes com o proprietário"></textarea>
        </label>

        <section class="addon-card" *ngIf="vehicle.addons.length">
          <div>
            <span class="eyebrow eyebrow--soft">Extras</span>
            <h2>Adicione opcionais</h2>
          </div>

          <label class="addon-option" *ngFor="let addon of activeAddons">
            <input
              type="checkbox"
              [checked]="isAddonSelected(addon.id)"
              (change)="toggleAddon(addon.id)"
            />
            <div>
              <strong>{{ addon.name }}</strong>
              <p>{{ addon.description || 'Item adicional para sua reserva.' }}</p>
            </div>
            <span class="price-text">{{ addon.price | currency: 'BRL' : 'symbol' : '1.2-2' }}</span>
          </label>
        </section>

        <section class="promotion-card" *ngIf="hasPromotionOffer">
          <div>
            <span class="eyebrow eyebrow--soft">Promoções</span>
            <h2>Economize nesta reserva</h2>
          </div>

          <div class="promotion-pill-list">
            <span class="promotion-pill" *ngIf="vehicle.firstBookingDiscountPercent">
              Primeira reserva {{ vehicle.firstBookingDiscountPercent }}% off
            </span>
            <span class="promotion-pill" *ngIf="vehicle.weeklyDiscountPercent">
              Pacote semanal {{ vehicle.weeklyDiscountPercent }}% off
            </span>
            <span class="promotion-pill" *ngIf="vehicle.couponCode">
              Cupom {{ vehicle.couponDiscountPercent }}% off
            </span>
          </div>

          <label *ngIf="vehicle.couponCode">
            <span>Cupom promocional</span>
            <input [(ngModel)]="couponCode" placeholder="Digite o cupom recebido" />
          </label>

          <p class="hint" *ngIf="vehicle.firstBookingDiscountPercent && !isFirstBookingEligible">
            O desconto de primeira reserva vale apenas para novos locatários.
          </p>

          <p class="hint" *ngIf="couponCode && vehicle.couponCode && !isCouponPreviewValid">
            Este cupom não corresponde a este anúncio.
          </p>
        </section>

        <p class="hint" *ngIf="pricingLoading">Atualizando preço dinâmico...</p>
        <p class="feedback feedback--error" *ngIf="pricingError">{{ pricingError }}</p>

        <p class="hint" *ngIf="availabilityLoading">Consultando datas indisponíveis...</p>
        <p class="feedback feedback--error" *ngIf="availabilityError">{{ availabilityError }}</p>
      </section>

      <section class="availability-card" *ngIf="availability">
        <div class="availability-card__head">
          <div>
            <span class="eyebrow eyebrow--soft">Disponibilidade</span>
            <h2>Calendário da reserva</h2>
          </div>
          <span class="availability-status" [class.availability-status--error]="selectedRangeHasConflict">
            {{ selectedRangeHasConflict ? 'Período indisponível' : 'Pronto para reservar' }}
          </span>
        </div>

        <p class="availability-description">
          O sistema já impede conflito com reservas aprovadas e bloqueios feitos pelo proprietário.
        </p>

        <div class="date-list" *ngIf="nextUnavailablePeriods.length">
          <article class="date-pill" *ngFor="let period of nextUnavailablePeriods">
            <strong>{{ period.label }}</strong>
            <span>{{ period.reason }}</span>
          </article>
        </div>

        <p class="hint" *ngIf="!nextUnavailablePeriods.length">
          Nenhum bloqueio próximo encontrado. Escolha as datas e siga com a solicitação.
        </p>
      </section>

      <section class="booking-summary">
        <div><span>Diárias</span><strong>{{ totalDays }}</strong></div>
        <div>
          <span>Locação base</span>
          <strong class="price-text">{{ staticRentalAmount | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
        </div>
        <div
          *ngFor="let adjustment of pricingAdjustments"
          class="booking-summary__adjustment"
          [class.booking-summary__adjustment--discount]="adjustment.amount < 0"
        >
          <span>{{ adjustment.label }}</span>
          <strong class="price-text">
            {{ adjustment.amount > 0 ? '+' : '' }}{{ adjustment.amount | currency: 'BRL' : 'symbol' : '1.2-2' }}
          </strong>
        </div>
        <div *ngIf="selectedAddons.length">
          <span>Extras</span>
          <strong class="price-text">{{ addonsAmount | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
        </div>
        <div>
          <span>Subtotal</span>
          <strong class="price-text">{{ subtotal | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
        </div>
        <div *ngFor="let promotion of appliedPromotionPreview" class="booking-summary__discount">
          <span>{{ promotion.label }}</span>
          <strong class="price-text">-{{ promotion.amount | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
        </div>
        <div *ngIf="discountsAmount">
          <span>Descontos</span>
          <strong class="price-text">-{{ discountsAmount | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
        </div>
        <div>
          <span>Taxa da plataforma</span>
          <strong class="price-text">{{ platformFee | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
        </div>
        <div class="booking-summary__total">
          <span>Total</span>
          <strong class="price-text price-text--total">{{ totalAmount | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
        </div>
        <p class="hint">
          Cancelamento {{ cancellationPolicyLabel(vehicle.cancellationPolicy).toLowerCase() }}.
        </p>
        <p class="feedback feedback--error" *ngIf="selectedRangeHasConflict">
          O período selecionado conflita com uma reserva já aprovada ou um bloqueio manual.
        </p>
      </section>

      <button
        type="button"
        class="btn btn-primary"
        (click)="submit()"
        [disabled]="submitting || availabilityLoading || selectedRangeHasConflict"
      >
        {{ submitting ? 'Enviando...' : submitLabel }}
      </button>

      <p class="feedback" *ngIf="feedback">{{ feedback }}</p>
    </main>
  `,
  styles: [
    `
      .booking-page {
        display: grid;
        gap: 18px;
        padding: 18px 12px 132px;
      }

      .booking-card {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-direction: column;
        gap: 18px;
        padding: 20px;
        border-radius: 30px;
        background: rgba(255, 255, 255, 0.98);
        color: var(--text-primary);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-strong);
      }

      .booking-form,
      .booking-summary,
      .availability-card {
        display: grid;
        gap: 14px;
        padding: 18px 16px;
        border-radius: 26px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
      }

      .booking-card__copy {
        display: grid;
        gap: 8px;
      }

      .booking-chip {
        display: inline-flex;
        width: fit-content;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(88, 181, 158, 0.1);
        color: var(--primary);
        font-size: 12px;
        font-weight: 700;
      }

      .booking-card__image {
        width: 100%;
        max-height: 180px;
        object-fit: contain;
        filter: drop-shadow(0 18px 26px rgba(90, 115, 145, 0.16));
      }

      .eyebrow {
        color: var(--primary);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .eyebrow--soft {
        color: var(--text-secondary);
      }

      h1,
      h2,
      p,
      strong {
        margin: 0;
      }

      p {
        color: var(--text-secondary);
      }

      label {
        display: grid;
        gap: 8px;
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 600;
      }

      input,
      textarea {
        width: 100%;
        min-width: 0;
        border: 1px solid var(--glass-border-soft);
        border-radius: 18px;
        padding: 12px 14px;
        font: inherit;
        background: var(--surface-muted);
      }

      .addon-card {
        display: grid;
        gap: 10px;
        padding: 16px;
        border-radius: 18px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .promotion-card {
        display: grid;
        gap: 12px;
        padding: 16px;
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(255, 248, 225, 0.92), rgba(255, 255, 255, 0.96));
        border: 1px solid rgba(245, 158, 11, 0.22);
      }

      .promotion-pill-list {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .promotion-pill {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.12);
        color: #9a5c00;
        font-size: 12px;
        font-weight: 700;
      }

      .addon-option {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: start;
        gap: 12px;
        padding: 12px;
        border-radius: 14px;
        background: #fff;
        border: 1px solid var(--glass-border-soft);
      }

      .addon-option strong,
      .addon-option p,
      .addon-option span {
        margin: 0;
      }

      .addon-option span:last-child {
        grid-column: 2;
        justify-self: start;
        color: var(--primary);
        font-weight: 700;
      }

      .booking-summary div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .booking-summary__discount span,
      .booking-summary__discount strong {
        color: var(--success);
      }

      .booking-summary__adjustment span,
      .booking-summary__adjustment strong {
        color: var(--warning);
      }

      .booking-summary__adjustment--discount span,
      .booking-summary__adjustment--discount strong {
        color: var(--success);
      }

      .availability-card__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .availability-status {
        display: inline-flex;
        align-items: center;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(34, 197, 94, 0.12);
        color: var(--success);
        font-size: 12px;
        font-weight: 700;
      }

      .availability-status--error {
        background: rgba(239, 68, 68, 0.12);
        color: var(--error);
      }

      .availability-description,
      .hint {
        color: var(--text-secondary);
      }

      .date-list {
        display: grid;
        gap: 10px;
      }

      .date-pill {
        display: grid;
        gap: 4px;
        padding: 14px;
        border-radius: 18px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .booking-summary__total {
        padding-top: 14px;
        border-top: 1px solid var(--border);
        font-size: 18px;
      }

      .feedback {
        text-align: center;
        color: var(--primary);
        font-weight: 600;
      }

      .feedback--error {
        color: var(--error);
      }

      @media (min-width: 641px) {
        .booking-page {
          padding: 20px 16px 132px;
        }

        .booking-card {
          flex-direction: row;
          align-items: center;
        }

        .booking-card__image {
          width: min(44%, 220px);
          max-height: none;
        }

        .addon-option {
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
        }

        .addon-option span:last-child {
          grid-column: auto;
          justify-self: end;
        }
      }

      @media (min-width: 1024px) {
        .booking-page {
          grid-template-columns: minmax(0, 1.15fr) 360px;
          align-items: start;
          gap: 20px;
          padding: 28px 20px 56px;
        }

        .booking-card,
        .booking-form,
        .availability-card {
          grid-column: 1;
        }

        .booking-summary {
          grid-column: 2;
          grid-row: 1 / span 2;
          position: sticky;
          top: 24px;
        }

        .booking-page > .btn {
          grid-column: 2;
          width: 100%;
        }

        .booking-page > .feedback {
          grid-column: 1 / -1;
        }
      }

    `,
  ],
})
export class BookingPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly availabilityApiService = inject(AvailabilityApiService);
  private readonly vehiclesApiService = inject(VehiclesApiService);
  private readonly bookingsApiService = inject(BookingsApiService);

  protected vehicle?: VehicleDetail;
  protected availability?: VehicleAvailabilityResponse;
  protected pricingPreview?: VehiclePricingPreview | null;
  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected startDate = '';
  protected endDate = '';
  protected notes = '';
  protected couponCode = '';
  protected selectedAddonIds = new Set<string>();
  protected feedback = '';
  protected availabilityError = '';
  protected availabilityLoading = false;
  protected pricingError = '';
  protected pricingLoading = false;
  protected submitting = false;
  protected hasPreviousBookings = false;

  constructor() {
    const vehicleId = this.route.snapshot.paramMap.get('vehicleId');

    if (vehicleId) {
      this.availabilityLoading = true;

      forkJoin({
        vehicle: this.vehiclesApiService.getById(vehicleId),
        availability: this.availabilityApiService.getVehicleAvailability(vehicleId),
        myBookings: this.authService.isAuthenticated()
          ? this.bookingsApiService.getMine().pipe(catchError(() => of([])))
          : of([]),
      }).subscribe({
        next: ({ vehicle, availability, myBookings }) => {
          this.vehicle = vehicle;
          this.availability = availability;
          this.hasPreviousBookings = myBookings.some(
            (booking) =>
              booking.status !== 'REJECTED' && booking.status !== 'CANCELLED',
          );
          this.availabilityLoading = false;
        },
        error: (error) => {
          this.availabilityError =
            error?.error?.message || 'Não foi possível carregar a disponibilidade.';
          this.availabilityLoading = false;
        },
      });
    }
  }

  protected get selectedRangeHasConflict() {
    if (!this.startDate || !this.endDate || !this.availability) {
      return false;
    }

    return this.hasDateConflict(this.startDate, this.endDate);
  }

  protected get nextUnavailablePeriods() {
    if (!this.availability) {
      return [];
    }

    const periods = [
      ...this.availability.blockedDates.map((period) => ({
        startDate: period.startDate,
        endDate: period.endDate,
        reason: period.reason || 'Bloqueado pelo proprietário',
      })),
      ...this.availability.approvedBookings.map((period) => ({
        startDate: period.startDate,
        endDate: period.endDate,
        reason: 'Reserva aprovada',
      })),
    ]
      .sort((left, right) => left.startDate.localeCompare(right.startDate))
      .slice(0, 4);

    return periods.map((period) => ({
      label: `${this.formatDate(period.startDate)} até ${this.formatDate(period.endDate)}`,
      reason: period.reason,
    }));
  }

  protected get totalDays() {
    if (!this.startDate || !this.endDate) {
      return 0;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    const diffInMs = end.getTime() - start.getTime();

    return Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));
  }

  protected get hasPromotionOffer() {
    return !!this.vehicle && (
      this.vehicle.firstBookingDiscountPercent > 0 ||
      this.vehicle.weeklyDiscountPercent > 0 ||
      (!!this.vehicle.couponCode && this.vehicle.couponDiscountPercent > 0)
    );
  }

  protected get isFirstBookingEligible() {
    return !this.hasPreviousBookings;
  }

  protected get baseRentalAmount() {
    return this.pricingPreview?.adjustedRentalAmount ?? this.staticRentalAmount;
  }

  protected get staticRentalAmount() {
    return this.vehicle ? this.totalDays * this.vehicle.dailyRate : 0;
  }

  protected get subtotal() {
    return this.baseRentalAmount + this.addonsAmount;
  }

  protected get pricingAdjustments() {
    return this.pricingPreview?.adjustments ?? [];
  }

  protected get appliedPromotionPreview(): AppliedPromotion[] {
    if (!this.vehicle) {
      return [];
    }

    const preview: AppliedPromotion[] = [];
    const baseAmount = this.baseRentalAmount;
    const addPromotion = (
      code: AppliedPromotion['code'],
      label: string,
      percent: number,
    ) => {
      if (percent <= 0 || baseAmount <= 0) {
        return;
      }

      const usedAmount = preview.reduce((total, promotion) => total + promotion.amount, 0);
      const remainingAmount = Math.max(0, baseAmount - usedAmount);
      const amount = Math.min(baseAmount * (percent / 100), remainingAmount);

      if (amount <= 0) {
        return;
      }

      preview.push({
        code,
        label,
        amount,
      });
    };

    if (this.vehicle.firstBookingDiscountPercent > 0 && this.isFirstBookingEligible) {
      addPromotion(
        'FIRST_BOOKING',
        'Primeira reserva',
        this.vehicle.firstBookingDiscountPercent,
      );
    }

    if (this.totalDays >= 7 && this.vehicle.weeklyDiscountPercent > 0) {
      addPromotion(
        'WEEKLY_PACKAGE',
        'Pacote semanal',
        this.vehicle.weeklyDiscountPercent,
      );
    }

    if (this.isCouponPreviewValid && this.vehicle.couponDiscountPercent > 0) {
      addPromotion(
        'COUPON',
        `Cupom ${this.normalizedCouponCode}`,
        this.vehicle.couponDiscountPercent,
      );
    }

    return preview.map((promotion) => ({
      ...promotion,
      amount: Number(promotion.amount.toFixed(2)),
    }));
  }

  protected get normalizedCouponCode() {
    return this.couponCode.trim().toUpperCase();
  }

  protected get isCouponPreviewValid() {
    return (
      !!this.vehicle?.couponCode &&
      !!this.normalizedCouponCode &&
      this.vehicle.couponCode.toUpperCase() === this.normalizedCouponCode
    );
  }

  protected get discountsAmount() {
    return this.appliedPromotionPreview.reduce(
      (total, promotion) => total + promotion.amount,
      0,
    );
  }

  protected get discountedSubtotal() {
    return Math.max(0, this.subtotal - this.discountsAmount);
  }

  protected get platformFee() {
    return this.discountedSubtotal * 0.12;
  }

  protected get totalAmount() {
    return this.discountedSubtotal + this.platformFee;
  }

  protected get activeAddons(): VehicleAddon[] {
    return (this.vehicle?.addons ?? []).filter((addon) => addon.enabled !== false);
  }

  protected get selectedAddons() {
    return this.activeAddons.filter((addon) => this.selectedAddonIds.has(addon.id));
  }

  protected get addonsAmount() {
    return this.selectedAddons.reduce((total, addon) => total + addon.price, 0);
  }

  protected get submitLabel() {
    if (!this.vehicle) {
      return 'Solicitar reserva';
    }

    return this.vehicle.bookingApprovalMode === 'INSTANT'
      ? 'Reservar agora'
      : 'Solicitar reserva';
  }

  protected isAddonSelected(addonId: string) {
    return this.selectedAddonIds.has(addonId);
  }

  protected toggleAddon(addonId: string) {
    const next = new Set(this.selectedAddonIds);

    if (next.has(addonId)) {
      next.delete(addonId);
    } else {
      next.add(addonId);
    }

    this.selectedAddonIds = next;
  }

  protected cancellationPolicyLabel(policy: VehicleDetail['cancellationPolicy']) {
    const labels = {
      FLEXIBLE: 'Flexível',
      MODERATE: 'Moderada',
      STRICT: 'Rígida',
    } as const;

    return labels[policy] || policy;
  }

  protected submit() {
    if (!this.vehicle || !this.startDate || !this.endDate) {
      this.feedback = 'Escolha o período da reserva antes de continuar.';
      return;
    }

    if (this.selectedRangeHasConflict) {
      this.feedback = 'Escolha outro período para evitar conflito com datas indisponíveis.';
      return;
    }

    this.submitting = true;
    this.feedback = '';

    this.bookingsApiService
      .create({
        vehicleId: this.vehicle.id,
        startDate: this.startDate,
        endDate: this.endDate,
        notes: this.notes,
        selectedAddonIds: [...this.selectedAddonIds],
        couponCode: this.normalizedCouponCode || undefined,
      })
      .subscribe({
        next: (booking) => {
          this.feedback =
            booking.status === 'APPROVED'
              ? 'Reserva confirmada instantaneamente.'
              : 'Solicitação enviada. Agora o proprietário pode aprovar ou recusar.';
          this.submitting = false;
          setTimeout(() => this.router.navigate(['/profile']), 900);
        },
        error: (error) => {
          this.feedback =
            error?.error?.message || 'Não foi possível criar a reserva.';
          this.submitting = false;
        },
      });
  }

  protected refreshPricingPreview() {
    if (!this.vehicle || !this.startDate || !this.endDate || this.totalDays <= 0) {
      this.pricingPreview = null;
      this.pricingError = '';
      return;
    }

    this.pricingLoading = true;
    this.pricingError = '';

    this.vehiclesApiService
      .getPricingPreview(this.vehicle.id, this.startDate, this.endDate)
      .subscribe({
        next: (preview) => {
          this.pricingPreview = preview;
          this.pricingLoading = false;
        },
        error: (error) => {
          this.pricingPreview = null;
          this.pricingLoading = false;
          this.pricingError =
            error?.error?.message || 'Não foi possível calcular o preço dinâmico.';
        },
      });
  }

  private hasDateConflict(startDate: string, endDate: string) {
    if (!this.availability) {
      return false;
    }

    const overlaps = (periodStart: string, periodEnd: string) =>
      periodStart < endDate && periodEnd > startDate;

    return (
      this.availability.blockedDates.some((period) =>
        overlaps(period.startDate.slice(0, 10), period.endDate.slice(0, 10)),
      ) ||
      this.availability.approvedBookings.some((period) =>
        overlaps(period.startDate.slice(0, 10), period.endDate.slice(0, 10)),
      )
    );
  }

  private formatDate(value: string) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }
}
