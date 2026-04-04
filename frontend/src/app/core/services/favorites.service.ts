import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { VehicleCardItem, VehicleDetail } from '../models/domain.models';
import { AppLoggerService } from './app-logger.service';
import { AuthService } from './auth.service';
import { FavoritesApiService } from './favorites-api.service';

type FavoriteVehicleLike = VehicleCardItem | VehicleDetail;

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly favoritesApiService = inject(FavoritesApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly logger = inject(AppLoggerService);

  private readonly favoriteItemsSignal = signal<VehicleCardItem[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly pendingIdsSignal = signal<string[]>([]);
  private readonly loadedForUserIdSignal = signal<string | null>(null);
  private loadingForUserId: string | null = null;

  readonly items = computed(() => this.favoriteItemsSignal());
  readonly count = computed(() => this.favoriteItemsSignal().length);
  readonly isLoading = computed(() => this.loadingSignal());
  readonly favoriteIds = computed(() =>
    new Set(this.favoriteItemsSignal().map((vehicle) => vehicle.id)),
  );

  constructor() {
    effect(
      () => {
        const userId = this.authService.currentUser()?.id ?? null;
        const authenticated = this.authService.isAuthenticated();

        if (!authenticated || !userId) {
          this.reset();
          return;
        }

        if (
          this.loadedForUserIdSignal() !== userId &&
          this.loadingForUserId !== userId
        ) {
          this.refresh();
        }
      },
      { allowSignalWrites: true },
    );
  }

  refresh() {
    const userId = this.authService.currentUser()?.id ?? null;

    if (!this.authService.isAuthenticated() || !userId) {
      this.reset();
      return;
    }

    this.loadingSignal.set(true);
    this.loadingForUserId = userId;

    this.favoritesApiService
      .getMyFavorites()
      .pipe(
        finalize(() => {
          this.loadingSignal.set(false);
          this.loadingForUserId = null;
        }),
      )
      .subscribe({
        next: (items) => {
          this.favoriteItemsSignal.set(items);
          this.loadedForUserIdSignal.set(userId);
        },
        error: (error) => {
          this.logger.warn('favorites', 'load_failed', {
            userId,
            message: error?.message ?? 'Erro desconhecido',
          });
        },
      });
  }

  isFavorite(vehicleId: string) {
    return this.favoriteIds().has(vehicleId);
  }

  isPending(vehicleId: string) {
    return this.pendingIdsSignal().includes(vehicleId);
  }

  toggleFavorite(vehicle: FavoriteVehicleLike) {
    this.ensureAuthenticated(() => {
      if (this.isPending(vehicle.id)) {
        return;
      }

      if (this.isFavorite(vehicle.id)) {
        this.removeFavorite(vehicle.id);
        return;
      }

      this.addFavorite(vehicle);
    });
  }

  private addFavorite(vehicle: FavoriteVehicleLike) {
    this.markPending(vehicle.id, true);

    this.favoritesApiService
      .addFavorite(vehicle.id)
      .pipe(finalize(() => this.markPending(vehicle.id, false)))
      .subscribe({
        next: (response) => {
          const nextItems = this.favoriteItemsSignal().filter(
            (item) => item.id !== vehicle.id,
          );

          this.favoriteItemsSignal.set([response.vehicle, ...nextItems]);
          this.logger.info('favorites', 'favorite_added', {
            vehicleId: vehicle.id,
          });
        },
        error: (error) => {
          this.logger.warn('favorites', 'favorite_add_failed', {
            vehicleId: vehicle.id,
            message: error?.message ?? 'Erro desconhecido',
          });
        },
      });
  }

  private removeFavorite(vehicleId: string) {
    this.markPending(vehicleId, true);

    this.favoritesApiService
      .removeFavorite(vehicleId)
      .pipe(finalize(() => this.markPending(vehicleId, false)))
      .subscribe({
        next: () => {
          this.favoriteItemsSignal.set(
            this.favoriteItemsSignal().filter((item) => item.id !== vehicleId),
          );
          this.logger.info('favorites', 'favorite_removed', {
            vehicleId,
          });
        },
        error: (error) => {
          this.logger.warn('favorites', 'favorite_remove_failed', {
            vehicleId,
            message: error?.message ?? 'Erro desconhecido',
          });
        },
      });
  }

  private ensureAuthenticated(onReady: () => void) {
    if (!this.authService.hasSession()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    if (this.authService.isAuthenticated()) {
      onReady();
      return;
    }

    this.authService.restoreSession().subscribe((authenticated) => {
      if (!authenticated) {
        this.router.navigate(['/auth/login']);
        return;
      }

      onReady();
    });
  }

  private markPending(vehicleId: string, pending: boolean) {
    const pendingIds = this.pendingIdsSignal();

    if (pending) {
      if (!pendingIds.includes(vehicleId)) {
        this.pendingIdsSignal.set([...pendingIds, vehicleId]);
      }
      return;
    }

    this.pendingIdsSignal.set(pendingIds.filter((id) => id !== vehicleId));
  }

  private reset() {
    this.favoriteItemsSignal.set([]);
    this.pendingIdsSignal.set([]);
    this.loadedForUserIdSignal.set(null);
    this.loadingSignal.set(false);
    this.loadingForUserId = null;
  }
}
