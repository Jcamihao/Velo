import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  getDashboard() {
    return this.http.get<{ totals: { users: number; vehicles: number; bookings: number; privacyRequests: number } }>(
      `${environment.apiBaseUrl}/admin/dashboard`,
    );
  }

  getUsers() {
    return this.http.get(`${environment.apiBaseUrl}/admin/users`);
  }

  getVehicles() {
    return this.http.get(`${environment.apiBaseUrl}/admin/vehicles`);
  }

  getBookings() {
    return this.http.get(`${environment.apiBaseUrl}/admin/bookings`);
  }

  blockUser(userId: string) {
    return this.http.patch(`${environment.apiBaseUrl}/admin/users/${userId}/block`, {});
  }

  approveUserDocument(userId: string) {
    return this.http.patch(
      `${environment.apiBaseUrl}/admin/users/${userId}/document/approve`,
      {},
    );
  }

  rejectUserDocument(userId: string) {
    return this.http.patch(
      `${environment.apiBaseUrl}/admin/users/${userId}/document/reject`,
      {},
    );
  }

  approveUserDriverLicense(userId: string) {
    return this.http.patch(
      `${environment.apiBaseUrl}/admin/users/${userId}/driver-license/approve`,
      {},
    );
  }

  rejectUserDriverLicense(userId: string) {
    return this.http.patch(
      `${environment.apiBaseUrl}/admin/users/${userId}/driver-license/reject`,
      {},
    );
  }

  deactivateVehicle(vehicleId: string) {
    return this.http.patch(
      `${environment.apiBaseUrl}/admin/vehicles/${vehicleId}/deactivate`,
      {},
    );
  }

  getUserVerificationFileUrl(
    userId: string,
    type: 'document' | 'driverLicense',
  ) {
    return this.http.get<{ url: string }>(
      `${environment.apiBaseUrl}/admin/users/${userId}/verification-file`,
      {
        params: { type },
      },
    );
  }

  getPrivacyRequests() {
    return this.http.get(`${environment.apiBaseUrl}/admin/privacy/requests`);
  }

  updatePrivacyRequest(
    requestId: string,
    status: string,
    resolutionNotes?: string,
  ) {
    return this.http.patch(
      `${environment.apiBaseUrl}/admin/privacy/requests/${requestId}`,
      { status, resolutionNotes },
    );
  }
}
