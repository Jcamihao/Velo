import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { SearchAlertsApiService } from '../../core/services/search-alerts-api.service';
import { FilterModalComponent } from '../../shared/components/filter-modal.component';
import { SearchHeaderComponent } from '../../shared/components/search-header.component';
import { VehicleMapComponent } from '../../shared/components/vehicle-map.component';
import { SearchAlert, VehicleCardItem, VehicleType } from '../../core/models/domain.models';
import { FavoritesService } from '../../core/services/favorites.service';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';

type SearchQuery = {
  q: string;
  city: string;
  startDate: string;
  endDate: string;
  vehicleType: VehicleType | '';
  category: string;
  motorcycleStyle: string;
  minEngineCc: string;
  maxEngineCc: string;
  minPrice: string;
  maxPrice: string;
  latitude: string;
  longitude: string;
  radiusKm: string;
};

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [
    CommonModule,
    SearchHeaderComponent,
    FilterModalComponent,
    VehicleMapComponent,
  ],
  template: `
    <main class="page search-page">
      <app-search-header
        [title]="searchTitle"
        [subtitle]="searchSubtitle"
        [query]="query.q"
        [startDate]="query.startDate"
        [endDate]="query.endDate"
        (search)="onSearch($event)"
        (filters)="filtersOpen = true"
      />

      <section class="search-page__tools">
        <button type="button" class="btn btn-secondary" (click)="useCurrentLocation()">
          Minha localização
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          *ngIf="hasLocationFilter"
          (click)="clearLocationFilter()"
        >
          Limpar raio
        </button>
        <button type="button" class="btn btn-secondary" (click)="mapOpen = !mapOpen">
          {{ mapOpen ? 'Ocultar mapa' : 'Ver mapa' }}
        </button>
        <button
          *ngIf="authService.hasSession()"
          type="button"
          class="btn btn-secondary"
          [disabled]="alertSaving || !canSaveCurrentSearch || currentAlertSaved"
          (click)="saveCurrentSearchAlert()"
        >
          {{
            currentAlertSaved
              ? 'Alerta salvo'
              : alertSaving
                ? 'Salvando alerta...'
                : 'Salvar alerta'
          }}
        </button>
      </section>

      <section class="search-page__alerts-card" *ngIf="authService.hasSession()">
        <div class="search-page__section-head">
          <h2>Alertas de busca</h2>
          <span>{{ searchAlerts.length }} salvo(s)</span>
        </div>

        <p class="loading" *ngIf="alertsLoading">Carregando alertas...</p>
        <p class="loading" *ngIf="alertFeedback">{{ alertFeedback }}</p>
        <p class="loading" *ngIf="!alertsLoading && !searchAlerts.length">
          Salve a busca atual para ser avisado quando surgir um carro ou moto nessa faixa.
        </p>

        <div class="search-page__alert-list" *ngIf="searchAlerts.length">
          <article class="search-page__alert-item" *ngFor="let alert of searchAlerts">
            <div>
              <strong>{{ alert.title || 'Busca salva' }}</strong>
              <p>{{ alertSummary(alert) }}</p>
            </div>

            <button
              type="button"
              class="btn btn-ghost"
              [disabled]="removingAlertId === alert.id"
              (click)="removeAlert(alert.id)"
            >
              {{ removingAlertId === alert.id ? 'Removendo...' : 'Remover' }}
            </button>
          </article>
        </div>
      </section>

      <section class="search-page__map-card" *ngIf="mapOpen">
        <div class="search-page__section-head">
          <h2>Mapa</h2>
          <span>{{ locationSummary }}</span>
        </div>

        <app-vehicle-map
          *ngIf="mapMarkers.length"
          [markers]="mapMarkers"
          [centerLatitude]="query.latitude ? +query.latitude : null"
          [centerLongitude]="query.longitude ? +query.longitude : null"
        />

        <p class="loading" *ngIf="!mapMarkers.length">
          Nenhum resultado com coordenadas para mostrar no mapa.
        </p>
      </section>

      <section class="search-page__section">
        <div class="search-page__section-head">
          <h2>Resultados</h2>
          <span>{{ totalItems }} {{ resultsLabel }}</span>
        </div>

        <section class="search-page__budget-grid" *ngIf="vehicles.length">
          <article
            *ngFor="let vehicle of vehicles"
            class="search-page__budget-card"
            tabindex="0"
            role="button"
            (click)="goToVehicle(vehicle.id)"
            (keydown.enter)="goToVehicle(vehicle.id)"
          >
            <div class="search-page__budget-media">
              <button
                type="button"
                class="search-page__favorite"
                [class.search-page__favorite--active]="isFavorite(vehicle.id)"
                [disabled]="isFavoritePending(vehicle.id)"
                [attr.aria-label]="
                  isFavorite(vehicle.id) ? 'Remover dos favoritos' : 'Salvar nos favoritos'
                "
                (click)="toggleFavorite(vehicle, $event)"
              >
                <span class="material-icons" aria-hidden="true">{{
                  isFavorite(vehicle.id) ? 'favorite' : 'favorite_border'
                }}</span>
              </button>
              <img [src]="vehicle.coverImage || fallbackImage" [alt]="vehicle.title" />
            </div>

            <div class="search-page__budget-copy">
              <div class="search-page__budget-top">
                <h3>{{ vehicle.title }}</h3>
                <strong>{{ vehicle.dailyRate | currency: 'BRL' : 'symbol' : '1.0-0' }} / semana</strong>
              </div>

              <div
                class="search-page__promo-row"
                *ngIf="
                  vehicle.firstBookingDiscountPercent ||
                  vehicle.weeklyDiscountPercent ||
                  (vehicle.couponCode && vehicle.couponDiscountPercent)
                "
              >
                <span class="search-page__promo-pill" *ngIf="vehicle.firstBookingDiscountPercent">
                  1a reserva {{ vehicle.firstBookingDiscountPercent }}% off
                </span>
                <span class="search-page__promo-pill" *ngIf="vehicle.weeklyDiscountPercent">
                  Semanal {{ vehicle.weeklyDiscountPercent }}% off
                </span>
                <span class="search-page__promo-pill" *ngIf="vehicle.couponCode && vehicle.couponDiscountPercent">
                  Cupom ativo
                </span>
              </div>

              <div class="search-page__budget-specs">
                <span>
                  <span class="material-icons" aria-hidden="true">tune</span>
                  {{ transmissionLabel(vehicle.transmission) }}
                </span>
                <span>
                  <span class="material-icons" aria-hidden="true">event_seat</span>
                  {{ vehicle.seats }} lugares
                </span>
              </div>

              <p>{{ vehicle.city }}, {{ vehicle.state }}</p>
            </div>
          </article>
        </section>

        <p class="loading" *ngIf="loading">Carregando resultados...</p>

        <section class="empty-state" *ngIf="!loading && vehicles.length === 0">
          <h2>{{ emptyStateTitle }}</h2>
          <p>{{ emptyStateDescription }}</p>
        </section>
      </section>

      <div #sentinel class="sentinel" *ngIf="hasNextPage && vehicles.length"></div>

      <app-filter-modal
        [open]="filtersOpen"
        [filters]="query"
        (close)="filtersOpen = false"
        (apply)="applyFilters($event)"
      />
    </main>
  `,
  styles: [
    `
      .search-page {
        display: grid;
        gap: 16px;
        width: 100%;
        margin: 0 auto;
        padding: 20px 16px 40px;
      }

      .search-page__section-head h2,
      .search-page__section-head span {
        margin: 0;
      }

      .search-page__section {
        display: grid;
        gap: 14px;
        padding: 18px 16px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
      }

      .search-page__tools {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .search-page__map-card {
        display: grid;
        gap: 14px;
        padding: 18px 16px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
      }

      .search-page__alerts-card {
        display: grid;
        gap: 14px;
        padding: 18px 16px;
        border-radius: 22px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
      }

      .search-page__section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .search-page__section-head h2 {
        color: var(--text-primary);
        font-size: 18px;
        font-weight: 700;
      }

      .search-page__section-head span {
        color: var(--text-secondary);
        font-size: 13px;
      }

      .search-page__budget-card {
        min-width: 0;
        border: 0;
        text-align: left;
        color: inherit;
        cursor: pointer;
      }

      .search-page__favorite {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.94);
        color: var(--text-secondary);
        box-shadow: 0 8px 18px rgba(28, 17, 18, 0.08);
      }

      .search-page__favorite--active {
        color: var(--primary);
      }

      .search-page__budget-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 14px;
      }

      .search-page__budget-card {
        display: grid;
        gap: 10px;
        padding: 12px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--glass-border-soft);
        box-shadow: 0 12px 24px rgba(28, 17, 18, 0.08);
      }

      .search-page__budget-media {
        position: relative;
        min-height: 118px;
        border-radius: 14px;
        overflow: hidden;
        background: linear-gradient(180deg, #fffdfd 0%, #f5efef 100%);
      }

      .search-page__budget-media img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .search-page__budget-copy {
        display: grid;
        gap: 8px;
      }

      .search-page__budget-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .search-page__budget-top h3,
      .search-page__budget-copy p {
        margin: 0;
      }

      .search-page__budget-top h3 {
        font-size: 15px;
        line-height: 1.2;
        color: var(--text-primary);
      }

      .search-page__budget-top strong {
        color: var(--primary);
        font-size: 18px;
        font-weight: 800;
        letter-spacing: -0.03em;
      }

      .search-page__promo-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .search-page__promo-pill {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        background: rgba(245, 158, 11, 0.14);
        color: #9a5c00;
        font-size: 11px;
        font-weight: 700;
      }

      .search-page__budget-specs {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 600;
      }

      .search-page__budget-specs span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .search-page__budget-specs .material-icons {
        font-size: 15px;
      }

      .search-page__budget-copy p {
        color: var(--text-secondary);
        font-size: 12px;
      }

      .search-page__alert-list {
        display: grid;
        gap: 10px;
      }

      .search-page__alert-item {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 14px;
        border-radius: 18px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
      }

      .search-page__alert-item strong,
      .search-page__alert-item p {
        margin: 0;
      }

      .empty-state,
      .loading {
        padding: 18px;
        border-radius: 22px;
        background: var(--surface-muted);
        border: 1px solid var(--glass-border-soft);
        text-align: center;
        color: var(--text-secondary);
      }

      .empty-state h2 {
        margin-top: 0;
        color: var(--text-primary);
      }

      .sentinel {
        height: 1px;
      }

      @media (min-width: 421px) {
        .search-page__budget-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (min-width: 1080px) {
        .search-page {
          gap: 20px;
          padding: 28px 20px 56px;
        }

        .search-page__section {
          padding: 22px;
          border-radius: 26px;
        }

        .search-page__budget-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .search-page__budget-card {
          gap: 12px;
          padding: 14px;
          border-radius: 20px;
        }

        .search-page__budget-media {
          min-height: 172px;
          border-radius: 16px;
        }
      }

    `,
  ],
})
export class SearchPageComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly searchAlertsApiService = inject(SearchAlertsApiService);
  private readonly vehiclesApiService = inject(VehiclesApiService);

  @ViewChild('sentinel') sentinelRef?: ElementRef<HTMLDivElement>;

  protected vehicles: VehicleCardItem[] = [];
  protected loading = false;
  protected hasNextPage = false;
  protected totalItems = 0;
  protected filtersOpen = false;
  protected mapOpen = false;
  protected searchAlerts: SearchAlert[] = [];
  protected alertsLoading = false;
  protected alertSaving = false;
  protected alertFeedback = '';
  protected removingAlertId: string | null = null;
  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';
  protected query: SearchQuery = {
    q: '',
    city: '',
    startDate: '',
    endDate: '',
    vehicleType: '',
    category: '',
    motorcycleStyle: '',
    minEngineCc: '',
    maxEngineCc: '',
    minPrice: '',
    maxPrice: '',
    latitude: '',
    longitude: '',
    radiusKm: '',
  };

  private currentPage = 1;
  private observer?: IntersectionObserver;

  constructor() {
    if (this.authService.hasSession()) {
      this.loadAlerts();
    }

    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.query = {
          q: params.get('q') || '',
          city: params.get('city') || '',
          startDate: params.get('startDate') || '',
          endDate: params.get('endDate') || '',
          vehicleType: (params.get('vehicleType') as VehicleType | '') || '',
          category: params.get('category') || '',
          motorcycleStyle: params.get('motorcycleStyle') || '',
          minEngineCc: params.get('minEngineCc') || '',
          maxEngineCc: params.get('maxEngineCc') || '',
          minPrice: params.get('minPrice') || '',
          maxPrice: params.get('maxPrice') || '',
          latitude: params.get('latitude') || '',
          longitude: params.get('longitude') || '',
          radiusKm: params.get('radiusKm') || '',
        };
        this.currentPage = 1;
        this.vehicles = [];
        this.fetchVehicles();
      });
  }

  protected get canSaveCurrentSearch() {
    return Object.keys(this.buildAlertFilters()).length > 0;
  }

  protected get currentAlertSaved() {
    const currentSignature = this.alertSignature(this.buildAlertFilters());

    return !!currentSignature && this.searchAlerts.some(
      (alert) => this.alertSignature(alert.filters) === currentSignature,
    );
  }

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (entry.isIntersecting && this.hasNextPage && !this.loading) {
          this.currentPage += 1;
          this.fetchVehicles();
        }
      },
      { rootMargin: '160px' },
    );

    queueMicrotask(() => this.observeSentinel());
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  protected onSearch(query: { q: string }) {
    this.router.navigate(['/search'], {
      queryParams: {
        ...this.query,
        ...query,
      },
    });
  }

  protected applyFilters(filters: Record<string, string>) {
    this.filtersOpen = false;
    this.router.navigate(['/search'], {
      queryParams: {
        ...this.query,
        ...filters,
      },
    });
  }

  protected useCurrentLocation() {
    if (!('geolocation' in navigator)) {
      globalThis.alert('Geolocalização não disponível neste navegador.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.router.navigate(['/search'], {
          queryParams: {
            ...this.query,
            latitude: coords.latitude.toFixed(6),
            longitude: coords.longitude.toFixed(6),
            radiusKm: this.query.radiusKm || '20',
          },
        });
      },
      () => {
        globalThis.alert('Não foi possível obter sua localização agora.');
      },
      {
        enableHighAccuracy: true,
      },
    );
  }

  protected clearLocationFilter() {
    this.router.navigate(['/search'], {
      queryParams: {
        ...this.query,
        latitude: '',
        longitude: '',
        radiusKm: '',
      },
    });
  }

  protected goToVehicle(vehicleId: string) {
    this.router.navigate(['/vehicles', vehicleId]);
  }

  protected isFavorite(vehicleId: string) {
    return this.favoritesService.isFavorite(vehicleId);
  }

  protected isFavoritePending(vehicleId: string) {
    return this.favoritesService.isPending(vehicleId);
  }

  protected toggleFavorite(vehicle: VehicleCardItem, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.favoritesService.toggleFavorite(vehicle);
  }

  protected saveCurrentSearchAlert() {
    const filters = this.buildAlertFilters();

    if (!Object.keys(filters).length) {
      this.alertFeedback = 'Escolha pelo menos um filtro antes de salvar o alerta.';
      return;
    }

    this.alertSaving = true;
    this.alertFeedback = '';

    this.searchAlertsApiService
      .create({ filters })
      .subscribe({
        next: () => {
          this.alertSaving = false;
          this.alertFeedback = 'Alerta salvo. Vamos avisar quando surgir algo nessa faixa.';
          this.loadAlerts();
        },
        error: (error) => {
          this.alertSaving = false;
          this.alertFeedback =
            error?.error?.message || 'Não foi possível salvar esse alerta.';
        },
      });
  }

  protected removeAlert(alertId: string) {
    this.removingAlertId = alertId;
    this.alertFeedback = '';

    this.searchAlertsApiService.remove(alertId).subscribe({
      next: () => {
        this.removingAlertId = null;
        this.alertFeedback = 'Alerta removido.';
        this.loadAlerts();
      },
      error: (error) => {
        this.removingAlertId = null;
        this.alertFeedback =
          error?.error?.message || 'Não foi possível remover esse alerta.';
      },
    });
  }

  private fetchVehicles() {
    this.loading = true;

    this.vehiclesApiService
      .search({
        ...this.query,
        page: this.currentPage,
        limit: 8,
      })
      .subscribe({
        next: (response) => {
          this.vehicles = [...this.vehicles, ...response.items];
          this.hasNextPage = response.meta.hasNextPage;
          this.totalItems = response.meta.total;
          this.loading = false;
          this.observeSentinel();
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  private observeSentinel() {
    if (this.sentinelRef?.nativeElement) {
      this.observer?.disconnect();
      this.observer?.observe(this.sentinelRef.nativeElement);
    }
  }

  protected transmissionLabel(transmission: string) {
    const labels: Record<string, string> = {
      AUTOMATIC: 'Auto',
      MANUAL: 'Manual',
      CVT: 'CVT',
    };

    return labels[transmission] || transmission;
  }

  protected get mapMarkers() {
    return this.vehicles
      .filter(
        (vehicle) =>
          vehicle.latitude !== null &&
          vehicle.latitude !== undefined &&
          vehicle.longitude !== null &&
          vehicle.longitude !== undefined,
      )
      .map((vehicle) => ({
        id: vehicle.id,
        title: vehicle.title,
        city: vehicle.city,
        state: vehicle.state,
        latitude: vehicle.latitude as number,
        longitude: vehicle.longitude as number,
      }));
  }

  protected get hasLocationFilter() {
    return !!this.query.latitude && !!this.query.longitude;
  }

  protected get locationSummary() {
    return this.hasLocationFilter
      ? `Raio de ${this.query.radiusKm || '20'} km`
      : 'Use sua localização para filtrar no mapa';
  }

  protected get searchTitle() {
    if (this.query.vehicleType === 'CAR') {
      return 'Buscar carros';
    }

    return this.query.vehicleType === 'MOTORCYCLE' ? 'Buscar motos' : 'Buscar veículos';
  }

  protected get searchSubtitle() {
    if (this.query.vehicleType === 'CAR') {
      return 'Escolha o modelo, ajuste o período e encontre carros disponíveis na sua faixa de preço.';
    }

    return this.query.vehicleType === 'MOTORCYCLE'
      ? 'Escolha o modelo, ajuste o período e encontre motos disponíveis na sua faixa de preço.'
      : 'Escolha o modelo, ajuste o período e filtre entre carros e motos.';
  }

  protected get resultsLabel() {
    if (this.query.vehicleType === 'CAR') {
      return 'carros encontrados';
    }

    return this.query.vehicleType === 'MOTORCYCLE' ? 'motos encontradas' : 'veículos encontrados';
  }

  protected get emptyStateTitle() {
    if (this.query.vehicleType === 'CAR') {
      return 'Nenhum carro encontrado';
    }

    return this.query.vehicleType === 'MOTORCYCLE'
      ? 'Nenhuma moto encontrada'
      : 'Nenhum veículo encontrado';
  }

  protected get emptyStateDescription() {
    if (this.query.vehicleType === 'CAR') {
      return 'Tente mudar a cidade ou ampliar a faixa de preço para ver mais carros.';
    }

    return this.query.vehicleType === 'MOTORCYCLE'
      ? 'Tente mudar a cidade ou ampliar a faixa de preço para ver mais motos.'
      : 'Tente mudar a cidade, o tipo de veículo ou ampliar a faixa de preço.';
  }

  protected alertSummary(alert: SearchAlert) {
    const filters = alert.filters as Record<string, unknown>;
    const city = filters['city'] ? String(filters['city']) : '';
    const vehicleType = String(filters['vehicleType'] ?? '');
    const minPrice = filters['minPrice'];
    const maxPrice = filters['maxPrice'];
    const parts = [
      city,
      vehicleType === 'CAR'
        ? 'carros'
        : vehicleType === 'MOTORCYCLE'
          ? 'motos'
          : 'veículos',
      minPrice || maxPrice
        ? `R$ ${minPrice || '0'}-${maxPrice || 'sem teto'}`
        : '',
    ].filter(Boolean);

    return parts.join(' • ');
  }

  private loadAlerts() {
    this.alertsLoading = true;

    this.searchAlertsApiService.getMine().subscribe({
      next: (alerts) => {
        this.searchAlerts = alerts;
        this.alertsLoading = false;
      },
      error: () => {
        this.searchAlerts = [];
        this.alertsLoading = false;
      },
    });
  }

  private buildAlertFilters() {
    const numericKeys = new Set([
      'minEngineCc',
      'maxEngineCc',
      'minPrice',
      'maxPrice',
      'latitude',
      'longitude',
      'radiusKm',
    ]);

    return Object.fromEntries(
      Object.entries(this.query)
        .filter(([, value]) => value !== '')
        .map(([key, value]) => [key, numericKeys.has(key) ? Number(value) : value]),
    );
  }

  private alertSignature(filters: Record<string, unknown>) {
    return JSON.stringify(
      Object.entries(filters)
        .filter(([, value]) => value !== '' && value !== undefined && value !== null)
        .sort(([left], [right]) => left.localeCompare(right)),
    );
  }
}
