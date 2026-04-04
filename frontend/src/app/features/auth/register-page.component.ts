import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { CepLookupService } from '../../core/services/cep-lookup.service';
import { ProfileApiService } from '../../core/services/profile-api.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="auth-page">
      <section class="auth-card">
        <a class="auth-card__back" routerLink="/">Voltar ao inicio</a>

        <img class="brand-logo" src="assets/branding/triluga-logo.png" alt="Triluga" />
        <span class="eyebrow">Cadastro</span>
        <h1>Crie sua conta na Triluga</h1>
        <p>Sua conta já nasce pronta para anunciar, alugar, conversar e usar todas as features da Triluga.</p>

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

        <label>
          <span>Telefone</span>
          <input
            [ngModel]="phone"
            (ngModelChange)="phone = formatPhone($event)"
            inputmode="tel"
            maxlength="19"
            placeholder="+55 (11) 99999-9999"
          />
        </label>

        <label>
          <span>CEP</span>
          <input
            [ngModel]="zipCode"
            (ngModelChange)="onZipCodeChange($event)"
            inputmode="numeric"
            maxlength="9"
            placeholder="13010-111"
          />
        </label>

        <p class="field-hint" *ngIf="zipCodeHint && !zipCodeError">{{ zipCodeHint }}</p>
        <p class="field-hint field-hint--error" *ngIf="zipCodeError">{{ zipCodeError }}</p>

        <label>
          <span>Endereço</span>
          <input [(ngModel)]="addressLine" placeholder="Rua, avenida ou praça" />
        </label>

        <label>
          <span>Complemento</span>
          <input [(ngModel)]="addressComplement" placeholder="Apto, bloco, casa, referência" />
        </label>

        <div class="grid">
          <label>
            <span>Cidade</span>
            <input [(ngModel)]="city" />
          </label>
          <label>
            <span>UF</span>
            <input
              [ngModel]="state"
              (ngModelChange)="state = formatState($event)"
              maxlength="2"
              placeholder="SP"
            />
          </label>
        </div>

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
        padding: calc(24px + env(safe-area-inset-top, 0px)) 12px calc(40px + env(safe-area-inset-bottom, 0px));
      }

      .auth-card {
        width: min(100%, 460px);
        display: grid;
        gap: 14px;
        padding: 24px 20px;
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

      .brand-logo {
        width: min(240px, 100%);
        height: auto;
        justify-self: center;
        margin-bottom: 6px;
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
        font-size: 38px;
        line-height: 0.96;
      }

      p {
        color: var(--text-secondary);
        line-height: 1.6;
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

      .avatar-section {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 16px;
        justify-items: center;
        align-items: start;
        text-align: center;
        padding: 16px;
        border-radius: 24px;
        border: 1px solid rgba(103, 203, 176, 0.1);
        background: rgba(88, 181, 158, 0.04);
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
        background: linear-gradient(180deg, rgba(103, 203, 176, 0.18) 0%, rgba(103, 203, 176, 0.08) 100%);
        color: var(--primary);
        font-size: 26px;
        font-weight: 800;
        box-shadow: inset 0 0 0 1px rgba(103, 203, 176, 0.16);
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
        width: 100%;
        min-height: 44px;
        padding: 0 16px;
        border-radius: 999px;
        border: 1px solid rgba(103, 203, 176, 0.18);
        background: rgba(103, 203, 176, 0.08);
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
        height: 52px;
        border-radius: 18px;
        border: 1px solid rgba(208, 226, 216, 0.08);
        padding: 0 14px;
        font: inherit;
        background: rgba(255, 255, 255, 0.94);
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
        flex-wrap: wrap;
        text-align: center;
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

      .field-hint {
        margin: -4px 0 0;
        color: var(--text-secondary);
        font-size: 13px;
      }

      .field-hint--error {
        color: var(--error);
      }

      .feedback {
        text-align: center;
        color: var(--error);
        font-weight: 600;
      }

      @media (min-width: 481px) {
        .upload-trigger {
          width: auto;
        }
      }

      @media (min-width: 960px) {
        .auth-page {
          padding: 32px 24px 48px;
        }

        .auth-card {
          width: min(100%, 640px);
          gap: 16px;
          padding: 30px 28px;
          border-radius: 38px;
        }

        h1 {
          font-size: 46px;
        }
      }
    `,
  ],
})
export class RegisterPageComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly cepLookupService = inject(CepLookupService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected fullName = 'Novo Usuário';
  protected phone = '+55 (11) 99999-0000';
  protected zipCode = '';
  protected addressLine = '';
  protected addressComplement = '';
  protected city = 'São Paulo';
  protected state = 'SP';
  protected email = '';
  protected password = 'Senha123!';
  protected loading = false;
  protected feedback = '';
  protected zipCodeHint = '';
  protected zipCodeError = '';
  protected pendingAvatarFile: File | null = null;
  private avatarPreviewUrl: string | null = null;
  private lastRequestedZipCode = '';

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

  protected onZipCodeChange(value: string) {
    this.zipCode = this.cepLookupService.formatZipCode(value);
    const zipCodeDigits = this.zipCode.replace(/\D/g, '');

    if (zipCodeDigits.length < 8) {
      this.lastRequestedZipCode = '';
      this.zipCodeHint = '';
      this.zipCodeError = '';
      return;
    }

    if (zipCodeDigits === this.lastRequestedZipCode) {
      return;
    }

    this.lastRequestedZipCode = zipCodeDigits;
    this.zipCodeHint = 'Buscando endereço pelo CEP...';
    this.zipCodeError = '';

    this.cepLookupService
      .lookup(this.zipCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (address) => {
          if (this.zipCode.replace(/\D/g, '') !== zipCodeDigits) {
            return;
          }

          this.zipCode = address.zipCode || this.zipCode;
          this.addressLine = address.addressLine || this.addressLine;
          this.city = address.city || this.city;
          this.state = address.state || this.state;

          if (!this.addressComplement.trim() && address.addressComplement) {
            this.addressComplement = address.addressComplement;
          }

          this.zipCodeHint =
            address.addressLine || address.city || address.state
              ? 'Endereço preenchido automaticamente.'
              : 'CEP encontrado. Complete os detalhes restantes manualmente.';
          this.zipCodeError = '';
        },
        error: () => {
          if (this.zipCode.replace(/\D/g, '') !== zipCodeDigits) {
            return;
          }

          this.zipCodeHint = '';
          this.zipCodeError =
            'Não foi possível localizar esse CEP. Você pode preencher o endereço manualmente.';
        },
      });
  }

  protected formatPhone(value: string) {
    const digits = value.replace(/\D/g, '');
    const normalized =
      digits.length > 11 && digits.startsWith('55')
        ? digits.slice(2, 13)
        : digits.slice(0, 11);

    if (!normalized) {
      return '';
    }

    const areaCode = normalized.slice(0, 2);
    const subscriberNumber = normalized.slice(2);
    const prefixLength = subscriberNumber.length > 8 ? 5 : 4;
    const prefix = subscriberNumber.slice(0, prefixLength);
    const suffix = subscriberNumber.slice(prefixLength, prefixLength + 4);

    let formatted = '+55';

    if (areaCode) {
      formatted += ` (${areaCode}`;

      if (areaCode.length === 2) {
        formatted += ')';
      }
    }

    if (prefix) {
      formatted += ` ${prefix}`;
    }

    if (suffix) {
      formatted += `-${suffix}`;
    }

    return formatted;
  }

  protected formatState(value: string) {
    return value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 2);
  }

  protected register() {
    this.loading = true;
    this.feedback = '';
    const pendingAvatarFile = this.pendingAvatarFile;
    const redirectPath = '/anunciar-carro';

    this.authService
      .register({
        fullName: this.fullName.trim(),
        phone: this.phone,
        zipCode: this.zipCode,
        addressLine: this.addressLine.trim(),
        addressComplement: this.addressComplement.trim() || undefined,
        city: this.city.trim(),
        state: this.formatState(this.state),
        email: this.email.trim(),
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
