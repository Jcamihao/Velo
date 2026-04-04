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
import { CompareService } from '../../core/services/compare.service';
import { SearchAlertsApiService } from '../../core/services/search-alerts-api.service';
import { FilterModalComponent } from '../../shared/components/filter-modal.component';
import { SearchHeaderComponent } from '../../shared/components/search-header.component';
import { VehicleMapComponent } from '../../shared/components/vehicle-map.component';
import { SearchAlert, VehicleCardItem, VehicleType } from '../../core/models/domain.models';
import { FavoritesService } from '../../core/services/favorites.service';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';
import { VehicleCardComponent } from '../../shared/components/vehicle-card.component';

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
    VehicleCardComponent,
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

      <section class="search-page__summary">
        <div class="search-page__summary-copy">
          <span class="search-page__eyebrow">Buscar</span>
          <h2>{{ searchOverviewTitle }}</h2>
          <p>{{ searchOverviewSubtitle }}</p>
        </div>

        <div class="search-page__summary-meta">
          <strong>{{ totalItems || vehicles.length || '--' }}</strong>
          <span>{{ totalItems === 1 ? 'resultado encontrado' : 'resultados encontrados' }}</span>
        </div>

        <div class="search-page__summary-actions">
          <button type="button" class="btn btn-secondary" (click)="useCurrentLocation()">
            Usar minha posição
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
            {{ mapOpen ? 'Fechar mapa' : 'Abrir mapa' }}
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
                ? 'Radar salvo'
                : alertSaving
                  ? 'Salvando radar...'
                  : 'Salvar radar'
            }}
          </button>
        </div>

        <div class="search-page__summary-pills" *ngIf="activeSearchPills.length">
          <span *ngFor="let pill of activeSearchPills">{{ pill }}</span>
        </div>
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
          <app-vehicle-card
            *ngFor="let vehicle of vehicles"
            [vehicle]="vehicle"
          />
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
        gap: 18px;
        width: 100%;
        margin: 0 auto;
        padding: 18px 12px 132px;
      }

      .search-page__summary {
        display: grid;
        gap: 14px;
        padding: 20px 18px;
        border-radius: 24px;
        border: 1px solid rgba(70, 89, 83, 0.08);
        background: rgba(250, 253, 252, 0.96);
        box-shadow: var(--shadow-soft);
        color: var(--text-primary);
      }

      .search-page__summary-copy {
        display: grid;
        gap: 8px;
      }

      .search-page__eyebrow {
        display: inline-flex;
        width: fit-content;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(88, 181, 158, 0.1);
        color: #427a6d;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .search-page__summary-copy h2,
      .search-page__summary-copy p {
        margin: 0;
      }

      .search-page__summary-copy h2 {
        max-width: 16ch;
        font-size: 28px;
        line-height: 1;
        color: var(--text-primary);
      }

      .search-page__summary-copy p {
        max-width: 56ch;
        color: rgba(64, 84, 79, 0.76);
        line-height: 1.5;
      }

      .search-page__summary-meta {
        display: grid;
        gap: 2px;
      }

      .search-page__summary-meta strong {
        font-family: var(--font-display);
        font-size: 26px;
        letter-spacing: -0.04em;
        color: var(--primary);
      }

      .search-page__summary-meta span {
        color: rgba(80, 99, 93, 0.8);
        font-size: 13px;
      }

      .search-page__summary-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .search-page__summary-pills {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .search-page__summary-pills span {
        display: inline-flex;
        align-items: center;
        min-height: 32px;
        padding: 0 11px;
        border-radius: 999px;
        background: #f1f7f4;
        border: 1px solid rgba(70, 89, 83, 0.08);
        color: #4b6d65;
        font-size: 11px;
        font-weight: 600;
      }

      .search-page__section-head h2,
      .search-page__section-head span {
        margin: 0;
      }

      .search-page__section {
        display: grid;
        gap: 14px;
        padding: 18px;
        border-radius: 24px;
        background: rgba(250, 253, 252, 0.96);
        border: 1px solid rgba(70, 89, 83, 0.08);
        box-shadow: var(--shadow-soft);
      }

      .search-page__map-card {
        display: grid;
        gap: 12px;
        padding: 18px;
        border-radius: 24px;
        background: rgba(250, 253, 252, 0.96);
        border: 1px solid rgba(70, 89, 83, 0.08);
        box-shadow: var(--shadow-soft);
      }

      .search-page__alerts-card {
        display: grid;
        gap: 12px;
        padding: 18px;
        border-radius: 24px;
        background: rgba(250, 253, 252, 0.96);
        border: 1px solid rgba(70, 89, 83, 0.08);
        box-shadow: var(--shadow-soft);
      }

      .search-page__section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .search-page__section-head h2 {
        color: var(--text-primary);
        font-size: 24px;
        font-weight: 700;
      }

      .search-page__section-head span {
        color: var(--text-secondary);
        font-size: 12px;
      }

      .search-page__budget-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 16px;
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
        flex-wrap: wrap;
        padding: 14px;
        border-radius: 20px;
        background: #f3f8f6;
        border: 1px solid rgba(70, 89, 83, 0.08);
      }

      .search-page__alert-item strong,
      .search-page__alert-item p {
        margin: 0;
      }

      .empty-state,
      .loading {
        padding: 18px;
        border-radius: 24px;
        background: #f3f8f6;
        border: 1px solid rgba(70, 89, 83, 0.08);
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
        .search-page {
          padding: 20px 16px 132px;
        }

        .search-page__budget-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (min-width: 1080px) {
        .search-page {
          gap: 20px;
          padding: 28px 20px 56px;
        }

        .search-page__summary {
          padding: 24px;
        }

        .search-page__summary-copy h2 {
          font-size: 34px;
        }

        .search-page__section {
          padding: 24px;
          border-radius: 30px;
        }

        .search-page__budget-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

      }

    `,
  ],
})
export class SearchPageComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  private readonly compareService = inject(CompareService);
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

  protected isCompared(vehicleId: string) {
    return this.compareService.isSelected(vehicleId);
  }

  protected compareDisabled(vehicleId: string) {
    return !this.compareService.isSelected(vehicleId) && this.compareService.isFull();
  }

  protected toggleCompare(vehicle: VehicleCardItem, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.compareService.toggle(vehicle);
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

  protected get activeSearchPills() {
    const pills: string[] = [];

    if (this.query.q) {
      pills.push(`Termo: ${this.query.q}`);
    }

    if (this.query.city) {
      pills.push(`Cidade: ${this.query.city}`);
    }

    if (this.query.startDate && this.query.endDate) {
      pills.push(`Período: ${this.query.startDate} até ${this.query.endDate}`);
    }

    if (this.query.vehicleType === 'CAR') {
      pills.push('Categoria: carros');
    }

    if (this.query.vehicleType === 'MOTORCYCLE') {
      pills.push('Categoria: motos');
    }

    if (this.query.maxPrice) {
      pills.push(`Até R$ ${this.query.maxPrice}`);
    }

    if (this.hasLocationFilter) {
      pills.push(`Raio de ${this.query.radiusKm || '20'} km`);
    }

    return pills;
  }

  protected get searchOverviewTitle() {
    if (this.query.vehicleType === 'MOTORCYCLE') {
      return this.query.city ? `Motos em radar por ${this.query.city}` : 'Motos em radar';
    }

    if (this.query.vehicleType === 'CAR') {
      return this.query.city ? `Carros em radar por ${this.query.city}` : 'Carros em radar';
    }

    return this.query.city ? `Veículos com saída em ${this.query.city}` : 'Veículos com saída imediata';
  }

  protected get searchOverviewSubtitle() {
    if (this.hasLocationFilter) {
      return 'O mapa já está calibrado com seu raio atual. Ajuste a rota, salve um radar e acompanhe quando aparecer algo melhor com mais presença visual.';
    }

    return 'Combine termo, período, tipo de veículo e preço para transformar a busca em um recorte mais rápido, técnico e menos genérico.';
  }

  protected get searchTitle() {
    if (this.query.vehicleType === 'CAR') {
      return 'Buscar carros';
    }

    return this.query.vehicleType === 'MOTORCYCLE' ? 'Buscar motos' : 'Buscar veículos';
  }

  protected get searchSubtitle() {
    if (this.query.vehicleType === 'CAR') {
      return 'Escolha o modelo, ajuste o período e encontre carros com mais energia visual na sua faixa de preço.';
    }

    return this.query.vehicleType === 'MOTORCYCLE'
      ? 'Escolha o modelo, ajuste o período e encontre motos com presença urbana e recorte mais agressivo.'
      : 'Escolha o modelo, ajuste o período e filtre entre carros e motos com um radar mais afiado.';
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
