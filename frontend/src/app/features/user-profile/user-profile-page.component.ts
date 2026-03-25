import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import {
  PublicUserProfile,
  VerificationStatus,
} from '../../core/models/domain.models';
import { ProfileApiService } from '../../core/services/profile-api.service';
import { VehicleCardComponent } from '../../shared/components/vehicle-card.component';

@Component({
  selector: 'app-user-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink, VehicleCardComponent],
  template: `
    <main class="page user-profile-page">
      <section class="user-profile-shell glass-panel-strong" *ngIf="isLoading">
        <span class="eyebrow">Perfil</span>
        <h1>Carregando usuário</h1>
        <p>Estamos buscando o histórico público e os anúncios desse perfil.</p>
      </section>

      <section class="user-profile-shell glass-panel-strong" *ngIf="!isLoading && errorMessage">
        <span class="eyebrow">Perfil</span>
        <h1>Perfil indisponível</h1>
        <p>{{ errorMessage }}</p>
        <a class="btn btn-secondary" routerLink="/chat">Voltar</a>
      </section>

      <ng-container *ngIf="!isLoading && profile">
        <section class="user-profile-hero glass-panel-strong">
          <div class="user-profile-hero__top">
            <img
              class="user-profile-hero__avatar"
              [src]="profile.avatarUrl || fallbackAvatarImage"
              [alt]="profile.fullName"
            />

            <div class="user-profile-hero__copy">
              <span class="eyebrow">{{ roleLabel(profile.role) }}</span>
              <h1>{{ profile.fullName }}</h1>
              <p class="user-profile-hero__since">
                Na Velo desde {{ memberSinceLabel(profile.memberSince) }}
              </p>
              <p *ngIf="locationLabel(profile)">{{ locationLabel(profile) }}</p>
            </div>
          </div>

          <p class="user-profile-hero__bio" *ngIf="profile.bio">{{ profile.bio }}</p>

          <div class="user-profile-stats">
            <article>
              <strong>{{ scoreLabel(profile) }}</strong>
              <span>Pontuação</span>
            </article>
            <article>
              <strong>{{ profile.reviewsCount }}</strong>
              <span>Avaliações</span>
            </article>
            <article>
              <strong>{{ profile.activeListingsCount }}</strong>
              <span>Anúncios ativos</span>
            </article>
          </div>
        </section>

        <section class="user-profile-section glass-panel-strong">
          <div class="user-profile-section__header">
            <div>
              <span class="eyebrow">Confiança</span>
              <h2>Verificações</h2>
            </div>

            <span
              class="verification-pill"
              [class.verification-pill--approved]="profile.verification.profileStatus === 'APPROVED'"
              [class.verification-pill--pending]="profile.verification.profileStatus === 'PENDING'"
            >
              {{ verificationSummary(profile.verification.profileStatus) }}
            </span>
          </div>

          <div class="verification-list">
            <article
              class="verification-item"
              [class.verification-item--approved]="profile.verification.documentStatus === 'APPROVED'"
              [class.verification-item--pending]="profile.verification.documentStatus === 'PENDING'"
              [class.verification-item--rejected]="profile.verification.documentStatus === 'REJECTED'"
            >
              <span class="material-icons" aria-hidden="true">
                {{ verificationIcon(profile.verification.documentStatus) }}
              </span>
              <div>
                <strong>Documento</strong>
                <p>{{ verificationLabel(profile.verification.documentStatus) }}</p>
              </div>
            </article>

            <article
              class="verification-item"
              [class.verification-item--approved]="profile.verification.driverLicenseStatus === 'APPROVED'"
              [class.verification-item--pending]="profile.verification.driverLicenseStatus === 'PENDING'"
              [class.verification-item--rejected]="profile.verification.driverLicenseStatus === 'REJECTED'"
            >
              <span class="material-icons" aria-hidden="true">
                {{ verificationIcon(profile.verification.driverLicenseStatus) }}
              </span>
              <div>
                <strong>CNH</strong>
                <p>{{ verificationLabel(profile.verification.driverLicenseStatus) }}</p>
              </div>
            </article>

            <article
              class="verification-item"
              [class.verification-item--approved]="profile.verification.profileStatus === 'APPROVED'"
              [class.verification-item--pending]="profile.verification.profileStatus === 'PENDING'"
              [class.verification-item--rejected]="profile.verification.profileStatus === 'REJECTED'"
            >
              <span class="material-icons" aria-hidden="true">
                {{ verificationIcon(profile.verification.profileStatus) }}
              </span>
              <div>
                <strong>Perfil</strong>
                <p>{{ verificationSummary(profile.verification.profileStatus) }}</p>
              </div>
            </article>
          </div>
        </section>

        <section class="user-profile-section glass-panel-strong">
          <div class="user-profile-section__header">
            <div>
              <span class="eyebrow">Anúncios</span>
              <h2>Carros publicados</h2>
            </div>
            <span class="user-profile-section__count">{{ profile.vehicles.length }}</span>
          </div>

          <div class="user-profile-listings" *ngIf="profile.vehicles.length; else emptyListings">
            <app-vehicle-card
              *ngFor="let vehicle of profile.vehicles"
              [vehicle]="vehicle"
            />
          </div>

          <ng-template #emptyListings>
            <div class="user-profile-empty">
              <span class="material-icons" aria-hidden="true">directions_car</span>
              <strong>Nenhum anúncio público no momento</strong>
              <p>Esse usuário ainda não tem veículos ativos publicados.</p>
            </div>
          </ng-template>
        </section>
      </ng-container>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .user-profile-page {
        display: grid;
        gap: 16px;
        padding: 18px 12px 132px;
      }

      .user-profile-shell,
      .user-profile-hero,
      .user-profile-section {
        display: grid;
        gap: 16px;
        padding: 18px;
        border-radius: 24px;
      }

      .eyebrow {
        color: var(--primary);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1,
      h2,
      p {
        margin: 0;
      }

      h1 {
        font-size: 30px;
        line-height: 1.04;
      }

      h2 {
        font-size: 22px;
        line-height: 1.1;
      }

      .user-profile-hero__top,
      .user-profile-section__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      .user-profile-hero__top {
        align-items: flex-start;
      }

      .user-profile-hero__avatar {
        width: 88px;
        height: 88px;
        border-radius: 28px;
        object-fit: cover;
        flex-shrink: 0;
        background: var(--surface-muted);
      }

      .user-profile-hero__copy {
        display: grid;
        gap: 6px;
        min-width: 0;
      }

      .user-profile-hero__copy p,
      .verification-item p,
      .user-profile-empty p {
        color: var(--text-secondary);
      }

      .user-profile-hero__since {
        font-weight: 600;
      }

      .user-profile-hero__bio {
        line-height: 1.6;
        color: var(--text-secondary);
      }

      .user-profile-stats {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .user-profile-stats article {
        display: grid;
        gap: 4px;
        min-width: 0;
        padding: 14px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid var(--glass-border-soft);
      }

      .user-profile-stats strong {
        font-size: 24px;
        line-height: 1;
        color: var(--text-primary);
      }

      .user-profile-stats span,
      .user-profile-section__count {
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 600;
      }

      .verification-pill {
        display: inline-flex;
        align-items: center;
        min-height: 36px;
        padding: 0 14px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.12);
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 800;
      }

      .verification-pill--approved {
        background: rgba(34, 197, 94, 0.12);
        color: var(--success);
      }

      .verification-pill--pending {
        background: rgba(245, 158, 11, 0.14);
        color: var(--warning);
      }

      .verification-list {
        display: grid;
        gap: 12px;
      }

      .verification-item {
        display: grid;
        grid-template-columns: 44px minmax(0, 1fr);
        gap: 12px;
        align-items: center;
        padding: 14px 16px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.72);
        border: 1px solid var(--glass-border-soft);
      }

      .verification-item .material-icons {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: rgba(148, 163, 184, 0.12);
        color: var(--text-secondary);
      }

      .verification-item--approved .material-icons {
        background: rgba(34, 197, 94, 0.12);
        color: var(--success);
      }

      .verification-item--pending .material-icons {
        background: rgba(245, 158, 11, 0.14);
        color: var(--warning);
      }

      .verification-item--rejected .material-icons {
        background: rgba(239, 68, 68, 0.12);
        color: var(--error);
      }

      .verification-item strong {
        display: block;
        margin-bottom: 4px;
      }

      .user-profile-listings {
        display: grid;
        gap: 10px;
      }

      .user-profile-empty {
        display: grid;
        justify-items: start;
        gap: 8px;
        padding: 6px 0 2px;
      }

      .user-profile-empty .material-icons {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 16px;
        background: var(--surface-muted);
        color: var(--primary);
      }

      @media (min-width: 641px) {
        .user-profile-page {
          padding: 18px 16px 132px;
        }

        .user-profile-shell,
        .user-profile-hero,
        .user-profile-section {
          padding: 22px;
          border-radius: 28px;
        }

        .user-profile-hero__top {
          align-items: center;
        }

        .user-profile-stats {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (min-width: 1080px) {
        .user-profile-page {
          gap: 20px;
          padding: 24px 20px 156px;
        }

        .user-profile-hero {
          grid-template-columns: minmax(0, 1.1fr) 320px;
          align-items: start;
        }

        .user-profile-hero__top,
        .user-profile-hero__bio {
          grid-column: 1;
        }

        .user-profile-stats {
          grid-column: 2;
          grid-row: 1 / span 2;
          grid-template-columns: 1fr;
        }

        .verification-list {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .user-profile-listings {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
      }

    `,
  ],
})
export class UserProfilePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fallbackAvatarImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' rx='40' fill='%23f3eeee'/%3E%3Ccircle cx='80' cy='60' r='24' fill='%23b7aaac'/%3E%3Cpath d='M40 128c7-22 24-34 40-34s33 12 40 34' fill='%23b7aaac'/%3E%3C/svg%3E";

  protected profile: PublicUserProfile | null = null;
  protected isLoading = true;
  protected errorMessage = '';

  constructor() {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          this.isLoading = true;
          this.errorMessage = '';
          this.profile = null;
          return this.profileApiService.getPublicProfile(params.get('id') ?? '');
        }),
      )
      .subscribe({
        next: (profile) => {
          this.profile = profile;
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage =
            error?.error?.message || 'Não foi possível carregar esse perfil.';
        },
      });
  }

  protected memberSinceLabel(value: string) {
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  }

  protected scoreLabel(profile: PublicUserProfile) {
    if (!profile.reviewsCount) {
      return 'Novo';
    }

    return profile.ratingAverage.toFixed(1);
  }

  protected roleLabel(role: PublicUserProfile['role']) {
    const labels: Record<PublicUserProfile['role'], string> = {
      ADMIN: 'Administrador',
      OWNER: 'Anfitrião',
      RENTER: 'Locatário',
    };

    return labels[role] || 'Usuário';
  }

  protected locationLabel(profile: PublicUserProfile) {
    return [profile.city, profile.state].filter(Boolean).join(', ');
  }

  protected verificationLabel(status: VerificationStatus) {
    const labels: Record<VerificationStatus, string> = {
      APPROVED: 'Verificado',
      PENDING: 'Em análise',
      REJECTED: 'Reprovado',
      NOT_SUBMITTED: 'Ainda não enviado',
    };

    return labels[status];
  }

  protected verificationSummary(status: VerificationStatus) {
    const labels: Record<VerificationStatus, string> = {
      APPROVED: 'Perfil verificado',
      PENDING: 'Verificação em análise',
      REJECTED: 'Verificação reprovada',
      NOT_SUBMITTED: 'Perfil não verificado',
    };

    return labels[status];
  }

  protected verificationIcon(status: VerificationStatus) {
    const icons: Record<VerificationStatus, string> = {
      APPROVED: 'verified',
      PENDING: 'schedule',
      REJECTED: 'gpp_bad',
      NOT_SUBMITTED: 'pending_actions',
    };

    return icons[status];
  }
}
