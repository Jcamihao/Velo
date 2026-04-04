import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <section class="auth-card">
        <a class="auth-card__back" routerLink="/">Voltar ao inicio</a>

        <div class="auth-card__hero">
          <img class="brand-logo" src="assets/branding/triluga-logo.png" alt="Triluga" />
          <span class="eyebrow">Entrar</span>
          <h1>Entre na Triluga</h1>
          <p>Acesse seu painel, acompanhe reservas e gerencie anúncios com uma identidade mais leve, precisa e marcada pela menta.</p>

          <div class="auth-highlights">
            <span>Painel vivo</span>
            <span>Reservas em tempo real</span>
            <span>Radar menta</span>
          </div>
        </div>

        <div class="auth-card__form">
          <label>
            <span>E-mail</span>
            <input [(ngModel)]="email" type="email" />
          </label>

          <label>
            <span>Senha</span>
            <input [(ngModel)]="password" type="password" />
          </label>

          <button type="button" class="btn btn-primary" (click)="login()" [disabled]="loading">
            {{ loading ? 'Entrando...' : 'Entrar' }}
          </button>

          <p class="feedback" *ngIf="feedback">{{ feedback }}</p>

          <div class="helper-links">
            <span>Não tem conta?</span>
            <a routerLink="/auth/register">Crie agora</a>
          </div>

          <div class="helper-links helper-links--secondary">
            <a routerLink="/privacy">Privacidade</a>
          </div>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .auth-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: calc(24px + env(safe-area-inset-top, 0px)) 12px calc(24px + env(safe-area-inset-bottom, 0px));
      }

      .auth-card {
        width: min(100%, 470px);
        display: grid;
        gap: 18px;
        padding: 18px;
        border-radius: 34px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.7), transparent),
          rgba(249, 252, 251, 0.94);
        border: 1px solid rgba(103, 203, 176, 0.12);
        box-shadow: var(--shadow-strong);
      }

      .auth-card__back {
        justify-self: start;
        display: inline-flex;
        align-items: center;
        min-height: 40px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid rgba(103, 203, 176, 0.16);
        background: rgba(88, 181, 158, 0.08);
        color: #38675d;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
      }

      .auth-card__back:hover {
        background: rgba(88, 181, 158, 0.14);
      }

      .auth-card__hero {
        display: grid;
        gap: 12px;
        padding: 22px 20px;
        border-radius: 26px;
        background:
          linear-gradient(135deg, rgba(88, 181, 158, 0.1), transparent 44%),
          radial-gradient(circle at top right, rgba(88, 181, 158, 0.14), transparent 32%),
          linear-gradient(180deg, #fbfdfc 0%, #eef5f2 100%);
        color: var(--text-primary);
      }

      .auth-card__form {
        display: grid;
        gap: 14px;
        padding: 4px;
      }

      .brand-logo {
        width: min(232px, 100%);
        height: auto;
        margin-bottom: 4px;
      }

      .eyebrow {
        display: inline-flex;
        width: fit-content;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(88, 181, 158, 0.1);
        color: #427a6d;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1,
      p {
        margin: 0;
      }

      h1 {
        max-width: 9ch;
        font-size: 38px;
        line-height: 0.96;
      }

      .auth-card__hero p {
        color: rgba(64, 84, 79, 0.76);
        line-height: 1.6;
      }

      .auth-highlights {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .auth-highlights span {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: 0 12px;
        border-radius: 999px;
        background: rgba(88, 181, 158, 0.08);
        border: 1px solid rgba(103, 203, 176, 0.1);
        color: #4b6d65;
        font-size: 12px;
      }

      label {
        display: grid;
        gap: 8px;
      }

      label span {
        font-size: 13px;
        font-weight: 700;
        color: var(--label-ink);
      }

      input {
        height: 52px;
        border-radius: 18px;
        border: 1px solid rgba(208, 226, 216, 0.08);
        padding: 0 14px;
        font: inherit;
        background: rgba(255, 255, 255, 0.94);
      }

      .helper-links {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
        text-align: center;
        color: var(--text-secondary);
      }

      .helper-links a {
        color: var(--primary);
        font-weight: 700;
        text-decoration: none;
      }

      .helper-links--secondary {
        margin-top: -4px;
      }

      .feedback {
        text-align: center;
        color: var(--error);
        font-weight: 600;
      }

      @media (min-width: 960px) {
        .auth-page {
          padding: 32px 24px;
        }

        .auth-card {
          width: min(100%, 540px);
          gap: 20px;
          padding: 20px;
          border-radius: 38px;
        }

        .auth-card__hero {
          padding: 28px 26px;
        }

        h1 {
          font-size: 46px;
        }
      }
    `,
  ],
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected loading = false;
  protected feedback = '';

  protected login() {
    this.loading = true;
    this.feedback = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.loading = false;
        const destination = response.user.role === 'ADMIN' ? '/admin' : '/';
        this.router.navigate([destination]);
      },
      error: (error) => {
        this.loading = false;
        this.feedback = error?.error?.message || 'Falha ao autenticar.';
      },
    });
  }
}
