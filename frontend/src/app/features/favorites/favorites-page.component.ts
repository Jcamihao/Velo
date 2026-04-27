import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '../../core/services/favorites.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { VehicleCardComponent } from '../../shared/components/vehicle-card/vehicle-card.component';

@Component({
  selector: 'app-favorites-page',
  standalone: true,
  imports: [CommonModule, RouterLink, VehicleCardComponent],
  templateUrl: './favorites-page.component.html',
  styleUrls: ['./favorites-page.component.scss'],
})
export class FavoritesPageComponent {
  protected readonly favoritesService = inject(FavoritesService);
  protected readonly uiStateService = inject(UiStateService);

  protected toggleMenu() {
    this.uiStateService.toggleMenu();
  }

  constructor() {
    this.favoritesService.refresh();
  }

  protected get favoriteItems() {
    return this.favoritesService.items();
  }
}
