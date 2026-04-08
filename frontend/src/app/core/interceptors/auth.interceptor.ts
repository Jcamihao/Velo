import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { isPublicCatalogRequest } from './public-catalog-request.util';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const accessToken = authService.getAccessToken();
  const isApiRequest = req.url.startsWith(environment.apiBaseUrl);
  const isPublicCatalogApiRequest = isPublicCatalogRequest(req.url, req.method);

  if (!isApiRequest) {
    return next(req);
  }

  if (isPublicCatalogApiRequest) {
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
