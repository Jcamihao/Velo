import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BookingsApiService } from '../../core/services/bookings-api.service';
import { Booking, PaymentMethod } from '../../core/models/domain.models';
import { ReviewsApiService } from '../../core/services/reviews-api.service';
import { BookingChecklistCardComponent } from '../../shared/components/booking-checklist-card.component';

@Component({
  selector: 'app-my-bookings-page',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    BookingChecklistCardComponent,
  ],
  template: `
    <main class="page reservations-page">
      <section class="section-head">
        <span>Minhas reservas</span>
        <h1>Acompanhe seu histórico</h1>
      </section>

      <p class="feedback" *ngIf="feedback">{{ feedback }}</p>
      <p class="feedback feedback--error" *ngIf="errorMessage">
        {{ errorMessage }}
      </p>

      <section class="state-card" *ngIf="loading">
        <strong>Carregando reservas...</strong>
        <p>Estamos buscando suas solicitações mais recentes.</p>
      </section>

      <section
        class="state-card"
        *ngIf="!loading && !errorMessage && !bookings.length"
      >
        <strong>Nenhuma reserva por enquanto</strong>
        <p>
          Quando você solicitar um carro, ele vai aparecer aqui com o status
          atualizado.
        </p>
        <a routerLink="/search" class="btn btn-primary">Buscar carros</a>
      </section>

      <section class="booking-list" *ngIf="!loading && bookings.length">
        <article class="booking-card" *ngFor="let booking of bookings">
          <img
            [src]="booking.vehicle.image || fallbackImage"
            [alt]="booking.vehicle.title"
          />

          <div class="booking-card__content">
            <div class="booking-card__top">
              <strong>{{ booking.vehicle.title }}</strong>
              <span
                class="status"
                [class]="'status status--' + booking.status.toLowerCase()"
              >
                {{ booking.status }}
              </span>
            </div>

            <p>{{ booking.vehicle.city }}, {{ booking.vehicle.state }}</p>
            <p>
              {{ booking.startDate | date: 'dd/MM/yyyy' }} até
              {{ booking.endDate | date: 'dd/MM/yyyy' }}
            </p>
            <strong class="price-text">{{
              booking.totalAmount | currency: 'BRL' : 'symbol' : '1.2-2'
            }}</strong>

            <div class="booking-card__details">
              <span>
                Anunciante:
                <span class="profile-name-text">{{ booking.owner.fullName || booking.owner.email }}</span>
              </span>
              <span *ngIf="booking.approvedAt"
                >Aprovada em {{ booking.approvedAt | date: 'dd/MM/yyyy' }}</span
              >
              <span *ngIf="booking.completedAt"
                >Concluída em
                {{ booking.completedAt | date: 'dd/MM/yyyy' }}</span
              >
              <span *ngIf="booking.payment?.status === 'PAID'">
                Pagamento confirmado via
                {{ paymentMethodLabel(booking.payment?.method) }}
              </span>
            </div>

            <div class="booking-card__actions">
              <a
                class="btn btn-secondary"
                [routerLink]="['/users', booking.owner.id]"
              >
                Ver perfil público
              </a>

              <button
                *ngIf="
                  booking.status === 'PENDING' || booking.status === 'APPROVED'
                "
                type="button"
                class="btn btn-secondary"
                [disabled]="cancellingBookingId === booking.id"
                (click)="cancel(booking.id)"
              >
                {{
                  cancellingBookingId === booking.id
                    ? 'Cancelando...'
                    : 'Cancelar'
                }}
              </button>
            </div>

            <app-booking-checklist-card
              [booking]="booking"
              viewerRole="RENTER"
              (bookingChange)="applyBookingUpdate($event)"
            />

            <section
              class="booking-review booking-review--submitted"
              *ngIf="booking.userReview"
            >
              <div class="booking-review__head">
                <div>
                  <strong>Sua avaliação do anunciante</strong>
                  <p>
                    Enviada em
                    {{ booking.userReview.createdAt | date: 'dd/MM/yyyy' }}
                  </p>
                </div>

                <div
                  class="booking-review__stars"
                  [attr.aria-label]="
                    'Nota ' + booking.userReview.rating + ' de 5'
                  "
                >
                  <span
                    class="material-icons"
                    *ngFor="let star of ratingOptions; trackBy: trackByValue"
                    aria-hidden="true"
                  >
                    {{
                      star <= booking.userReview.rating ? 'star' : 'star_border'
                    }}
                  </span>
                </div>
              </div>

              <p *ngIf="booking.userReview.comment">
                {{ booking.userReview.comment }}
              </p>
            </section>

            <section class="booking-review" *ngIf="canReviewOwner(booking)">
              <div class="booking-review__head">
                <div>
                  <strong>Avalie o anunciante</strong>
                  <p>Essa nota vai aparecer no perfil público dele.</p>
                </div>
              </div>

              <div class="booking-review__rating-picker">
                <button
                  type="button"
                  class="booking-review__star"
                  *ngFor="let rating of ratingOptions; trackBy: trackByValue"
                  [class.booking-review__star--active]="
                    rating <= currentDraftRating(booking.id)
                  "
                  (click)="setDraftRating(booking.id, rating)"
                >
                  <span class="material-icons" aria-hidden="true">
                    {{
                      rating <= currentDraftRating(booking.id)
                        ? 'star'
                        : 'star_border'
                    }}
                  </span>
                  <span>{{ rating }}</span>
                </button>
              </div>

              <label class="booking-review__field">
                <span>Comentário opcional</span>
                <textarea
                  [ngModel]="currentDraftComment(booking.id)"
                  (ngModelChange)="setDraftComment(booking.id, $event)"
                  rows="3"
                  maxlength="600"
                  placeholder="Como foi sua experiência com esse anunciante?"
                ></textarea>
              </label>

              <button
                type="button"
                class="btn btn-primary"
                [disabled]="
                  reviewSubmittingId === booking.id ||
                  !currentDraftRating(booking.id)
                "
                (click)="submitUserReview(booking)"
              >
                {{
                  reviewSubmittingId === booking.id
                    ? 'Enviando...'
                    : 'Enviar avaliação'
                }}
              </button>
            </section>
          </div>
        </article>
      </section>
    </main>
  `,
  styles: [
    `
      .reservations-page {
        display: grid;
        gap: 18px;
        padding: 18px 12px 132px;
      }

      .section-head span {
        color: var(--primary);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .section-head h1 {
        color: #26322f;
      }

      .section-head h1,
      p,
      strong {
        margin: 0;
      }

      .booking-list {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 16px;
      }

      .state-card {
        display: grid;
        gap: 10px;
        padding: 20px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
      }

      .booking-card {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
        padding: 12px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
      }

      img {
        width: 100%;
        height: 196px;
        object-fit: cover;
        border-radius: 18px;
      }

      .booking-card__content {
        display: grid;
        gap: 8px;
      }

      .booking-card__details {
        display: grid;
        gap: 4px;
        color: var(--text-secondary);
        font-size: 12px;
      }

      .booking-card__actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .booking-card__top {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }

      .status {
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
      }

      .status--approved,
      .status--completed {
        background: rgba(34, 197, 94, 0.12);
        color: var(--success);
      }

      .status--pending {
        background: rgba(245, 158, 11, 0.14);
        color: var(--warning);
      }

      .status--cancelled,
      .status--rejected {
        background: rgba(239, 68, 68, 0.12);
        color: var(--error);
      }

      .feedback {
        margin: 0;
        color: var(--success);
        font-weight: 600;
      }

      .feedback--error {
        color: var(--error);
      }

      .booking-review {
        display: grid;
        gap: 12px;
        padding: 14px;
        border-radius: 18px;
        background: rgba(88, 181, 158, 0.06);
        border: 1px solid rgba(88, 181, 158, 0.12);
      }

      .booking-review--submitted {
        background: rgba(34, 197, 94, 0.08);
        border-color: rgba(34, 197, 94, 0.16);
      }

      .booking-review__head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        align-items: flex-start;
      }

      .booking-review__head strong,
      .booking-review__head p,
      .booking-review p {
        margin: 0;
      }

      .booking-review__head p,
      .booking-review p {
        color: var(--text-secondary);
      }

      .booking-review__stars {
        display: inline-flex;
        gap: 2px;
        color: #f59e0b;
      }

      .booking-review__stars .material-icons {
        font-size: 18px;
      }

      .booking-review__rating-picker {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .booking-review__star {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 40px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: #fff;
        color: var(--text-secondary);
        font-weight: 700;
      }

      .booking-review__star--active {
        border-color: rgba(245, 158, 11, 0.28);
        background: rgba(245, 158, 11, 0.12);
        color: #b45309;
      }

      .booking-review__star .material-icons {
        font-size: 18px;
      }

      .booking-review__field {
        display: grid;
        gap: 8px;
      }

      .booking-review__field span {
        font-size: 13px;
        font-weight: 700;
      }

      .booking-review__field textarea {
        width: 100%;
        min-width: 0;
        border: 1px solid var(--glass-border-soft);
        border-radius: 14px;
        padding: 12px 14px;
        font: inherit;
        background: rgba(255, 255, 255, 0.9);
        resize: vertical;
      }

      @media (min-width: 641px) {
        .reservations-page {
          padding: 20px 16px 132px;
        }

        .booking-list {
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
        }

        .booking-card {
          grid-template-columns: 112px 1fr;
        }

        img {
          height: 100%;
        }
      }

      @media (min-width: 1080px) {
        .reservations-page {
          gap: 20px;
          padding: 28px 20px 56px;
        }

        .booking-card {
          grid-template-columns: 128px 1fr;
          padding: 16px;
        }
      }
    `,
  ],
})
export class MyBookingsPageComponent {
  private readonly bookingsApiService = inject(BookingsApiService);
  private readonly reviewsApiService = inject(ReviewsApiService);
  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';
  protected readonly ratingOptions = [1, 2, 3, 4, 5];
  protected bookings: Booking[] = [];
  protected loading = true;
  protected feedback = '';
  protected errorMessage = '';
  protected cancellingBookingId: string | null = null;
  protected reviewSubmittingId: string | null = null;
  protected reviewDrafts: Record<string, { rating: number; comment: string }> =
    {};

