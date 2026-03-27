import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);

  if (!isApiRequest) {
    return next(req);
  }

  if (!accessToken) {
    return next(
      req.clone({
        withCredentials: true,
      }),
    );
  }

  return next(
    req.clone({
      withCredentials: true,
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );
};
