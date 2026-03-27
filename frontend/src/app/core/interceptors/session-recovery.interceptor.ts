import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AppLoggerService } from '../services/app-logger.service';
import { AuthService } from '../services/auth.service';

const RETRY_HEADER = 'x-auth-retry';

export const sessionRecoveryInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const logger = inject(AppLoggerService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const httpError =
        error instanceof HttpErrorResponse
          ? error
          : new HttpErrorResponse({ error });
      const isAuthRoute = req.url.includes('/auth/login')
        || req.url.includes('/auth/register')
        || req.url.includes('/auth/refresh');
      const alreadyRetried = req.headers.has(RETRY_HEADER);
      const shouldAttemptRecovery =
        httpError.status === 401
        && !isAuthRoute
        && !alreadyRetried
        && authService.hasSessionHint();

      if (!shouldAttemptRecovery) {
        return throwError(() => error);
      }

      logger.warn('auth', 'session_recovery_requested', {
        url: req.urlWithParams,
      });

      return authService.restoreSession(true).pipe(
        switchMap((authenticated) => {
          if (!authenticated) {
            logger.warn('auth', 'session_recovery_rejected', {
              url: req.urlWithParams,
            });
            return throwError(() => error);
          }

          logger.info('auth', 'session_recovery_retrying_request', {
            url: req.urlWithParams,
          });

          return next(
            req.clone({
              setHeaders: {
                [RETRY_HEADER]: '1',
              },
            }),
          );
        }),
        catchError((refreshError) => {
          logger.error('auth', 'session_recovery_failed', {
            url: req.urlWithParams,
            message:
              refreshError instanceof Error
                ? refreshError.message
                : 'Falha ao restaurar sessão',
          });
          return throwError(() => error);
        }),
      );
    }),
  );
};
