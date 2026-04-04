import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ProfileApiService } from '../../core/services/profile-api.service';
import { Profile } from '../../core/models/domain.models';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page profile-page">
      <section class="profile-card">
        <div class="profile-card__hero">
          <div
            class="avatar-preview avatar-preview--large"
            [class.avatar-preview--filled]="resolvedAvatarUrl"
          >
            <img
              *ngIf="resolvedAvatarUrl; else profileInitialsAvatar"
              [src]="resolvedAvatarUrl"
              alt="Foto de perfil"
            />

            <ng-template #profileInitialsAvatar>
              <span>{{ avatarInitials }}</span>
            </ng-template>
          </div>

          <div>
            <span class="eyebrow">Perfil</span>
            <h1 class="profile-name-text">
              {{ authService.currentUser()?.profile?.fullName || 'Meu perfil' }}
            </h1>
            <p>{{ authService.currentUser()?.email }}</p>
            <a
              class="profile-public-link"
              *ngIf="authService.currentUser()?.id"
              [routerLink]="['/users', authService.currentUser()?.id]"
            >
              Ver meu perfil público
            </a>
          </div>
        </div>
      </section>

      <section class="loading-card" *ngIf="loading">
        <strong>Carregando seu perfil...</strong>
        <p>Estamos buscando seus dados da conta.</p>
      </section>

      <section class="profile-form" *ngIf="!loading">
        <div class="avatar-section">
          <div>
            <strong>Foto de perfil</strong>
            <p>
              Ela aparece no chat e ajuda a deixar sua conta mais confiável.
            </p>
          </div>

          <label class="upload-trigger">
            <input
              type="file"
              accept="image/*"
              (change)="onAvatarSelected($event)"
            />
            <span class="material-icons" aria-hidden="true">photo_camera</span>
            <span>{{
              pendingAvatarFile ? 'Trocar foto' : 'Adicionar foto'
            }}</span>
          </label>
        </div>

        <p class="file-hint" *ngIf="pendingAvatarFile">
          Nova foto selecionada: {{ pendingAvatarFile.name }}
        </p>

        <label
          ><span>Nome completo</span><input [(ngModel)]="profile.fullName"
        /></label>
        <label
          ><span>Telefone</span><input [(ngModel)]="profile.phone"
        /></label>
        <div class="profile-grid">
          <label><span>Cidade</span><input [(ngModel)]="profile.city" /></label>
          <label>
            <span>UF</span>
            <input
              [ngModel]="profile.state"
              (ngModelChange)="profile.state = formatState($event)"
              maxlength="2"
              placeholder="SP"
            />
          </label>
        </div>
        <label
          ><span>Número do documento</span
          ><input [(ngModel)]="profile.documentNumber"
        /></label>
        <label
          ><span>Número da CNH</span
          ><input [(ngModel)]="profile.driverLicenseNumber"
        /></label>
        <label
          ><span>Bio</span
          ><textarea [(ngModel)]="profile.bio" rows="4"></textarea>
        </label>

        <a class="privacy-link" routerLink="/privacy-center">
          Gerenciar preferências, exportação e solicitações na central de
          privacidade
        </a>

        <div class="verification-grid">
          <article class="verification-card">
            <div class="verification-card__head">
              <div>
                <strong>Documento</strong>
                <p>
                  {{
                    verificationStatusLabel(profile.documentVerificationStatus)
                  }}
                </p>
              </div>

              <label class="upload-trigger">
                <input
                  type="file"
                  accept="image/*"
                  (change)="onDocumentSelected($event)"
                />
                <span>{{
                  pendingDocumentFile ? 'Trocar arquivo' : 'Enviar'
                }}</span>
              </label>
            </div>

            <p class="file-hint" *ngIf="pendingDocumentFile">
              Novo arquivo: {{ pendingDocumentFile.name }}
            </p>
            <button
              *ngIf="profile.hasDocumentImage"
              type="button"
              class="doc-link"
              [disabled]="openingDocument"
              (click)="openVerificationFile('document')"
            >
              {{ openingDocument ? 'Abrindo...' : 'Ver documento enviado' }}
            </button>
          </article>

          <article class="verification-card">
            <div class="verification-card__head">
              <div>
                <strong>CNH</strong>
                <p>
                  {{
                    verificationStatusLabel(profile.driverLicenseVerification)
                  }}
                </p>
              </div>

              <label class="upload-trigger">
                <input
                  type="file"
                  accept="image/*"
                  (change)="onDriverLicenseSelected($event)"
                />
                <span>{{
                  pendingDriverLicenseFile ? 'Trocar arquivo' : 'Enviar'
                }}</span>
              </label>
            </div>

            <p class="file-hint" *ngIf="pendingDriverLicenseFile">
              Novo arquivo: {{ pendingDriverLicenseFile.name }}
            </p>
            <button
              *ngIf="profile.hasDriverLicenseImage"
              type="button"
              class="doc-link"
              [disabled]="openingDriverLicense"
              (click)="openVerificationFile('driverLicense')"
            >
              {{ openingDriverLicense ? 'Abrindo...' : 'Ver CNH enviada' }}
            </button>
          </article>
        </div>

        <button
          type="button"
          class="btn btn-primary"
          (click)="save()"
          [disabled]="saving"
        >
          {{ saving ? 'Salvando...' : 'Salvar perfil' }}
        </button>
        <p class="feedback" *ngIf="feedback">{{ feedback }}</p>
        <p class="feedback feedback--error" *ngIf="errorMessage">
          {{ errorMessage }}
        </p>
      </section>
    </main>
  `,
  styles: [
    `
      .profile-page {
        display: grid;
        gap: 18px;
        padding: 16px 12px 132px;
      }

      .profile-card,
      .loading-card,
      .profile-form {
        display: grid;
        gap: 14px;
        min-width: 0;
        padding: 18px 16px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
      }

      .profile-card__hero,
      .avatar-section {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      .eyebrow {
        color: var(--primary);
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
      }

      h1,
      p,
      strong {
        margin: 0;
      }

      h1 {
        overflow-wrap: anywhere;
      }

      p {
        color: var(--text-secondary);
      }

      label {
        display: grid;
        gap: 8px;
      }

      .avatar-preview {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border-radius: 50%;
        background: linear-gradient(
          180deg,
          rgba(88, 181, 158, 0.18) 0%,
          rgba(88, 181, 158, 0.08) 100%
        );
        color: var(--primary);
        font-weight: 800;
        box-shadow: inset 0 0 0 1px rgba(88, 181, 158, 0.16);
      }

      .avatar-preview--large {
        width: 92px;
        height: 92px;
        font-size: 28px;
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
        min-height: 46px;
        padding: 0 16px;
        border-radius: 16px;
        border: 1px solid rgba(88, 181, 158, 0.18);
        background: rgba(88, 181, 158, 0.08);
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

      .upload-trigger .material-icons {
        font-size: 18px;
      }

      .file-hint {
        margin: 0;
        color: var(--text-secondary);
        font-size: 13px;
      }

      input,
      textarea {
        width: 100%;
        min-width: 0;
        border: 1px solid var(--glass-border-soft);
        border-radius: 14px;
        padding: 12px 14px;
        font: inherit;
        background: var(--surface-muted);
      }

      .feedback {
        margin: 0;
      }

      .feedback {
        color: var(--success);
        font-weight: 600;
      }

      .feedback--error {
        color: var(--error);
      }

      .profile-public-link {
        display: inline-flex;
        margin-top: 10px;
        color: var(--primary);
        font-weight: 700;
        text-decoration: none;
      }

      .profile-grid {
        display: grid;
        gap: 12px;
      }

      .verification-grid {
        display: grid;
        gap: 12px;
      }

      .verification-card {
        display: grid;
        gap: 10px;
        padding: 14px;
        border-radius: 18px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .verification-card__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .doc-link {
        border: 0;
        padding: 0;
        background: transparent;
        text-align: left;
        cursor: pointer;
        color: var(--primary);
        font-weight: 700;
        text-decoration: none;
      }

      .privacy-link {
        display: block;
        color: var(--primary);
        font-weight: 700;
        text-decoration: none;
        line-height: 1.45;
      }

      .verification-card__head .upload-trigger {
        width: 100%;
      }

      @media (min-width: 481px) {
        .profile-page {
          padding: 20px 16px 132px;
        }

        .profile-card,
        .loading-card,
        .profile-form {
          padding: 20px;
          border-radius: 24px;
        }

        .profile-card__hero,
        .avatar-section {
          align-items: center;
        }

        .profile-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .upload-trigger,
        .verification-card__head .upload-trigger {
          width: auto;
        }
      }

      @media (min-width: 1080px) {
        .profile-page {
          grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
          align-items: start;
          gap: 20px;
          padding: 28px 20px 56px;
        }

        .profile-card {
          position: sticky;
          top: 24px;
        }

        .loading-card,
        .profile-form {
          grid-column: 2;
        }
      }
    `,
  ],
})
export class ProfilePageComponent implements OnDestroy {
  protected readonly authService = inject(AuthService);
  private readonly profileApiService = inject(ProfileApiService);
  protected profile: Profile = {
    fullName: '',
    phone: '',
    zipCode: '',
    addressLine: '',
    addressComplement: '',
    city: '',
    state: '',
    bio: '',
  };
  protected loading = true;
  protected saving = false;
  protected feedback = '';
  protected errorMessage = '';
  protected pendingAvatarFile: File | null = null;
  protected pendingDocumentFile: File | null = null;
  protected pendingDriverLicenseFile: File | null = null;
  protected openingDocument = false;
  protected openingDriverLicense = false;
  private avatarPreviewUrl: string | null = null;

  constructor() {
    this.loadData();
  }

  ngOnDestroy() {
    this.revokeAvatarPreview();
  }

  protected get resolvedAvatarUrl() {
    return (
      this.avatarPreviewUrl ||
      this.profile.avatarUrl ||
      this.authService.currentUser()?.profile?.avatarUrl ||
      null
    );
  }

  protected get avatarInitials() {
    const source =
      this.profile.fullName ||
      this.authService.currentUser()?.profile?.fullName ||
      this.authService.currentUser()?.email ||
      'U';

    return source
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected save() {
    this.saving = true;
    this.feedback = '';
    this.errorMessage = '';
    const pendingAvatarFile = this.pendingAvatarFile;
    const pendingDocumentFile = this.pendingDocumentFile;
    const pendingDriverLicenseFile = this.pendingDriverLicenseFile;

    this.profileApiService
      .updateMyProfile(this.buildEditableProfile(this.profile))
      .pipe(
        switchMap((profile) => {
          const uploads = {
            profile: of(profile),
            avatar: pendingAvatarFile
              ? this.profileApiService.uploadMyAvatar(pendingAvatarFile)
              : of(null),
            document: pendingDocumentFile
              ? this.profileApiService.uploadMyDocument(pendingDocumentFile)
              : of(null),
            driverLicense: pendingDriverLicenseFile
              ? this.profileApiService.uploadMyDriverLicense(
                  pendingDriverLicenseFile,
                )
              : of(null),
          };

          return forkJoin(uploads);
        }),
      )
      .subscribe({
        next: ({ profile, avatar, document, driverLicense }) => {
          const normalizedProfile = this.buildEditableProfile({
            ...this.profile,
            ...profile,
            ...avatar,
            ...document,
            ...driverLicense,
          });

          this.profile = normalizedProfile;
          this.authService.syncProfile(normalizedProfile);
          this.pendingAvatarFile = null;
          this.pendingDocumentFile = null;
          this.pendingDriverLicenseFile = null;
          this.revokeAvatarPreview();
          this.feedback =
            pendingAvatarFile || pendingDocumentFile || pendingDriverLicenseFile
              ? 'Perfil e arquivos atualizados com sucesso.'
              : 'Perfil atualizado com sucesso.';
          this.saving = false;
        },
        error: (error) => {
          this.errorMessage = this.resolveErrorMessage(error);
          this.saving = false;
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
      this.errorMessage = 'Selecione uma imagem válida para a foto de perfil.';
      input.value = '';
      return;
    }

    this.errorMessage = '';
    this.pendingAvatarFile = file;
    this.setAvatarPreview(file);
    input.value = '';
  }

  protected onDocumentSelected(event: Event) {
    this.pendingDocumentFile = this.extractImageFile(
      event,
      'Selecione uma imagem válida para o documento.',
    );
  }

  protected onDriverLicenseSelected(event: Event) {
    this.pendingDriverLicenseFile = this.extractImageFile(
      event,
      'Selecione uma imagem válida para a CNH.',
    );
  }

  protected verificationStatusLabel(
    status?: Profile['documentVerificationStatus'],
  ) {
    const labels = {
      APPROVED: 'Aprovado',
      PENDING: 'Em análise',
      REJECTED: 'Recusado',
      NOT_SUBMITTED: 'Não enviado',
    } as const;

    return labels[status || 'NOT_SUBMITTED'] || 'Não enviado';
  }

  protected formatState(value: string) {
    return String(value ?? '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 2);
  }

  private loadData() {
    this.loading = true;
    this.errorMessage = '';

    this.profileApiService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile = this.buildEditableProfile({
          ...this.profile,
          ...profile,
        });
        this.errorMessage = '';
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = this.resolveErrorMessage(
          error,
          'Não foi possível carregar seu perfil.',
        );
        this.loading = false;
      },
    });
  }

  private buildEditableProfile(profile: Partial<Profile>): Profile {
    return {
      fullName: profile.fullName ?? '',
      phone: profile.phone ?? '',
      zipCode: profile.zipCode ?? '',
      addressLine: profile.addressLine ?? '',
      addressComplement: profile.addressComplement ?? '',
      city: profile.city ?? '',
      state: this.formatState(profile.state ?? ''),
      bio: profile.bio ?? '',
      avatarUrl: profile.avatarUrl ?? null,
      documentNumber: profile.documentNumber ?? null,
      driverLicenseNumber: profile.driverLicenseNumber ?? null,
      documentImageUrl: profile.documentImageUrl ?? null,
      driverLicenseImageUrl: profile.driverLicenseImageUrl ?? null,
      hasDocumentImage: profile.hasDocumentImage ?? false,
      hasDriverLicenseImage: profile.hasDriverLicenseImage ?? false,
      documentVerificationStatus:
        profile.documentVerificationStatus ?? 'NOT_SUBMITTED',
      driverLicenseVerification:
        profile.driverLicenseVerification ?? 'NOT_SUBMITTED',
    };
  }

  protected openVerificationFile(type: 'document' | 'driverLicense') {
    const request$ =
      type === 'document'
        ? this.profileApiService.getMyDocumentUrl()
        : this.profileApiService.getMyDriverLicenseUrl();

    if (type === 'document') {
      this.openingDocument = true;
    } else {
      this.openingDriverLicense = true;
    }

    request$.subscribe({
      next: ({ url }) => {
        window.open(url, '_blank', 'noopener,noreferrer');
        this.openingDocument = false;
        this.openingDriverLicense = false;
      },
      error: (error) => {
        this.errorMessage = this.resolveErrorMessage(
          error,
          'Não foi possível abrir o arquivo solicitado.',
        );
        this.openingDocument = false;
        this.openingDriverLicense = false;
      },
    });
  }

  private resolveErrorMessage(
    error: unknown,
    fallback = 'Não foi possível salvar seu perfil.',
  ) {
    const message = (error as { error?: { message?: string | string[] } })
      ?.error?.message;

    if (Array.isArray(message)) {
      return message.join('. ');
    }

    return message || fallback;
  }

  private setAvatarPreview(file: File) {
    this.revokeAvatarPreview();
    this.avatarPreviewUrl = URL.createObjectURL(file);
  }

  private extractImageFile(event: Event, errorMessage: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      return null;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = errorMessage;
      input.value = '';
      return null;
    }

    this.errorMessage = '';
    input.value = '';
    return file;
  }

  private revokeAvatarPreview() {
    if (!this.avatarPreviewUrl) {
      return;
    }

    URL.revokeObjectURL(this.avatarPreviewUrl);
    this.avatarPreviewUrl = null;
  }
}
