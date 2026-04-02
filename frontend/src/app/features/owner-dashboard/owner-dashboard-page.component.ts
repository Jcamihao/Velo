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
  BookingApprovalMode,
  Booking,
  CancellationPolicy,
  CreateVehiclePayload,
  FuelType,
  MotorcycleStyle,
  OwnerVehicleItem,
  TransmissionType,
  VehicleAddon,
  VehicleAvailabilityResponse,
  VehicleImage,
  VehicleCategory,
  VehicleType,
} from '../../core/models/domain.models';

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type PublicationChecklistItem = {
  title: string;
  description: string;
  done: boolean;
};

type CalendarDayItem = {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  state: 'free' | 'booked' | 'blocked' | 'outside';
  note: string;
  isToday: boolean;
};

type IdlePeriodItem = {
  startDate: string;
  endDate: string;
  totalDays: number;
  label: string;
};

type ScheduleSummary = {
  booked: number;
  blocked: number;
  free: number;
};

type FinancialSnapshot = {
  revenue: number;
  bookingCount: number;
  occupancyRate: number;
  averageTicket: number;
  longestIdleGapDays: number;
};

type OwnerViewMode = 'dashboard' | 'ads';

@Component({
  selector: 'app-owner-dashboard-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  template: `
    <main class="page owner-page">
      <section class="owner-hero">
        <span class="eyebrow">
          {{
            isDashboardView
              ? 'Dashboard do anfitrião'
              : createMode
                ? 'Anunciar carro'
                : 'Meus anúncios'
          }}
        </span>
        <h1>
          {{
            isDashboardView
              ? 'Acompanhe faturamento, agenda e pedidos em um só lugar'
              : createMode
                ? 'Publique um novo veículo'
                : 'Gerencie seus veículos anunciados'
          }}
        </h1>
        <p>
          {{
            isDashboardView
              ? manageableVehicles.length + ' veículos ativos • ' + bookings.length + ' reservas monitoradas'
              : vehicles.length + ' veículos cadastrados • ' + bookings.length + ' reservas recebidas'
          }}
        </p>

        <div class="owner-hero__actions">
          <div class="owner-hero__switches">
            <button
              type="button"
              class="btn owner-hero__switch"
              [class.btn-primary]="isDashboardView"
              [class.btn-secondary]="!isDashboardView"
              (click)="goToDashboardView()"
            >
              Dashboard
            </button>

            <button
              type="button"
              class="btn owner-hero__switch"
              [class.btn-primary]="isAdsView"
              [class.btn-secondary]="!isAdsView"
              (click)="goToAdsView()"
            >
              Meus anúncios
            </button>
          </div>

          <button type="button" class="btn btn-primary" (click)="goToCreateView()">
            Novo anúncio
          </button>
        </div>
      </section>

      <section class="dashboard-card" *ngIf="isDashboardView && !manageableVehicles.length">
        <div class="card-head">
          <div>
            <h2>Seu dashboard vai aparecer aqui</h2>
            <p>Publique o primeiro anúncio para começar a acompanhar agenda, faturamento e pedidos.</p>
          </div>
          <button type="button" class="btn btn-primary" (click)="goToCreateView()">
            Criar primeiro anúncio
          </button>
        </div>
      </section>

      <section class="stats-grid" *ngIf="isDashboardView">
        <article><strong>{{ pendingCount }}</strong><span>pendentes</span></article>
        <article><strong>{{ approvedCount }}</strong><span>aprovadas</span></article>
        <article><strong>{{ completedCount }}</strong><span>concluídas</span></article>
      </section>

      <section class="dashboard-card finance-card" *ngIf="isDashboardView && manageableVehicles.length">
        <div class="card-head">
          <div>
            <h2>Dashboard financeiro</h2>
            <p>Visão consolidada do mês selecionado para os seus anúncios ativos.</p>
          </div>

          <label class="month-filter">
            <span>Mês</span>
            <input
              type="month"
              [ngModel]="calendarMonth"
              (ngModelChange)="updateCalendarMonth($event)"
            />
          </label>
        </div>

        <div class="finance-grid">
          <article>
            <span>Faturamento</span>
            <strong>{{ financialSnapshot.revenue | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
            <small>{{ financialSnapshot.bookingCount }} reserva(s) com impacto no período</small>
          </article>

          <article>
            <span>Taxa de ocupação</span>
            <strong>{{ financialSnapshot.occupancyRate | number: '1.0-1' }}%</strong>
            <small>Baseado nos dias reservados do mês</small>
          </article>

          <article>
            <span>Ticket médio</span>
            <strong>{{ financialSnapshot.averageTicket | currency: 'BRL' : 'symbol' : '1.2-2' }}</strong>
            <small>Valor médio por reserva no mês</small>
          </article>

          <article>
            <span>Períodos ociosos</span>
            <strong>{{ financialSnapshot.longestIdleGapDays }} dia(s)</strong>
            <small>Maior lacuna livre do veículo selecionado</small>
          </article>
        </div>
      </section>

      <section class="dashboard-card dashboard-card--form" *ngIf="isAdsView && showVehicleEditor">
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

        <section class="publication-guide">
          <div class="publication-guide__head">
            <div>
              <span class="eyebrow eyebrow--soft">Publicação guiada</span>
              <h3>{{ publicationChecklistCompleted }}/{{ publicationChecklist.length }} itens completos</h3>
            </div>

            <strong>{{ publicationReadinessPercentage }}%</strong>
          </div>

          <div class="publication-checklist">
            <article
              class="publication-item"
              *ngFor="let item of publicationChecklist; trackBy: trackByChecklistTitle"
            >
              <span class="publication-item__icon" [class.publication-item__icon--done]="item.done">
                {{ item.done ? 'OK' : '!' }}
              </span>

              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.description }}</p>
              </div>
            </article>
          </div>

          <div class="publication-suggestions" *ngIf="publicationSuggestions.length">
            <strong>Prioridades agora</strong>
            <p *ngFor="let suggestion of publicationSuggestions; trackBy: trackByString">{{ suggestion }}</p>
          </div>
        </section>

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

        <div class="form-grid">
          <label>
            <span>Tipo de veículo</span>
            <select [(ngModel)]="vehicleDraft.vehicleType">
              <option *ngFor="let option of vehicleTypeOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

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
        </div>

        <div class="form-grid">
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
        </div>

        <div class="form-grid">
          <label>
            <span>Valor semanal</span>
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

        <div class="form-grid">
          <label>
            <span>Reserva</span>
            <select [(ngModel)]="vehicleDraft.bookingApprovalMode">
              <option *ngFor="let option of bookingApprovalOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label>
            <span>Cancelamento</span>
            <select [(ngModel)]="vehicleDraft.cancellationPolicy">
              <option *ngFor="let option of cancellationPolicyOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <section class="media-manager">
          <div class="media-manager__head">
            <div>
              <h3>Promoções</h3>
              <p>Ofertas aplicadas automaticamente no cálculo da reserva.</p>
            </div>
          </div>

          <div class="form-grid">
            <label>
              <span>Primeira reserva (%)</span>
              <input
                [(ngModel)]="vehicleDraft.firstBookingDiscountPercent"
                type="number"
                min="0"
                max="90"
                step="1"
              />
            </label>

            <label>
              <span>Pacote semanal (%)</span>
              <input
                [(ngModel)]="vehicleDraft.weeklyDiscountPercent"
                type="number"
                min="0"
                max="90"
                step="1"
              />
            </label>
          </div>

          <div class="form-grid">
            <label>
              <span>Cupom</span>
              <input [(ngModel)]="vehicleDraft.couponCode" placeholder="PRIMEIRAVIAGEM" maxlength="32" />
            </label>

            <label>
              <span>Desconto do cupom (%)</span>
              <input
                [(ngModel)]="vehicleDraft.couponDiscountPercent"
                type="number"
                min="0"
                max="90"
                step="1"
              />
            </label>
          </div>
        </section>

        <section class="media-manager">
          <div class="media-manager__head">
            <div>
              <h3>Preço dinâmico</h3>
              <p>Ajuste a diária por fim de semana, feriado, demanda e antecedência.</p>
            </div>
          </div>

          <div class="form-grid form-grid--triple">
            <label>
              <span>Fim de semana (%)</span>
              <input
                [(ngModel)]="vehicleDraft.weekendSurchargePercent"
                type="number"
                min="0"
                max="90"
                step="1"
              />
            </label>

            <label>
              <span>Feriado (%)</span>
              <input
                [(ngModel)]="vehicleDraft.holidaySurchargePercent"
                type="number"
                min="0"
                max="90"
                step="1"
              />
            </label>

            <label>
              <span>Alta demanda (%)</span>
              <input
                [(ngModel)]="vehicleDraft.highDemandSurchargePercent"
                type="number"
                min="0"
                max="90"
                step="1"
              />
            </label>
          </div>

          <div class="form-grid">
            <label>
              <span>Desconto por antecedência (%)</span>
              <input
                [(ngModel)]="vehicleDraft.advanceBookingDiscountPercent"
                type="number"
                min="0"
                max="90"
                step="1"
              />
            </label>

            <label>
              <span>Antecedência mínima (dias)</span>
              <input
                [(ngModel)]="vehicleDraft.advanceBookingDaysThreshold"
                type="number"
                min="0"
                max="365"
                step="1"
              />
            </label>
          </div>
        </section>

        <div class="form-grid">
          <label>
            <span>Latitude</span>
            <input [(ngModel)]="vehicleDraft.latitude" type="number" step="0.000001" placeholder="-23.550520" />
          </label>

          <label>
            <span>Longitude</span>
            <input [(ngModel)]="vehicleDraft.longitude" type="number" step="0.000001" placeholder="-46.633308" />
          </label>
        </div>

        <div class="form-grid" *ngIf="vehicleDraft.vehicleType === 'MOTORCYCLE'">
          <label>
            <span>Estilo da moto</span>
            <select [(ngModel)]="vehicleDraft.motorcycleStyle">
              <option value="">Selecione</option>
              <option *ngFor="let option of motorcycleStyleOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label>
            <span>Cilindrada</span>
            <input [(ngModel)]="vehicleDraft.engineCc" type="number" min="50" max="2500" step="1" />
          </label>
        </div>

        <div class="form-grid" *ngIf="vehicleDraft.vehicleType === 'MOTORCYCLE'">
          <label class="toggle-field">
            <span>Freio ABS</span>
            <button
              type="button"
              class="toggle-button"
              [class.toggle-button--active]="vehicleDraft.hasAbs"
              (click)="vehicleDraft.hasAbs = !vehicleDraft.hasAbs"
            >
              {{ vehicleDraft.hasAbs ? 'Incluído' : 'Não' }}
            </button>
          </label>

          <label class="toggle-field">
            <span>Baú</span>
            <button
              type="button"
              class="toggle-button"
              [class.toggle-button--active]="vehicleDraft.hasTopCase"
              (click)="vehicleDraft.hasTopCase = !vehicleDraft.hasTopCase"
            >
              {{ vehicleDraft.hasTopCase ? 'Incluído' : 'Não' }}
            </button>
          </label>
        </div>

        <section class="media-manager">
          <div class="media-manager__head">
            <div>
              <h3>Itens extras</h3>
              <p>Configure adicionais opcionais para aumentar o ticket da reserva.</p>
            </div>

            <button type="button" class="btn btn-secondary" (click)="addAddon()">
              Adicionar extra
            </button>
          </div>

          <p class="state-message" *ngIf="!vehicleDraft.addons.length">
            Nenhum item extra configurado ainda.
          </p>

          <div class="addon-list" *ngIf="vehicleDraft.addons.length">
            <article
              class="addon-row"
              *ngFor="let addon of vehicleDraft.addons; let index = index; trackBy: trackByAddon"
            >
              <div class="form-grid">
                <label>
                  <span>Nome</span>
                  <input [(ngModel)]="addon.name" placeholder="Ex.: Capacete extra" />
                </label>

                <label>
                  <span>Preço</span>
                  <input [(ngModel)]="addon.price" type="number" min="0" step="0.01" />
                </label>
              </div>

              <label>
                <span>Descrição</span>
                <input [(ngModel)]="addon.description" placeholder="Explique rapidamente o que está incluso" />
              </label>

              <div class="addon-row__actions">
                <button type="button" class="btn btn-secondary" (click)="toggleAddon(index)">
                  {{ addon.enabled === false ? 'Ativar' : 'Desativar' }}
                </button>
                <button type="button" class="btn btn-ghost btn-ghost--danger" (click)="removeAddon(index)">
                  Remover
                </button>
              </div>
            </article>
          </div>
        </section>

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
            <article
              class="media-card"
              *ngFor="let image of editingVehicle?.images; let index = index; trackBy: trackById"
            >
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

            <article
              class="media-card media-card--pending"
              *ngFor="let preview of pendingVehiclePreviews; let index = index; trackBy: trackByPreview"
            >
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

      <section class="dashboard-card" *ngIf="isAdsView">
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

        <article
          class="vehicle-row"
          *ngFor="let vehicle of vehicles; trackBy: trackById"
          [class.vehicle-row--editing]="vehicle.id === editingVehicleId"
        >
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
            <span>{{ vehicle.dailyRate | currency: 'BRL' : 'symbol' : '1.2-2' }} / semana</span>
            <p>
              {{ vehicle.images.length }} fotos •
              {{ vehicleTypeLabel(vehicle.vehicleType) }} •
              {{ categoryLabel(vehicle.category) }} •
              {{ transmissionLabel(vehicle.transmission) }}
            </p>
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

      <section class="dashboard-card" *ngIf="isAdsView">
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
              <option *ngFor="let vehicle of manageableVehicles; trackBy: trackById" [value]="vehicle.id">
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
          <article class="blocked-date-item" *ngFor="let period of blockedDates; trackBy: trackByBlockedDate">
            <strong>{{ period.startDate | date: 'dd/MM/yyyy' }} até {{ period.endDate | date: 'dd/MM/yyyy' }}</strong>
            <span>{{ period.reason || 'Bloqueio manual do proprietário' }}</span>
          </article>
        </div>
        <p class="state-message" *ngIf="manageableVehicles.length && !availabilityLoading && !blockedDates.length">
          Nenhum bloqueio manual cadastrado para este veículo.
        </p>
      </section>

      <section class="dashboard-card" *ngIf="isDashboardView && manageableVehicles.length">
        <div class="card-head">
          <div>
            <h2>Agenda visual</h2>
            <p>Reservas, bloqueios e lacunas livres de {{ selectedVehicle?.title || 'seu veículo' }}.</p>
          </div>

          <div class="calendar-controls">
            <button type="button" class="btn btn-secondary" (click)="changeCalendarMonth(-1)">
              Mês anterior
            </button>
            <strong>{{ calendarMonthLabel }}</strong>
            <button type="button" class="btn btn-secondary" (click)="changeCalendarMonth(1)">
              Próximo mês
            </button>
          </div>
        </div>

        <div class="calendar-legend">
          <span class="calendar-legend__item"><i class="calendar-dot calendar-dot--booked"></i>Reserva</span>
          <span class="calendar-legend__item"><i class="calendar-dot calendar-dot--blocked"></i>Bloqueio</span>
          <span class="calendar-legend__item"><i class="calendar-dot calendar-dot--free"></i>Livre</span>
        </div>

        <div class="calendar-grid" *ngIf="selectedAvailability; else emptyCalendar">
          <span class="calendar-weekday" *ngFor="let weekday of calendarWeekdays; trackBy: trackByString">{{ weekday }}</span>

          <article
            class="calendar-day"
            *ngFor="let day of calendarDays; trackBy: trackByCalendarDay"
            [class.calendar-day--outside]="!day.inCurrentMonth"
            [class.calendar-day--booked]="day.state === 'booked'"
            [class.calendar-day--blocked]="day.state === 'blocked'"
            [class.calendar-day--free]="day.state === 'free'"
            [class.calendar-day--today]="day.isToday"
          >
            <strong>{{ day.dayNumber }}</strong>
            <small>{{ day.note }}</small>
          </article>
        </div>

        <ng-template #emptyCalendar>
          <p class="state-message">Selecione um veículo para visualizar o calendário.</p>
        </ng-template>

        <div class="calendar-summary" *ngIf="selectedAvailability">
          <article>
            <strong>{{ monthlyScheduleSummary.booked }}</strong>
            <span>dias reservados</span>
          </article>
          <article>
            <strong>{{ monthlyScheduleSummary.blocked }}</strong>
            <span>dias bloqueados</span>
          </article>
          <article>
            <strong>{{ monthlyScheduleSummary.free }}</strong>
            <span>dias livres</span>
          </article>
        </div>

        <div class="idle-periods" *ngIf="selectedAvailability">
          <div class="idle-periods__head">
            <h3>Lacunas livres</h3>
            <p>Use esses períodos para promoções, destaque no anúncio ou bloqueios planejados.</p>
          </div>

          <div class="idle-period-list" *ngIf="idlePeriods.length; else noIdlePeriods">
            <article class="idle-period-item" *ngFor="let period of idlePeriods; trackBy: trackByIdlePeriod">
              <strong>{{ period.label }}</strong>
              <span>{{ period.startDate | date: 'dd/MM' }} até {{ period.endDate | date: 'dd/MM' }}</span>
            </article>
          </div>

          <ng-template #noIdlePeriods>
            <p class="state-message">Nenhuma lacuna livre encontrada neste mês.</p>
          </ng-template>
        </div>
      </section>

      <section class="dashboard-card" *ngIf="isDashboardView">
        <div class="card-head">
          <h2>Solicitações recebidas</h2>
        </div>

        <p class="state-message" *ngIf="loading">Carregando reservas recebidas...</p>
        <p class="state-message" *ngIf="!loading && !bookings.length">
          Assim que um locatário solicitar um período, ele vai aparecer aqui.
        </p>
        <p class="feedback feedback--error" *ngIf="loadError">{{ loadError }}</p>

        <article class="booking-row" *ngFor="let booking of bookings; trackBy: trackById">
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
        padding: 18px 12px 132px;
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
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .stats-grid strong {
        display: block;
        color: var(--primary);
        font-size: 22px;
      }

      .finance-card {
        gap: 18px;
      }

      .owner-hero__actions {
        display: grid;
        gap: 10px;
      }

      .owner-hero__switches {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .owner-hero__switch {
        min-width: 0;
      }

      .finance-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .finance-grid article {
        display: grid;
        gap: 6px;
        padding: 16px;
        border-radius: 18px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .finance-grid strong {
        color: var(--text-primary);
        font-size: 22px;
      }

      .finance-grid small {
        color: var(--text-secondary);
      }

      .dashboard-card--form {
        gap: 16px;
      }

      .card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-direction: column;
        gap: 16px;
      }

      .announcement-steps {
        display: grid;
        grid-template-columns: 1fr;
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

      .publication-guide {
        display: grid;
        gap: 14px;
        padding: 18px;
        border-radius: 22px;
        background: linear-gradient(180deg, rgba(248, 250, 255, 0.96), rgba(255, 255, 255, 0.98));
        border: 1px solid rgba(37, 99, 235, 0.12);
      }

      .publication-guide__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .publication-guide__head strong {
        font-size: 28px;
        color: var(--primary);
      }

      .publication-checklist,
      .publication-suggestions,
      .idle-period-list {
        display: grid;
        gap: 10px;
      }

      .publication-item,
      .idle-period-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 12px;
        padding: 14px;
        border-radius: 18px;
        background: #fff;
        border: 1px solid var(--glass-border-soft);
      }

      .publication-item__icon {
        width: 32px;
        height: 32px;
        display: inline-grid;
        place-items: center;
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.18);
        color: #9a5c00;
        font-size: 12px;
        font-weight: 800;
      }

      .publication-item__icon--done {
        background: rgba(34, 197, 94, 0.16);
        color: var(--success);
      }

      .publication-suggestions {
        padding: 14px;
        border-radius: 18px;
        background: rgba(37, 99, 235, 0.06);
      }

      .publication-suggestions p {
        color: var(--text-primary);
      }

      .form-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .form-grid--triple {
        grid-template-columns: 1fr;
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
        flex-direction: column;
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

      .addon-list {
        display: grid;
        gap: 12px;
      }

      .addon-row {
        display: grid;
        gap: 12px;
        padding: 14px;
        border-radius: 18px;
        background: #fff;
        border: 1px solid var(--glass-border-soft);
      }

      .addon-row__actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
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

      .month-filter {
        min-width: 0;
        width: 100%;
      }

      .calendar-controls {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .calendar-legend {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .calendar-legend__item {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .calendar-dot {
        width: 12px;
        height: 12px;
        border-radius: 999px;
        display: inline-block;
      }

      .calendar-dot--booked {
        background: rgba(37, 99, 235, 0.9);
      }

      .calendar-dot--blocked {
        background: rgba(245, 158, 11, 0.9);
      }

      .calendar-dot--free {
        background: rgba(34, 197, 94, 0.9);
      }

      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 6px;
      }

      .calendar-weekday {
        text-align: center;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      .calendar-day {
        display: grid;
        gap: 6px;
        min-height: 72px;
        padding: 10px;
        border-radius: 16px;
        background: #fff;
        border: 1px solid var(--glass-border-soft);
      }

      .calendar-day--booked {
        background: rgba(37, 99, 235, 0.08);
        border-color: rgba(37, 99, 235, 0.22);
      }

      .calendar-day--blocked {
        background: rgba(245, 158, 11, 0.1);
        border-color: rgba(245, 158, 11, 0.24);
      }

      .calendar-day--free {
        background: rgba(34, 197, 94, 0.08);
        border-color: rgba(34, 197, 94, 0.2);
      }

      .calendar-day--outside {
        opacity: 0.45;
      }

      .calendar-day--today {
        box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.2);
      }

      .calendar-summary {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .calendar-summary article,
      .idle-periods {
        display: grid;
        gap: 6px;
      }

      .calendar-summary article {
        padding: 14px;
        border-radius: 18px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .idle-periods {
        gap: 12px;
      }

      .idle-periods__head {
        display: grid;
        gap: 4px;
      }

      .feedback {
        color: var(--success);
        font-weight: 600;
      }

      .feedback--error {
        color: var(--error);
      }

      @media (min-width: 721px) {
        .owner-hero__actions {
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
        }

        .form-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .form-grid--triple {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .stats-grid {
          grid-template-columns: repeat(3, 1fr);
        }

        .announcement-steps {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .finance-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .calendar-summary {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .card-head,
        .media-manager__head {
          flex-direction: row;
        }

        .month-filter {
          width: auto;
          min-width: 180px;
        }

        .calendar-grid {
          gap: 8px;
        }

        .calendar-day {
          min-height: 84px;
          padding: 12px;
        }
      }

      @media (min-width: 1080px) {
        .owner-page {
          gap: 20px;
          padding: 28px 20px 56px;
        }

        .owner-hero,
        .dashboard-card,
        .stats-grid article {
          padding: 24px;
        }

        .media-grid {
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }

        .vehicle-row__content {
          padding: 24px;
        }

        .calendar-day {
          min-height: 92px;
        }

        .booking-row {
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
        }
      }

      .vehicle-row__top {
        flex-direction: column;
      }

      @media (min-width: 721px) {
        .vehicle-row__top {
          flex-direction: row;
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
  private readonly calendarMonthFormatter = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  private readonly shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
  private readonly emptyScheduleSummary: ScheduleSummary = {
    booked: 0,
    blocked: 0,
    free: 0,
  };
  private readonly emptyFinancialSnapshot: FinancialSnapshot = {
    revenue: 0,
    bookingCount: 0,
    occupancyRate: 0,
    averageTicket: 0,
    longestIdleGapDays: 0,
  };
  private bookingStatusSummaryCacheSource: Booking[] | null = null;
  private bookingStatusSummaryCache = {
    pending: 0,
    approved: 0,
    completed: 0,
  };
  private manageableVehiclesCacheSource: OwnerVehicleItem[] | null = null;
  private manageableVehiclesCache: OwnerVehicleItem[] = [];
  private editingVehicleCacheSource: OwnerVehicleItem[] | null = null;
  private editingVehicleCacheId: string | null = null;
  private editingVehicleCache: OwnerVehicleItem | null = null;
  private selectedVehicleCacheSource: OwnerVehicleItem[] | null = null;
  private selectedVehicleCacheId = '';
  private selectedVehicleCache: OwnerVehicleItem | null = null;
  private calendarMonthLabelCacheValue = '';
  private calendarMonthLabelCache = '';
  private publicationChecklistCacheKey = '';
  private publicationChecklistCache: PublicationChecklistItem[] = [];
  private publicationChecklistSummaryCacheSource: PublicationChecklistItem[] | null = null;
  private publicationChecklistSummaryCache = {
    completed: 0,
    percentage: 0,
    suggestions: [] as string[],
  };
  private calendarDaysCacheMonth = '';
  private calendarDaysCacheAvailability: VehicleAvailabilityResponse | null = null;
  private calendarDaysCache: CalendarDayItem[] = [];
  private scheduleSummaryCacheSource: CalendarDayItem[] | null = null;
  private scheduleSummaryCache: ScheduleSummary = this.emptyScheduleSummary;
  private idlePeriodsCacheSource: CalendarDayItem[] | null = null;
  private idlePeriodsCache: IdlePeriodItem[] = [];
  private financialSnapshotCacheMonth = '';
  private financialSnapshotCacheBookings: Booking[] | null = null;
  private financialSnapshotCacheVehicles: OwnerVehicleItem[] | null = null;
  private financialSnapshotCacheIdlePeriods: IdlePeriodItem[] | null = null;
  private financialSnapshotCache: FinancialSnapshot = this.emptyFinancialSnapshot;

  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly calendarWeekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  protected readonly vehicleTypeOptions: SelectOption<VehicleType>[] = [
    { label: 'Carro', value: 'CAR' },
    { label: 'Moto', value: 'MOTORCYCLE' },
  ];
  protected readonly bookingApprovalOptions: SelectOption<BookingApprovalMode>[] = [
    { label: 'Manual', value: 'MANUAL' },
    { label: 'Instantânea', value: 'INSTANT' },
  ];
  protected readonly cancellationPolicyOptions: SelectOption<CancellationPolicy>[] = [
    { label: 'Flexível', value: 'FLEXIBLE' },
    { label: 'Moderada', value: 'MODERATE' },
    { label: 'Rígida', value: 'STRICT' },
  ];
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
  protected readonly motorcycleStyleOptions: SelectOption<MotorcycleStyle>[] = [
    { label: 'Scooter', value: 'SCOOTER' },
    { label: 'Street', value: 'STREET' },
    { label: 'Sport', value: 'SPORT' },
    { label: 'Trail', value: 'TRAIL' },
    { label: 'Custom', value: 'CUSTOM' },
    { label: 'Touring', value: 'TOURING' },
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
  protected calendarMonth = this.formatMonthValue(new Date());
  protected selectedVehicleId = '';
  protected selectedAvailability: VehicleAvailabilityResponse | null = null;
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
  protected readonly viewMode: OwnerViewMode;
  protected pendingVehicleFiles: File[] = [];
  protected pendingVehiclePreviews: Array<{ name: string; url: string }> = [];
  protected vehicleDraft = this.createVehicleDraft();

  constructor() {
    this.viewMode = this.route.snapshot.data['view'] === 'dashboard' ? 'dashboard' : 'ads';
    this.createMode =
      this.isAdsView && this.route.snapshot.queryParamMap.get('editor') === 'create';

    if (this.createMode) {
      this.vehicleDraft = this.createVehicleDraft();
    }

    this.loadData();
  }

  ngOnDestroy() {
    this.revokePendingPreviewUrls();
  }

  protected get pendingCount() {
    return this.bookingStatusSummary.pending;
  }

  protected get approvedCount() {
    return this.bookingStatusSummary.approved;
  }

  protected get completedCount() {
    return this.bookingStatusSummary.completed;
  }

  protected get isEditingVehicle() {
    return !!this.editingVehicleId;
  }

  protected get isDashboardView() {
    return this.viewMode === 'dashboard';
  }

  protected get isAdsView() {
    return this.viewMode === 'ads';
  }

  protected get showVehicleEditor() {
    return this.isAdsView && (this.isEditingVehicle || this.createMode);
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
    if (
      this.editingVehicleCacheSource === this.vehicles &&
      this.editingVehicleCacheId === this.editingVehicleId
    ) {
      return this.editingVehicleCache;
    }

    this.editingVehicleCacheSource = this.vehicles;
    this.editingVehicleCacheId = this.editingVehicleId;
    this.editingVehicleCache =
      this.vehicles.find((vehicle) => vehicle.id === this.editingVehicleId) ?? null;

    return this.editingVehicleCache;
  }

  protected get manageableVehicles() {
    if (this.manageableVehiclesCacheSource === this.vehicles) {
      return this.manageableVehiclesCache;
    }

    this.manageableVehiclesCacheSource = this.vehicles;
    this.manageableVehiclesCache = this.vehicles.filter((vehicle) => vehicle.isActive);
    return this.manageableVehiclesCache;
  }

  protected get selectedVehicle() {
    const manageableVehicles = this.manageableVehicles;

    if (
      this.selectedVehicleCacheSource === manageableVehicles &&
      this.selectedVehicleCacheId === this.selectedVehicleId
    ) {
      return this.selectedVehicleCache;
    }

    this.selectedVehicleCacheSource = manageableVehicles;
    this.selectedVehicleCacheId = this.selectedVehicleId;
    this.selectedVehicleCache =
      manageableVehicles.find((vehicle) => vehicle.id === this.selectedVehicleId) ?? null;

    return this.selectedVehicleCache;
  }

  protected get calendarMonthLabel() {
    if (this.calendarMonthLabelCacheValue === this.calendarMonth) {
      return this.calendarMonthLabelCache;
    }

    this.calendarMonthLabelCacheValue = this.calendarMonth;
    this.calendarMonthLabelCache = this.calendarMonthFormatter.format(
      this.getMonthStart(this.calendarMonth),
    );

    return this.calendarMonthLabelCache;
  }

  protected get financialSnapshot() {
    const manageableVehicles = this.manageableVehicles;
    const idlePeriods = this.idlePeriods;

    if (
      this.financialSnapshotCacheMonth === this.calendarMonth &&
      this.financialSnapshotCacheBookings === this.bookings &&
      this.financialSnapshotCacheVehicles === manageableVehicles &&
      this.financialSnapshotCacheIdlePeriods === idlePeriods
    ) {
      return this.financialSnapshotCache;
    }

    const monthStart = this.getMonthStart(this.calendarMonth);
    const monthEnd = this.getNextMonthStart(monthStart);
    const relevantBookings = this.bookings.filter((booking) => {
      if (!['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status)) {
        return false;
      }

      return this.countOverlapDays(booking.startDate, booking.endDate, monthStart, monthEnd) > 0;
    });
    const revenue = relevantBookings.reduce((total, booking) => {
      const overlapDays = this.countOverlapDays(
        booking.startDate,
        booking.endDate,
        monthStart,
        monthEnd,
      );
      const bookingNetAmount = Math.max(0, booking.subtotal - booking.discountsAmount);
      const proratedAmount =
        booking.totalDays > 0 ? (bookingNetAmount / booking.totalDays) * overlapDays : 0;

      return total + proratedAmount;
    }, 0);
    const daysInMonth = this.getDaysInMonth(monthStart);
    const bookedDays = relevantBookings.reduce(
      (total, booking) =>
        total +
        this.countOverlapDays(booking.startDate, booking.endDate, monthStart, monthEnd),
      0,
    );
    const capacityDays = daysInMonth * Math.max(manageableVehicles.length, 1);

    this.financialSnapshotCacheMonth = this.calendarMonth;
    this.financialSnapshotCacheBookings = this.bookings;
    this.financialSnapshotCacheVehicles = manageableVehicles;
    this.financialSnapshotCacheIdlePeriods = idlePeriods;
    this.financialSnapshotCache = {
      revenue: Number(revenue.toFixed(2)),
      bookingCount: relevantBookings.length,
      occupancyRate: capacityDays
        ? Number(((bookedDays / capacityDays) * 100).toFixed(1))
        : 0,
      averageTicket: relevantBookings.length
        ? Number((revenue / relevantBookings.length).toFixed(2))
        : 0,
      longestIdleGapDays: idlePeriods.reduce(
        (longest, period) => Math.max(longest, period.totalDays),
        0,
      ),
    };

    return this.financialSnapshotCache;
  }

  protected get publicationChecklist() {
    const totalPhotos = (this.editingVehicle?.images.length ?? 0) + this.pendingVehicleFiles.length;
    const descriptionLength = this.vehicleDraft.description.trim().length;
    const hasPickupPoint = !!this.vehicleDraft.addressLine?.trim();
    const hasCoordinates =
      this.vehicleDraft.latitude !== undefined && this.vehicleDraft.longitude !== undefined;
    const hasTitleContext =
      this.vehicleDraft.title.trim().length >= 18 &&
      !!this.vehicleDraft.brand.trim() &&
      !!this.vehicleDraft.model.trim();
    const hasConversionBoost =
      this.vehicleDraft.bookingApprovalMode === 'INSTANT' ||
      this.vehicleDraft.addons.some((addon) => addon.enabled !== false) ||
      this.vehicleDraft.firstBookingDiscountPercent > 0 ||
      this.vehicleDraft.weeklyDiscountPercent > 0 ||
      (!!this.vehicleDraft.couponCode && this.vehicleDraft.couponDiscountPercent > 0);
    const checklistCacheKey = [
      totalPhotos,
      descriptionLength,
      hasPickupPoint ? 1 : 0,
      hasCoordinates ? 1 : 0,
      hasTitleContext ? 1 : 0,
      hasConversionBoost ? 1 : 0,
      this.vehicleDraft.vehicleType,
      this.vehicleDraft.motorcycleStyle ?? '',
      this.vehicleDraft.engineCc ?? '',
    ].join('|');

    if (this.publicationChecklistCacheKey === checklistCacheKey) {
      return this.publicationChecklistCache;
    }

    this.publicationChecklistCacheKey = checklistCacheKey;
    this.publicationChecklistCache = [
      {
        title: 'Fotos do anúncio',
        description:
          totalPhotos >= 3
            ? `${totalPhotos} fotos prontas para vender melhor.`
            : 'Faltam fotos. Adicione pelo menos 3 imagens reais do veículo.',
        done: totalPhotos >= 3,
      },
      {
        title: 'Descrição completa',
        description:
          descriptionLength >= 120
            ? 'Descrição boa o suficiente para responder as dúvidas básicas.'
            : 'Faltou descrição. Explique regras, diferenciais e itens inclusos.',
        done: descriptionLength >= 120,
      },
      {
        title: 'Localização e retirada',
        description:
          hasPickupPoint && hasCoordinates
            ? 'Ponto de retirada e mapa já estão configurados.'
            : 'Defina endereço e coordenadas para reduzir atrito antes da reserva.',
        done: hasPickupPoint && hasCoordinates,
      },
      {
        title: 'Anúncio pode converter mais',
        description:
          hasConversionBoost
            ? 'Seu anúncio já tem algum incentivo de conversão ativo.'
            : 'Ative reserva instantânea, extras ou promoção para melhorar a conversão.',
        done: hasConversionBoost,
      },
      {
        title: this.vehicleDraft.vehicleType === 'MOTORCYCLE' ? 'Ficha da moto' : 'Título específico',
        description:
          this.vehicleDraft.vehicleType === 'MOTORCYCLE'
            ? this.vehicleDraft.motorcycleStyle && this.vehicleDraft.engineCc
              ? 'Estilo e cilindrada ajudam a filtrar melhor a moto.'
              : 'Informe estilo e cilindrada para melhorar a descoberta da moto.'
            : hasTitleContext
              ? 'Título claro com marca e modelo aumenta a confiança.'
              : 'Use um título mais específico com marca, modelo e diferencial.',
        done:
          this.vehicleDraft.vehicleType === 'MOTORCYCLE'
            ? !!this.vehicleDraft.motorcycleStyle && !!this.vehicleDraft.engineCc
            : hasTitleContext,
      },
    ];

    return this.publicationChecklistCache;
  }

  protected get publicationChecklistCompleted() {
    return this.publicationChecklistSummary.completed;
  }

  protected get publicationReadinessPercentage() {
    return this.publicationChecklistSummary.percentage;
  }

  protected get publicationSuggestions() {
    return this.publicationChecklistSummary.suggestions;
  }

  protected get calendarDays(): CalendarDayItem[] {
    if (!this.selectedAvailability) {
      return [];
    }

    if (
      this.calendarDaysCacheMonth === this.calendarMonth &&
      this.calendarDaysCacheAvailability === this.selectedAvailability
    ) {
      return this.calendarDaysCache;
    }

    const monthStart = this.getMonthStart(this.calendarMonth);
    const startOffset = (monthStart.getDay() + 6) % 7;
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - startOffset);

    this.calendarDaysCacheMonth = this.calendarMonth;
    this.calendarDaysCacheAvailability = this.selectedAvailability;
    this.calendarDaysCache = Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      const date = this.formatDateKey(day);
      const inCurrentMonth = day.getMonth() === monthStart.getMonth();
      const isBooked =
        this.selectedAvailability?.approvedBookings.some((booking) =>
          this.dateKeyInsidePeriod(date, booking.startDate, booking.endDate),
        ) ?? false;
      const isBlocked =
        !isBooked &&
        (this.selectedAvailability?.blockedDates.some((period) =>
          this.dateKeyInsidePeriod(date, period.startDate, period.endDate),
        ) ?? false);
      const state = !inCurrentMonth ? 'outside' : isBooked ? 'booked' : isBlocked ? 'blocked' : 'free';

      return {
        date,
        dayNumber: day.getDate(),
        inCurrentMonth,
        state,
        note:
          state === 'booked'
            ? 'Reserva'
            : state === 'blocked'
              ? 'Bloqueio'
              : state === 'outside'
                ? ''
                : 'Livre',
        isToday: date === this.today,
      };
    });

    return this.calendarDaysCache;
  }

  protected get monthlyScheduleSummary() {
    const calendarDays = this.calendarDays;

    if (this.scheduleSummaryCacheSource === calendarDays) {
      return this.scheduleSummaryCache;
    }

    this.scheduleSummaryCacheSource = calendarDays;
    this.scheduleSummaryCache = calendarDays
      .filter((day) => day.inCurrentMonth)
      .reduce(
        (summary, day) => {
          if (day.state === 'booked') {
            summary.booked += 1;
          } else if (day.state === 'blocked') {
            summary.blocked += 1;
          } else if (day.state === 'free') {
            summary.free += 1;
          }

          return summary;
        },
        {
          ...this.emptyScheduleSummary,
        },
      );

    return this.scheduleSummaryCache;
  }

  protected get idlePeriods(): IdlePeriodItem[] {
    if (!this.selectedAvailability) {
      return [];
    }

    const calendarDays = this.calendarDays;

    if (this.idlePeriodsCacheSource === calendarDays) {
      return this.idlePeriodsCache;
    }

    const periods: IdlePeriodItem[] = [];
    let currentStart: string | null = null;
    let currentLength = 0;

    const pushPeriod = (endDate: string | null) => {
      if (!currentStart || !endDate || currentLength <= 0) {
        return;
      }

      periods.push({
        startDate: currentStart,
        endDate,
        totalDays: currentLength,
        label: `${this.formatShortDate(currentStart)} a ${this.formatShortDate(endDate)} • ${currentLength} dia(s) livre(s)`,
      });
    };

    calendarDays
      .filter((day) => day.inCurrentMonth)
      .forEach((day) => {
        if (day.state === 'free') {
          currentStart = currentStart ?? day.date;
          currentLength += 1;
          return;
        }

        pushPeriod(this.getPreviousDateKey(day.date));
        currentStart = null;
        currentLength = 0;
      });

    pushPeriod(
      currentStart
        ? calendarDays.filter((day) => day.inCurrentMonth).at(-1)?.date ?? currentStart
        : null,
    );

    this.idlePeriodsCacheSource = calendarDays;
    this.idlePeriodsCache = periods;

    return this.idlePeriodsCache;
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
      vehicleType: vehicle.vehicleType || 'CAR',
      category: vehicle.category,
      bookingApprovalMode: vehicle.bookingApprovalMode,
      cancellationPolicy: vehicle.cancellationPolicy,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      seats: vehicle.seats,
      dailyRate: vehicle.dailyRate,
      addons: this.cloneAddons(vehicle.addons),
      firstBookingDiscountPercent: vehicle.firstBookingDiscountPercent,
      weeklyDiscountPercent: vehicle.weeklyDiscountPercent,
      couponCode: vehicle.couponCode || '',
      couponDiscountPercent: vehicle.couponDiscountPercent,
      weekendSurchargePercent: vehicle.weekendSurchargePercent,
      holidaySurchargePercent: vehicle.holidaySurchargePercent,
      highDemandSurchargePercent: vehicle.highDemandSurchargePercent,
      advanceBookingDiscountPercent: vehicle.advanceBookingDiscountPercent,
      advanceBookingDaysThreshold: vehicle.advanceBookingDaysThreshold,
      motorcycleStyle: vehicle.motorcycleStyle || undefined,
      engineCc: vehicle.engineCc || undefined,
      hasAbs: !!vehicle.hasAbs,
      hasTopCase: !!vehicle.hasTopCase,
      description: vehicle.description,
      addressLine: vehicle.addressLine || '',
      latitude: vehicle.latitude ?? undefined,
      longitude: vehicle.longitude ?? undefined,
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

  protected goToDashboardView() {
    if (this.isDashboardView) {
      return;
    }

    this.router.navigate(['/owner-dashboard']);
  }

  protected goToAdsView() {
    if (this.isAdsView && !this.createMode) {
      return;
    }

    this.router.navigate(['/anunciar-carro']);
  }

  protected goToCreateView() {
    if (this.isAdsView) {
      this.createMode = true;
      this.editingVehicleId = null;
      this.vehicleDraft = this.createVehicleDraft();
      this.clearPendingVehicleFiles();
      this.vehicleFeedback = '';
      this.vehicleError = '';
      this.mediaFeedback = '';
      this.mediaError = '';
    }

    this.router.navigate(['/anunciar-carro'], {
      queryParams: { editor: 'create' },
    });
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

  protected vehicleTypeLabel(vehicleType: VehicleType) {
    return this.vehicleTypeOptions.find((option) => option.value === vehicleType)?.label ?? vehicleType;
  }

  protected addAddon() {
    this.vehicleDraft.addons = [...this.vehicleDraft.addons, this.createEmptyAddon()];
  }

  protected removeAddon(index: number) {
    this.vehicleDraft.addons = this.vehicleDraft.addons.filter((_, addonIndex) => addonIndex !== index);
  }

  protected toggleAddon(index: number) {
    this.vehicleDraft.addons = this.vehicleDraft.addons.map((addon, addonIndex) =>
      addonIndex === index
        ? {
            ...addon,
            enabled: addon.enabled === false,
          }
        : addon,
    );
  }

  protected transmissionLabel(transmission: TransmissionType) {
    return this.transmissionOptions.find((option) => option.value === transmission)?.label ?? transmission;
  }

  protected trackById(_index: number, item: { id: string }) {
    return item.id;
  }

  protected trackByString(_index: number, value: string) {
    return value;
  }

  protected trackByChecklistTitle(_index: number, item: PublicationChecklistItem) {
    return item.title;
  }

  protected trackByAddon(index: number, item: VehicleAddon) {
    return item.id || `${item.name}-${index}`;
  }

  protected trackByPreview(_index: number, item: { name: string; url: string }) {
    return item.url;
  }

  protected trackByBlockedDate(_index: number, item: { id: string; startDate: string; endDate: string }) {
    return item.id || `${item.startDate}-${item.endDate}`;
  }

  protected trackByCalendarDay(_index: number, item: CalendarDayItem) {
    return item.date;
  }

  protected trackByIdlePeriod(_index: number, item: IdlePeriodItem) {
    return `${item.startDate}-${item.endDate}`;
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
      this.selectedAvailability = null;
      return;
    }

    this.availabilityLoading = true;
    this.blockedDateError = '';

    this.availabilityApiService
      .getVehicleAvailability(this.selectedVehicleId)
      .subscribe({
        next: (availability) => {
          this.blockedDates = availability.blockedDates;
          this.selectedAvailability = availability;
          this.availabilityLoading = false;
        },
        error: (error) => {
          this.availabilityLoading = false;
          this.selectedAvailability = null;
          this.blockedDateError =
            error?.error?.message || 'Não foi possível carregar o calendário do veículo.';
        },
      });
  }

  protected changeCalendarMonth(step: number) {
    const nextMonth = this.getMonthStart(this.calendarMonth);
    nextMonth.setMonth(nextMonth.getMonth() + step);
    this.calendarMonth = this.formatMonthValue(nextMonth);
  }

  protected updateCalendarMonth(value: string) {
    this.calendarMonth = /^\d{4}-\d{2}$/.test(value)
      ? value
      : this.formatMonthValue(new Date());
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
          this.selectedAvailability = null;
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
      vehicleType: 'CAR',
      category: 'HATCH',
      bookingApprovalMode: 'MANUAL',
      cancellationPolicy: 'FLEXIBLE',
      transmission: 'AUTOMATIC',
      fuelType: 'FLEX',
      seats: 5,
      dailyRate: 150,
      addons: [],
      firstBookingDiscountPercent: 0,
      weeklyDiscountPercent: 0,
      couponCode: '',
      couponDiscountPercent: 0,
      weekendSurchargePercent: 0,
      holidaySurchargePercent: 0,
      highDemandSurchargePercent: 0,
      advanceBookingDiscountPercent: 0,
      advanceBookingDaysThreshold: 0,
      motorcycleStyle: undefined,
      engineCc: undefined,
      hasAbs: false,
      hasTopCase: false,
      description: '',
      addressLine: '',
      latitude: undefined,
      longitude: undefined,
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
      firstBookingDiscountPercent: this.normalizeDiscountPercent(
        this.vehicleDraft.firstBookingDiscountPercent,
      ),
      weeklyDiscountPercent: this.normalizeDiscountPercent(
        this.vehicleDraft.weeklyDiscountPercent,
      ),
      couponCode: this.normalizeCouponCode(this.vehicleDraft.couponCode),
      couponDiscountPercent: this.normalizeDiscountPercent(
        this.vehicleDraft.couponDiscountPercent,
      ),
      weekendSurchargePercent: this.normalizeDiscountPercent(
        this.vehicleDraft.weekendSurchargePercent,
      ),
      holidaySurchargePercent: this.normalizeDiscountPercent(
        this.vehicleDraft.holidaySurchargePercent,
      ),
      highDemandSurchargePercent: this.normalizeDiscountPercent(
        this.vehicleDraft.highDemandSurchargePercent,
      ),
      advanceBookingDiscountPercent: this.normalizeDiscountPercent(
        this.vehicleDraft.advanceBookingDiscountPercent,
      ),
      advanceBookingDaysThreshold: Math.max(
        0,
        Math.min(
          365,
          Math.round(Number(this.vehicleDraft.advanceBookingDaysThreshold ?? 0)),
        ),
      ),
      engineCc: this.parseOptionalNumber(this.vehicleDraft.engineCc),
      latitude: this.parseOptionalNumber(this.vehicleDraft.latitude),
      longitude: this.parseOptionalNumber(this.vehicleDraft.longitude),
      addons: this.vehicleDraft.addons
        .map((addon) => ({
          ...addon,
          name: addon.name.trim(),
          description: addon.description?.trim() || '',
          price: Number(addon.price),
          enabled: addon.enabled !== false,
        }))
        .filter((addon) => addon.name && !Number.isNaN(addon.price)),
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
      Number.isNaN(payload.dailyRate) ||
      (payload.engineCc !== undefined && Number.isNaN(payload.engineCc)) ||
      (payload.latitude !== undefined && Number.isNaN(payload.latitude)) ||
      (payload.longitude !== undefined && Number.isNaN(payload.longitude))
    ) {
      return null;
    }

    if (!payload.couponCode) {
      payload.couponDiscountPercent = 0;
    }

    return payload;
  }

  private createEmptyAddon(): VehicleAddon {
    return {
      id: '',
      name: '',
      description: '',
      price: 0,
      enabled: true,
    };
  }

  private cloneAddons(addons: VehicleAddon[] | undefined) {
    return (addons ?? []).map((addon) => ({
      id: addon.id,
      name: addon.name,
      description: addon.description || '',
      price: addon.price,
      enabled: addon.enabled !== false,
    }));
  }

  private parseOptionalNumber(value: number | null | undefined) {
    if (value === undefined || value === null) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private getMonthStart(monthValue: string) {
    const [year, month] = monthValue.split('-').map((part) => Number(part));
    return new Date(year, (month || 1) - 1, 1);
  }

  private getNextMonthStart(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }

  private getDaysInMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  private formatMonthValue(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatDateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
  }

  private getPreviousDateKey(dateKey: string) {
    const date = this.getDateFromKey(dateKey);
    date.setDate(date.getDate() - 1);
    return this.formatDateKey(date);
  }

  private formatShortDate(dateKey: string) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
      .format(this.getDateFromKey(dateKey))
      .replace('.', '');
  }

  private getDateFromKey(dateKey: string) {
    const [year, month, day] = dateKey.split('-').map((part) => Number(part));
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private dateKeyInsidePeriod(dateKey: string, startDate: string, endDate: string) {
    const periodStart = startDate.slice(0, 10);
    const periodEnd = endDate.slice(0, 10);

    return periodStart <= dateKey && periodEnd > dateKey;
  }

  private countOverlapDays(startDate: string, endDate: string, monthStart: Date, monthEnd: Date) {
    const start = this.getDateFromKey(startDate.slice(0, 10));
    const end = this.getDateFromKey(endDate.slice(0, 10));
    const overlapStart = Math.max(start.getTime(), monthStart.getTime());
    const overlapEnd = Math.min(end.getTime(), monthEnd.getTime());

    if (overlapEnd <= overlapStart) {
      return 0;
    }

    return Math.round((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
  }

  private normalizeDiscountPercent(value: number | null | undefined) {
    const parsed = Number(value ?? 0);

    if (Number.isNaN(parsed)) {
      return 0;
    }

    return Math.max(0, Math.min(90, Math.round(parsed)));
  }

  private normalizeCouponCode(value: string | null | undefined) {
    return (value || '').trim().toUpperCase();
  }

  private get bookingStatusSummary() {
    if (this.bookingStatusSummaryCacheSource === this.bookings) {
      return this.bookingStatusSummaryCache;
    }

    this.bookingStatusSummaryCacheSource = this.bookings;
    this.bookingStatusSummaryCache = this.bookings.reduce(
      (summary, booking) => {
        if (booking.status === 'PENDING') {
          summary.pending += 1;
        } else if (booking.status === 'APPROVED') {
          summary.approved += 1;
        } else if (booking.status === 'COMPLETED') {
          summary.completed += 1;
        }

        return summary;
      },
      {
        pending: 0,
        approved: 0,
        completed: 0,
      },
    );

    return this.bookingStatusSummaryCache;
  }

  private get publicationChecklistSummary() {
    const checklist = this.publicationChecklist;

    if (this.publicationChecklistSummaryCacheSource === checklist) {
      return this.publicationChecklistSummaryCache;
    }

    const completed = checklist.filter((item) => item.done).length;

    this.publicationChecklistSummaryCacheSource = checklist;
    this.publicationChecklistSummaryCache = {
      completed,
      percentage: Math.round((completed / Math.max(checklist.length, 1)) * 100),
      suggestions: checklist
        .filter((item) => !item.done)
        .map((item) => item.description)
        .slice(0, 3),
    };

    return this.publicationChecklistSummaryCache;
  }
}
