import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/models/domain.models';
import { ProfileApiService } from '../../core/services/profile-api.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <section class="auth-card">
        <img class="brand-logo" src="assets/logo_velo.png" alt="Velo" />
        <span class="eyebrow">Cadastro</span>
        <h1>Crie sua conta na Velo</h1>
        <p>Escolha se você vai anunciar carros ou alugar um agora.</p>

        <label>
          <span>Tipo de conta</span>
          <select [(ngModel)]="role">
            <option value="RENTER">Locatário</option>
            <option value="OWNER">Proprietário</option>
          </select>
        </label>

        <label>
          <span>Nome completo</span>
          <input [(ngModel)]="fullName" />
        </label>

        <section class="avatar-section">
          <div class="avatar-preview" [class.avatar-preview--filled]="resolvedAvatarUrl">
            <img *ngIf="resolvedAvatarUrl; else registerAvatarInitials" [src]="resolvedAvatarUrl" alt="Prévia da foto de perfil" />

            <ng-template #registerAvatarInitials>
              <span>{{ avatarInitials }}</span>
            </ng-template>
          </div>

          <div class="avatar-section__content">
            <strong>Foto de perfil</strong>
            <p>Opcional, mas recomendada para deixar seu perfil mais confiável.</p>

            <label class="upload-trigger">
              <input type="file" accept="image/*" (change)="onAvatarSelected($event)" />
              <span class="material-icons" aria-hidden="true">add_a_photo</span>
              <span>{{ pendingAvatarFile ? 'Trocar foto' : 'Adicionar foto' }}</span>
            </label>

            <small *ngIf="pendingAvatarFile">{{ pendingAvatarFile.name }}</small>
          </div>
        </section>

        <div class="grid">
          <label>
            <span>Telefone</span>
            <input [(ngModel)]="phone" />
          </label>
          <label>
            <span>Estado</span>
            <input [(ngModel)]="state" maxlength="2" />
          </label>
        </div>

        <label>
          <span>Cidade</span>
          <input [(ngModel)]="city" />
        </label>

        <label>
          <span>E-mail</span>
          <input [(ngModel)]="email" type="email" />
        </label>

        <label>
          <span>Senha</span>
          <input [(ngModel)]="password" type="password" />
        </label>

        <button type="button" class="btn btn-primary" (click)="register()" [disabled]="loading">
          {{ loading ? 'Criando conta...' : 'Criar conta' }}
        </button>

        <p class="feedback" *ngIf="feedback">{{ feedback }}</p>

        <div class="helper-links">
          <span>Já tem conta?</span>
          <a routerLink="/auth/login">Entrar</a>
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
        padding: 24px 16px 40px;
      }

      .auth-card {
        width: min(100%, 460px);
        display: grid;
        gap: 14px;
        padding: 28px 22px;
        border-radius: 30px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-strong);
      }

      .brand-logo {
        width: min(210px, 100%);
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

      .avatar-section {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 16px;
        justify-items: center;
        align-items: start;
        text-align: center;
        padding: 16px;
        border-radius: 20px;
        border: 1px solid rgba(31, 140, 255, 0.14);
        background: rgba(31, 140, 255, 0.05);
      }

      .avatar-section__content {
        display: grid;
        gap: 8px;
        justify-items: center;
      }

      .avatar-section__content strong,
      .avatar-section__content p,
      .avatar-section__content small {
        margin: 0;
      }

      .avatar-section__content small {
        color: var(--text-secondary);
      }

      .avatar-preview {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 88px;
        height: 88px;
        overflow: hidden;
        border-radius: 50%;
        background: linear-gradient(180deg, rgba(31, 140, 255, 0.18) 0%, rgba(31, 140, 255, 0.08) 100%);
        color: var(--primary);
        font-size: 26px;
        font-weight: 800;
        box-shadow: inset 0 0 0 1px rgba(31, 140, 255, 0.16);
      }

      .avatar-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .upload-trigger {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        padding: 0 16px;
        border-radius: 16px;
        border: 1px solid rgba(31, 140, 255, 0.18);
        background: rgba(31, 140, 255, 0.08);
        color: var(--primary);
        font-weight: 700;
        cursor: pointer;
      }

      .upload-trigger input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }

      input,
      select {
        width: 100%;
        min-width: 0;
        height: 48px;
        border-radius: 14px;
        border: 1px solid var(--glass-border-soft);
        padding: 0 14px;
        font: inherit;
        background: var(--surface-muted);
      }

      .grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 12px;
      }

      @media (min-width: 481px) {
        .grid {
          grid-template-columns: minmax(0, 1fr) 96px;
        }

        .avatar-section {
          grid-template-columns: auto minmax(0, 1fr);
          justify-items: stretch;
          align-items: center;
          text-align: left;
        }

        .avatar-section__content {
          justify-items: start;
        }
      }

      .helper-links {
        display: flex;
        justify-content: center;
        gap: 8px;
        color: var(--text-secondary);
      }

      .helper-links--secondary {
        margin-top: -4px;
      }

      .helper-links a {
        color: var(--primary);
        font-weight: 700;
        text-decoration: none;
      }

      .feedback {
        text-align: center;
        color: var(--error);
        font-weight: 600;
      }

      @media (min-width: 960px) {
        .auth-page {
          padding: 32px 24px 48px;
        }

        .auth-card {
          width: min(100%, 640px);
          gap: 16px;
          padding: 36px 32px;
          border-radius: 34px;
        }
      }
    `,
  ],
})
export class RegisterPageComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly router = inject(Router);

  protected role: Extract<UserRole, 'OWNER' | 'RENTER'> = 'RENTER';
  protected fullName = 'Novo Usuário';
  protected phone = '+55 11 99999-0000';
  protected city = 'São Paulo';
  protected state = 'SP';
  protected email = '';
  protected password = 'Senha123!';
  protected loading = false;
  protected feedback = '';
  protected pendingAvatarFile: File | null = null;
  private avatarPreviewUrl: string | null = null;

  ngOnDestroy() {
    this.revokeAvatarPreview();
  }

  protected get resolvedAvatarUrl() {
    return this.avatarPreviewUrl;
  }

  protected get avatarInitials() {
    const source = this.fullName.trim() || 'U';

    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected register() {
    this.loading = true;
    this.feedback = '';
    const pendingAvatarFile = this.pendingAvatarFile;
    const redirectPath = this.role === 'OWNER' ? '/anunciar-carro' : '/';

    this.authService
      .register({
        role: this.role,
        fullName: this.fullName,
        phone: this.phone,
        city: this.city,
        state: this.state,
        email: this.email,
        password: this.password,
      })
      .pipe(
        switchMap(() => {
          if (!pendingAvatarFile) {
            return of(null);
          }

          return this.profileApiService.uploadMyAvatar(pendingAvatarFile).pipe(
            tap((profile) => {
              this.authService.syncProfile(profile);
            }),
            catchError(() => of(null)),
          );
        }),
      )
      .subscribe({
        next: () => {
          this.loading = false;
          this.pendingAvatarFile = null;
          this.revokeAvatarPreview();
          this.router.navigate([redirectPath]);
        },
        error: (error) => {
          this.loading = false;
          this.feedback = error?.error?.message || 'Não foi possível criar a conta.';
        },
      });
  }

  protected onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.feedback = 'Selecione uma imagem válida para a foto de perfil.';
      input.value = '';
      return;
    }

    this.feedback = '';
    this.pendingAvatarFile = file;
    this.setAvatarPreview(file);
    input.value = '';
  }

  private setAvatarPreview(file: File) {
    this.revokeAvatarPreview();
    this.avatarPreviewUrl = URL.createObjectURL(file);
  }

  private revokeAvatarPreview() {
    if (!this.avatarPreviewUrl) {
      return;
    }

    URL.revokeObjectURL(this.avatarPreviewUrl);
    this.avatarPreviewUrl = null;
  }
}
