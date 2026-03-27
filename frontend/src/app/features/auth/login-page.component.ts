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
        <img class="brand-logo" src="assets/logo_velo.png" alt="Velo" />
        <span class="eyebrow">Entrar</span>
        <h1>Entre na Velo</h1>
        <p>Acesse seu painel, acompanhe reservas e gerencie anúncios.</p>

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
      </section>
    </main>
  `,
  styles: [
    `
      .auth-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px 16px;
      }

      .auth-card {
        width: min(100%, 420px);
        display: grid;
        gap: 14px;
        padding: 28px 22px;
        border-radius: 30px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-strong);
      }

      .brand-logo {
        width: min(196px, 100%);
        height: auto;
        justify-self: center;
        margin-bottom: 2px;
      }

      .eyebrow {
        color: var(--primary);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      h1,
      p {
        margin: 0;
      }

      p {
        color: var(--text-secondary);
      }

      label {
        display: grid;
        gap: 8px;
      }

      input {
        height: 48px;
        border-radius: 14px;
        border: 1px solid var(--glass-border-soft);
        padding: 0 14px;
        font: inherit;
        background: var(--surface-muted);
      }

      .helper-links {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
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
          width: min(100%, 520px);
          gap: 16px;
          padding: 36px 32px;
          border-radius: 34px;
        }
      }
    `,
  ],
})
export class LoginPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected email = 'renter@velo.local';
  protected password = 'Renter123!';
  protected loading = false;
  protected feedback = '';

  protected login() {
    this.loading = true;
    this.feedback = '';

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (response) => {
        this.loading = false;
        const destination =
          response.user.role === 'ADMIN'
            ? '/admin'
            : response.user.role === 'OWNER'
              ? '/anunciar-carro'
              : '/';
        this.router.navigate([destination]);
      },
      error: (error) => {
        this.loading = false;
        this.feedback = error?.error?.message || 'Falha ao autenticar.';
      },
    });
  }
}
