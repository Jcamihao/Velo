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
      </section>

      <section class="admin-card">
        <h2>Usuários</h2>
        <article class="row" *ngFor="let user of users">
          <div>
            <strong>{{ user.profile?.fullName || user.email }}</strong>
            <p>{{ user.role }} • {{ user.status }}</p>
          </div>
          <button type="button" class="btn btn-secondary" (click)="blockUser(user.id)">
            Bloquear
          </button>
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
        grid-template-columns: repeat(3, 1fr);
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
        align-items: center;
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
    `,
  ],
})
export class AdminPageComponent {
  private readonly adminApiService = inject(AdminApiService);

  protected dashboard?: { totals: { users: number; vehicles: number; bookings: number } };
  protected users: any[] = [];
  protected vehicles: any[] = [];
  protected bookings: any[] = [];

  constructor() {
    this.loadData();
  }

  protected blockUser(userId: string) {
    this.adminApiService.blockUser(userId).subscribe(() => this.loadData());
  }

  protected deactivateVehicle(vehicleId: string) {
    this.adminApiService.deactivateVehicle(vehicleId).subscribe(() => this.loadData());
  }

  private loadData() {
    forkJoin({
      dashboard: this.adminApiService.getDashboard(),
      users: this.adminApiService.getUsers(),
      vehicles: this.adminApiService.getVehicles(),
      bookings: this.adminApiService.getBookings(),
    }).subscribe(({ dashboard, users, vehicles, bookings }) => {
      this.dashboard = dashboard;
      this.users = users as any[];
      this.vehicles = vehicles as any[];
      this.bookings = bookings as any[];
    });
  }
}
