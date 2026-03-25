import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SearchAlert } from '../models/domain.models';

@Injectable({ providedIn: 'root' })
export class SearchAlertsApiService {
  private readonly http = inject(HttpClient);

  create(payload: { title?: string; filters: Record<string, unknown> }) {
    return this.http.post<SearchAlert>(
      `${environment.apiBaseUrl}/search-alerts`,
      payload,
    );
  }

  getMine(includeInactive = false) {
    return this.http.get<SearchAlert[]>(
      `${environment.apiBaseUrl}/search-alerts/my`,
      {
        params: {
          includeInactive,
        },
      },
    );
  }

  remove(alertId: string) {
    return this.http.delete<{ message: string; alertId: string }>(
      `${environment.apiBaseUrl}/search-alerts/${alertId}`,
    );
  }
}
