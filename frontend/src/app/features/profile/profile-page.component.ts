import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { ProfileApiService } from '../../core/services/profile-api.service';
import { Profile } from '../../core/models/domain.models';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.scss'],
})
export class ProfilePageComponent implements OnDestroy {
  protected readonly authService = inject(AuthService);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly uiStateService = inject(UiStateService);
  private readonly router = inject(Router);
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

  protected toggleMenu() {
    this.uiStateService.toggleMenu();
  }

  protected logout() {
    this.authService.logout();
    this.router.navigate(['/']);
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
