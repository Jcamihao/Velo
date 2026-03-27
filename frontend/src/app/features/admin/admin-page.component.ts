import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminApiService } from '../../core/services/admin-api.service';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page admin-page">
      <section class="admin-hero">
        <span class="eyebrow">Admin</span>
        <h1>Visão geral do marketplace</h1>
      </section>

      <section class="admin-stats" *ngIf="dashboard">
        <article><strong>{{ dashboard.totals.users }}</strong><span>usuários</span></article>
        <article><strong>{{ dashboard.totals.vehicles }}</strong><span>veículos</span></article>
        <article><strong>{{ dashboard.totals.bookings }}</strong><span>reservas</span></article>
        <article><strong>{{ dashboard.totals.privacyRequests }}</strong><span>pedidos LGPD</span></article>
      </section>

      <section class="admin-card">
        <h2>Usuários</h2>
        <article class="row" *ngFor="let user of users">
          <div>
            <strong>{{ user.profile?.fullName || user.email }}</strong>
            <p>{{ user.role }} • {{ user.status }}</p>
            <p>
              Documento: {{ verificationLabel(user.profile?.documentVerificationStatus) }} •
              CNH: {{ verificationLabel(user.profile?.driverLicenseVerification) }}
            </p>
          </div>
          <div class="row__actions">
            <button type="button" class="btn btn-secondary" (click)="approveDocument(user.id)">
              Aprovar doc
            </button>
            <button type="button" class="btn btn-secondary" (click)="rejectDocument(user.id)">
              Recusar doc
            </button>
            <button type="button" class="btn btn-secondary" (click)="approveDriverLicense(user.id)">
              Aprovar CNH
            </button>
            <button type="button" class="btn btn-secondary" (click)="rejectDriverLicense(user.id)">
              Recusar CNH
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              *ngIf="user.profile?.hasDocumentImage"
              (click)="openVerificationFile(user.id, 'document')"
            >
              Ver doc
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              *ngIf="user.profile?.hasDriverLicenseImage"
              (click)="openVerificationFile(user.id, 'driverLicense')"
            >
              Ver CNH
            </button>
            <button type="button" class="btn btn-secondary" (click)="blockUser(user.id)">
              Bloquear
            </button>
          </div>
        </article>
      </section>

      <section class="admin-card">
        <h2>Veículos</h2>
        <article class="row" *ngFor="let vehicle of vehicles">
          <div>
            <strong>{{ vehicle.title }}</strong>
            <p>{{ vehicle.city }}, {{ vehicle.state }}</p>
          </div>
          <button type="button" class="btn btn-secondary" (click)="deactivateVehicle(vehicle.id)">
            Desativar
          </button>
        </article>
      </section>

      <section class="admin-card">
        <h2>Reservas</h2>
        <article class="row" *ngFor="let booking of bookings">
          <div>
            <strong>{{ booking.vehicle.title }}</strong>
            <p>{{ booking.status }} • {{ booking.renter.profile?.fullName || booking.renter.email }}</p>
          </div>
        </article>
      </section>

      <section class="admin-card">
        <h2>Solicitações LGPD</h2>
        <article class="row" *ngFor="let request of privacyRequests">
          <div>
            <strong>{{ privacyRequestTypeLabel(request.type) }}</strong>
            <p>
              {{ request.user?.profile?.fullName || request.user?.email }} • {{ privacyRequestStatusLabel(request.status) }}
            </p>
            <p *ngIf="request.notes">{{ request.notes }}</p>
          </div>
          <div class="row__actions">
            <button
              type="button"
              class="btn btn-secondary"
              *ngIf="request.status === 'OPEN'"
              (click)="updatePrivacyRequest(request.id, 'IN_REVIEW')"
            >
              Em análise
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              *ngIf="request.status !== 'COMPLETED'"
              (click)="updatePrivacyRequest(request.id, 'COMPLETED')"
            >
              Concluir
            </button>
          </div>
        </article>
      </section>
    </main>
  `,
  styles: [
    `
      .admin-page {
        display: grid;
        gap: 18px;
        padding: 20px 16px 32px;
      }

      .admin-hero,
      .admin-card,
      .admin-stats article {
        padding: 20px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
      }

      .eyebrow {
        color: var(--primary);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .admin-stats {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .admin-stats strong {
        display: block;
        color: var(--primary);
        font-size: 22px;
      }

      .admin-card {
        display: grid;
        gap: 14px;
      }

      .row {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border);
      }

      .row:first-of-type {
        border-top: 0;
        padding-top: 0;
      }

      h1,
      h2,
      p,
      strong,
      span {
        margin: 0;
      }

      p {
        color: var(--text-secondary);
      }

      .row__actions {
        display: flex;
        width: 100%;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-start;
      }

      .row .btn {
        width: 100%;
      }

      @media (min-width: 701px) {
        .admin-stats {
          grid-template-columns: repeat(4, 1fr);
        }

        .row {
          flex-direction: row;
          align-items: center;
        }

        .row__actions {
          width: auto;
          justify-content: flex-end;
        }

        .row .btn {
          width: auto;
        }
      }

      @media (min-width: 1080px) {
        .admin-page {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: start;
          gap: 20px;
          padding: 28px 20px 56px;
        }

        .admin-hero,
        .admin-stats,
        .admin-card:last-of-type {
          grid-column: 1 / -1;
        }
      }

    `,
  ],
})
export class AdminPageComponent {
  private readonly adminApiService = inject(AdminApiService);

  protected dashboard?: { totals: { users: number; vehicles: number; bookings: number; privacyRequests: number } };
  protected users: any[] = [];
  protected vehicles: any[] = [];
  protected bookings: any[] = [];
  protected privacyRequests: any[] = [];

  constructor() {
    this.loadData();
  }

  protected blockUser(userId: string) {
    this.adminApiService.blockUser(userId).subscribe(() => this.loadData());
  }

  protected approveDocument(userId: string) {
    this.adminApiService.approveUserDocument(userId).subscribe(() => this.loadData());
  }

  protected rejectDocument(userId: string) {
    this.adminApiService.rejectUserDocument(userId).subscribe(() => this.loadData());
  }

  protected approveDriverLicense(userId: string) {
    this.adminApiService.approveUserDriverLicense(userId).subscribe(() => this.loadData());
  }

  protected rejectDriverLicense(userId: string) {
    this.adminApiService.rejectUserDriverLicense(userId).subscribe(() => this.loadData());
  }

  protected verificationLabel(status?: string) {
    const labels: Record<string, string> = {
      APPROVED: 'Aprovado',
      PENDING: 'Em análise',
      REJECTED: 'Recusado',
      NOT_SUBMITTED: 'Não enviado',
    };

    return labels[status || 'NOT_SUBMITTED'] || status || 'Não enviado';
  }

  protected deactivateVehicle(vehicleId: string) {
    this.adminApiService.deactivateVehicle(vehicleId).subscribe(() => this.loadData());
  }

  protected openVerificationFile(userId: string, type: 'document' | 'driverLicense') {
    this.adminApiService.getUserVerificationFileUrl(userId, type).subscribe({
      next: ({ url }) => {
        window.open(url, '_blank', 'noopener,noreferrer');
      },
    });
  }

  protected updatePrivacyRequest(requestId: string, status: string) {
    this.adminApiService
      .updatePrivacyRequest(requestId, status)
      .subscribe(() => this.loadData());
  }

  protected privacyRequestTypeLabel(type: string) {
    const labels: Record<string, string> = {
      ACCESS: 'Acesso',
      PORTABILITY: 'Portabilidade',
      DELETION: 'Exclusão',
      CORRECTION: 'Correção',
      RESTRICTION: 'Restrição',
      OBJECTION: 'Oposição',
      ANONYMIZATION: 'Anonimização',
      REVOCATION: 'Revogação',
    };

    return labels[type] || type;
  }

  protected privacyRequestStatusLabel(status: string) {
    const labels: Record<string, string> = {
      OPEN: 'Aberta',
      IN_REVIEW: 'Em análise',
      COMPLETED: 'Concluída',
      REJECTED: 'Recusada',
      CANCELLED: 'Cancelada',
    };

    return labels[status] || status;
  }

  private loadData() {
    forkJoin({
      dashboard: this.adminApiService.getDashboard(),
      users: this.adminApiService.getUsers(),
      vehicles: this.adminApiService.getVehicles(),
      bookings: this.adminApiService.getBookings(),
      privacyRequests: this.adminApiService.getPrivacyRequests(),
    }).subscribe(({ dashboard, users, vehicles, bookings, privacyRequests }) => {
      this.dashboard = dashboard;
      this.users = users as any[];
      this.vehicles = vehicles as any[];
      this.bookings = bookings as any[];
      this.privacyRequests = privacyRequests as any[];
    });
  }
}
