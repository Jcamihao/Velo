import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PrivacyCenterOverview,
  PrivacyRequestItem,
  PrivacyRequestType,
} from '../../core/models/domain.models';
import { PrivacyApiService } from '../../core/services/privacy-api.service';
import { PrivacyPreferencesService } from '../../core/services/privacy-preferences.service';

@Component({
  selector: 'app-privacy-center-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <main class="page privacy-center-page">
      <section class="hero-card">
        <span class="eyebrow">Central de privacidade</span>
        <h1>Controle do titular em um só lugar</h1>
        <p>
          Ajuste preferências, exporte seus dados e registre solicitações relacionadas à LGPD.
        </p>
      </section>

      <section class="privacy-card" *ngIf="loading">
        <strong>Carregando central...</strong>
        <p>Estamos buscando suas preferências e solicitações registradas.</p>
      </section>

      <ng-container *ngIf="!loading && overview">
        <section class="privacy-card">
          <div class="section-head">
            <div>
              <span class="eyebrow eyebrow--soft">Preferências</span>
              <h2>Analytics não essencial</h2>
            </div>
            <span class="status-pill" [class.status-pill--enabled]="privacyPreferencesService.analyticsConsentGranted()">
              {{ privacyPreferencesService.analyticsConsentGranted() ? 'Ativo' : 'Desativado' }}
            </span>
          </div>

          <p>
            Quando ativado, a Velo coleta métricas de navegação para melhorar produto, conteúdo e conversão.
          </p>

          <div class="action-row">
            <button
              type="button"
              class="btn btn-secondary"
              [disabled]="savingPreferences || !privacyPreferencesService.analyticsConsentGranted()"
              (click)="setAnalyticsConsent(false)"
            >
              {{ savingPreferences ? 'Salvando...' : 'Desativar' }}
            </button>

            <button
              type="button"
              class="btn btn-primary"
              [disabled]="savingPreferences || privacyPreferencesService.analyticsConsentGranted()"
              (click)="setAnalyticsConsent(true)"
            >
              {{ savingPreferences ? 'Salvando...' : 'Ativar' }}
            </button>
          </div>
        </section>

        <section class="privacy-card">
          <div class="section-head">
            <div>
              <span class="eyebrow eyebrow--soft">Exportação</span>
              <h2>Baixe seus dados</h2>
            </div>
          </div>

          <p>
            O arquivo inclui conta, perfil, reservas, anúncios, notificações, favoritos, alertas e solicitações LGPD registradas.
          </p>

          <button type="button" class="btn btn-primary" [disabled]="exporting" (click)="exportMyData()">
            {{ exporting ? 'Preparando exportação...' : 'Exportar meus dados' }}
          </button>
        </section>

        <section class="privacy-card">
          <div class="section-head">
            <div>
              <span class="eyebrow eyebrow--soft">Solicitações</span>
              <h2>Registrar novo pedido</h2>
            </div>
          </div>

          <label>
            <span>Tipo de solicitação</span>
            <select [(ngModel)]="selectedRequestType">
              <option *ngFor="let option of requestTypeOptions" [value]="option">
                {{ requestTypeLabel(option) }}
              </option>
            </select>
          </label>

          <label>
            <span>Observações</span>
            <textarea
              [(ngModel)]="requestNotes"
              rows="4"
              placeholder="Explique o contexto da sua solicitação, se desejar."
            ></textarea>
          </label>

          <button type="button" class="btn btn-primary" [disabled]="submittingRequest" (click)="submitRequest()">
            {{ submittingRequest ? 'Enviando...' : 'Enviar solicitação' }}
          </button>
        </section>

        <section class="privacy-card">
          <div class="section-head">
            <div>
              <span class="eyebrow eyebrow--soft">Histórico</span>
              <h2>Pedidos já registrados</h2>
            </div>
          </div>

          <div class="request-list" *ngIf="overview.requests.length; else emptyRequests">
            <article class="request-item" *ngFor="let request of overview.requests">
              <div class="request-item__top">
                <strong>{{ requestTypeLabel(request.type) }}</strong>
                <span class="status-pill" [class]="'status-pill status-pill--' + request.status.toLowerCase()">
                  {{ requestStatusLabel(request.status) }}
                </span>
              </div>

              <p *ngIf="request.notes">{{ request.notes }}</p>
              <small>Criada em {{ request.createdAt | date: 'dd/MM/yyyy HH:mm' }}</small>
              <small *ngIf="request.resolutionNotes">Retorno: {{ request.resolutionNotes }}</small>
            </article>
          </div>

          <ng-template #emptyRequests>
            <p>Nenhuma solicitação LGPD registrada até o momento.</p>
          </ng-template>
        </section>

        <section class="privacy-card privacy-card--compact">
          <strong>Contato de privacidade</strong>
          <p>
            Para temas regulatórios e acompanhamento adicional, use {{ overview.policy.contactEmail }}.
          </p>
        </section>
      </ng-container>

      <p class="feedback" *ngIf="feedback">{{ feedback }}</p>
      <p class="feedback feedback--error" *ngIf="errorMessage">{{ errorMessage }}</p>
    </main>
  `,
  styles: [
    `
      .privacy-center-page {
        display: grid;
        gap: 18px;
        padding: 20px 16px 40px;
      }

      .hero-card,
      .privacy-card {
        display: grid;
        gap: 14px;
        padding: 20px;
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
      }

      .privacy-card--compact {
        gap: 8px;
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
      strong,
      small,
      span {
        margin: 0;
      }

      p,
      small {
        color: var(--text-secondary);
      }

      label {
        display: grid;
        gap: 8px;
      }

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

      .section-head,
      .request-item__top,
      .action-row {
        display: flex;
        gap: 12px;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
      }

      .action-row {
        justify-content: flex-start;
      }

      .status-pill {
        display: inline-flex;
        padding: 7px 12px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.14);
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 700;
      }

      .status-pill--enabled,
      .status-pill--completed {
        background: rgba(34, 197, 94, 0.12);
        color: var(--success);
      }

      .status-pill--open,
      .status-pill--in_review {
        background: rgba(245, 158, 11, 0.14);
        color: var(--warning);
      }

      .status-pill--rejected,
      .status-pill--cancelled {
        background: rgba(239, 68, 68, 0.12);
        color: var(--error);
      }

      .request-list {
        display: grid;
        gap: 12px;
      }

      .request-item {
        display: grid;
        gap: 6px;
        padding: 14px;
        border-radius: 18px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .feedback {
        margin: 0;
        color: var(--success);
        font-weight: 600;
      }

      .feedback--error {
        color: var(--error);
      }

      @media (min-width: 1080px) {
        .privacy-center-page {
          padding: 28px 20px 56px;
        }
      }
    `,
  ],
})
export class PrivacyCenterPageComponent {
  private readonly privacyApiService = inject(PrivacyApiService);
  protected readonly privacyPreferencesService = inject(PrivacyPreferencesService);
  protected overview: PrivacyCenterOverview | null = null;
  protected readonly requestTypeOptions: PrivacyRequestType[] = [
    'ACCESS',
    'PORTABILITY',
    'CORRECTION',
    'DELETION',
    'ANONYMIZATION',
    'RESTRICTION',
    'OBJECTION',
    'REVOCATION',
  ];
  protected selectedRequestType: PrivacyRequestType = 'ACCESS';
  protected requestNotes = '';
  protected loading = true;
  protected savingPreferences = false;
  protected exporting = false;
  protected submittingRequest = false;
  protected feedback = '';
  protected errorMessage = '';

  constructor() {
    this.loadData();
  }

  protected setAnalyticsConsent(granted: boolean) {
    this.savingPreferences = true;
    this.feedback = '';
    this.errorMessage = '';

    this.privacyApiService.updateMyPreferences(granted).subscribe({
      next: (preferences) => {
        this.privacyPreferencesService.hydrateAnalyticsConsent(
          preferences.analyticsConsentGranted,
        );
        if (this.overview) {
          this.overview = {
            ...this.overview,
            preferences,
          };
        }
        this.feedback = 'Preferências de privacidade atualizadas com sucesso.';
        this.savingPreferences = false;
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'Não foi possível atualizar suas preferências.';
        this.savingPreferences = false;
      },
    });
  }

  protected exportMyData() {
    this.exporting = true;
    this.feedback = '';
    this.errorMessage = '';

    this.privacyApiService.exportMyData().subscribe({
      next: (payload) => {
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `velo-privacy-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.feedback = 'Exportação gerada com sucesso.';
        this.exporting = false;
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'Não foi possível exportar seus dados.';
        this.exporting = false;
      },
    });
  }

  protected submitRequest() {
    this.submittingRequest = true;
    this.feedback = '';
    this.errorMessage = '';

    this.privacyApiService
      .createRequest(this.selectedRequestType, this.requestNotes.trim() || undefined)
      .subscribe({
        next: (request) => {
          this.overview = this.prependRequest(request, this.overview);
          this.requestNotes = '';
          this.feedback = 'Solicitação registrada com sucesso.';
          this.submittingRequest = false;
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || 'Não foi possível registrar sua solicitação.';
          this.submittingRequest = false;
        },
      });
  }

  protected requestTypeLabel(type: PrivacyRequestType) {
    const labels: Record<PrivacyRequestType, string> = {
      ACCESS: 'Acesso aos dados',
      PORTABILITY: 'Portabilidade',
      DELETION: 'Exclusão',
      CORRECTION: 'Correção',
      RESTRICTION: 'Restrição de tratamento',
      OBJECTION: 'Oposição',
      ANONYMIZATION: 'Anonimização',
      REVOCATION: 'Revogação de consentimento',
    };

    return labels[type] || type;
  }

  protected requestStatusLabel(status: PrivacyRequestItem['status']) {
    const labels = {
      OPEN: 'Aberta',
      IN_REVIEW: 'Em análise',
      COMPLETED: 'Concluída',
      REJECTED: 'Recusada',
      CANCELLED: 'Cancelada',
    } as const;

    return labels[status] || status;
  }

  private loadData() {
    this.loading = true;
    this.privacyApiService.getMyPrivacyCenter().subscribe({
      next: (overview) => {
        this.overview = overview;
        this.privacyPreferencesService.hydrateAnalyticsConsent(
          overview.preferences.analyticsConsentGranted,
        );
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'Não foi possível carregar sua central de privacidade.';
        this.loading = false;
      },
    });
  }

  private prependRequest(
    request: PrivacyRequestItem,
    overview: PrivacyCenterOverview | null,
  ) {
    if (!overview) {
      return overview;
    }

    return {
      ...overview,
      requests: [request, ...overview.requests],
    };
  }
}
