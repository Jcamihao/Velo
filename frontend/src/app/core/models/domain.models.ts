export type UserRole = 'ADMIN' | 'USER';
export type BookingStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'IN_PROGRESS'
  | 'COMPLETED';
export type PaymentMethod = 'CREDIT_CARD' | 'PIX' | 'BOLETO' | 'BANK_TRANSFER';
export type VehicleCategory =
  | 'ECONOMY'
  | 'HATCH'
  | 'SEDAN'
  | 'SUV'
  | 'PICKUP'
  | 'VAN'
  | 'LUXURY';
export type VehicleType = 'CAR' | 'MOTORCYCLE';
export type BookingApprovalMode = 'MANUAL' | 'INSTANT';
export type CancellationPolicy = 'FLEXIBLE' | 'MODERATE' | 'STRICT';
export type BookingChecklistType = 'PICKUP' | 'RETURN';
export type MotorcycleStyle =
  | 'SCOOTER'
  | 'STREET'
  | 'SPORT'
  | 'TRAIL'
  | 'CUSTOM'
  | 'TOURING';
export type FuelType =
  | 'GASOLINE'
  | 'ETHANOL'
  | 'FLEX'
  | 'DIESEL'
  | 'ELECTRIC'
  | 'HYBRID';
export type TransmissionType = 'MANUAL' | 'AUTOMATIC' | 'CVT';
export type VerificationStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';
export type PrivacyRequestType =
  | 'ACCESS'
  | 'PORTABILITY'
  | 'DELETION'
  | 'CORRECTION'
  | 'RESTRICTION'
  | 'OBJECTION'
  | 'ANONYMIZATION'
  | 'REVOCATION';
export type PrivacyRequestStatus =
  | 'OPEN'
  | 'IN_REVIEW'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export interface VehicleImage {
  id: string;
  url: string;
  alt?: string | null;
  position: number;
}

export interface Profile {
  id?: string;
  fullName: string;
  phone: string;
  zipCode?: string | null;
  addressLine?: string | null;
  addressComplement?: string | null;
  city: string;
  state: string;
  bio?: string | null;
  avatarUrl?: string | null;
  documentNumber?: string | null;
  driverLicenseNumber?: string | null;
  documentImageUrl?: string | null;
  driverLicenseImageUrl?: string | null;
  hasDocumentImage?: boolean;
  hasDriverLicenseImage?: boolean;
  documentVerificationStatus?: VerificationStatus;
  driverLicenseVerification?: VerificationStatus;
}

export interface VehicleAddon {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  enabled?: boolean;
}

export interface AppliedPromotion {
  code: 'FIRST_BOOKING' | 'WEEKLY_PACKAGE' | 'COUPON';
  label: string;
  amount: number;
}

export interface VehiclePricingPreview {
  vehicleId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  baseDailyRate: number;
  averageDailyRate: number;
  baseRentalAmount: number;
  adjustedRentalAmount: number;
  dynamicPricingAmount: number;
  adjustments: Array<{
    code: 'WEEKEND' | 'HOLIDAY' | 'HIGH_DEMAND' | 'ADVANCE';
    label: string;
    amount: number;
  }>;
  ruleSummary: {
    weekendSurchargePercent: number;
    holidaySurchargePercent: number;
    highDemandSurchargePercent: number;
    advanceBookingDiscountPercent: number;
    advanceBookingDaysThreshold: number;
  };
}

export interface SearchAlert {
  id: string;
  title?: string | null;
  filters: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  profile: Profile | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  analyticsConsentGranted?: boolean;
  analyticsConsentUpdatedAt?: string | null;
}

export interface PublicUserProfile {
  id: string;
  role: UserRole;
  memberSince: string;
  fullName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  ratingAverage: number;
  reviewsCount: number;
  activeListingsCount: number;
  trustMetrics: {
    completedBookingsCount: number;
    responseRate: number;
    averageResponseHours: number | null;
    approvalRate: number;
    cancellationRate: number;
  };
  reviews: UserReviewItem[];
  verification: {
    documentStatus: VerificationStatus;
    driverLicenseStatus: VerificationStatus;
    profileStatus: VerificationStatus;
  };
  vehicles: VehicleCardItem[];
}

