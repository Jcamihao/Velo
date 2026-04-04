import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PrivacyPolicySummary } from '../../core/models/domain.models';
import { PrivacyApiService } from '../../core/services/privacy-api.service';

@Component({
  selector: 'app-privacy-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page privacy-page">
      <section class="privacy-hero">
        <span class="eyebrow">Privacidade</span>
        <h1>Como a Triluga trata os seus dados</h1>
        <p>
          Transparência, minimização e controle do titular fazem parte do produto.
        </p>

        <div class="privacy-hero__actions">
          <a class="btn btn-primary" *ngIf="authService.currentUser(); else loginLink" routerLink="/privacy-center">
            Abrir central de privacidade
          </a>

          <ng-template #loginLink>
            <a class="btn btn-primary" routerLink="/auth/login">Entrar para gerenciar preferências</a>
          </ng-template>

          <a class="btn btn-secondary" routerLink="/">Voltar para a Triluga</a>
        </div>
      </section>

      <section class="privacy-card" *ngIf="loading">
        <strong>Carregando política...</strong>
        <p>Estamos buscando a versão mais recente do resumo de privacidade.</p>
      </section>

      <section class="privacy-card" *ngIf="!loading && policy">
        <div class="privacy-card__meta">
          <span>Versão {{ policy.version }}</span>
          <span>Contato: {{ policy.contactEmail }}</span>
        </div>

        <article class="privacy-section" *ngFor="let section of policy.sections">
          <strong>{{ section.title }}</strong>
          <p>{{ section.summary }}</p>
        </article>
      </section>

      <section class="privacy-card privacy-card--compact">
        <strong>Direitos do titular</strong>
        <p>
          Pela central de privacidade você pode exportar seus dados, revisar preferências e registrar solicitações de acesso,
          correção, eliminação, anonimização, portabilidade, oposição e revogação.
        </p>
      </section>
    </main>
  `,
  styles: [
    `
      .privacy-page {
        display: grid;
        gap: 18px;
        padding: 20px 12px 40px;
      }

      .privacy-hero,
      .privacy-card {
        display: grid;
        gap: 14px;
        padding: 22px 20px;
        border-radius: 26px;
        background: var(--glass-surface-strong);
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

      h1,
      p,
      strong,
      span {
        margin: 0;
      }

      p {
        color: var(--text-secondary);
      }

      .privacy-hero__actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .privacy-card__meta {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        color: var(--text-secondary);
        font-size: 13px;
      }

      .privacy-section {
        display: grid;
        gap: 6px;
        padding-top: 14px;
        border-top: 1px solid var(--border);
      }

      .privacy-section:first-of-type {
        padding-top: 0;
        border-top: 0;
      }

      @media (min-width: 1080px) {
        .privacy-page {
          padding: 28px 20px 56px;
        }
      }
    `,
  ],
})
export class PrivacyPageComponent {
  protected readonly authService = inject(AuthService);
  private readonly privacyApiService = inject(PrivacyApiService);
  protected policy: PrivacyPolicySummary | null = null;
  protected loading = true;

  constructor() {
    this.privacyApiService.getPolicy().subscribe({
      next: (policy) => {
        this.policy = policy;
        this.loading = false;
      },
      error: () => {
        this.policy = {
          version: '2026-03-27',
          contactEmail: 'privacidade@triluga.local',
          sections: [
            {
              title: 'Dados coletados',
              summary:
                'Cadastro, autenticação, perfil, anúncios, reservas, suporte, notificações e preferências de privacidade.',
            },
            {
              title: 'Finalidades',
              summary:
                'Operar o marketplace, cumprir obrigações regulatórias, prevenir fraude, atender suporte e executar reservas.',
            },
          ],
        };
        this.loading = false;
      },
    });
  }
}
