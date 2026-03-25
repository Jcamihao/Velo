import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  NotificationItem,
  Profile,
  PublicUserProfile,
} from '../models/domain.models';

type ProfileUpdatePayload = Partial<
  Pick<
    Profile,
    | 'fullName'
    | 'phone'
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
    return this.http.get<Profile>(`${environment.apiBaseUrl}/profiles/me`);
  }

  getPublicProfile(userId: string) {
    return this.http.get<PublicUserProfile>(
      `${environment.apiBaseUrl}/profiles/${userId}`,
    );
  }

  updateMyProfile(payload: Partial<Profile>) {
    const safePayload: ProfileUpdatePayload = {
      fullName: payload.fullName,
      phone: payload.phone,
      city: payload.city,
      state: payload.state,
      bio: payload.bio,
      avatarUrl: payload.avatarUrl,
      documentNumber: payload.documentNumber,
      driverLicenseNumber: payload.driverLicenseNumber,
    };

    return this.http.patch<Profile>(
      `${environment.apiBaseUrl}/profiles/me`,
      safePayload,
    );
  }

  uploadMyAvatar(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<Profile>(
      `${environment.apiBaseUrl}/profiles/me/avatar`,
      formData,
    );
  }

  uploadMyDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<Profile>(
      `${environment.apiBaseUrl}/profiles/me/document`,
      formData,
    );
  }

  uploadMyDriverLicense(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<Profile>(
      `${environment.apiBaseUrl}/profiles/me/driver-license`,
      formData,
    );
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
