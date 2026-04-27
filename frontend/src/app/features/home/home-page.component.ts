import { CommonModule, DecimalPipe } from '@angular/common';
import {
  Component,
  inject,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';
import { VehicleCardItem } from '../../core/models/domain.models';
import { VehicleCardComponent } from '../../shared/components/vehicle-card/vehicle-card.component';

type QuickShortcut = {
  label: string;
  icon: string;
  filterValue: string;
};

type CategoryCard = {
  label: string;
  value: string;
  image: string;
};

const QUICK_SHORTCUTS: QuickShortcut[] = [
  { label: 'Carros', icon: 'directions_car', filterValue: 'CAR' },
  { label: 'Motos', icon: 'two_wheeler', filterValue: 'MOTORCYCLE' },
  { label: 'Híbridos', icon: 'eco', filterValue: 'HYBRID' },
  { label: 'SUVs', icon: 'airport_shuttle', filterValue: 'SUV' },
  { label: 'Luxo', icon: 'workspace_premium', filterValue: 'LUXURY' },
];

const FEATURED_CATEGORY_CARDS: CategoryCard[] = [
  {
    label: 'Luxo & Executivos',
    value: 'LUXURY',
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=300&fit=crop',
  },
  {
    label: 'Econômicos',
    value: 'ECONOMY',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0afa?w=400&h=300&fit=crop',
  },
  {
    label: 'Para Viagem',
    value: 'TRAVEL',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop',
  },
  {
    label: 'Clássicos',
    value: 'CLASSIC',
    image: 'https://images.unsplash.com/photo-1514316454349-750a7fd3da3a?w=400&h=300&fit=crop',
  },
];

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, DecimalPipe, VehicleCardComponent],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss'],
})
export class HomePageComponent {
  private readonly router = inject(Router);
  private readonly vehiclesApiService = inject(VehiclesApiService);

  protected readonly quickShortcuts = QUICK_SHORTCUTS;
  protected readonly featuredCategoryCards = FEATURED_CATEGORY_CARDS;
  protected carouselAds: VehicleCardItem[] = [];
  protected carouselLoading = true;

  protected carList: VehicleCardItem[] = [];
  protected carsLoading = true;
  protected hasMoreCars = true;
  private currentPage = 1;

  constructor() {
    this.loadCarouselAds();
    this.loadMoreCars();
  }

  protected goToSearch(params: Record<string, string | undefined>) {
    this.router.navigate(['/search'], {
      queryParams: params,
    });
  }

  protected trackByVehicleId(_index: number, vehicle: VehicleCardItem) {
    return vehicle.id;
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

  protected loadMoreCars() {
    if (!this.hasMoreCars) return;
    this.carsLoading = true;
    this.vehiclesApiService.search({ page: this.currentPage, limit: 12 }).subscribe({
      next: (response) => {
        this.carList = [...this.carList, ...response.items];
        this.hasMoreCars = response.meta.hasNextPage;
        this.currentPage++;
        this.carsLoading = false;
      },
      error: () => {
        this.carsLoading = false;
      },
    });
  }
}
