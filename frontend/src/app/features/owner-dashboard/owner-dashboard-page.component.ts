import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UiStateService } from '../../core/services/ui-state.service';
import { VehiclesApiService } from '../../core/services/vehicles-api.service';
import { VehicleCardComponent } from '../../shared/components/vehicle-card/vehicle-card.component';
import { OwnerDashboardListComponent } from './components/owner-dashboard-list.component';
import { VehicleWizardComponent } from './components/vehicle-wizard.component';
import {
  CreateVehiclePayload,
  FuelType,
  MotorcycleStyle,
  OwnerVehicleItem,
  TransmissionType,
  VehicleImage,
  VehicleCategory,
  VehicleType,
} from '../../core/models/domain.models';

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type PublicationChecklistItem = {
  title: string;
  description: string;
  done: boolean;
};

type OwnerViewMode = 'ads';

@Component({
  selector: 'app-owner-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    VehicleCardComponent,
    VehicleWizardComponent,
    OwnerDashboardListComponent,
  ],
  templateUrl: './owner-dashboard-page.component.html',
  styleUrls: ['./owner-dashboard-page.component.scss'],
})
export class OwnerDashboardPageComponent implements OnDestroy {
  protected readonly ownerContext = this;
  private readonly authService = inject(AuthService);
  protected readonly uiStateService = inject(UiStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly vehiclesApiService = inject(VehiclesApiService);
  private editingVehicleCacheSource: OwnerVehicleItem[] | null = null;
  private editingVehicleCacheId: string | null = null;
  private editingVehicleCache: OwnerVehicleItem | null = null;

  private publicationChecklistCacheKey = '';
  private publicationChecklistCache: PublicationChecklistItem[] = [];
  private publicationChecklistSummaryCacheSource:
    | PublicationChecklistItem[]
    | null = null;
  private publicationChecklistSummaryCache = {
    completed: 0,
    percentage: 0,
    suggestions: [] as string[],
  };

  protected readonly fallbackImage =
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80';
  protected readonly vehicleTypeOptions: SelectOption<VehicleType>[] = [
    { label: 'Carro', value: 'CAR' },
    { label: 'Moto', value: 'MOTORCYCLE' },
  ];
  protected readonly categoryOptions: SelectOption<VehicleCategory>[] = [
    { label: 'Econômico', value: 'ECONOMY' },
    { label: 'Hatch', value: 'HATCH' },
    { label: 'Sedan', value: 'SEDAN' },
    { label: 'SUV', value: 'SUV' },
    { label: 'Pickup', value: 'PICKUP' },
    { label: 'Van', value: 'VAN' },
    { label: 'Luxo', value: 'LUXURY' },
  ];
  protected readonly transmissionOptions: SelectOption<TransmissionType>[] = [
    { label: 'Manual', value: 'MANUAL' },
    { label: 'Automático', value: 'AUTOMATIC' },
    { label: 'CVT', value: 'CVT' },
  ];
  protected readonly fuelOptions: SelectOption<FuelType>[] = [
    { label: 'Flex', value: 'FLEX' },
    { label: 'Gasolina', value: 'GASOLINE' },
    { label: 'Etanol', value: 'ETHANOL' },
    { label: 'Diesel', value: 'DIESEL' },
    { label: 'Elétrico', value: 'ELECTRIC' },
    { label: 'Híbrido', value: 'HYBRID' },
  ];
  protected readonly motorcycleStyleOptions: SelectOption<MotorcycleStyle>[] = [
    { label: 'Scooter', value: 'SCOOTER' },
    { label: 'Street', value: 'STREET' },
    { label: 'Sport', value: 'SPORT' },
    { label: 'Trail', value: 'TRAIL' },
    { label: 'Custom', value: 'CUSTOM' },
    { label: 'Touring', value: 'TOURING' },
  ];
  protected vehicles: OwnerVehicleItem[] = [];
  protected loading = true;
  protected vehicleFeedback = '';
  protected vehicleError = '';
  protected mediaFeedback = '';
  protected mediaError = '';
  protected submittingVehicle = false;
  protected uploadingVehicleImages = false;
  protected currentStep = 1;
  protected vehicleActionId: string | null = null;
  protected imageActionId: string | null = null;
  protected editingVehicleId: string | null = null;
  protected createMode = false;
  protected readonly viewMode: OwnerViewMode = 'ads';
  protected pendingVehicleFiles: File[] = [];
  protected pendingVehiclePreviews: Array<{ name: string; url: string }> = [];
  protected vehicleDraft = this.createVehicleDraft();
  protected readonly photoSlots = Array.from(
    { length: 6 },
    (_, index) => index,
  );

  constructor() {
    this.createMode =
      this.isAdsView &&
      this.route.snapshot.queryParamMap.get('editor') === 'create';

    if (this.createMode) {
      this.vehicleDraft = this.createVehicleDraft();
    }

    this.loadData();
  }

  ngOnDestroy() {
    this.revokePendingPreviewUrls();
  }

  protected get ownerAvatarUrl() {
    return (
      this.authService.currentUser()?.profile?.avatarUrl || this.fallbackImage
    );
  }

  protected get totalAds() {
    return this.vehicles.length;
  }

  protected get totalViews() {
    return this.vehicles.reduce((acc, v) => acc + (v.viewsCount || 0), 0);
  }

  protected get totalViews30Days() {
    return this.vehicles.reduce((acc, v) => acc + (v.viewsLast30Days || 0), 0);
  }

  protected get ownerRating() {
    return 5.0; // Default rating for prototype.
  }

  protected get isEditingVehicle() {
    return !!this.editingVehicleId;
  }

  protected get isAdsView() {
    return this.viewMode === 'ads';
  }

  protected get showVehicleEditor() {
    return this.isAdsView && (this.isEditingVehicle || this.createMode);
  }

  protected get vehicleSubmitLabel() {
    if (this.uploadingVehicleImages) {
      return 'Enviando fotos...';
    }

    if (this.submittingVehicle) {
      return this.isEditingVehicle
        ? 'Salvando anúncio...'
        : 'Publicando anúncio...';
    }

    return this.isEditingVehicle ? 'Salvar alterações' : 'Publicar anúncio';
  }

  protected get stepProgressLabel() {
    return `${Math.round((this.currentStep / 3) * 100)}% Concluído`;
  }

  protected get stepProgressWidth() {
    return `${(this.currentStep / 3) * 100}%`;
  }

  protected get stepTitle() {
    if (this.currentStep === 1) {
      return 'Dados Principais';
    }

    if (this.currentStep === 2) {
      return 'Fotos e Preços';
    }

    return 'Condições do Veículo';
  }

  protected get cityStateValue() {
    const city = this.vehicleDraft.city?.trim();
    const state = this.vehicleDraft.state?.trim();

    return [city, state].filter(Boolean).join(city && state ? ', ' : '');
  }

  protected get selectedVehicleImages() {
    return [
      ...(this.editingVehicle?.images ?? []).map((image) => ({
        id: image.id,
        url: image.url,
        source: 'saved' as const,
      })),
      ...this.pendingVehiclePreviews.map((preview, index) => ({
        id: preview.url,
        url: preview.url,
        source: 'pending' as const,
        pendingIndex: index,
      })),
    ];
  }

  protected get primaryVehicleImageUrl() {
    return this.selectedVehicleImages[0]?.url || '';
  }

  protected get vehicleSummaryImageUrl() {
    return this.primaryVehicleImageUrl || this.fallbackImage;
  }

  protected get vehicleSummaryTitle() {
    return this.generatedVehicleTitle;
  }

  protected get vehicleSummarySubtitle() {
    return [
      this.transmissionLabel(this.vehicleDraft.transmission),
      this.fuelOptions.find(
        (option) => option.value === this.vehicleDraft.fuelType,
      )?.label,
      this.vehicleDraft.year || null,
    ]
      .filter(Boolean)
      .join(' • ');
  }

  protected updateCityState(value: string) {
    const [cityPart, statePart] = value.split(',').map((part) => part.trim());

    this.vehicleDraft.city = cityPart || '';
    this.vehicleDraft.state = (statePart || this.vehicleDraft.state || '')
      .slice(0, 2)
      .toUpperCase();
  }

  protected setVehicleType(vehicleType: VehicleType) {
    this.vehicleDraft.vehicleType = vehicleType;

    if (vehicleType !== 'MOTORCYCLE') {
      this.vehicleDraft.motorcycleStyle = undefined;
      this.vehicleDraft.engineCc = undefined;
      this.vehicleDraft.hasAbs = false;
      this.vehicleDraft.hasTopCase = false;
    }
  }

  protected setTransmission(transmission: TransmissionType) {
    this.vehicleDraft.transmission = transmission;
  }

  protected setFuelType(fuelType: FuelType) {
    this.vehicleDraft.fuelType = fuelType;
  }

  protected setSeats(seats: number) {
    this.vehicleDraft.seats = Math.min(9, Math.max(2, seats));
  }

  protected adjustSeats(delta: number) {
    this.setSeats(Number(this.vehicleDraft.seats || 5) + delta);
  }

  protected setKmPolicy(kmPolicy: 'FREE' | 'FIXED') {
    this.vehicleDraft.kmPolicy = kmPolicy;
  }

  protected setDetranStatus(status: 'OK' | 'ISSUES') {
    this.vehicleDraft.hasDetranIssues = status === 'ISSUES';
  }

  protected get detranStatus() {
    return this.vehicleDraft.hasDetranIssues ? 'ISSUES' : 'OK';
  }

  protected get selectedPhotoCount() {
    return (
      (this.editingVehicle?.images.length ?? 0) + this.pendingVehicleFiles.length
    );
  }

  protected get estimatedDraftMonthlyRevenue() {
    return Number(this.vehicleDraft.dailyRate || 0) * 20;
  }

  protected get generatedVehicleTitle() {
    return (
      this.vehicleDraft.title.trim() ||
      [
        this.vehicleDraft.brand.trim(),
        this.vehicleDraft.model.trim(),
        this.vehicleDraft.year || null,
      ]
        .filter(Boolean)
        .join(' ') ||
      'Seu veículo'
    );
  }

  protected photoSlotUrl(index: number) {
    return this.selectedVehicleImages[index + 1]?.url || '';
  }

  protected get editingVehicle() {
    if (
      this.editingVehicleCacheSource === this.vehicles &&
      this.editingVehicleCacheId === this.editingVehicleId
    ) {
      return this.editingVehicleCache;
    }

    this.editingVehicleCacheSource = this.vehicles;
    this.editingVehicleCacheId = this.editingVehicleId;
    this.editingVehicleCache =
      this.vehicles.find((vehicle) => vehicle.id === this.editingVehicleId) ??
      null;

    return this.editingVehicleCache;
  }

  protected get publicationChecklist() {
    const totalPhotos =
      (this.editingVehicle?.images.length ?? 0) +
      this.pendingVehicleFiles.length;
    const descriptionLength = this.vehicleDraft.description.trim().length;
    const hasPickupPoint = !!this.vehicleDraft.addressLine?.trim();
    const hasTitleContext =
      this.vehicleDraft.title.trim().length >= 12 &&
      !!this.vehicleDraft.brand.trim() &&
      !!this.vehicleDraft.model.trim();
    const checklistCacheKey = [
      totalPhotos,
      descriptionLength,
      hasPickupPoint ? 1 : 0,
      hasTitleContext ? 1 : 0,
      this.vehicleDraft.vehicleType,
      this.vehicleDraft.motorcycleStyle ?? '',
      this.vehicleDraft.engineCc ?? '',
    ].join('|');

    if (this.publicationChecklistCacheKey === checklistCacheKey) {
      return this.publicationChecklistCache;
    }

    this.publicationChecklistCacheKey = checklistCacheKey;
    this.publicationChecklistCache = [
      {
        title: 'Fotos do anúncio',
        description:
          totalPhotos >= 3
            ? `${totalPhotos} fotos prontas para publicar.`
            : 'Adicione pelo menos 3 fotos reais do veículo.',
        done: totalPhotos >= 3,
      },
      {
        title: 'Descrição completa',
        description:
          descriptionLength >= 80
            ? 'A descrição já responde as dúvidas principais.'
            : 'Explique diferenciais, retirada e condições básicas da negociação.',
        done: descriptionLength >= 80,
      },
      {
        title: 'Retirada definida',
        description: hasPickupPoint
          ? 'O endereço de retirada já está definido.'
          : 'Defina onde o carro pode ser retirado.',
        done: hasPickupPoint,
      },
      {
        title:
          this.vehicleDraft.vehicleType === 'MOTORCYCLE'
            ? 'Ficha da moto'
            : 'Título específico',
        description:
          this.vehicleDraft.vehicleType === 'MOTORCYCLE'
            ? this.vehicleDraft.motorcycleStyle && this.vehicleDraft.engineCc
              ? 'Estilo e cilindrada ajudam a filtrar melhor a moto.'
              : 'Informe estilo e cilindrada para melhorar a descoberta da moto.'
            : hasTitleContext
              ? 'Título claro com marca e modelo aumenta a confiança.'
              : 'Use um título mais específico com marca, modelo e diferencial.',
        done:
          this.vehicleDraft.vehicleType === 'MOTORCYCLE'
            ? !!this.vehicleDraft.motorcycleStyle &&
              !!this.vehicleDraft.engineCc
            : hasTitleContext,
      },
      {
        title: 'Preço definido',
        description:
          Number(this.vehicleDraft.weeklyRate) > 0
            ? 'O preço semanal já está pronto para publicação.'
            : 'Informe o preço por semana para publicar.',
        done: Number(this.vehicleDraft.weeklyRate) > 0,
      },
    ];

    return this.publicationChecklistCache;
  }

  protected get publicationChecklistCompleted() {
    return this.publicationChecklistSummary.completed;
  }

  protected get publicationReadinessPercentage() {
    return this.publicationChecklistSummary.percentage;
  }

  protected nextStep() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.currentStep = Math.min(3, this.currentStep + 1);
  }

