import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FilterModalComponent } from '../../shared/components/filter-modal/filter-modal.component';
import { VehicleCardItem, VehicleType } from '../../core/models/domain.models';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';
import { WebHeaderComponent } from '../../shared/components/web-header/web-header.component';

type SearchQuery = {
  q: string;
  city: string;
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
  imports: [CommonModule, RouterLink, FilterModalComponent, WebHeaderComponent],
  templateUrl: './search-page.component.html',
  styleUrls: ['./search-page.component.scss'],
})
export class SearchPageComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vehiclesApiService = inject(VehiclesApiService);

  private sentinelRef?: ElementRef<HTMLDivElement>;
  private sentinelObservationQueued = false;

  @ViewChild('sentinel')
  set sentinelElementRef(value: ElementRef<HTMLDivElement> | undefined) {
    this.sentinelRef = value;

    if (value) {
      this.observeSentinel();
    }
  }

  protected vehicles: VehicleCardItem[] = [];
  protected loading = false;
  protected hasNextPage = false;
  protected totalItems = 0;
  protected filtersOpen = false;
  protected query: SearchQuery = {
    q: '',
    city: '',
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
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.query = {
        q: params.get('q') || '',
        city: params.get('city') || '',
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

  protected showAllAds() {
    this.router.navigate(['/search'], {
      queryParams: {},
    });
  }

  protected browseCars() {
    this.router.navigate(['/search'], {
      queryParams: {
        ...this.query,
        vehicleType: 'CAR',
      },
    });
  }

  protected browseMotorcycles() {
    this.router.navigate(['/search'], {
      queryParams: {
        ...this.query,
        vehicleType: 'MOTORCYCLE',
      },
    });
  }

  protected goToPublish() {
    this.router.navigate(['/anunciar-carro']);
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
      this.sentinelObservationQueued = false;
      this.observer?.disconnect();
      this.observer?.observe(this.sentinelRef.nativeElement);
      return;
    }

    if (!this.sentinelObservationQueued) {
      this.sentinelObservationQueued = true;
      queueMicrotask(() => this.observeSentinel());
    }
  }

  protected get hasLocationFilter() {
    return !!this.query.latitude && !!this.query.longitude;
  }

  protected get activeSearchPills() {
    const pills: { key: string; label: string }[] = [];

    if (this.query.q) {
      pills.push({ key: 'q', label: `Termo: ${this.query.q}` });
    }

    if (this.query.city) {
      pills.push({ key: 'city', label: this.query.city });
    }

    if (this.query.vehicleType === 'CAR') {
      pills.push({ key: 'vehicleType', label: 'Carros' });
    }

    if (this.query.vehicleType === 'MOTORCYCLE') {
      pills.push({ key: 'vehicleType', label: 'Motos' });
    }

    if (this.query.maxPrice) {
      pills.push({ key: 'maxPrice', label: `Até R$ ${this.query.maxPrice}` });
    }

    if (this.hasLocationFilter) {
      pills.push({
        key: 'location',
        label: `Raio de ${this.query.radiusKm || '20'} km`,
      });
    }

    return pills;
  }

  protected removeFilter(key: string) {
    if (key === 'location') {
      this.clearLocationFilter();
      return;
    }

    this.router.navigate(['/search'], {
      queryParams: {
        ...this.query,
        [key]: '',
      },
    });
  }

  protected get searchOverviewTitle() {
    if (this.query.vehicleType === 'MOTORCYCLE') {
      return this.query.city
        ? `Motos em radar por ${this.query.city}`
        : 'Motos em radar';
    }

    if (this.query.vehicleType === 'CAR') {
      return this.query.city
        ? `Carros em radar por ${this.query.city}`
        : 'Carros em radar';
    }

    return this.query.city
      ? `Encontre seu carro ideal em ${this.query.city}`
      : 'Encontre seu carro ideal';
  }

  protected get webResultsTitle() {
    const city = this.query.city || 'São Paulo, SP';

    if (this.query.vehicleType === 'MOTORCYCLE') {
      return `Motos em ${city}`;
    }

    if (this.query.vehicleType === 'CAR') {
      return `Veículos em ${city}`;
    }

    return `Veículos em ${city}`;
  }

  protected get searchOverviewSubtitle() {
    if (this.hasLocationFilter) {
      return 'Use os filtros para encontrar anúncios perto de você e seguir direto para o contato com o anunciante.';
    }

    return 'Filtre por cidade, tipo de veículo e faixa de preço para encontrar seu carro ideal mais rápido.';
  }

  protected get searchTitle() {
    if (this.query.vehicleType === 'CAR') {
      return 'Buscar carros';
    }

    return this.query.vehicleType === 'MOTORCYCLE'
      ? 'Buscar motos'
      : 'Buscar veículos';
  }

  protected get searchSubtitle() {
    if (this.query.vehicleType === 'CAR') {
      return 'Filtre por modelo, cidade e preço para encontrar carros e seguir para o chat com quem anunciou.';
    }

    return this.query.vehicleType === 'MOTORCYCLE'
      ? 'Filtre por modelo, cidade e preço para encontrar motos e ir direto ao anúncio.'
      : 'Filtre por modelo, cidade e preço para encontrar seu carro ideal.';
  }

  protected get resultsLabel() {
    if (this.query.vehicleType === 'CAR') {
      return 'carros encontrados';
    }

    return this.query.vehicleType === 'MOTORCYCLE'
      ? 'motos encontradas'
      : 'veículos encontrados';
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
}
