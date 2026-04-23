import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';
import { SearchHeaderComponent } from '../../shared/components/search-header/search-header.component';
import { VehicleCardComponent } from '../../shared/components/vehicle-card/vehicle-card.component';
import { VehicleCardItem, VehicleCategory } from '../../core/models/domain.models';

type CategoryShortcut = {
  label: string;
  value: VehicleCategory;
  icon: string;
};

const FEATURED_CATEGORIES: CategoryShortcut[] = [
  {
    label: 'Econômico',
    value: 'ECONOMY',
    icon: 'savings',
  },
  {
    label: 'Hatch',
    value: 'HATCH',
    icon: 'directions_car',
  },
  {
    label: 'Sedan',
    value: 'SEDAN',
    icon: 'airport_shuttle',
  },
  {
    label: 'SUV',
    value: 'SUV',
    icon: 'airport_shuttle',
  },
  {
    label: 'Pickup',
    value: 'PICKUP',
    icon: 'local_shipping',
  },
  {
    label: 'Van',
    value: 'VAN',
    icon: 'airport_shuttle',
  },
  {
    label: 'Luxo',
    value: 'LUXURY',
    icon: 'diamond',
  },
];

const MOBILE_CARS_BREAKPOINT = '(max-width: 767px)';
const MOBILE_CARS_INITIAL_LIMIT = 15;
const MOBILE_CARS_NEXT_LIMIT = 10;
const DESKTOP_CARS_PAGE_LIMIT = 9;

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, SearchHeaderComponent, VehicleCardComponent],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
})
export class HomePageComponent implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly vehiclesApiService = inject(VehiclesApiService);
  private readonly mobileCarsQuery =
    typeof window !== 'undefined'
      ? window.matchMedia(MOBILE_CARS_BREAKPOINT)
      : null;
  private carsObserver?: IntersectionObserver;
  private carsPage = 1;
  private readonly carsMediaQueryHandler = (event: MediaQueryListEvent) => {
    if (this.isMobileCarsView === event.matches) {
      return;
    }

    this.isMobileCarsView = event.matches;
    this.resetCarList();
    this.loadCarList();
  };

  @ViewChild('adsRail') adsRailRef?: ElementRef<HTMLDivElement>;
  @ViewChild('carsSentinel') carsSentinelRef?: ElementRef<HTMLDivElement>;

  protected readonly featuredCategories = FEATURED_CATEGORIES;
  protected carouselAds: VehicleCardItem[] = [];
  protected carList: VehicleCardItem[] = [];
  protected carsLoadingMore = false;
  protected carsPageLoading = false;
  protected carsHasNextPage = false;
  protected carsTotalItems = 0;
  protected isMobileCarsView = this.mobileCarsQuery?.matches ?? false;
  protected carouselLoading = true;
  protected carsLoading = true;

  constructor() {
    this.loadCarouselAds();
    this.loadCarList();
  }

  ngAfterViewInit() {
    this.carsObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (
          entry.isIntersecting &&
          this.isMobileCarsView &&
          this.carsHasNextPage &&
          !this.carsLoading &&
          !this.carsLoadingMore
        ) {
          this.carsPage += 1;
          this.loadCarList();
        }
      },
      {
        rootMargin: '200px',
      },
    );

    this.mobileCarsQuery?.addEventListener('change', this.carsMediaQueryHandler);

    queueMicrotask(() => this.observeCarsSentinel());
  }

  ngOnDestroy() {
    this.carsObserver?.disconnect();
    this.mobileCarsQuery?.removeEventListener('change', this.carsMediaQueryHandler);
  }

  protected goToSearch(params: Record<string, string | undefined>) {
    this.router.navigate(['/search'], {
      queryParams: params,
    });
  }

  protected goToHost() {
    this.router.navigateByUrl('/anunciar');
  }

  protected scrollAds(direction: -1 | 1) {
    const rail = this.adsRailRef?.nativeElement;

    if (!rail) {
      return;
    }

    rail.scrollBy({
      left: direction * Math.min(rail.clientWidth * 0.9, 760),
      behavior: 'smooth',
    });
  }

  protected trackByVehicleId(_index: number, vehicle: VehicleCardItem) {
    return vehicle.id;
  }

  protected get carListSummary() {
    return this.carsTotalItems
      ? `${this.carsTotalItems} carros disponíveis agora`
      : 'Carros disponíveis agora';
  }

  protected get showCarsInfiniteLoader() {
    return this.isMobileCarsView && this.carsHasNextPage;
  }

  protected get carsCurrentPage() {
    return this.carsPage;
  }

  protected get carsTotalPages() {
    if (this.isMobileCarsView || !this.carsTotalItems) {
      return 0;
    }

    return Math.ceil(this.carsTotalItems / DESKTOP_CARS_PAGE_LIMIT);
  }

  protected get desktopCarsPageNumbers() {
    return Array.from({ length: this.carsTotalPages }, (_value, index) => index + 1);
  }

  protected get showDesktopCarsPagination() {
    return !this.isMobileCarsView && this.carsTotalPages > 1;
  }

  protected changeCarsPage(page: number) {
    if (
      this.isMobileCarsView ||
      page === this.carsPage ||
      page < 1 ||
      page > this.carsTotalPages ||
      this.carsPageLoading
    ) {
      return;
    }

    this.carsPage = page;
    this.loadCarList();
  }

  private loadCarouselAds() {
    this.carouselLoading = true;
    this.vehiclesApiService.search({ limit: 12 }).subscribe({
      next: (response) => {
        this.carouselAds = response.items;
        this.carouselLoading = false;
      },
      error: () => {
        this.carouselAds = [];
        this.carouselLoading = false;
      },
    });
  }

  private loadCarList() {
    const isFirstPage = this.carsPage === 1;
    const limit = this.isMobileCarsView
      ? isFirstPage
        ? MOBILE_CARS_INITIAL_LIMIT
        : MOBILE_CARS_NEXT_LIMIT
      : DESKTOP_CARS_PAGE_LIMIT;

    if (this.isMobileCarsView && isFirstPage) {
      this.carsLoading = true;
      this.carsLoadingMore = false;
      this.carsPageLoading = false;
    } else if (this.isMobileCarsView) {
      this.carsLoadingMore = true;
      this.carsPageLoading = false;
    } else if (isFirstPage && !this.carList.length) {
      this.carsLoading = true;
      this.carsLoadingMore = false;
      this.carsPageLoading = false;
    } else {
      this.carsLoading = false;
      this.carsLoadingMore = false;
      this.carsPageLoading = true;
    }

    this.vehiclesApiService
      .search({
        page: this.carsPage,
        limit,
        vehicleType: 'CAR',
      })
      .subscribe({
        next: (response) => {
          this.carList = this.isMobileCarsView && !isFirstPage
            ? [...this.carList, ...response.items]
            : response.items;
          this.carsTotalItems = response.meta.total;
          this.carsHasNextPage = response.meta.hasNextPage;
          this.carsLoading = false;
          this.carsLoadingMore = false;
          this.carsPageLoading = false;
          this.observeCarsSentinel();
        },
        error: () => {
          if (isFirstPage) {
            this.carList = [];
            this.carsTotalItems = 0;
          }

          this.carsHasNextPage = false;
          this.carsLoading = false;
          this.carsLoadingMore = false;
          this.carsPageLoading = false;
        },
      });
  }

  private resetCarList() {
    this.carsPage = 1;
    this.carList = [];
    this.carsTotalItems = 0;
    this.carsHasNextPage = false;
    this.carsLoading = true;
    this.carsLoadingMore = false;
    this.carsPageLoading = false;
    this.observeCarsSentinel();
  }

  private observeCarsSentinel() {
    if (!this.carsObserver) {
      return;
    }

    this.carsObserver.disconnect();

    if (!this.isMobileCarsView || !this.carsHasNextPage) {
      return;
    }

    const sentinel = this.carsSentinelRef?.nativeElement;

    if (sentinel) {
      this.carsObserver.observe(sentinel);
    }
  }
}