export interface UserReviewItem {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  targetUserId?: string;
  author?: {
    id: string;
    fullName: string | null;
    avatarUrl?: string | null;
    city?: string | null;
    state?: string | null;
  };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface PrivacyRequestItem {
  id: string;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  notes?: string | null;
  resolutionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface PrivacyPolicySummary {
  version: string;
  contactEmail: string;
  sections: Array<{
    title: string;
    summary: string;
  }>;
}

export interface PrivacyPreferences {
  analyticsConsentGranted: boolean;
  analyticsConsentUpdatedAt?: string | null;
}

export interface PrivacyCenterOverview {
  policy: PrivacyPolicySummary;
  preferences: PrivacyPreferences;
  requests: PrivacyRequestItem[];
}

export interface VehicleCardItem {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  city: string;
  state: string;
  vehicleType: VehicleType;
  category: string;
  bookingApprovalMode: BookingApprovalMode;
  cancellationPolicy: CancellationPolicy;
  seats: number;
  transmission: string;
  fuelType: string;
  dailyRate: number;
  addons: VehicleAddon[];
  firstBookingDiscountPercent: number;
  weeklyDiscountPercent: number;
  couponCode?: string | null;
  couponDiscountPercent: number;
  weekendSurchargePercent: number;
  holidaySurchargePercent: number;
  highDemandSurchargePercent: number;
  advanceBookingDiscountPercent: number;
  advanceBookingDaysThreshold: number;
  motorcycleStyle?: MotorcycleStyle | null;
  engineCc?: number | null;
  hasAbs?: boolean | null;
  hasTopCase?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  ratingAverage: number;
  reviewsCount: number;
  coverImage: string | null;
  owner?: {
    id: string;
    fullName: string | null;
    avatarUrl?: string | null;
    city: string | null;
    state: string | null;
    ratingAverage?: number;
    reviewsCount?: number;
  };
}

export interface OwnerVehicleItem {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  city: string;
  state: string;
  vehicleType: VehicleType;
  category: VehicleCategory;
  bookingApprovalMode: BookingApprovalMode;
  cancellationPolicy: CancellationPolicy;
  transmission: TransmissionType;
  fuelType: FuelType;
  seats: number;
  dailyRate: number;
  addons: VehicleAddon[];
  firstBookingDiscountPercent: number;
  weeklyDiscountPercent: number;
  couponCode?: string | null;
  couponDiscountPercent: number;
  weekendSurchargePercent: number;
  holidaySurchargePercent: number;
  highDemandSurchargePercent: number;
  advanceBookingDiscountPercent: number;
  advanceBookingDaysThreshold: number;
  motorcycleStyle?: MotorcycleStyle | null;
  engineCc?: number | null;
  hasAbs?: boolean | null;
  hasTopCase?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  addressLine?: string | null;
  isActive: boolean;
  isPublished: boolean;
  ratingAverage: number;
  reviewsCount: number;
  coverImage: string | null;
  images: VehicleImage[];
}

export interface VehicleDetail extends VehicleCardItem {
  description: string;
  addressLine?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPublished: boolean;
  images: VehicleImage[];
  reviews: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
    author: {
      id: string;
      fullName: string | null;
    };
  }>;
}

export interface VehicleSearchResponse {
  items: VehicleCardItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
  };
}

export interface CreateVehiclePayload {
  title: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  city: string;
  state: string;
  vehicleType: VehicleType;
  category: VehicleCategory;
  bookingApprovalMode: BookingApprovalMode;
  cancellationPolicy: CancellationPolicy;
  transmission: TransmissionType;
  fuelType: FuelType;
  seats: number;
  dailyRate: number;
  addons: VehicleAddon[];
  firstBookingDiscountPercent: number;
  weeklyDiscountPercent: number;
  couponCode?: string | null;
  couponDiscountPercent: number;
  weekendSurchargePercent: number;
  holidaySurchargePercent: number;
  highDemandSurchargePercent: number;
  advanceBookingDiscountPercent: number;
  advanceBookingDaysThreshold: number;
  motorcycleStyle?: MotorcycleStyle | null;
  engineCc?: number | null;
  hasAbs?: boolean;
  hasTopCase?: boolean;
  description: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  isPublished?: boolean;
}

export type UpdateVehiclePayload = Partial<CreateVehiclePayload>;

export interface Booking {
  id: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate: number;
  subtotal: number;
  platformFee: number;
  totalAmount: number;
  addonsAmount: number;
  discountsAmount: number;
  couponCode?: string | null;
  selectedAddons: VehicleAddon[];
  appliedPromotions: AppliedPromotion[];
  notes?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  vehicle: {
    id: string;
    title: string;
    city: string;
    state: string;
    dailyRate: number;
    image: string | null;
  };
  renter: {
    id: string;
    email: string;
    fullName: string | null;
  };
  owner: {
    id: string;
    email: string;
    fullName: string | null;
  };
  payment?: {
    id: string;
    status: string;
    method: PaymentMethod;
    amount: number;
    ownerAmount: number;
    platformFee: number;
    transactionId: string;
  } | null;
  statusHistory: Array<{
    id: string;
    fromStatus?: BookingStatus | null;
    toStatus: BookingStatus;
    reason?: string | null;
    changedAt: string;
  }>;
  review?: unknown;
  userReview?: UserReviewItem | null;
  checklists: BookingChecklist[];
}

export interface BookingChecklist {
  id: string;
  type: BookingChecklistType;
  items: string[];
  notes?: string | null;
  completedAt?: string | null;
  updatedAt: string;
  updatedById?: string | null;
  photos: Array<{
    url: string;
    key?: string | null;
  }>;
}

export interface VehicleAvailabilityResponse {
  vehicleId: string;
  weeklyAvailability: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
  blockedDates: Array<{
    id: string;
    startDate: string;
    endDate: string;
    reason?: string | null;
  }>;
  approvedBookings: Array<{
    id: string;
    startDate: string;
    endDate: string;
    status: BookingStatus;
  }>;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatConversationItem {
  id: string;
  vehicle: {
    id: string;
    title: string;
    coverImage: string | null;
    city: string;
    state: string;
    dailyRate: number;
  };
  otherParticipant: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl?: string | null;
    isOnline: boolean;
  };
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
  lastMessageAt?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl?: string | null;
  };
}
