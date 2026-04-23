import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs/operators';
import {
  PublicUserProfile,
  VerificationStatus,
} from '../../core/models/domain.models';
import { ProfileApiService } from '../../core/services/profile-api.service';
import { VehicleCardComponent } from '../../shared/components/vehicle-card/vehicle-card.component';

@Component({
  selector: 'app-user-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink, VehicleCardComponent],
  templateUrl: './user-profile-page.component.html',
  styleUrls: ['./user-profile-page.component.scss'],
})
export class UserProfilePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly fallbackAvatarImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' rx='40' fill='%23f3eeee'/%3E%3Ccircle cx='80' cy='60' r='24' fill='%23b7aaac'/%3E%3Cpath d='M40 128c7-22 24-34 40-34s33 12 40 34' fill='%23b7aaac'/%3E%3C/svg%3E";
  protected readonly ratingOptions = [1, 2, 3, 4, 5];

  protected profile: PublicUserProfile | null = null;
  protected isLoading = true;
  protected errorMessage = '';
  protected linkCopied = false;

  constructor() {
    this.route.paramMap
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((params) => {
          this.isLoading = true;
          this.errorMessage = '';
          this.profile = null;
          return this.profileApiService.getPublicProfile(
            params.get('id') ?? '',
          );
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

  protected copyProfileLink() {
    const url = window.location.href;

    navigator.clipboard.writeText(url).then(() => {
      this.linkCopied = true;
      setTimeout(() => (this.linkCopied = false), 2500);
    });
  }

  protected contactUser() {
    if (!this.profile) {
      return;
    }

    const firstVehicle = this.profile.vehicles[0];

    if (firstVehicle) {
      this.router.navigate(['/vehicles', firstVehicle.id]);
    }
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

  protected reviewSummaryLabel(profile: PublicUserProfile) {
    if (!profile.reviewsCount) {
      return 'Esse perfil ainda não recebeu avaliações gerais.';
    }

    return `Baseado em ${profile.reviewsCount} avaliação${
      profile.reviewsCount > 1 ? 'ões' : ''
    } pública.`;
  }

  protected roleLabel(role: PublicUserProfile['role']) {
    const labels: Record<PublicUserProfile['role'], string> = {
      ADMIN: 'Administrador',
      USER: 'Usuário',
    };

    return labels[role] || 'Usuário';
  }

  protected locationLabel(profile: PublicUserProfile) {
    return [profile.city, profile.state].filter(Boolean).join(', ');
  }

  protected roundedScore(value: number) {
    return Math.max(0, Math.min(5, Math.round(value)));
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

  protected trackById(_: number, item: { id: string }) {
    return item.id;
  }

  protected trackByValue(_: number, value: number) {
    return value;
  }
}
