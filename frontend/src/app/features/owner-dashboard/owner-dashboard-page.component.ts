import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';
import {
  CreateVehiclePayload,
  FuelType,
  MotorcycleStyle,
  OwnerVehicleItem,
  TransmissionType,
  VehicleAddon,
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

type OwnerViewMode = 'ads';

@Component({
  selector: 'app-owner-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
  ],
  template: `
    <main class="page owner-page">
      <section class="owner-hero">
        <span class="eyebrow">{{ createMode ? 'Novo anúncio' : 'Meus anúncios' }}</span>
        <h1>
          {{ createMode ? 'Publique um novo anúncio' : 'Gerencie seus anúncios publicados' }}
        </h1>
        <p>
          {{ vehicles.length ? vehicles.length + ' anúncio(s) cadastrado(s)' : 'Cadastre seu primeiro veículo para começar a receber interesse.' }}
        </p>

        <div class="owner-hero__actions">
          <button type="button" class="btn btn-primary" (click)="goToCreateView()">
            Novo anúncio
          </button>
        </div>
      </section>

      <section class="dashboard-card dashboard-card--form" *ngIf="isAdsView && showVehicleEditor">
        <div class="card-head">
          <div>
            <h2>{{ isEditingVehicle ? 'Editar anúncio' : 'Publicar anúncio' }}</h2>
            <p>
              {{
                isEditingVehicle
                  ? 'Atualize os dados principais e deixe o anúncio mais claro para quem vai alugar.'
                  : 'Preencha os campos essenciais, adicione fotos e publique seu classificado.'
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
            <span>Dados principais</span>
          </article>
          <article>
            <strong>2</strong>
            <span>Fotos reais</span>
          </article>
          <article>
            <strong>3</strong>
            <span>Publicar</span>
          </article>
        </div>

        <div class="editor-layout">
          <div class="editor-main">
            <section class="editor-panel editor-panel--highlights">
              <div class="editor-highlights">
                <article>
                  <span>Status do anúncio</span>
                  <strong>{{ editorStatusLabel }}</strong>
                  <small>{{ editorStatusHint }}</small>
                </article>

                <article>
                  <span>Fotos carregadas</span>
                  <strong>{{ totalVehiclePhotos }}</strong>
                  <small>{{ totalVehiclePhotos >= 3 ? 'Capa e galeria prontas' : 'Adicione pelo menos 3 fotos' }}</small>
                </article>

                <article>
                  <span>Retirada</span>
                  <strong>{{ vehicleDraft.addressLine?.trim() ? 'Definida' : 'Pendente' }}</strong>
                  <small>{{ vehicleDraft.addressLine?.trim() || 'Informe o bairro, avenida ou ponto de encontro' }}</small>
                </article>
              </div>
            </section>

            <section class="editor-panel">
              <div class="editor-panel__head">
                <div>
                  <span class="eyebrow eyebrow--soft">Etapa 1</span>
                  <h3>Dados do anúncio</h3>
                  <p>Preencha a ficha principal do carro para ele aparecer bem na busca.</p>
                </div>
              </div>

              <div class="form-grid">
                <label>
                  <span>Título do anúncio <em>*</em></span>
                  <input [(ngModel)]="vehicleDraft.title" placeholder="Ex.: Jeep Renegade 2022 completo" />
                </label>

                <label>
                  <span>Placa <em>*</em></span>
                  <input [(ngModel)]="vehicleDraft.plate" placeholder="ABC1D23" maxlength="8" />
                </label>
              </div>

              <div class="form-grid form-grid--triple">
                <label>
                  <span>Marca <em>*</em></span>
                  <input [(ngModel)]="vehicleDraft.brand" placeholder="Jeep" />
                </label>

                <label>
                  <span>Modelo <em>*</em></span>
                  <input [(ngModel)]="vehicleDraft.model" placeholder="Renegade" />
                </label>

                <label>
                  <span>Ano <em>*</em></span>
                  <input [(ngModel)]="vehicleDraft.year" type="number" min="1990" max="2100" />
                </label>
              </div>

              <div class="form-grid">
                <label>
                  <span>Tipo de veículo <em>*</em></span>
                  <select [(ngModel)]="vehicleDraft.vehicleType">
                    <option *ngFor="let option of vehicleTypeOptions" [value]="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <label>
                  <span>Categoria <em>*</em></span>
                  <select [(ngModel)]="vehicleDraft.category">
                    <option *ngFor="let option of categoryOptions" [value]="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <label>
                  <span>Câmbio <em>*</em></span>
                  <select [(ngModel)]="vehicleDraft.transmission">
                    <option *ngFor="let option of transmissionOptions" [value]="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </div>

              <div class="form-grid">
                <label>
                  <span>Combustível <em>*</em></span>
                  <select [(ngModel)]="vehicleDraft.fuelType">
                    <option *ngFor="let option of fuelOptions" [value]="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>

                <label>
                  <span>Assentos <em>*</em></span>
                  <input [(ngModel)]="vehicleDraft.seats" type="number" min="2" max="12" />
                </label>
              </div>
            </section>

            <section class="editor-panel">
              <div class="editor-panel__head">
                <div>
                  <span class="eyebrow eyebrow--soft">Etapa 2</span>
                  <h3>Preço e retirada</h3>
                  <p>Defina o valor e deixe claro de onde o veículo sai.</p>
                </div>
              </div>

              <div class="form-grid">
                <label>
                  <span>Valor semanal <em>*</em></span>
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
                  <span>Cidade <em>*</em></span>
                  <input [(ngModel)]="vehicleDraft.city" placeholder="São Paulo" />
                </label>

                <label>
                  <span>Estado <em>*</em></span>
                  <input [(ngModel)]="vehicleDraft.state" maxlength="2" placeholder="SP" />
                </label>
              </div>

              <label>
                <span>Endereço de retirada <em>*</em></span>
                <input [(ngModel)]="vehicleDraft.addressLine" placeholder="Bairro, avenida ou ponto de encontro" />
              </label>

              <label>
                <span>Descrição <em>*</em></span>
                <textarea
                  [(ngModel)]="vehicleDraft.description"
                  rows="4"
                  placeholder="Conte os diferenciais do carro, regras básicas e itens inclusos."
                ></textarea>
              </label>

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
            </section>

            <section class="editor-panel" *ngIf="vehicleDraft.vehicleType === 'MOTORCYCLE'">
              <div class="editor-panel__head">
                <div>
                  <span class="eyebrow eyebrow--soft">Etapa extra</span>
                  <h3>Detalhes da moto</h3>
                  <p>Essas informações ajudam a moto aparecer nos filtros certos.</p>
                </div>
              </div>

              <div class="form-grid">
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

              <div class="form-grid">
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
            </section>

            <section class="editor-panel media-manager">
              <div class="media-manager__head">
                <div>
                  <span class="eyebrow eyebrow--soft">Etapa 3</span>
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
          </div>

          <aside class="editor-sidebar">
            <section class="publication-guide">
              <div class="publication-guide__head">
                <div>
                  <span class="eyebrow eyebrow--soft">Publicação guiada</span>
                  <h3>{{ publicationChecklistCompleted }}/{{ publicationChecklist.length }} itens completos</h3>
                  <p>Veja rapidamente o que já está pronto e o que ainda falta.</p>
                </div>

                <strong>{{ publicationReadinessPercentage }}%</strong>
              </div>

              <div class="publication-guide__progress" aria-hidden="true">
                <span [style.width.%]="publicationReadinessPercentage"></span>
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
                <strong>O que falta para publicar</strong>
                <p *ngFor="let suggestion of publicationSuggestions; trackBy: trackByString">{{ suggestion }}</p>
              </div>
            </section>

            <section class="required-fields-card" *ngIf="missingVehicleFields.length">
              <div class="required-fields-card__head">
                <div>
                  <span class="eyebrow eyebrow--soft">Campos obrigatórios</span>
                  <h3>Faltam {{ missingVehicleFields.length }} campo(s)</h3>
                </div>
                <strong>Revise antes de publicar</strong>
              </div>

              <div class="required-fields-card__list">
                <span *ngFor="let field of missingVehicleFields; trackBy: trackByString">{{ field }}</span>
              </div>
            </section>

            <div class="publish-card">
              <div>
                <span class="eyebrow eyebrow--soft">Finalizar anúncio</span>
                <h3>{{ isEditingVehicle ? 'Salvar e manter anúncio atualizado' : 'Publicar classificado' }}</h3>
                <p>
                  {{
                    missingVehicleFields.length
                      ? 'Complete os campos obrigatórios e confira as fotos antes de publicar.'
                      : 'Seu anúncio já está pronto para receber interessados.'
                  }}
                </p>
              </div>

              <button
                type="button"
                class="btn btn-primary"
                (click)="saveVehicle()"
                [disabled]="submittingVehicle || uploadingVehicleImages"
              >
                {{ vehicleSubmitLabel }}
              </button>
            </div>
          </aside>
        </div>

        <p class="feedback" *ngIf="vehicleFeedback">{{ vehicleFeedback }}</p>
        <p class="feedback feedback--error" *ngIf="vehicleError">{{ vehicleError }}</p>
      </section>

      <section class="dashboard-card" *ngIf="isAdsView">
        <div class="card-head">
          <div>
            <h2>Meus anúncios</h2>
            <p>Abra um anúncio para editar dados, trocar fotos ou publicar novamente.</p>
          </div>
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
            <span class="price-text">{{ vehicle.dailyRate | currency: 'BRL' : 'symbol' : '1.2-2' }} / semana</span>
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
      .dashboard-card {
        display: grid;
        gap: 16px;
        padding: 20px;
        border-radius: 24px;
        background: var(--glass-surface-strong);
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

      .owner-hero__actions {
        display: grid;
        gap: 10px;
      }

      .dashboard-card--form {
        gap: 16px;
      }

      .editor-layout,
      .editor-main,
      .editor-sidebar {
        display: grid;
        gap: 16px;
      }

      .editor-panel {
        display: grid;
        gap: 14px;
        padding: 18px;
        border-radius: 22px;
        background:
          linear-gradient(180deg, rgba(251, 253, 252, 0.98), rgba(240, 246, 243, 0.98));
        border: 1px solid rgba(103, 203, 176, 0.12);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
      }

      .editor-panel--highlights {
        padding: 0;
        background: transparent;
        border: 0;
        box-shadow: none;
      }

      .editor-panel__head {
        display: grid;
        gap: 8px;
      }

      .editor-panel__head h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 20px;
      }

      .editor-highlights {
        display: grid;
        gap: 12px;
      }

      .editor-highlights article {
        display: grid;
        gap: 8px;
        padding: 16px;
        border-radius: 20px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 247, 244, 0.96));
        border: 1px solid rgba(103, 203, 176, 0.12);
        box-shadow: var(--shadow-soft);
      }

      .editor-highlights span,
      .editor-highlights small {
        color: var(--text-secondary);
      }

      .editor-highlights span {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .editor-highlights strong {
        color: var(--text-primary);
        font-size: 20px;
        line-height: 1.05;
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
        background: rgba(88, 181, 158, 0.12);
        color: var(--primary);
      }

      .publication-guide {
        display: grid;
        gap: 14px;
        padding: 18px;
        border-radius: 22px;
        background: linear-gradient(180deg, rgba(251, 253, 252, 0.98), rgba(237, 245, 242, 0.98));
        border: 1px solid rgba(103, 203, 176, 0.14);
      }

      .publication-guide__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-direction: column;
        gap: 16px;
      }

      .publication-guide__head strong {
        font-size: 28px;
        color: var(--primary);
      }

      .publication-guide__head p {
        margin-top: 6px;
      }

      .publication-guide__progress {
        height: 10px;
        border-radius: 999px;
        background: rgba(88, 181, 158, 0.12);
        overflow: hidden;
      }

      .publication-guide__progress span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #58b59e 0%, #8ad8c7 100%);
      }

      .publication-checklist,
      .publication-suggestions {
        display: grid;
        gap: 10px;
      }

      .publication-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 12px;
        padding: 14px;
        border-radius: 18px;
        background: var(--surface-dark-elevated);
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
        background: rgba(103, 203, 176, 0.08);
        border: 1px solid rgba(103, 203, 176, 0.12);
      }

      .publication-suggestions p {
        color: var(--text-primary);
      }

      .required-fields-card,
      .publish-card {
        display: grid;
        gap: 12px;
        padding: 16px;
        border-radius: 22px;
        border: 1px solid var(--glass-border-soft);
        background: var(--surface-muted);
      }

      .required-fields-card__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        flex-direction: column;
      }

      .required-fields-card__list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .required-fields-card__list span {
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.12);
        color: #8a5a00;
        font-size: 12px;
        font-weight: 700;
      }

      .publish-card {
        background: linear-gradient(180deg, rgba(251, 253, 252, 0.98), rgba(237, 245, 242, 0.98));
        border-color: rgba(103, 203, 176, 0.14);
      }

      .publish-card .btn,
      .form-actions .btn,
      .card-head .btn-ghost {
        width: 100%;
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

      label span em {
        color: var(--error);
        font-style: normal;
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
        background: linear-gradient(180deg, #8ad8c7 0%, #58b59e 100%);
        color: #123128;
        cursor: pointer;
        overflow: hidden;
        box-shadow: 0 14px 24px rgba(88, 181, 158, 0.2);
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
        background: var(--surface-dark-elevated);
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
        background: rgba(88, 181, 158, 0.94);
        color: #123128;
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
        border-color: rgba(88, 181, 158, 0.24);
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
        background: var(--surface-dark-elevated);
        box-shadow: var(--shadow-soft);
      }

      .vehicle-row:first-of-type {
        margin-top: 0;
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
        outline: 2px solid rgba(88, 181, 158, 0.34);
        outline-offset: -2px;
      }

      .vehicle-row .btn-secondary,
      .vehicle-row .btn-ghost {
        min-height: 42px;
        background: rgba(68, 82, 76, 0.92);
        color: #fff;
        border: 1px solid rgba(208, 226, 216, 0.16);
        box-shadow: none;
      }

      .vehicle-row .btn-ghost--danger {
        background: rgba(239, 68, 68, 0.22);
        border-color: rgba(239, 68, 68, 0.28);
        color: #fff;
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
        background: rgba(88, 181, 158, 0.12);
        color: var(--primary);
      }

      .state-message,
      .feedback {
        margin: 0;
        color: var(--text-secondary);
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

        .editor-highlights {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .form-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .form-grid--triple {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .announcement-steps {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .card-head,
        .media-manager__head {
          flex-direction: row;
        }

        .publication-guide__head {
          flex-direction: row;
        }

        .publish-card .btn,
        .form-actions .btn,
        .card-head .btn-ghost {
          width: auto;
        }

      }

      @media (min-width: 1080px) {
        .owner-page {
          gap: 20px;
          padding: 28px 20px 56px;
        }

        .owner-hero,
        .dashboard-card {
          padding: 24px;
        }

        .editor-layout {
          grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.75fr);
          align-items: start;
        }

        .editor-sidebar {
          position: sticky;
          top: 24px;
        }

        .media-grid {
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }

        .vehicle-row__content {
          padding: 24px;
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
  private readonly vehiclesApiService = inject(VehiclesApiService);
  private editingVehicleCacheSource: OwnerVehicleItem[] | null = null;
  private editingVehicleCacheId: string | null = null;
  private editingVehicleCache: OwnerVehicleItem | null = null;
  private publicationChecklistCacheKey = '';
  private publicationChecklistCache: PublicationChecklistItem[] = [];
  private publicationChecklistSummaryCacheSource: PublicationChecklistItem[] | null = null;
  private publicationChecklistSummaryCache = {
    completed: 0,
    percentage: 0,
    suggestions: [] as string[],
  };

  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';
  protected readonly vehicleTypeOptions: SelectOption<VehicleType>[] = [
    { label: 'Carro', value: 'CAR' },
    { label: 'Moto', value: 'MOTORCYCLE' },
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
  protected loading = true;
  protected vehicleFeedback = '';
  protected vehicleError = '';
  protected mediaFeedback = '';
  protected mediaError = '';
  protected submittingVehicle = false;
  protected uploadingVehicleImages = false;
  protected vehicleActionId: string | null = null;
  protected imageActionId: string | null = null;
  protected editingVehicleId: string | null = null;
  protected createMode = false;
  protected readonly viewMode: OwnerViewMode = 'ads';
  protected pendingVehicleFiles: File[] = [];
  protected pendingVehiclePreviews: Array<{ name: string; url: string }> = [];
  protected vehicleDraft = this.createVehicleDraft();

  constructor() {
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

  protected get isEditingVehicle() {
    return !!this.editingVehicleId;
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

  protected get totalVehiclePhotos() {
    return (this.editingVehicle?.images.length ?? 0) + this.pendingVehicleFiles.length;
  }

  protected get editorStatusLabel() {
    if (!this.isEditingVehicle) {
      return this.vehicleDraft.isPublished ? 'Novo anúncio pronto' : 'Novo rascunho';
    }

    return this.vehicleDraft.isPublished ? 'Publicado' : 'Rascunho';
  }

  protected get editorStatusHint() {
    return this.vehicleDraft.isPublished
      ? 'Vai aparecer para quem estiver buscando no app.'
      : 'Fica salvo sem aparecer na busca até você publicar.';
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

  protected get publicationChecklist() {
    const totalPhotos = (this.editingVehicle?.images.length ?? 0) + this.pendingVehicleFiles.length;
    const descriptionLength = this.vehicleDraft.description.trim().length;
    const hasPickupPoint = !!this.vehicleDraft.addressLine?.trim();
    const hasTitleContext =
      this.vehicleDraft.title.trim().length >= 12 &&
      !!this.vehicleDraft.brand.trim() &&
      !!this.vehicleDraft.model.trim();
    const checklistCacheKey = [
      totalPhotos,
      descriptionLength,
      hasPickupPoint ? 1 : 0,
      hasTitleContext ? 1 : 0,
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
            ? `${totalPhotos} fotos prontas para publicar.`
            : 'Adicione pelo menos 3 fotos reais do veículo.',
        done: totalPhotos >= 3,
      },
      {
        title: 'Descrição completa',
        description:
          descriptionLength >= 80
            ? 'A descrição já responde as dúvidas principais.'
            : 'Explique diferenciais, retirada e condições básicas do aluguel.',
        done: descriptionLength >= 80,
      },
      {
        title: 'Retirada definida',
        description:
          hasPickupPoint
            ? 'O endereço de retirada já está definido.'
            : 'Defina onde o carro pode ser retirado.',
        done: hasPickupPoint,
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
      {
        title: 'Preço definido',
        description:
          Number(this.vehicleDraft.dailyRate) > 0
            ? 'O valor semanal já está pronto para publicação.'
            : 'Informe o valor semanal para publicar.',
        done: Number(this.vehicleDraft.dailyRate) > 0,
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

  protected get missingVehicleFields() {
    return this.collectMissingVehicleFields();
  }

  protected saveVehicle() {
    const payload = this.normalizeVehicleDraft();

    if (!payload) {
      const missingFields = this.collectMissingVehicleFields();
      this.vehicleError = missingFields.length
        ? `Preencha os campos obrigatórios: ${missingFields.join(', ')}.`
        : 'Preencha os campos obrigatórios do anúncio.';
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

  protected trackByPreview(_index: number, item: { name: string; url: string }) {
    return item.url;
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
    this.vehiclesApiService.getMine().subscribe({
      next: (vehicles) => {
        this.vehicles = vehicles;

        if (this.editingVehicleId && !this.vehicles.some((vehicle) => vehicle.id === this.editingVehicleId)) {
          this.cancelEditingVehicle();
        }

        if (
          focusVehicleId &&
          !this.editingVehicleId &&
          this.vehicles.some((vehicle) => vehicle.id === focusVehicleId)
        ) {
          this.editingVehicleId = focusVehicleId;
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
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
      addressLine: profile?.addressLine || '',
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
      !payload.addressLine ||
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

  private collectMissingVehicleFields() {
    const missingFields: string[] = [];

    if (!this.vehicleDraft.title.trim()) {
      missingFields.push('título');
    }

    if (!this.vehicleDraft.plate.trim()) {
      missingFields.push('placa');
    }

    if (!this.vehicleDraft.brand.trim()) {
      missingFields.push('marca');
    }

    if (!this.vehicleDraft.model.trim()) {
      missingFields.push('modelo');
    }

    if (!Number(this.vehicleDraft.year)) {
      missingFields.push('ano');
    }

    if (!this.vehicleDraft.city.trim()) {
      missingFields.push('cidade');
    }

    if (this.vehicleDraft.state.trim().length !== 2) {
      missingFields.push('estado');
    }

    if (!this.vehicleDraft.addressLine?.trim()) {
      missingFields.push('endereço de retirada');
    }

    if (!Number(this.vehicleDraft.seats)) {
      missingFields.push('assentos');
    }

    if (!Number(this.vehicleDraft.dailyRate)) {
      missingFields.push('valor semanal');
    }

    if (!this.vehicleDraft.description.trim()) {
      missingFields.push('descrição');
    }

    return missingFields;
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
