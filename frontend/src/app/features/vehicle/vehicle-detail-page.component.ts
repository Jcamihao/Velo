import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalyticsTrackingService } from '../../core/services/analytics-tracking.service';
import { AppLoggerService } from '../../core/services/app-logger.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatApiService } from '../../core/services/chat-api.service';
import { ChatInboxService } from '../../core/services/chat-inbox.service';
import { CompareService } from '../../core/services/compare.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';
import { VehicleDetail } from '../../core/models/domain.models';
import { FixedActionButtonComponent } from '../../shared/components/fixed-action-button/fixed-action-button.component';
import { ImageGalleryComponent } from '../../shared/components/image-gallery/image-gallery.component';

type DetailFactItem = {
  icon: string;
  label: string;
  value: string;
};

type RatingDistributionItem = {
  stars: number;
  count: number;
  percentage: number;
};

type StarIcon = 'star' | 'star_half' | 'star_border';

@Component({
  selector: 'app-vehicle-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterLink,
    ImageGalleryComponent,
    FixedActionButtonComponent,
  ],
  templateUrl: './vehicle-detail-page.component.html',
  styleUrls: ['./vehicle-detail-page.component.scss'],
})
export class VehicleDetailPageComponent {
  protected readonly router = inject(Router);
  protected readonly fallbackAvatarImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Crect width='160' height='160' rx='40' fill='%23f3eeee'/%3E%3Ccircle cx='80' cy='60' r='24' fill='%23b7aaac'/%3E%3Cpath d='M40 128c7-22 24-34 40-34s33 12 40 34' fill='%23b7aaac'/%3E%3C/svg%3E";
  private readonly route = inject(ActivatedRoute);
  private readonly vehiclesApiService = inject(VehiclesApiService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);
  private readonly chatApiService = inject(ChatApiService);
  private readonly chatInboxService = inject(ChatInboxService);
  private readonly compareService = inject(CompareService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly analyticsTrackingService = inject(AnalyticsTrackingService);
  private readonly logger = inject(AppLoggerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly idleScheduler = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void) => number;
    }
  ).requestIdleCallback;
  private readonly emptyStarIcons = this.buildStarIcons(0);
  private readonly emptyRatingDistributionValue: RatingDistributionItem[] = [
    5, 4, 3, 2, 1,
  ].map((stars) => ({
    stars,
    count: 0,
    percentage: 0,
  }));
  private readonly reviewStarsCache = new Map<number, StarIcon[]>();
  private detailItemsCacheVehicle?: VehicleDetail;
  private detailItemsCache: DetailFactItem[] = [];
  private visibleDetailItemsCacheSource: DetailFactItem[] | null = null;
  private visibleDetailItemsCacheShowAll = false;
  private visibleDetailItemsCache: DetailFactItem[] = [];
  private reviewAnalyticsCacheVehicle?: VehicleDetail;
  private mapEmbedCacheKey = '';
  private mapEmbedCacheUrl: SafeResourceUrl | null = null;
  private reviewAnalyticsCache = {
    totalReviewCount: 0,
    displayRating: 0,
    recommendationPercentage: 0,
    ratingDistribution: this.emptyRatingDistributionValue,
    highlightedReviews: [] as VehicleDetail['reviews'],
    reviewHighlightSummary: '',
    averageRatingStars: this.emptyStarIcons,
  };

  protected vehicle?: VehicleDetail;
  protected readonly collapsedDetailCount = 6;
  protected showAllDetails = false;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const vehicleId = params.get('id');

      if (!vehicleId) {
        return;
      }

      this.vehiclesApiService.getById(vehicleId).subscribe((vehicle) => {
        this.vehicle = vehicle;
        this.analyticsTrackingService.trackVehicleView(
          vehicle.id,
          `${globalThis.location.pathname}${globalThis.location.search}`,
        );
        this.scheduleInboxWarmup();
      });
    });
  }

  protected get ctaLabel() {
    const user = this.authService.currentUser();

    if (!user) {
      return 'Entrar para conversar';
    }

    if (this.isOwnVehicle) {
      return 'Editar anúncio';
    }

    return 'Conversar';
  }

  protected get ctaIcon() {
    const user = this.authService.currentUser();

    if (!user) {
      return 'login';
    }

    if (this.isOwnVehicle) {
      return 'edit_square';
    }

    return 'chat_bubble';
  }

  protected get footerHelper() {
    if (this.isOwnVehicle) {
      return 'Edite fotos, preço e informações do seu anúncio';
    }

    if (this.showChatAction) {
      return 'Veja os detalhes e fale direto com o anunciante';
    }

    return 'Classificado publicado na Triluga';
  }

  protected get pickupTitle() {
    if (!this.vehicle) {
      return '';
    }

    return (
      this.vehicle.addressLine?.trim() ||
      `${this.vehicle.city}, ${this.vehicle.state}`
    );
  }

  protected get pickupSubtitle() {
    if (!this.vehicle) {
      return '';
    }

    return this.vehicle.addressLine?.trim()
      ? `${this.vehicle.city}, ${this.vehicle.state}`
      : 'Retirada combinada com o anunciante';
  }

  protected get detailItems() {
    if (!this.vehicle) {
      return [];
    }

    if (this.detailItemsCacheVehicle === this.vehicle) {
      return this.detailItemsCache;
    }

    const items: DetailFactItem[] = [
      {
        icon: 'category',
        label: 'Categoria',
        value: this.categoryLabel(this.vehicle.category),
      },
      {
        icon: 'directions_car',
        label: 'Modelo',
        value: this.vehicle.model,
      },
      {
        icon: 'workspace_premium',
        label: 'Marca',
        value: this.vehicle.brand,
      },
      {
        icon: 'event_seat',
        label: 'Capacidade',
        value: `${this.vehicle.seats} lugares`,
      },
      {
        icon: 'tune',
        label: 'Transmissão',
        value: this.transmissionLabel(this.vehicle.transmission).toUpperCase(),
      },
      {
        icon: 'local_gas_station',
        label: 'Combustível',
        value: this.fuelTypeLabel(this.vehicle.fuelType).toUpperCase(),
      },
      {
        icon: 'calendar_month',
        label: 'Ano',
        value: String(this.vehicle.year),
      },
      {
        icon: 'location_on',
        label: 'Localização',
        value: `${this.vehicle.city}, ${this.vehicle.state}`,
      },
    ];

    if (this.vehicle.vehicleType === 'MOTORCYCLE') {
      if (this.vehicle.motorcycleStyle) {
        items.push({
          icon: 'two_wheeler',
          label: 'Estilo',
          value: this.motorcycleStyleLabel(this.vehicle.motorcycleStyle),
        });
      }

      if (this.vehicle.engineCc) {
        items.push({
          icon: 'speed',
          label: 'Cilindrada',
          value: `${this.vehicle.engineCc} cc`,
        });
      }

      items.push({
        icon: 'verified',
        label: 'Freio ABS',
        value: this.vehicle.hasAbs ? 'Sim' : 'Não',
      });
    }

    this.detailItemsCacheVehicle = this.vehicle;
    this.detailItemsCache = items;

    return this.detailItemsCache;
  }

  protected get visibleDetailItems() {
    const detailItems = this.detailItems;

    if (
      this.visibleDetailItemsCacheSource === detailItems &&
      this.visibleDetailItemsCacheShowAll === this.showAllDetails
    ) {
      return this.visibleDetailItemsCache;
    }

    this.visibleDetailItemsCacheSource = detailItems;
    this.visibleDetailItemsCacheShowAll = this.showAllDetails;
    this.visibleDetailItemsCache = this.showAllDetails
      ? detailItems
      : detailItems.slice(0, this.collapsedDetailCount);

    return this.visibleDetailItemsCache;
  }

  protected get totalReviewCount() {
    return this.reviewAnalytics.totalReviewCount;
  }

  protected get displayRating() {
    return this.reviewAnalytics.displayRating;
  }

  protected get averageRatingStars() {
    return this.reviewAnalytics.averageRatingStars;
  }

  protected get emptyRatingStars() {
    return this.emptyStarIcons;
  }

  protected get recommendationPercentage() {
    return this.reviewAnalytics.recommendationPercentage;
  }

  protected get ratingDistribution() {
    return this.reviewAnalytics.ratingDistribution;
  }

  protected get emptyRatingDistribution() {
    return this.emptyRatingDistributionValue;
  }

  protected get highlightedReviews() {
    return this.reviewAnalytics.highlightedReviews;
  }

  protected get reviewHighlightSummary() {
    return this.reviewAnalytics.reviewHighlightSummary;
  }

  protected get ownerRatingLabel() {
    const reviewsCount = this.vehicle?.owner?.reviewsCount ?? 0;
    const ratingAverage = this.vehicle?.owner?.ratingAverage ?? 0;

    if (!reviewsCount) {
      return 'Ainda sem avaliações de usuário';
    }

    return `${ratingAverage.toFixed(1)} de média nas avaliações do usuário`;
  }

  protected toggleDetails() {
    this.showAllDetails = !this.showAllDetails;
  }

  protected transmissionLabel(transmission: string) {
    const labels: Record<string, string> = {
      AUTOMATIC: 'Auto',
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

  protected motorcycleStyleLabel(style: string) {
    const labels: Record<string, string> = {
      SCOOTER: 'Scooter',
      STREET: 'Street',
      SPORT: 'Sport',
      TRAIL: 'Trail',
      CUSTOM: 'Custom',
      TOURING: 'Touring',
    };

    return labels[style] || style;
  }

  protected get hasPreciseLocation() {
    return this.vehicleLatitude !== null && this.vehicleLongitude !== null;
  }

  protected get mapEmbedUrl(): SafeResourceUrl | null {
    const latitude = this.vehicleLatitude;
    const longitude = this.vehicleLongitude;

    if (latitude === null || longitude === null) {
      return null;
    }

    const cacheKey = `${latitude},${longitude}`;

    if (this.mapEmbedCacheKey === cacheKey) {
      return this.mapEmbedCacheUrl;
    }

    const latitudeDelta = 0.012;
    const longitudeDelta = 0.018;
    const url = new URL('https://www.openstreetmap.org/export/embed.html');

    url.searchParams.set(
      'bbox',
      [
        longitude - longitudeDelta,
        latitude - latitudeDelta,
        longitude + longitudeDelta,
        latitude + latitudeDelta,
      ].join(','),
    );
    url.searchParams.set('layer', 'mapnik');
    url.searchParams.set('marker', `${latitude},${longitude}`);

    this.mapEmbedCacheKey = cacheKey;
    this.mapEmbedCacheUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url.toString());

    return this.mapEmbedCacheUrl;
  }

  protected get mapLink() {
    const latitude = this.vehicleLatitude;
    const longitude = this.vehicleLongitude;

    if (latitude === null || longitude === null) {
      return 'https://www.openstreetmap.org';
    }

    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
  }

  protected categoryLabel(category: string) {
    const labels: Record<string, string> = {
      ECONOMY: 'Econômico',
      HATCH: 'Hatch',
      SEDAN: 'Sedan',
      SUV: 'SUV',
      PICKUP: 'Pickup',
      VAN: 'Van',
      LUXURY: 'Luxo',
    };

    return labels[category] || category;
  }

  protected reviewStars(rating: number) {
    const normalizedRating = Math.max(0, Math.min(5, rating));

    if (!this.reviewStarsCache.has(normalizedRating)) {
      this.reviewStarsCache.set(
        normalizedRating,
        this.buildStarIcons(normalizedRating),
      );
    }

    return this.reviewStarsCache.get(normalizedRating) ?? this.emptyStarIcons;
  }

  protected excerptReview(comment?: string | null, maxLength = 180) {
    const text = comment?.trim() || 'Sem comentário adicional.';

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength).trimEnd()}...`;
  }

  private buildStarIcons(rating: number): StarIcon[] {
    const normalizedRating = Math.max(0, Math.min(5, rating));
    const fullStars = Math.floor(normalizedRating);
    const hasHalfStar = normalizedRating - fullStars >= 0.5;

    return Array.from({ length: 5 }, (_, index) => {
      if (index < fullStars) {
        return 'star';
      }

      if (index === fullStars && hasHalfStar) {
        return 'star_half';
      }

      return 'star_border';
    });
  }

  private get vehicleLatitude() {
    return this.parseCoordinate(this.vehicle?.latitude, -90, 90);
  }

  private get vehicleLongitude() {
    return this.parseCoordinate(this.vehicle?.longitude, -180, 180);
  }

  private parseCoordinate(value: number | string | null | undefined, min: number, max: number) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const coordinate = Number(value);

    return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max
      ? coordinate
      : null;
  }

  protected handlePrimaryAction() {
    if (!this.vehicle) {
      return;
    }

    if (this.isOwnVehicle) {
      this.router.navigate(['/anunciar-carro']);
      return;
    }

    this.openChat();
  }

  protected get showChatAction() {
    const user = this.authService.currentUser();

    if (!this.vehicle) {
      return false;
    }

    if (!user) {
      return true;
    }

    return !this.isOwnVehicle;
  }

  protected get chatLabel() {
    return this.authService.currentUser()
      ? 'Conversar com o anunciante'
      : 'Entrar para conversar';
  }

  protected get footerChatLabel() {
    return undefined;
  }

  protected get footerChatUnreadCount() {
    if (!this.vehicle || !this.showChatAction) {
      return 0;
    }

    return (
      this.chatInboxService.findConversation(
        this.vehicle.id,
        this.vehicle.owner?.id ?? null,
      )?.unreadCount ?? 0
    );
  }

  protected openChat() {
    if (!this.vehicle) {
      return;
    }

    this.logger.info('vehicle-detail', 'open_chat_requested', {
      vehicleId: this.vehicle.id,
      ownerId: this.vehicle.owner?.id ?? null,
    });

    const user = this.authService.currentUser();

    if (!this.authService.hasSession()) {
      this.logger.warn('vehicle-detail', 'open_chat_requires_login', {
        vehicleId: this.vehicle.id,
      });
      this.router.navigate(['/auth/login']);
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.authService
        .restoreSession()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((authenticated) => {
          if (!authenticated) {
            this.router.navigate(['/auth/login']);
            return;
          }

          this.chatInboxService.ensureReady().subscribe();
          this.startChatFlow();
        });
      return;
    }

    this.startChatFlow();
  }

  private get isOwnVehicle() {
    const userId = this.authService.getSessionUserId();
    return !!userId && !!this.vehicle && this.vehicle.owner?.id === userId;
  }

  protected get isFavorite() {
    return !!this.vehicle && this.favoritesService.isFavorite(this.vehicle.id);
  }

  protected get isFavoritePending() {
    return !!this.vehicle && this.favoritesService.isPending(this.vehicle.id);
  }

  protected get isCompared() {
    return !!this.vehicle && this.compareService.isSelected(this.vehicle.id);
  }

  protected get compareDisabled() {
    return !this.isCompared && this.compareService.isFull();
  }

  protected toggleCompare() {
    if (!this.vehicle) {
      return;
    }

    this.compareService.toggle(this.vehicle);
  }

  protected toggleFavorite() {
    if (!this.vehicle) {
      return;
    }

    this.favoritesService.toggleFavorite(this.vehicle);
  }

  protected trackByIndex(index: number) {
    return index;
  }

  protected trackById(_index: number, item: { id: string }) {
    return item.id;
  }

  protected trackByStars(_index: number, item: { stars: number }) {
    return item.stars;
  }

  protected trackByDetailLabel(_index: number, item: DetailFactItem) {
    return item.label;
  }

  private startChatFlow() {
    if (!this.vehicle) {
      return;
    }

    const userId = this.authService.getSessionUserId();

    if (this.isOwnVehicle) {
      this.logger.warn('vehicle-detail', 'open_chat_blocked_own_vehicle', {
        vehicleId: this.vehicle.id,
        userId,
      });
      this.router.navigate(['/anunciar-carro']);
      return;
    }

    this.chatApiService
      .startVehicleConversation(this.vehicle.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversation) => {
          this.logger.info('vehicle-detail', 'open_chat_succeeded', {
            vehicleId: this.vehicle?.id ?? null,
            conversationId: conversation.id,
          });
          this.chatInboxService.refresh();
          this.router.navigate(['/chat', conversation.id]);
        },
        error: (error) => {
          this.logger.error('vehicle-detail', 'open_chat_failed', {
            vehicleId: this.vehicle?.id ?? null,
            message: error?.message ?? 'Erro desconhecido',
          });
        },
      });
  }

  private scheduleInboxWarmup() {
    if (!this.authService.hasSession()) {
      return;
    }

    if (this.idleScheduler) {
      this.idleScheduler(() => {
        this.chatInboxService.ensureReady().subscribe();
      });
      return;
    }

    globalThis.setTimeout(() => {
      this.chatInboxService.ensureReady().subscribe();
    }, 900);
  }

  private get reviewAnalytics() {
    if (!this.vehicle) {
      return {
        totalReviewCount: 0,
        displayRating: 0,
        recommendationPercentage: 0,
        ratingDistribution: this.emptyRatingDistributionValue,
        highlightedReviews: [] as VehicleDetail['reviews'],
        reviewHighlightSummary: '',
        averageRatingStars: this.emptyStarIcons,
      };
    }

    if (this.reviewAnalyticsCacheVehicle === this.vehicle) {
      return this.reviewAnalyticsCache;
    }

    const totalReviewCount =
      this.vehicle.reviewsCount || this.vehicle.reviews.length;
    const displayRating = this.vehicle.ratingAverage
      ? this.vehicle.ratingAverage
      : this.vehicle.reviews.length
        ? this.vehicle.reviews.reduce((sum, review) => sum + review.rating, 0) /
          this.vehicle.reviews.length
        : 0;
    const recommendationPercentage = this.vehicle.reviews.length
      ? Math.round(
          (this.vehicle.reviews.filter((review) => review.rating >= 4).length /
            this.vehicle.reviews.length) *
            100,
        )
      : Math.round((displayRating / 5) * 100);
    const ratingDistribution = this.vehicle.reviews.length
      ? [5, 4, 3, 2, 1].map((stars) => {
          const count = this.vehicle!.reviews.filter(
            (review) => review.rating === stars,
          ).length;
          return {
            stars,
            count,
            percentage: Math.round(
              (count / this.vehicle!.reviews.length) * 100,
            ),
          };
        })
      : this.emptyRatingDistributionValue;
    const highlightedReviews = [...this.vehicle.reviews]
      .filter((review) => review.comment?.trim())
      .sort((left, right) => {
        if (right.rating !== left.rating) {
          return right.rating - left.rating;
        }

        return (
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime()
        );
      })
      .slice(0, 2);
    const tone =
      recommendationPercentage >= 85
        ? 'muito positiva'
        : recommendationPercentage >= 65
          ? 'positiva'
          : 'mista';
    const topExcerpt = highlightedReviews[0]?.comment?.trim();
    const leadSnippet = topExcerpt
      ? `Destaque recorrente: ${this.excerptReview(topExcerpt, 120)}`
      : '';

    this.reviewAnalyticsCacheVehicle = this.vehicle;
    this.reviewAnalyticsCache = {
      totalReviewCount,
      displayRating,
      recommendationPercentage,
      ratingDistribution,
      highlightedReviews,
      reviewHighlightSummary: [
        `Com base nas avaliações recebidas, a percepção sobre este carro é ${tone}.`,
        `${recommendationPercentage}% das notas ficaram entre 4 e 5 estrelas.`,
        leadSnippet,
      ]
        .filter(Boolean)
        .join(' '),
      averageRatingStars: this.reviewStars(displayRating),
    };

    return this.reviewAnalyticsCache;
  }
}