  protected maxVisitedStep = 1;

  protected prevStep() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.currentStep = Math.max(1, this.currentStep - 1);
  }

  protected goToStep(step: number) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.currentStep = step;
    if (step > this.maxVisitedStep) {
      this.maxVisitedStep = step;
    }
  }

  protected checkStepCompletion(step: number): boolean {
    const d = this.vehicleDraft;
    if (step === 1) {
      return !!(
        d.plate?.trim() &&
        d.brand?.trim() &&
        d.model?.trim() &&
        Number(d.year)
      );
    }
    if (step === 2) {
      return !!(
        (this.editingVehicle?.images?.length ?? 0) +
          this.pendingVehicleFiles.length >
          0 &&
        Number(d.weeklyRate) > 0 &&
        d.city?.trim() &&
        d.state?.trim().length === 2 &&
        d.addressLine?.trim() &&
        d.description?.trim()
      );
    }
    if (step === 3) {
      const isMotoComplete =
        d.vehicleType === 'MOTORCYCLE'
          ? !!(d.motorcycleStyle && Number(d.engineCc))
          : true;
      return !!(
        d.mechanicsCondition?.trim() &&
        Number(d.seats) > 0 &&
        isMotoComplete
      );
    }
    return false;
  }

  protected getStepStatus(
    step: number,
  ): 'active' | 'completed' | 'warning' | 'pending' {
    if (this.currentStep === step) return 'active';

    const isComplete = this.checkStepCompletion(step);

    // Once visualizou or if it's a backward step, mark as warning if not complete
    if (
      !isComplete &&
      (step < this.currentStep || step < this.maxVisitedStep)
    ) {
      return 'warning';
    }

    return isComplete ? 'completed' : 'pending';
  }

  protected saveVehicle() {
    const payload = this.normalizeVehicleDraft();

    if (!payload) {
      const missingFields = this.collectMissingVehicleFields();
      this.vehicleError = missingFields.length
        ? `Preencha os campos obrigatórios: ${missingFields.join(', ')}.`
        : 'Preencha os campos obrigatórios do anúncio.';
      this.vehicleFeedback = '';
      return;
    }

    const wasEditing = this.isEditingVehicle;
    const successMessage = wasEditing
      ? 'Anúncio atualizado com sucesso.'
      : 'Anúncio criado com sucesso. Seu carro já pode receber contatos.';

    this.submittingVehicle = true;
    this.vehicleError = '';
    this.vehicleFeedback = '';
    this.mediaFeedback = '';
    this.mediaError = '';

    const isNewAd = !this.editingVehicleId;
    const request$ = this.editingVehicleId
      ? this.vehiclesApiService.update(this.editingVehicleId, payload)
      : this.vehiclesApiService.create(payload);

    request$.subscribe({
      next: (vehicle) => {
        const vehicleId = vehicle.id;
        const shouldRedirectToList = isNewAd && payload.isPublished;

        this.submittingVehicle = false;
        this.createMode = false;
        this.currentStep = 1;
        this.clearCreateIntent();

        if (shouldRedirectToList) {
          this.editingVehicleId = null;
        } else {
          this.editingVehicleId = vehicleId;
          this.vehicleDraft = {
            ...payload,
            addressLine: payload.addressLine || '',
            isPublished: payload.isPublished ?? true,
          };
        }

        if (this.pendingVehicleFiles.length > 0) {
          this.uploadPendingVehicleFiles(
            vehicleId,
            successMessage,
            shouldRedirectToList ? undefined : vehicleId,
          );
          return;
        }

        this.vehicleFeedback = successMessage;
        this.loadData(shouldRedirectToList ? undefined : vehicleId);
      },
      error: (error) => {
        this.submittingVehicle = false;
        this.vehicleFeedback = '';
        this.vehicleError =
          error?.error?.message || 'Não foi possível publicar o anúncio agora.';
      },
    });
  }

  protected startEditingVehicle(vehicle: OwnerVehicleItem) {
    this.createMode = false;
    this.currentStep = 1;
    this.clearCreateIntent();
    this.editingVehicleId = vehicle.id;
    this.vehicleDraft = {
      title: vehicle.title,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      plate: vehicle.plate,
      city: vehicle.city,
      state: vehicle.state,
      vehicleType: vehicle.vehicleType || 'CAR',
      category: vehicle.category,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      seats: vehicle.seats,
      dailyRate: vehicle.dailyRate,
      weeklyRate: vehicle.weeklyRate || vehicle.dailyRate * 7,
      kmPolicy: vehicle.kmPolicy || 'FREE',
      motorcycleStyle: vehicle.motorcycleStyle || undefined,
      engineCc: vehicle.engineCc || undefined,
      hasAbs: !!vehicle.hasAbs,
      hasTopCase: !!vehicle.hasTopCase,
      hasInsurance: !!vehicle.hasInsurance,
      mechanicsCondition: vehicle.mechanicsCondition || '',
      hasDetranIssues: !!vehicle.hasDetranIssues,
      trunkSize: vehicle.trunkSize || undefined,
      description: vehicle.description,
      addressLine: vehicle.addressLine || '',
      isPublished: vehicle.isPublished,
    };
    this.clearPendingVehicleFiles();
    this.vehicleFeedback = '';
    this.vehicleError = '';
    this.mediaFeedback = '';
    this.mediaError = '';
  }

  protected cancelEditingVehicle() {
    this.createMode = false;
    this.currentStep = 1;
    this.editingVehicleId = null;
    this.vehicleDraft = this.createVehicleDraft();
    this.clearPendingVehicleFiles();
    this.vehicleFeedback = '';
    this.vehicleError = '';
    this.mediaFeedback = '';
    this.mediaError = '';
    this.clearCreateIntent();
  }

  protected goToCreateView() {
    if (this.isAdsView) {
      this.createMode = true;
      this.currentStep = 1;
      this.editingVehicleId = null;
      this.vehicleDraft = this.createVehicleDraft();
      this.clearPendingVehicleFiles();
      this.vehicleFeedback = '';
      this.vehicleError = '';
      this.mediaFeedback = '';
      this.mediaError = '';
    }

    this.router.navigate(['/anunciar-carro'], {
      queryParams: { editor: 'create' },
    });
  }

  protected onVehicleFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files ?? []);

    if (!selectedFiles.length) {
      return;
    }

    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith('image/'),
    );
    const exceededLimit =
      this.pendingVehicleFiles.length + imageFiles.length > 7;
    const limitedFiles = [...this.pendingVehicleFiles, ...imageFiles].slice(
      0,
      7,
    );

    this.setPendingVehicleFiles(limitedFiles);
    this.mediaError =
      imageFiles.length !== selectedFiles.length
        ? 'Somente arquivos de imagem podem ser enviados.'
        : exceededLimit
          ? 'Você pode enviar até 7 novas fotos por vez.'
          : '';
    this.mediaFeedback = `${this.pendingVehicleFiles.length} foto(s) pronta(s) para envio.`;
    input.value = '';
  }

  protected removePendingVehicleFile(index: number) {
    const nextFiles = this.pendingVehicleFiles.filter(
      (_, fileIndex) => fileIndex !== index,
    );
    this.setPendingVehicleFiles(nextFiles);
    this.mediaFeedback = nextFiles.length
      ? `${nextFiles.length} foto(s) pronta(s) para envio.`
      : '';
  }

  protected removeVehicleImage(image: VehicleImage) {
    if (!this.editingVehicleId) {
      return;
    }

    const vehicleId = this.editingVehicleId;

    this.imageActionId = image.id;
    this.mediaError = '';

    this.vehiclesApiService.removeImage(vehicleId, image.id).subscribe({
      next: () => {
        this.imageActionId = null;
        this.mediaFeedback = 'Foto removida do anúncio.';
        this.loadData(vehicleId);
      },
      error: (error) => {
        this.imageActionId = null;
        this.mediaFeedback = '';
        this.mediaError =
          error?.error?.message || 'Não foi possível remover esta foto agora.';
      },
    });
  }

  protected toggleVehiclePublication(vehicle: OwnerVehicleItem) {
    const nextPublishedState = !vehicle.isPublished;

    this.vehicleActionId = vehicle.id;
    this.vehicleError = '';

    this.vehiclesApiService
      .update(vehicle.id, { isPublished: nextPublishedState })
      .subscribe({
        next: () => {
          this.vehicleActionId = null;
          this.vehicleFeedback = nextPublishedState
            ? 'Anúncio publicado com sucesso.'
            : 'Anúncio movido para rascunho.';

          if (this.editingVehicleId === vehicle.id) {
            this.vehicleDraft.isPublished = nextPublishedState;
          }

          this.loadData(vehicle.id);
        },
        error: (error) => {
          this.vehicleActionId = null;
          this.vehicleFeedback = '';
          this.vehicleError =
            error?.error?.message ||
            'Não foi possível alterar a publicação do anúncio.';
        },
      });
  }

  protected deactivateVehicle(vehicle: OwnerVehicleItem) {
    if (!globalThis.confirm(`Deseja desativar o anúncio "${vehicle.title}"?`)) {
      return;
    }

    this.vehicleActionId = vehicle.id;
    this.vehicleError = '';

    this.vehiclesApiService.remove(vehicle.id).subscribe({
      next: () => {
        this.vehicleActionId = null;

        if (this.editingVehicleId === vehicle.id) {
          this.cancelEditingVehicle();
        }

        this.vehicleFeedback = 'Anúncio desativado com sucesso.';
        this.loadData();
      },
      error: (error) => {
        this.vehicleActionId = null;
        this.vehicleFeedback = '';
        this.vehicleError =
          error?.error?.message ||
          'Não foi possível desativar o anúncio agora.';
      },
    });
  }

  protected categoryLabel(category: VehicleCategory) {
    return (
      this.categoryOptions.find((option) => option.value === category)?.label ??
      category
    );
  }

  protected vehicleTypeLabel(vehicleType: VehicleType) {
    return (
      this.vehicleTypeOptions.find((option) => option.value === vehicleType)
        ?.label ?? vehicleType
    );
  }

  protected transmissionLabel(transmission: TransmissionType) {
    return (
      this.transmissionOptions.find((option) => option.value === transmission)
        ?.label ?? transmission
    );
  }

  protected trackById(_index: number, item: { id: string }) {
    return item.id;
  }

  protected vehicleViewsLabel(vehicle: OwnerVehicleItem) {
    const viewsCount = vehicle.viewsCount ?? 0;
    return viewsCount === 1 ? '1 visualização' : `${viewsCount} visualizações`;
  }

  protected vehicleRecentViewsLabel(vehicle: OwnerVehicleItem) {
    const viewsCount = vehicle.viewsLast30Days ?? 0;
    return viewsCount === 1
      ? '1 nos últimos 30 dias'
      : `${viewsCount} nos últimos 30 dias`;
  }

  protected trackByString(_index: number, value: string) {
    return value;
  }

  protected trackByIndex(index: number) {
    return index;
  }

  protected trackByChecklistTitle(
    _index: number,
    item: PublicationChecklistItem,
  ) {
    return item.title;
  }

  protected trackByPreview(
    _index: number,
    item: { name: string; url: string },
  ) {
    return item.url;
  }

  private uploadPendingVehicleFiles(
    vehicleId: string,
    successMessage: string,
    focusVehicleId?: string,
  ) {
    this.uploadingVehicleImages = true;
    this.mediaError = '';

    this.vehiclesApiService
      .uploadImages(vehicleId, this.pendingVehicleFiles)
      .subscribe({
        next: () => {
          this.uploadingVehicleImages = false;
          this.vehicleFeedback = successMessage;
          this.mediaFeedback = 'Fotos enviadas com sucesso.';
          this.clearPendingVehicleFiles();
          this.loadData(focusVehicleId);
        },
        error: (error) => {
          this.uploadingVehicleImages = false;
          this.vehicleFeedback = successMessage;
          this.mediaFeedback = '';
          this.mediaError =
            error?.error?.message ||
            'O anúncio foi salvo, mas as fotos não puderam ser enviadas agora.';
          this.loadData(focusVehicleId);
        },
      });
  }

  private setPendingVehicleFiles(files: File[]) {
    this.revokePendingPreviewUrls();
    this.pendingVehicleFiles = files;
    this.pendingVehiclePreviews = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }

  private clearPendingVehicleFiles() {
    this.setPendingVehicleFiles([]);
  }

  private revokePendingPreviewUrls() {
    this.pendingVehiclePreviews.forEach((preview) =>
      URL.revokeObjectURL(preview.url),
    );
  }

  private loadData(focusVehicleId?: string) {
    this.loading = true;
    this.vehiclesApiService.getMine().subscribe({
      next: (vehicles) => {
        this.vehicles = vehicles;

        if (
          this.editingVehicleId &&
          !this.vehicles.some((vehicle) => vehicle.id === this.editingVehicleId)
        ) {
          this.cancelEditingVehicle();
        }

        if (
          focusVehicleId &&
          !this.editingVehicleId &&
          this.vehicles.some((vehicle) => vehicle.id === focusVehicleId)
        ) {
          this.editingVehicleId = focusVehicleId;
        }

        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private clearCreateIntent() {
    if (!this.route.snapshot.queryParamMap.has('editor')) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { editor: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private createVehicleDraft(): CreateVehiclePayload {
    const profile = this.authService.currentUser()?.profile;

    return {
      title: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      plate: '',
      city: profile?.city || '',
      state: profile?.state || '',
      vehicleType: 'CAR',
      category: 'HATCH',
      transmission: 'AUTOMATIC',
      fuelType: 'FLEX',
      seats: 5,
      dailyRate: 150,
      weeklyRate: 1050,
      kmPolicy: 'FREE',
      motorcycleStyle: undefined,
      engineCc: undefined,
      hasAbs: false,
      hasTopCase: false,
      hasInsurance: false,
      mechanicsCondition: '',
      hasDetranIssues: false,
      trunkSize: undefined,
      description: '',
      addressLine: profile?.addressLine || '',
      isPublished: true,
    };
  }

  private normalizeVehicleDraft(): CreateVehiclePayload | null {
    const payload: CreateVehiclePayload = {
      ...this.vehicleDraft,
      brand: this.vehicleDraft.brand.trim(),
      model: this.vehicleDraft.model.trim(),
      plate: this.vehicleDraft.plate.trim().toUpperCase(),
      city: this.vehicleDraft.city.trim(),
      state: this.vehicleDraft.state.trim().toUpperCase(),
      description: this.vehicleDraft.description.trim(),
      addressLine: this.vehicleDraft.addressLine?.trim() || '',
      year: Number(this.vehicleDraft.year),
      seats: Number(this.vehicleDraft.seats),
      dailyRate: Number(this.vehicleDraft.dailyRate),
      weeklyRate: Number(this.vehicleDraft.weeklyRate),
      kmPolicy: this.vehicleDraft.kmPolicy || 'FREE',
      hasInsurance: !!this.vehicleDraft.hasInsurance,
      mechanicsCondition: this.vehicleDraft.mechanicsCondition?.trim() || '',
      hasDetranIssues: !!this.vehicleDraft.hasDetranIssues,
      trunkSize: this.parseOptionalNumber(this.vehicleDraft.trunkSize),
      engineCc: this.parseOptionalNumber(this.vehicleDraft.engineCc),
    };

    payload.title =
      this.vehicleDraft.title.trim() ||
      [payload.brand, payload.model, payload.year].filter(Boolean).join(' ');

    if (
      !payload.title ||
      !payload.brand ||
      !payload.model ||
      !payload.plate ||
      !payload.city ||
      payload.state.length !== 2 ||
      !payload.addressLine ||
      !payload.description ||
      Number.isNaN(payload.year) ||
      Number.isNaN(payload.seats) ||
      Number.isNaN(payload.weeklyRate) ||
      (payload.trunkSize !== undefined && Number.isNaN(payload.trunkSize)) ||
      (payload.engineCc !== undefined && Number.isNaN(payload.engineCc))
    ) {
      return null;
    }

    return payload;
  }

  private parseOptionalNumber(value: number | null | undefined) {
    if (value === undefined || value === null) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private collectMissingVehicleFields() {
    const missingFields: string[] = [];

    if (!this.vehicleDraft.plate.trim()) {
      missingFields.push('placa');
    }

    if (!this.vehicleDraft.brand.trim()) {
      missingFields.push('marca');
    }

    if (!this.vehicleDraft.model.trim()) {
      missingFields.push('modelo');
    }

    if (!Number(this.vehicleDraft.year)) {
      missingFields.push('ano');
    }

    if (!this.vehicleDraft.city.trim()) {
      missingFields.push('cidade');
    }

    if (this.vehicleDraft.state.trim().length !== 2) {
      missingFields.push('estado');
    }

    if (!this.vehicleDraft.addressLine?.trim()) {
      missingFields.push('endereço de retirada');
    }

    if (!Number(this.vehicleDraft.seats)) {
      missingFields.push('assentos');
    }

    if (!Number(this.vehicleDraft.weeklyRate)) {
      missingFields.push('preço por semana');
    }

    if (!this.vehicleDraft.description.trim()) {
      missingFields.push('descrição');
    }

    return missingFields;
  }

  private get publicationChecklistSummary() {
    const checklist = this.publicationChecklist;

    if (this.publicationChecklistSummaryCacheSource === checklist) {
      return this.publicationChecklistSummaryCache;
    }

    const completed = checklist.filter((item) => item.done).length;

    this.publicationChecklistSummaryCacheSource = checklist;
    this.publicationChecklistSummaryCache = {
      completed,
      percentage: Math.round((completed / Math.max(checklist.length, 1)) * 100),
      suggestions: checklist
        .filter((item) => !item.done)
        .map((item) => item.description)
        .slice(0, 3),
    };

    return this.publicationChecklistSummaryCache;
  }
}
