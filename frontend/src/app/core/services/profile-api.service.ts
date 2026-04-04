import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  NotificationItem,
  Profile,
  PublicUserProfile,
} from '../models/domain.models';
import { normalizeApiPayloadUrls } from '../utils/network-url.util';

type ProfileUpdatePayload = Partial<
  Pick<
    Profile,
    | 'fullName'
    | 'phone'
    | 'zipCode'
    | 'addressLine'
    | 'addressComplement'
    | 'city'
    | 'state'
    | 'bio'
    | 'avatarUrl'
    | 'documentNumber'
    | 'driverLicenseNumber'
  >
>;

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);

  getMyProfile() {
    return this.http
      .get<Profile>(`${environment.apiBaseUrl}/profiles/me`)
      .pipe(map((profile) => normalizeApiPayloadUrls(profile)));
  }

  getPublicProfile(userId: string) {
    return this.http
      .get<PublicUserProfile>(`${environment.apiBaseUrl}/profiles/${userId}`)
      .pipe(map((profile) => normalizeApiPayloadUrls(profile)));
  }

  updateMyProfile(payload: Partial<Profile>) {
    const safePayload: ProfileUpdatePayload = {
      fullName: payload.fullName,
      phone: payload.phone,
      zipCode: payload.zipCode,
      addressLine: payload.addressLine,
      addressComplement: payload.addressComplement,
      city: payload.city,
      state: payload.state,
      bio: payload.bio,
      avatarUrl: payload.avatarUrl,
      documentNumber: payload.documentNumber,
      driverLicenseNumber: payload.driverLicenseNumber,
    };

    return this.http
      .patch<Profile>(`${environment.apiBaseUrl}/profiles/me`, safePayload)
      .pipe(map((profile) => normalizeApiPayloadUrls(profile)));
  }

  uploadMyAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<Profile>(`${environment.apiBaseUrl}/profiles/me/avatar`, formData)
      .pipe(map((profile) => normalizeApiPayloadUrls(profile)));
  }

  uploadMyDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<Profile>(`${environment.apiBaseUrl}/profiles/me/document`, formData)
      .pipe(map((profile) => normalizeApiPayloadUrls(profile)));
  }

  uploadMyDriverLicense(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<Profile>(
        `${environment.apiBaseUrl}/profiles/me/driver-license`,
        formData,
      )
      .pipe(map((profile) => normalizeApiPayloadUrls(profile)));
  }

  getMyDocumentUrl() {
    return this.http
      .get<{ url: string }>(`${environment.apiBaseUrl}/profiles/me/document/url`)
      .pipe(map((response) => normalizeApiPayloadUrls(response)));
  }

  getMyDriverLicenseUrl() {
    return this.http
      .get<{ url: string }>(
        `${environment.apiBaseUrl}/profiles/me/driver-license/url`,
      )
      .pipe(map((response) => normalizeApiPayloadUrls(response)));
  }

  getNotifications() {
    return this.http.get<NotificationItem[]>(
      `${environment.apiBaseUrl}/notifications/my`,
    );
  }

  markNotificationRead(notificationId: string) {
    return this.http.patch<NotificationItem>(
      `${environment.apiBaseUrl}/notifications/${notificationId}/read`,
      {},
    );
  }
}