  constructor() {
    this.loadBookings();
  }

  protected cancel(bookingId: string) {
    this.cancellingBookingId = bookingId;
    this.feedback = '';
    this.errorMessage = '';

    this.bookingsApiService.cancel(bookingId).subscribe({
      next: () => {
        this.feedback = 'Reserva cancelada com sucesso.';
        this.cancellingBookingId = null;
        this.loadBookings();
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'Não foi possível cancelar a reserva.';
        this.cancellingBookingId = null;
      },
    });
  }

  protected paymentMethodLabel(method?: PaymentMethod | null) {
    const labels: Record<PaymentMethod, string> = {
      PIX: 'PIX',
      CREDIT_CARD: 'Cartão',
      BOLETO: 'Boleto',
      BANK_TRANSFER: 'Transferência',
    };

    return method ? labels[method] : 'PIX';
  }

  protected canReviewOwner(booking: Booking) {
    return booking.status === 'COMPLETED' && !booking.userReview;
  }

  protected currentDraftRating(bookingId: string) {
    return this.reviewDrafts[bookingId]?.rating ?? 0;
  }

  protected currentDraftComment(bookingId: string) {
    return this.reviewDrafts[bookingId]?.comment ?? '';
  }

  protected setDraftRating(bookingId: string, rating: number) {
    const current = this.reviewDrafts[bookingId] ?? { rating: 0, comment: '' };
    this.reviewDrafts[bookingId] = {
      ...current,
      rating,
    };
  }

