import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';

export type CepLookupResult = {
  zipCode: string;
  addressLine: string;
  city: string;
  state: string;
  addressComplement: string;
};

@Injectable({ providedIn: 'root' })
export class CepLookupService {
  private readonly http = inject(HttpClient);

  lookup(zipCode: string) {
    const digits = zipCode.replace(/\D/g, '');

    return this.http
      .get<CepLookupResult>(`${environment.apiBaseUrl}/lookups/cep/${digits}`)
      .pipe(
        map((response) => {
          return {
            zipCode: this.formatZipCode(response.zipCode ?? digits),
            addressLine: response.addressLine?.trim() ?? '',
            city: response.city?.trim() ?? '',
            state: response.state?.trim().toUpperCase() ?? '',
            addressComplement: response.addressComplement?.trim() ?? '',
          } satisfies CepLookupResult;
        }),
      );
  }

  formatZipCode(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 5) {
      return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
}
