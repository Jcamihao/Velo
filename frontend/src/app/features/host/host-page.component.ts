import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-host-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page host-page">
      <section class="hero-card">
        <span class="eyebrow">Anunciar</span>
        <h1>Seu carro vira anúncio em poucos minutos</h1>
        <p>Publique fotos, informe o valor semanal e comece a receber contatos sem painel complicado.</p>

        <div class="actions" *ngIf="!user">
          <button type="button" class="btn btn-primary" (click)="router.navigate(['/auth/register'])">
            Criar conta para anunciar
          </button>
          <a routerLink="/auth/login" class="btn btn-secondary">Já tenho conta</a>
        </div>

        <div class="actions" *ngIf="user">
          <button
            type="button"
            class="btn btn-primary"
            (click)="router.navigate(['/anunciar-carro'], { queryParams: { editor: 'create' } })"
          >
            Criar novo anúncio
          </button>
          <button type="button" class="btn btn-secondary" (click)="router.navigate(['/anunciar-carro'])">
            Abrir meus anúncios
          </button>
        </div>
      </section>

      <section class="info-grid">
        <article>
          <strong>1</strong>
          <h2>Monte o classificado</h2>
          <p>Preencha os dados essenciais e deixe o anúncio pronto para aparecer na busca.</p>
        </article>
        <article>
          <strong>2</strong>
          <h2>Envie boas fotos</h2>
          <p>A primeira imagem vira a capa do anúncio e ajuda o carro a chamar atenção.</p>
        </article>
        <article>
          <strong>3</strong>
          <h2>Feche pelo chat</h2>
          <p>Converse com interessados para alinhar retirada, disponibilidade e combinar o aluguel.</p>
        </article>
      </section>
    </main>
  `,
  styles: [
    `
      .host-page {
        display: grid;
        gap: 18px;
        padding: 20px 12px 32px;
      }

      .hero-card,
      .info-grid article {
        padding: 22px;
        border-radius: 28px;
        background: var(--glass-surface-strong);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
      }

      .hero-card {
        display: grid;
        gap: 14px;
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
      strong {
        margin: 0;
      }

      p {
        color: var(--text-secondary);
      }

      .actions {
        display: grid;
        gap: 10px;
      }

      .actions .btn,
      .actions a {
        width: 100%;
        justify-content: center;
      }

      .actions a {
        text-decoration: none;
      }

      .info-grid {
        display: grid;
        gap: 12px;
      }

      .info-grid article {
        display: grid;
        gap: 8px;
      }

      .info-grid strong {
        display: inline-grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: var(--primary-light);
        color: var(--primary);
      }

      @media (min-width: 960px) {
        .host-page {
          gap: 20px;
          padding: 28px 20px 56px;
        }

        .hero-card {
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: end;
          gap: 18px;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-start;
        }

        .actions .btn,
        .actions a {
          width: auto;
        }

        .info-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
      }
    `,
  ],
})
export class HostPageComponent {
  protected readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected get user() {
    return this.authService.currentUser();
  }
}
