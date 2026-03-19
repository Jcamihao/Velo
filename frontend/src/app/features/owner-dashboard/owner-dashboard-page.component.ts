import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AvailabilityApiService } from '../../core/services/availability-api.service';
import { AuthService } from '../../core/services/auth.service';
import { BookingsApiService } from '../../core/services/bookings-api.service';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';
import {
  Booking,
  CreateVehiclePayload,
  FuelType,
  OwnerVehicleItem,
  TransmissionType,
  VehicleImage,
  VehicleCategory,
} from '../../core/models/domain.models';

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

@Component({
  selector: 'app-owner-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  template: `
    <main class="page owner-page">
      <section class="owner-hero">
        <span class="eyebrow">{{ createMode ? 'Anunciar carro' : 'Meus anúncios' }}</span>
        <h1>{{ createMode ? 'Publique um novo veículo' : 'Gerencie seus veículos anunciados' }}</h1>
        <p>{{ vehicles.length }} veículos cadastrados • {{ bookings.length }} reservas recebidas</p>
      </section>

      <section class="stats-grid">
        <article><strong>{{ pendingCount }}</strong><span>pendentes</span></article>
        <article><strong>{{ approvedCount }}</strong><span>aprovadas</span></article>
        <article><strong>{{ completedCount }}</strong><span>concluídas</span></article>
      </section>

      <section class="dashboard-card dashboard-card--form" *ngIf="showVehicleEditor">
        <div class="card-head">
          <div>
            <h2>{{ isEditingVehicle ? 'Editar anúncio' : 'Finalizar anúncio' }}</h2>
            <p>
              {{
                isEditingVehicle
                  ? 'Atualize preço, fotos e disponibilidade do seu anúncio.'
                  : 'Revise os dados, adicione fotos e publique seu veículo.'
              }}
            </p>
          </div>
          <button type="button" class="btn btn-ghost" (click)="cancelEditingVehicle()">
            Fechar editor
          </button>
        </div>

        <div class="announcement-steps">
          <article>
            <strong>1</strong>
            <span>Dados do carro</span>
          </article>
          <article>
            <strong>2</strong>
            <span>Fotos do anúncio</span>
          </article>
          <article>
            <strong>3</strong>
            <span>Publicação</span>
          </article>
        </div>

        <div class="form-grid">
          <label>
            <span>Título do anúncio</span>
            <input [(ngModel)]="vehicleDraft.title" placeholder="Ex.: Jeep Renegade 2022 completo" />
          </label>

          <label>
            <span>Placa</span>
            <input [(ngModel)]="vehicleDraft.plate" placeholder="ABC1D23" maxlength="8" />
          </label>
        </div>

        <div class="form-grid form-grid--triple">
          <label>
            <span>Marca</span>
            <input [(ngModel)]="vehicleDraft.brand" placeholder="Jeep" />
          </label>

          <label>
            <span>Modelo</span>
            <input [(ngModel)]="vehicleDraft.model" placeholder="Renegade" />
          </label>

          <label>
            <span>Ano</span>
            <input [(ngModel)]="vehicleDraft.year" type="number" min="1990" max="2100" />
          </label>
        </div>

        <div class="form-grid form-grid--triple">
          <label>
            <span>Categoria</span>
            <select [(ngModel)]="vehicleDraft.category">
              <option *ngFor="let option of categoryOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label>
            <span>Câmbio</span>
            <select [(ngModel)]="vehicleDraft.transmission">
              <option *ngFor="let option of transmissionOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label>
            <span>Combustível</span>
            <select [(ngModel)]="vehicleDraft.fuelType">
              <option *ngFor="let option of fuelOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="form-grid form-grid--triple">
          <label>
            <span>Assentos</span>
            <input [(ngModel)]="vehicleDraft.seats" type="number" min="2" max="12" />
          </label>

          <label>
            <span>Diária</span>
            <input [(ngModel)]="vehicleDraft.dailyRate" type="number" min="1" step="0.01" />
          </label>

          <label class="toggle-field">
            <span>Publicação</span>
            <button
              type="button"
              class="toggle-button"
              [class.toggle-button--active]="vehicleDraft.isPublished"
              (click)="vehicleDraft.isPublished = !vehicleDraft.isPublished"
            >
              {{ vehicleDraft.isPublished ? 'Publicado' : 'Rascunho' }}
            </button>
          </label>
        </div>

        <div class="form-grid">
          <label>
            <span>Cidade</span>
            <input [(ngModel)]="vehicleDraft.city" placeholder="São Paulo" />
          </label>

          <label>
            <span>Estado</span>
            <input [(ngModel)]="vehicleDraft.state" maxlength="2" placeholder="SP" />
          </label>
        </div>

        <label>
          <span>Endereço de retirada</span>
          <input [(ngModel)]="vehicleDraft.addressLine" placeholder="Bairro, avenida ou ponto de encontro" />
        </label>

        <label>
          <span>Descrição</span>
          <textarea
            [(ngModel)]="vehicleDraft.description"
            rows="4"
            placeholder="Conte os diferenciais do carro, regras básicas e itens inclusos."
          ></textarea>
        </label>

        <section class="media-manager">
          <div class="media-manager__head">
            <div>
              <h3>Fotos do veículo</h3>
              <p>A primeira imagem vira a capa do anúncio e aparece na busca.</p>
            </div>

            <label class="upload-trigger">
              <input type="file" accept="image/*" multiple (change)="onVehicleFilesSelected($event)" />
              <span>Adicionar fotos</span>
            </label>
          </div>

          <p class="state-message" *ngIf="!isEditingVehicle">
            Você pode selecionar as fotos agora. Elas serão enviadas automaticamente depois que o anúncio for salvo.
          </p>

          <div class="media-grid" *ngIf="editingVehicle?.images?.length || pendingVehiclePreviews.length">
            <article class="media-card" *ngFor="let image of editingVehicle?.images; let index = index">
              <img [src]="image.url" [alt]="image.alt || vehicleDraft.title || 'Foto do veículo'" />
              <span class="media-badge" *ngIf="index === 0">Capa</span>
              <button
                type="button"
                class="media-card__action"
                [disabled]="imageActionId === image.id"
                (click)="removeVehicleImage(image)"
              >
                {{ imageActionId === image.id ? 'Removendo...' : 'Excluir' }}
              </button>
            </article>

            <article class="media-card media-card--pending" *ngFor="let preview of pendingVehiclePreviews; let index = index">
              <img [src]="preview.url" [alt]="preview.name" />
              <span class="media-badge media-badge--pending">Nova</span>
              <button type="button" class="media-card__action" (click)="removePendingVehicleFile(index)">
                Remover
              </button>
            </article>
          </div>

          <p class="state-message" *ngIf="!editingVehicle?.images?.length && !pendingVehiclePreviews.length">
            Adicione pelo menos 3 fotos para aumentar a taxa de conversão do anúncio.
          </p>

          <p class="feedback" *ngIf="mediaFeedback">{{ mediaFeedback }}</p>
          <p class="feedback feedback--error" *ngIf="mediaError">{{ mediaError }}</p>
        </section>

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-primary"
            (click)="saveVehicle()"
            [disabled]="submittingVehicle || uploadingVehicleImages"
          >
            {{ vehicleSubmitLabel }}
          </button>

          <button
            *ngIf="isEditingVehicle"
            type="button"
            class="btn btn-secondary"
            (click)="cancelEditingVehicle()"
            [disabled]="submittingVehicle || uploadingVehicleImages"
          >
            Cancelar edição
          </button>
        </div>

        <p class="feedback" *ngIf="vehicleFeedback">{{ vehicleFeedback }}</p>
        <p class="feedback feedback--error" *ngIf="vehicleError">{{ vehicleError }}</p>
      </section>

      <section class="dashboard-card">
        <div class="card-head">
          <h2>Meus veículos</h2>
        </div>

        <p class="state-message" *ngIf="loading">Carregando seus anúncios...</p>
        <p class="state-message" *ngIf="!loading && !vehicles.length">
          Você ainda não tem anúncios cadastrados.
        </p>
        <p class="state-message" *ngIf="!loading && vehicles.length && !showVehicleEditor">
          Selecione um anúncio para editar, revisar fotos ou alterar a publicação.
        </p>

        <article class="vehicle-row" *ngFor="let vehicle of vehicles" [class.vehicle-row--editing]="vehicle.id === editingVehicleId">
          <div class="vehicle-row__media">
            <img [src]="vehicle.coverImage || fallbackImage" [alt]="vehicle.title" />
          </div>

          <div class="vehicle-row__content">
            <div class="vehicle-row__top">
              <div>
                <strong>{{ vehicle.title }}</strong>
                <p>{{ vehicle.brand }} {{ vehicle.model }} • {{ vehicle.year }}</p>
              </div>
              <span class="status status--editing" *ngIf="vehicle.id === editingVehicleId">Em edição</span>
            </div>

            <p>{{ vehicle.city }}, {{ vehicle.state }}</p>
            <span>{{ vehicle.dailyRate | currency: 'BRL' : 'symbol' : '1.2-2' }} / diária</span>
            <p>{{ vehicle.images.length }} fotos • {{ categoryLabel(vehicle.category) }} • {{ transmissionLabel(vehicle.transmission) }}</p>
            <div class="vehicle-row__meta">
              <span class="status status--published" *ngIf="vehicle.isPublished">Publicado</span>
              <span class="status status--draft" *ngIf="!vehicle.isPublished">Rascunho</span>
              <span class="status status--inactive" *ngIf="!vehicle.isActive">Desativado</span>
            </div>

            <div class="vehicle-row__actions">
              <button
                type="button"
                class="btn btn-secondary"
                [disabled]="vehicleActionId === vehicle.id || !vehicle.isActive"
                (click)="startEditingVehicle(vehicle)"
              >
                Editar
              </button>

              <button
                type="button"
                class="btn btn-secondary"
                [disabled]="vehicleActionId === vehicle.id || !vehicle.isActive"
                (click)="toggleVehiclePublication(vehicle)"
              >
                {{ vehicle.isPublished ? 'Virar rascunho' : 'Publicar' }}
              </button>

              <button
                type="button"
                class="btn btn-ghost btn-ghost--danger"
                [disabled]="vehicleActionId === vehicle.id || !vehicle.isActive"
                (click)="deactivateVehicle(vehicle)"
              >
                {{ vehicleActionId === vehicle.id ? 'Salvando...' : 'Desativar' }}
              </button>
            </div>
          </div>
        </article>
      </section>

      <section class="dashboard-card">
        <div class="card-head">
          <div>
            <h2>Bloquear período</h2>
            <p>Evite pedidos em dias de manutenção, viagem ou uso próprio.</p>
          </div>
        </div>

        <p class="state-message" *ngIf="!manageableVehicles.length">
          Cadastre um veículo antes de bloquear datas no calendário.
        </p>

        <div class="form-grid" *ngIf="manageableVehicles.length">
          <label>
            <span>Veículo</span>
            <select [(ngModel)]="selectedVehicleId" (ngModelChange)="loadSelectedVehicleAvailability()">
              <option *ngFor="let vehicle of manageableVehicles" [value]="vehicle.id">
                {{ vehicle.title }}
              </option>
            </select>
          </label>

          <label>
            <span>Motivo</span>
            <input [(ngModel)]="blockedDateDraft.reason" placeholder="Manutenção, uso próprio..." />
          </label>
        </div>

        <div class="form-grid" *ngIf="manageableVehicles.length">
          <label>
            <span>Início</span>
            <input [(ngModel)]="blockedDateDraft.startDate" type="date" [min]="today" />
          </label>

          <label>
            <span>Fim</span>
            <input [(ngModel)]="blockedDateDraft.endDate" type="date" [min]="blockedDateDraft.startDate || today" />
          </label>
        </div>

        <button
          *ngIf="manageableVehicles.length"
          type="button"
          class="btn btn-secondary"
          [disabled]="submittingBlockedDate"
          (click)="blockDates()"
        >
          {{ submittingBlockedDate ? 'Bloqueando...' : 'Bloquear período' }}
        </button>

        <p class="feedback" *ngIf="blockedDateFeedback">{{ blockedDateFeedback }}</p>
        <p class="feedback feedback--error" *ngIf="blockedDateError">{{ blockedDateError }}</p>

        <p class="state-message" *ngIf="availabilityLoading">Carregando calendário...</p>
        <div class="blocked-date-list" *ngIf="!availabilityLoading && blockedDates.length">
          <article class="blocked-date-item" *ngFor="let period of blockedDates">
            <strong>{{ period.startDate | date: 'dd/MM/yyyy' }} até {{ period.endDate | date: 'dd/MM/yyyy' }}</strong>
            <span>{{ period.reason || 'Bloqueio manual do proprietário' }}</span>
          </article>
        </div>
        <p class="state-message" *ngIf="manageableVehicles.length && !availabilityLoading && !blockedDates.length">
          Nenhum bloqueio manual cadastrado para este veículo.
        </p>
      </section>

      <section class="dashboard-card">
        <div class="card-head">
          <h2>Solicitações recebidas</h2>
        </div>

        <p class="state-message" *ngIf="loading">Carregando reservas recebidas...</p>
        <p class="state-message" *ngIf="!loading && !bookings.length">
          Assim que um locatário solicitar um período, ele vai aparecer aqui.
        </p>
        <p class="feedback feedback--error" *ngIf="loadError">{{ loadError }}</p>

        <article class="booking-row" *ngFor="let booking of bookings">
          <div>
            <strong>{{ booking.vehicle.title }}</strong>
            <p>{{ booking.renter.fullName || booking.renter.email }}</p>
            <p>
              {{ booking.startDate | date: 'dd/MM' }} até
              {{ booking.endDate | date: 'dd/MM' }}
            </p>
          </div>

          <div class="booking-row__actions">
            <span class="status" [class]="'status status--' + booking.status.toLowerCase()">
              {{ booking.status }}
            </span>
            <button
              *ngIf="booking.status === 'PENDING'"
              type="button"
              class="btn btn-primary"
              [disabled]="bookingActionId === booking.id"
              (click)="approve(booking.id)"
            >
              {{ bookingActionId === booking.id ? 'Salvando...' : 'Aprovar' }}
            </button>
            <button
              *ngIf="booking.status === 'PENDING'"
              type="button"
              class="btn btn-secondary"
              [disabled]="bookingActionId === booking.id"
              (click)="reject(booking.id)"
            >
              Recusar
            </button>
          </div>
        </article>
      </section>
    </main>
  `,
  styles: [
    `
      .owner-page {
        display: grid;
        gap: 18px;
        padding: 20px 16px 32px;
      }

      .owner-hero,
      .dashboard-card,
      .stats-grid article {
        display: grid;
        gap: 16px;
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

      h1,
      h2,
      p,
      strong,
      span {
        margin: 0;
      }

      p,
      span {
        color: var(--text-secondary);
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .stats-grid strong {
        display: block;
        color: var(--primary);
        font-size: 22px;
      }

      .dashboard-card--form {
        gap: 16px;
      }

      .card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .announcement-steps {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .announcement-steps article {
        display: grid;
        gap: 6px;
        padding: 14px;
        border-radius: 18px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .announcement-steps strong {
        width: 28px;
        height: 28px;
        display: inline-grid;
        place-items: center;
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.12);
        color: var(--primary);
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .form-grid--triple {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      label {
        display: grid;
        gap: 8px;
      }

      label span {
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      input,
      select,
      textarea {
        width: 100%;
        min-width: 0;
        border: 1px solid var(--glass-border-soft);
        border-radius: 14px;
        padding: 12px 14px;
        font: inherit;
        background: var(--surface-muted);
      }

      textarea {
        resize: vertical;
        min-height: 112px;
      }

      .toggle-field {
        align-content: end;
      }

      .toggle-button {
        min-height: 48px;
        width: 100%;
        border: 1px solid var(--glass-border-soft);
        border-radius: 14px;
        background: var(--surface-muted);
        color: var(--text-primary);
        font: inherit;
        font-weight: 700;
      }

      .media-manager {
        display: grid;
        gap: 12px;
        padding: 16px;
        border-radius: 22px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .media-manager__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .media-manager h3 {
        margin: 0;
        font-size: 18px;
        color: var(--text-primary);
      }

      .upload-trigger {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 16px;
        border-radius: 999px;
        background: linear-gradient(180deg, #2495ff 0%, #1a81f7 100%);
        color: #fff;
        cursor: pointer;
        overflow: hidden;
        box-shadow: 0 14px 24px rgba(31, 140, 255, 0.24);
      }

      .upload-trigger input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }

      .media-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 12px;
      }

      .media-card {
        position: relative;
        display: grid;
        gap: 10px;
        padding: 10px;
        border-radius: 18px;
        background: #fff;
        border: 1px solid var(--glass-border-soft);
      }

      .media-card--pending {
        border-style: dashed;
      }

      .media-card img {
        width: 100%;
        height: 128px;
        border-radius: 14px;
        object-fit: cover;
      }

      .media-badge {
        position: absolute;
        top: 18px;
        left: 18px;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(31, 140, 255, 0.94);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
      }

      .media-badge--pending {
        background: rgba(255, 191, 47, 0.94);
        color: var(--text-primary);
      }

      .media-card__action {
        border: 0;
        border-radius: 12px;
        padding: 10px 12px;
        background: var(--surface-muted);
        color: var(--text-primary);
        font: inherit;
        font-weight: 700;
      }

      .form-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .btn-ghost {
        background: var(--surface-muted);
        color: var(--text-primary);
      }

      .btn-ghost--danger {
        color: var(--error);
      }

      .toggle-button--active {
        background: var(--primary-light);
        border-color: rgba(37, 99, 235, 0.24);
        color: var(--primary);
      }

      .vehicle-row {
        position: relative;
        display: grid;
        align-items: end;
        min-height: 280px;
        margin-top: 14px;
        border-radius: 26px;
        overflow: hidden;
        background: #fff;
        box-shadow: var(--shadow-soft);
      }

      .booking-row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
        padding: 12px 0;
        border-top: 1px solid var(--border);
      }

      .vehicle-row:first-of-type {
        margin-top: 0;
      }

      .booking-row:first-of-type {
        border-top: 0;
      }

      .vehicle-row__media,
      .vehicle-row__media img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      .vehicle-row__media::after {
        content: '';
        position: absolute;
        inset: 0;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(28, 37, 51, 0.14) 40%, rgba(28, 37, 51, 0.8) 100%),
          linear-gradient(90deg, rgba(28, 37, 51, 0.16) 0%, transparent 52%);
      }

      .vehicle-row__media img {
        object-fit: cover;
      }

      .vehicle-row__content {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 8px;
        min-width: 0;
        min-height: 280px;
        padding: 20px;
        align-content: end;
      }

      .vehicle-row__content strong {
        color: #fff;
      }

      .vehicle-row__content > p,
      .vehicle-row__content > span,
      .vehicle-row__top p {
        color: rgba(255, 255, 255, 0.78);
      }

      .vehicle-row__top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .vehicle-row__meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .vehicle-row__actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
      }

      .vehicle-row--editing {
        outline: 2px solid rgba(37, 99, 235, 0.42);
        outline-offset: -2px;
      }

      .vehicle-row .btn-secondary,
      .vehicle-row .btn-ghost {
        min-height: 42px;
        background: rgba(255, 255, 255, 0.16);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.16);
        box-shadow: none;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      .vehicle-row .btn-ghost--danger {
        background: rgba(239, 68, 68, 0.22);
        border-color: rgba(239, 68, 68, 0.28);
        color: #fff;
      }

      .booking-row__actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .status {
        padding: 4px 8px;
        border-radius: 999px;
        background: var(--primary-light);
        color: var(--primary);
        font-size: 11px;
        font-weight: 700;
      }

      .status--published {
        background: rgba(34, 197, 94, 0.12);
        color: var(--success);
      }

      .status--draft {
        background: rgba(245, 158, 11, 0.14);
        color: var(--warning);
      }

      .status--inactive {
        background: rgba(239, 68, 68, 0.12);
        color: var(--error);
      }

      .status--editing {
        background: rgba(37, 99, 235, 0.12);
        color: var(--primary);
      }

      .state-message,
      .feedback {
        margin: 0;
        color: var(--text-secondary);
      }

      .blocked-date-list {
        display: grid;
        gap: 10px;
      }

      .blocked-date-item {
        display: grid;
        gap: 4px;
        padding: 14px;
        border-radius: 18px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .feedback {
        color: var(--success);
        font-weight: 600;
      }

      .feedback--error {
        color: var(--error);
      }

      @media (max-width: 720px) {
        .form-grid,
        .form-grid--triple,
        .stats-grid,
        .announcement-steps {
          grid-template-columns: 1fr;
        }

        .card-head,
        .media-manager__head,
        .vehicle-row,
        .vehicle-row__top {
          grid-template-columns: 1fr;
          flex-direction: column;
        }

        .vehicle-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class OwnerDashboardPageComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly availabilityApiService = inject(AvailabilityApiService);
  private readonly vehiclesApiService = inject(VehiclesApiService);
  private readonly bookingsApiService = inject(BookingsApiService);

  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly categoryOptions: SelectOption<VehicleCategory>[] = [
    { label: 'Econômico', value: 'ECONOMY' },
    { label: 'Hatch', value: 'HATCH' },
    { label: 'Sedan', value: 'SEDAN' },
    { label: 'SUV', value: 'SUV' },
    { label: 'Pickup', value: 'PICKUP' },
    { label: 'Van', value: 'VAN' },
    { label: 'Luxo', value: 'LUXURY' },
  ];
  protected readonly transmissionOptions: SelectOption<TransmissionType>[] = [
    { label: 'Manual', value: 'MANUAL' },
    { label: 'Automático', value: 'AUTOMATIC' },
    { label: 'CVT', value: 'CVT' },
  ];
  protected readonly fuelOptions: SelectOption<FuelType>[] = [
    { label: 'Flex', value: 'FLEX' },
    { label: 'Gasolina', value: 'GASOLINE' },
    { label: 'Etanol', value: 'ETHANOL' },
    { label: 'Diesel', value: 'DIESEL' },
    { label: 'Elétrico', value: 'ELECTRIC' },
    { label: 'Híbrido', value: 'HYBRID' },
  ];
  protected vehicles: OwnerVehicleItem[] = [];
  protected bookings: Booking[] = [];
  protected loading = true;
  protected loadError = '';
  protected vehicleFeedback = '';
  protected vehicleError = '';
  protected mediaFeedback = '';
  protected mediaError = '';
  protected availabilityLoading = false;
  protected selectedVehicleId = '';
  protected blockedDates: Array<{ id: string; startDate: string; endDate: string; reason?: string | null }> = [];
  protected blockedDateDraft = {
    startDate: '',
    endDate: '',
    reason: '',
  };
  protected blockedDateFeedback = '';
  protected blockedDateError = '';
  protected submittingBlockedDate = false;
  protected submittingVehicle = false;
  protected uploadingVehicleImages = false;
  protected bookingActionId: string | null = null;
  protected vehicleActionId: string | null = null;
  protected imageActionId: string | null = null;
  protected editingVehicleId: string | null = null;
  protected createMode = false;
  protected pendingVehicleFiles: File[] = [];
  protected pendingVehiclePreviews: Array<{ name: string; url: string }> = [];
  protected vehicleDraft = this.createVehicleDraft();

  constructor() {
    this.createMode = this.route.snapshot.queryParamMap.get('editor') === 'create';

    if (this.createMode) {
      this.vehicleDraft = this.createVehicleDraft();
    }

    this.loadData();
  }

  ngOnDestroy() {
    this.revokePendingPreviewUrls();
  }

  protected get pendingCount() {
    return this.bookings.filter((booking) => booking.status === 'PENDING').length;
  }

  protected get approvedCount() {
    return this.bookings.filter((booking) => booking.status === 'APPROVED').length;
  }

  protected get completedCount() {
    return this.bookings.filter((booking) => booking.status === 'COMPLETED').length;
  }

  protected get isEditingVehicle() {
    return !!this.editingVehicleId;
  }

  protected get showVehicleEditor() {
    return this.isEditingVehicle || this.createMode;
  }

  protected get vehicleSubmitLabel() {
    if (this.uploadingVehicleImages) {
      return 'Enviando fotos...';
    }

    if (this.submittingVehicle) {
      return this.isEditingVehicle ? 'Salvando anúncio...' : 'Publicando anúncio...';
    }

    return this.isEditingVehicle ? 'Salvar alterações' : 'Publicar anúncio';
  }

  protected get editingVehicle() {
    return this.vehicles.find((vehicle) => vehicle.id === this.editingVehicleId) ?? null;
  }

  protected get manageableVehicles() {
    return this.vehicles.filter((vehicle) => vehicle.isActive);
  }

  protected saveVehicle() {
    const payload = this.normalizeVehicleDraft();

    if (!payload) {
      this.vehicleError = 'Preencha todos os campos obrigatórios do anúncio.';
      this.vehicleFeedback = '';
      return;
    }

    const wasEditing = this.isEditingVehicle;
    const successMessage = wasEditing
      ? 'Anúncio atualizado com sucesso.'
      : 'Anúncio criado com sucesso. Seu carro já pode receber reservas.';

    this.submittingVehicle = true;
    this.vehicleError = '';
    this.vehicleFeedback = '';
    this.mediaFeedback = '';
    this.mediaError = '';

    const request$ = this.editingVehicleId
      ? this.vehiclesApiService.update(this.editingVehicleId, payload)
      : this.vehiclesApiService.create(payload);

    request$.subscribe({
      next: (vehicle) => {
        const vehicleId = vehicle.id;

        this.submittingVehicle = false;
        this.createMode = false;
        this.clearCreateIntent();
        this.editingVehicleId = vehicleId;
        this.selectedVehicleId = vehicleId;
        this.vehicleDraft = {
          ...payload,
          addressLine: payload.addressLine || '',
          isPublished: payload.isPublished ?? true,
        };

        if (this.pendingVehicleFiles.length > 0) {
          this.uploadPendingVehicleFiles(vehicleId, successMessage);
          return;
        }

        this.vehicleFeedback = successMessage;
        this.loadData(vehicleId);
      },
      error: (error) => {
        this.submittingVehicle = false;
        this.vehicleFeedback = '';
        this.vehicleError =
          error?.error?.message || 'Não foi possível publicar o anúncio agora.';
      },
    });
  }

  protected startEditingVehicle(vehicle: OwnerVehicleItem) {
    this.createMode = false;
    this.clearCreateIntent();
    this.editingVehicleId = vehicle.id;
    this.selectedVehicleId = vehicle.id;
    this.vehicleDraft = {
      title: vehicle.title,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      plate: vehicle.plate,
      city: vehicle.city,
      state: vehicle.state,
      category: vehicle.category,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      seats: vehicle.seats,
      dailyRate: vehicle.dailyRate,
      description: vehicle.description,
      addressLine: vehicle.addressLine || '',
      isPublished: vehicle.isPublished,
    };
    this.clearPendingVehicleFiles();
    this.vehicleFeedback = '';
    this.vehicleError = '';
    this.mediaFeedback = '';
    this.mediaError = '';
    this.loadSelectedVehicleAvailability();
  }

  protected cancelEditingVehicle() {
    this.createMode = false;
    this.editingVehicleId = null;
    this.vehicleDraft = this.createVehicleDraft();
    this.clearPendingVehicleFiles();
    this.vehicleFeedback = '';
    this.vehicleError = '';
    this.mediaFeedback = '';
    this.mediaError = '';
    this.clearCreateIntent();
  }

  protected onVehicleFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files ?? []);

    if (!selectedFiles.length) {
      return;
    }

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith('image/'));
    const exceededLimit = this.pendingVehicleFiles.length + imageFiles.length > 8;
    const limitedFiles = [...this.pendingVehicleFiles, ...imageFiles].slice(0, 8);

    this.setPendingVehicleFiles(limitedFiles);
    this.mediaError =
      imageFiles.length !== selectedFiles.length
        ? 'Somente arquivos de imagem podem ser enviados.'
        : exceededLimit
          ? 'Você pode enviar até 8 novas fotos por vez.'
          : '';
    this.mediaFeedback = `${this.pendingVehicleFiles.length} foto(s) pronta(s) para envio.`;
    input.value = '';
  }

  protected removePendingVehicleFile(index: number) {
    const nextFiles = this.pendingVehicleFiles.filter((_, fileIndex) => fileIndex !== index);
    this.setPendingVehicleFiles(nextFiles);
    this.mediaFeedback = nextFiles.length
      ? `${nextFiles.length} foto(s) pronta(s) para envio.`
      : '';
  }

  protected removeVehicleImage(image: VehicleImage) {
    if (!this.editingVehicleId) {
      return;
    }

    const vehicleId = this.editingVehicleId;

    this.imageActionId = image.id;
    this.mediaError = '';

    this.vehiclesApiService.removeImage(vehicleId, image.id).subscribe({
      next: () => {
        this.imageActionId = null;
        this.mediaFeedback = 'Foto removida do anúncio.';
        this.loadData(vehicleId);
      },
      error: (error) => {
        this.imageActionId = null;
        this.mediaFeedback = '';
        this.mediaError =
          error?.error?.message || 'Não foi possível remover esta foto agora.';
      },
    });
  }

  protected toggleVehiclePublication(vehicle: OwnerVehicleItem) {
    const nextPublishedState = !vehicle.isPublished;

    this.vehicleActionId = vehicle.id;
    this.vehicleError = '';

    this.vehiclesApiService
      .update(vehicle.id, { isPublished: nextPublishedState })
      .subscribe({
        next: () => {
          this.vehicleActionId = null;
          this.vehicleFeedback = nextPublishedState
            ? 'Anúncio publicado com sucesso.'
            : 'Anúncio movido para rascunho.';

          if (this.editingVehicleId === vehicle.id) {
            this.vehicleDraft.isPublished = nextPublishedState;
          }

          this.loadData(vehicle.id);
        },
        error: (error) => {
          this.vehicleActionId = null;
          this.vehicleFeedback = '';
          this.vehicleError =
            error?.error?.message || 'Não foi possível alterar a publicação do anúncio.';
        },
      });
  }

  protected deactivateVehicle(vehicle: OwnerVehicleItem) {
    if (!globalThis.confirm(`Deseja desativar o anúncio "${vehicle.title}"?`)) {
      return;
    }

    this.vehicleActionId = vehicle.id;
    this.vehicleError = '';

    this.vehiclesApiService.remove(vehicle.id).subscribe({
      next: () => {
        this.vehicleActionId = null;

        if (this.editingVehicleId === vehicle.id) {
          this.cancelEditingVehicle();
        }

        this.vehicleFeedback = 'Anúncio desativado com sucesso.';
        this.loadData();
      },
      error: (error) => {
        this.vehicleActionId = null;
        this.vehicleFeedback = '';
        this.vehicleError =
          error?.error?.message || 'Não foi possível desativar o anúncio agora.';
      },
    });
  }

  protected categoryLabel(category: VehicleCategory) {
    return this.categoryOptions.find((option) => option.value === category)?.label ?? category;
  }

  protected transmissionLabel(transmission: TransmissionType) {
    return this.transmissionOptions.find((option) => option.value === transmission)?.label ?? transmission;
  }

  protected approve(bookingId: string) {
    this.bookingActionId = bookingId;
    this.bookingsApiService.approve(bookingId).subscribe({
      next: () => {
        this.bookingActionId = null;
        this.loadData();
      },
      error: () => {
        this.bookingActionId = null;
        this.loadError = 'Não foi possível aprovar a reserva agora.';
      },
    });
  }

  protected reject(bookingId: string) {
    this.bookingActionId = bookingId;
    this.bookingsApiService
      .reject(bookingId, 'Indisponibilidade no período')
      .subscribe({
        next: () => {
          this.bookingActionId = null;
          this.loadData();
        },
        error: () => {
          this.bookingActionId = null;
          this.loadError = 'Não foi possível recusar a reserva agora.';
        },
      });
  }

  protected blockDates() {
    if (!this.selectedVehicleId || !this.blockedDateDraft.startDate || !this.blockedDateDraft.endDate) {
      this.blockedDateError = 'Escolha o veículo e o período que deve ser bloqueado.';
      this.blockedDateFeedback = '';
      return;
    }

    this.submittingBlockedDate = true;
    this.blockedDateError = '';

    this.availabilityApiService
      .blockDates(this.selectedVehicleId, {
        ...this.blockedDateDraft,
        reason: this.blockedDateDraft.reason.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.submittingBlockedDate = false;
          this.blockedDateFeedback = 'Período bloqueado com sucesso.';
          this.blockedDateDraft = {
            startDate: '',
            endDate: '',
            reason: '',
          };
          this.loadSelectedVehicleAvailability();
        },
        error: (error) => {
          this.submittingBlockedDate = false;
          this.blockedDateFeedback = '';
          this.blockedDateError =
            error?.error?.message || 'Não foi possível bloquear este período.';
        },
      });
  }

  protected loadSelectedVehicleAvailability() {
    if (!this.selectedVehicleId) {
      this.blockedDates = [];
      return;
    }

    this.availabilityLoading = true;
    this.blockedDateError = '';

    this.availabilityApiService
      .getVehicleAvailability(this.selectedVehicleId)
      .subscribe({
        next: (availability) => {
          this.blockedDates = availability.blockedDates;
          this.availabilityLoading = false;
        },
        error: (error) => {
          this.availabilityLoading = false;
          this.blockedDateError =
            error?.error?.message || 'Não foi possível carregar o calendário do veículo.';
        },
      });
  }

  private uploadPendingVehicleFiles(vehicleId: string, successMessage: string) {
    this.uploadingVehicleImages = true;
    this.mediaError = '';

    this.vehiclesApiService.uploadImages(vehicleId, this.pendingVehicleFiles).subscribe({
      next: () => {
        this.uploadingVehicleImages = false;
        this.vehicleFeedback = successMessage;
        this.mediaFeedback = 'Fotos enviadas com sucesso.';
        this.clearPendingVehicleFiles();
        this.loadData(vehicleId);
      },
      error: (error) => {
        this.uploadingVehicleImages = false;
        this.vehicleFeedback = successMessage;
        this.mediaFeedback = '';
        this.mediaError =
          error?.error?.message || 'O anúncio foi salvo, mas as fotos não puderam ser enviadas agora.';
        this.loadData(vehicleId);
      },
    });
  }

  private setPendingVehicleFiles(files: File[]) {
    this.revokePendingPreviewUrls();
    this.pendingVehicleFiles = files;
    this.pendingVehiclePreviews = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }

  private clearPendingVehicleFiles() {
    this.setPendingVehicleFiles([]);
  }

  private revokePendingPreviewUrls() {
    this.pendingVehiclePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }

  private loadData(focusVehicleId?: string) {
    this.loading = true;
    this.loadError = '';

    forkJoin({
      vehicles: this.vehiclesApiService.getMine(),
      bookings: this.bookingsApiService.getOwnerBookings(),
    }).subscribe({
      next: ({ vehicles, bookings }) => {
        this.vehicles = vehicles;
        this.bookings = bookings;

        if (this.editingVehicleId && !this.vehicles.some((vehicle) => vehicle.id === this.editingVehicleId)) {
          this.cancelEditingVehicle();
        }

        if (this.manageableVehicles.length > 0) {
          const preferredVehicleId = focusVehicleId || this.selectedVehicleId;
          const stillExists = this.manageableVehicles.some((vehicle) => vehicle.id === preferredVehicleId);
          this.selectedVehicleId = stillExists ? preferredVehicleId : this.manageableVehicles[0].id;
          this.loadSelectedVehicleAvailability();
        } else {
          this.selectedVehicleId = '';
          this.blockedDates = [];
        }
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.loadError =
          error?.error?.message || 'Não foi possível carregar seu painel.';
      },
    });
  }

  private clearCreateIntent() {
    if (!this.route.snapshot.queryParamMap.has('editor')) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { editor: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private createVehicleDraft(): CreateVehiclePayload {
    const profile = this.authService.currentUser()?.profile;

    return {
      title: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      plate: '',
      city: profile?.city || '',
      state: profile?.state || '',
      category: 'HATCH',
      transmission: 'AUTOMATIC',
      fuelType: 'FLEX',
      seats: 5,
      dailyRate: 150,
      description: '',
      addressLine: '',
      isPublished: true,
    };
  }

  private normalizeVehicleDraft(): CreateVehiclePayload | null {
    const payload: CreateVehiclePayload = {
      ...this.vehicleDraft,
      title: this.vehicleDraft.title.trim(),
      brand: this.vehicleDraft.brand.trim(),
      model: this.vehicleDraft.model.trim(),
      plate: this.vehicleDraft.plate.trim().toUpperCase(),
      city: this.vehicleDraft.city.trim(),
      state: this.vehicleDraft.state.trim().toUpperCase(),
      description: this.vehicleDraft.description.trim(),
      addressLine: this.vehicleDraft.addressLine?.trim() || '',
      year: Number(this.vehicleDraft.year),
      seats: Number(this.vehicleDraft.seats),
      dailyRate: Number(this.vehicleDraft.dailyRate),
    };

    if (
      !payload.title ||
      !payload.brand ||
      !payload.model ||
      !payload.plate ||
      !payload.city ||
      payload.state.length !== 2 ||
      !payload.description ||
      Number.isNaN(payload.year) ||
      Number.isNaN(payload.seats) ||
      Number.isNaN(payload.dailyRate)
    ) {
      return null;
    }

    return payload;
  }
}
