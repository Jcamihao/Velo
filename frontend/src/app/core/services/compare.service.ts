import { computed, Injectable, signal } from '@angular/core';
import { VehicleCardItem } from '../models/domain.models';

type CompareToggleResult =
  | { status: 'added' }
  | { status: 'removed' }
  | { status: 'full' };

@Injectable({ providedIn: 'root' })
export class CompareService {
  private readonly storageKey = 'triluga.compare.vehicles';
  private readonly maxItems = 4;
  private readonly itemsState = signal<VehicleCardItem[]>(this.restoreItems());

  readonly items = this.itemsState.asReadonly();
  readonly count = computed(() => this.itemsState().length);
  readonly canCompare = computed(() => this.count() >= 2);

  isSelected(vehicleId: string) {
    return this.itemsState().some((vehicle) => vehicle.id === vehicleId);
  }

  isFull() {
    return this.count() >= this.maxItems;
  }

  toggle(vehicle: VehicleCardItem): CompareToggleResult {
    if (this.isSelected(vehicle.id)) {
      this.remove(vehicle.id);
      return { status: 'removed' };
    }

    if (this.isFull()) {
      return { status: 'full' };
    }

    this.itemsState.update((items) => [...items, vehicle]);
    this.persistItems();
    return { status: 'added' };
  }

  remove(vehicleId: string) {
    this.itemsState.update((items) =>
      items.filter((vehicle) => vehicle.id !== vehicleId),
    );
    this.persistItems();
  }

  clear() {
    this.itemsState.set([]);
    this.persistItems();
  }

  private restoreItems() {
    try {
      const serialized = globalThis.localStorage?.getItem(this.storageKey);

      if (!serialized) {
        return [];
      }

      const parsed = JSON.parse(serialized);
      return Array.isArray(parsed) ? (parsed as VehicleCardItem[]) : [];
    } catch {
      return [];
    }
  }

  private persistItems() {
    try {
      globalThis.localStorage?.setItem(
        this.storageKey,
        JSON.stringify(this.itemsState()),
      );
    } catch {
      return;
    }
  }
}
