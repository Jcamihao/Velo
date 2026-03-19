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
        <h1>Transforme seu carro em renda</h1>
        <p>Publique fotos, ajuste a diária e gerencie pedidos em um fluxo simples, com cara de app.</p>

        <div class="actions" *ngIf="!user">
          <button type="button" class="btn btn-primary" (click)="router.navigate(['/auth/register'])">
            Criar conta para anunciar
          </button>
          <a routerLink="/auth/login" class="btn btn-secondary">Já tenho conta</a>
        </div>

        <div class="actions" *ngIf="user?.role === 'OWNER'">
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

        <div class="actions" *ngIf="user && user.role !== 'OWNER'">
          <button type="button" class="btn btn-primary" (click)="router.navigate(['/profile'])">
            Ir para meu perfil
          </button>
          <a routerLink="/search" class="btn btn-secondary">Explorar carros</a>
        </div>
      </section>

      <section class="info-grid">
        <article>
          <strong>1</strong>
          <h2>Cadastre o veículo</h2>
          <p>Preencha os dados, valor da diária e regras básicas do anúncio.</p>
        </article>
        <article>
          <strong>2</strong>
          <h2>Envie boas fotos</h2>
          <p>A primeira imagem vira a capa do anúncio e melhora a conversão.</p>
        </article>
        <article>
          <strong>3</strong>
          <h2>Receba pedidos</h2>
          <p>Aprove, recuse e bloqueie datas direto pela central de anúncios.</p>
        </article>
      </section>
    </main>
  `,
  styles: [
    `
      .host-page {
        display: grid;
        gap: 18px;
        padding: 20px 16px 32px;
      }

      .hero-card,
      .info-grid article {
        padding: 22px;
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.98);
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
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
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
