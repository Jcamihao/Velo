import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { VehicleCardItem } from '../../core/models/domain.models';
import { CompareService } from '../../core/services/compare.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { WebHeaderComponent } from '../../shared/components/web-header/web-header.component';
import { VehicleCardComponent } from '../../shared/components/vehicle-card/vehicle-card.component';

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  imports: [CommonModule, RouterLink, VehicleCardComponent, WebHeaderComponent],
  templateUrl: './favorites-page.component.html',
  styleUrls: ['./favorites-page.component.scss'],
})
export class FavoritesPageComponent {
  protected readonly favoritesService = inject(FavoritesService);
  protected readonly compareService = inject(CompareService);
  protected readonly uiStateService = inject(UiStateService);
  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';
  protected sortMode: 'recent' | 'priceAsc' | 'priceDesc' = 'recent';

  protected toggleMenu() {
    this.uiStateService.toggleMenu();
  }

  constructor() {
    this.favoritesService.refresh();
  }

  protected get favoriteItems() {
    return this.favoritesService.items();
  }

  protected get sortedFavoriteItems() {
    const items = [...this.favoriteItems];

    if (this.sortMode === 'priceAsc') {
      return items.sort((a, b) => a.dailyRate - b.dailyRate);
    }

    if (this.sortMode === 'priceDesc') {
      return items.sort((a, b) => b.dailyRate - a.dailyRate);
    }

    return items;
  }

  protected get compareFavoritesCount() {
    return Math.min(this.favoriteItems.length, 4);
  }

  protected cycleSortMode() {
    const nextMode: Record<typeof this.sortMode, typeof this.sortMode> = {
      recent: 'priceAsc',
      priceAsc: 'priceDesc',
      priceDesc: 'recent',
    };

    this.sortMode = nextMode[this.sortMode];
  }

  protected sortLabel() {
    const labels: Record<typeof this.sortMode, string> = {
      recent: 'Ordenar',
      priceAsc: 'Menor preço',
      priceDesc: 'Maior preço',
    };

    return labels[this.sortMode];
  }

  protected compareFavorites() {
    const selected = this.favoriteItems.slice(0, 4);

    this.compareService.clear();
    selected.forEach((vehicle) => this.compareService.toggle(vehicle));
  }

  protected removeFavorite(vehicle: VehicleCardItem) {
    this.favoritesService.toggleFavorite(vehicle);
    if (this.compareService.isSelected(vehicle.id)) {
      this.compareService.remove(vehicle.id);
    }
  }

  protected trackById(_index: number, vehicle: VehicleCardItem) {
    return vehicle.id;
  }

  protected categoryLabel(vehicle: VehicleCardItem) {
    if (vehicle.vehicleType === 'MOTORCYCLE') {
      return 'Moto';
    }

    const labels: Record<string, string> = {
      ECONOMY: 'Econômico',
      HATCH: 'Hatch',
      SEDAN: 'Sedan',
      SUV: 'SUV',
      PICKUP: 'Pickup',
      VAN: 'Van',
      LUXURY: 'Premium',
    };

    return labels[vehicle.category] || vehicle.category;
  }

  protected transmissionLabel(transmission: string) {
    const labels: Record<string, string> = {
      AUTOMATIC: 'Automático',
      MANUAL: 'Manual',
      CVT: 'CVT',
    };

    return labels[transmission] || transmission;
  }

  protected fuelTypeLabel(fuelType: string) {
    const labels: Record<string, string> = {
      FLEX: 'Flex',
      GASOLINE: 'Gasolina',
      ETHANOL: 'Etanol',
      DIESEL: 'Diesel',
      ELECTRIC: 'Elétrico',
      HYBRID: 'Híbrido',
    };

    return labels[fuelType] || fuelType;
  }

  protected rangeLabel(vehicle: VehicleCardItem) {
    if (vehicle.fuelType === 'ELECTRIC') {
      return vehicle.vehicleType === 'MOTORCYCLE' ? 'Elétrica' : 'Elétrico';
    }

    if (vehicle.vehicleType === 'MOTORCYCLE' && vehicle.engineCc) {
      return `${vehicle.engineCc} cc`;
    }

    return vehicle.kmPolicy === 'FREE' ? 'Km livre' : '200 km/dia';
  }
}
