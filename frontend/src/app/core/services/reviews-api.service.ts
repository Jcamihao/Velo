import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserReviewItem } from '../models/domain.models';
import { normalizeApiPayloadUrls } from '../utils/network-url.util';

@Injectable({ providedIn: 'root' })
export class ReviewsApiService {
  private readonly http = inject(HttpClient);

  createUserReview(payload: {
    bookingId: string;
    rating: number;
    comment?: string;
  }) {
    return this.http
      .post<UserReviewItem>(`${environment.apiBaseUrl}/reviews/user`, payload)
      .pipe(map((review) => normalizeApiPayloadUrls(review)));
  }
}