  protected setDraftComment(bookingId: string, comment: string) {
    const current = this.reviewDrafts[bookingId] ?? { rating: 0, comment: '' };
    this.reviewDrafts[bookingId] = {
      ...current,
      comment,
    };
  }

  protected submitUserReview(booking: Booking) {
    const draft = this.reviewDrafts[booking.id];

    if (!draft?.rating) {
      this.errorMessage = 'Selecione uma nota para enviar a avaliação.';
      return;
    }

    this.reviewSubmittingId = booking.id;
    this.feedback = '';
    this.errorMessage = '';

    this.reviewsApiService
      .createUserReview({
        bookingId: booking.id,
        rating: draft.rating,
        comment: draft.comment.trim() || undefined,
      })
      .subscribe({
        next: (userReview) => {
          this.bookings = this.bookings.map((item) =>
            item.id === booking.id
              ? {
                  ...item,
                  userReview,
                }
              : item,
          );
          delete this.reviewDrafts[booking.id];
          this.feedback = 'Avaliação do anunciante enviada com sucesso.';
          this.reviewSubmittingId = null;
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ||
            'Não foi possível enviar a avaliação do anunciante.';
          this.reviewSubmittingId = null;
        },
      });
  }

  protected trackByValue(_: number, value: number) {
    return value;
  }

  protected applyBookingUpdate(updatedBooking: Booking) {
    this.bookings = this.bookings.map((booking) =>
      booking.id === updatedBooking.id ? updatedBooking : booking,
    );
  }

  private loadBookings() {
    this.loading = true;
    this.errorMessage = '';

    this.bookingsApiService.getMine().subscribe({
      next: (bookings) => {
        this.bookings = bookings;
        this.errorMessage = '';
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'Não foi possível carregar suas reservas.';
        this.loading = false;
      },
    });
  }
}
