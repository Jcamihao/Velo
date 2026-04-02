import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

type LeafletModule = typeof import('leaflet');
type LeafletLayerGroup = import('leaflet').LayerGroup;
type LeafletMap = import('leaflet').Map;

type VehicleMapMarker = {
  id: string;
  title: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
};

@Component({
  selector: 'app-vehicle-map',
  standalone: true,
  imports: [CommonModule],
  template: `<div #map class="vehicle-map"></div>`,
  styles: [
    `
      .vehicle-map {
        width: 100%;
        min-height: 320px;
        border-radius: 22px;
        overflow: hidden;
      }
    `,
  ],
})
export class VehicleMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('map') private mapRef?: ElementRef<HTMLDivElement>;

  @Input() markers: VehicleMapMarker[] = [];
  @Input() centerLatitude?: number | null;
  @Input() centerLongitude?: number | null;
  @Input() zoom = 12;

  private leaflet?: LeafletModule;
  private map?: LeafletMap;
  private markerLayer?: LeafletLayerGroup;
  private mapInitializationPromise: Promise<void> | null = null;
  private destroyed = false;

  async ngAfterViewInit() {
    await this.ensureMapReady();
    this.renderMarkers();
  }

  ngOnChanges(_changes: SimpleChanges) {
    this.renderMarkers();
  }

  ngOnDestroy() {
    this.destroyed = true;
    this.mapInitializationPromise = null;
    this.map?.remove();
    this.map = undefined;
    this.markerLayer = undefined;
    this.leaflet = undefined;
  }

  private renderMarkers() {
    if (!this.map || !this.markerLayer || !this.leaflet) {
      return;
    }

    const leaflet = this.leaflet;
    const markerLayer = this.markerLayer;

    markerLayer.clearLayers();

    const validMarkers = this.markers.filter(
      (marker) =>
        Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude),
    );

    validMarkers.forEach((marker) => {
      const leafletMarker = leaflet.marker([marker.latitude, marker.longitude], {
        icon: leaflet.divIcon({
          className: 'vehicle-map__marker',
          html: '<span style="display:block;width:14px;height:14px;border-radius:999px;background:#1f8cff;border:3px solid #fff;box-shadow:0 10px 20px rgba(31,140,255,.35);"></span>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      });

      leafletMarker.bindPopup(
        `<strong>${marker.title}</strong><br/>${marker.city}, ${marker.state}`,
      );

      markerLayer.addLayer(leafletMarker);
    });

    if (
      this.centerLatitude !== undefined &&
      this.centerLatitude !== null &&
      this.centerLongitude !== undefined &&
      this.centerLongitude !== null
    ) {
      this.map.setView(
        [this.centerLatitude, this.centerLongitude],
        this.zoom,
      );
      return;
    }

    if (validMarkers.length === 1) {
      this.map.setView(
        [validMarkers[0].latitude, validMarkers[0].longitude],
        this.zoom,
      );
      return;
    }

    if (validMarkers.length > 1) {
      const bounds = leaflet.latLngBounds(
        validMarkers.map((marker) => [marker.latitude, marker.longitude] as [number, number]),
      );
      this.map.fitBounds(bounds.pad(0.2));
      return;
    }

    this.map.setView([-23.55052, -46.633308], 10);
  }

  private async ensureMapReady() {
    if (this.map || !this.mapRef || this.destroyed) {
      return;
    }

    if (this.mapInitializationPromise) {
      await this.mapInitializationPromise;
      return;
    }

    this.mapInitializationPromise = this.initializeMap();
    await this.mapInitializationPromise;
  }

  private async initializeMap() {
    const leaflet = await import('leaflet');

    if (this.destroyed || !this.mapRef || this.map) {
      return;
    }

    this.leaflet = leaflet;
    this.map = leaflet.map(this.mapRef.nativeElement, {
      zoomControl: true,
      attributionControl: true,
    });

    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      })
      .addTo(this.map);

    this.markerLayer = leaflet.layerGroup();
    this.markerLayer.addTo(this.map);
  }
}
