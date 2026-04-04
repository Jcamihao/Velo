import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, of, tap } from 'rxjs';
import { NotificationItem } from '../models/domain.models';
import { AppLoggerService } from './app-logger.service';
import { AuthService } from './auth.service';
import { ProfileApiService } from './profile-api.service';

@Injectable({ providedIn: 'root' })
export class NotificationsCenterService {
  private readonly authService = inject(AuthService);
  private readonly logger = inject(AppLoggerService);
  private readonly profileApiService = inject(ProfileApiService);

  private readonly notificationsSignal = signal<NotificationItem[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly initializedSignal = signal(false);

  readonly notifications = computed(() => this.notificationsSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly unreadCount = computed(
    () => this.notificationsSignal().filter((notification) => !notification.isRead).length,
  );

  constructor() {
    effect(
      () => {
        if (this.authService.hasSession()) {
          return;
        }

        this.notificationsSignal.set([]);
        this.loadingSignal.set(false);
        this.initializedSignal.set(false);
      },
      { allowSignalWrites: true },
    );
  }

  ensureLoaded(force = false): Observable<NotificationItem[]> {
    if (!this.authService.hasSession()) {
      this.notificationsSignal.set([]);
      this.initializedSignal.set(false);
      return of([]);
    }

    if (!force && this.initializedSignal()) {
      return of(this.notificationsSignal());
    }

    this.loadingSignal.set(true);
    this.logger.debug('notifications', force ? 'refresh_started' : 'load_started');

    return this.profileApiService.getNotifications().pipe(
      tap({
        next: (notifications) => {
          this.notificationsSignal.set(
            [...notifications].sort((left, right) =>
              new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
            ),
          );
          this.initializedSignal.set(true);
          this.logger.debug('notifications', force ? 'refresh_succeeded' : 'load_succeeded', {
            count: notifications.length,
          });
        },
        error: (error) => {
          this.logger.warn('notifications', force ? 'refresh_failed' : 'load_failed', {
            message: error?.message ?? 'Erro desconhecido',
          });
        },
      }),
      finalize(() => this.loadingSignal.set(false)),
    );
  }

  markRead(notificationId: string) {
    return this.profileApiService.markNotificationRead(notificationId).pipe(
      tap((updatedNotification) => {
        this.notificationsSignal.update((notifications) =>
          notifications.map((notification) =>
            notification.id === notificationId
              ? { ...notification, ...updatedNotification, isRead: true }
              : notification,
          ),
        );
      }),
    );
  }
}
