export type UserRole = 'ADMIN' | 'USER';
export type VehicleCategory =
  | 'ECONOMY'
  | 'HATCH'
  | 'SEDAN'
  | 'SUV'
  | 'PICKUP'
  | 'VAN'
  | 'LUXURY';
export type VehicleType = 'CAR' | 'MOTORCYCLE';
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
  responseTimeLabel?: string | null;
  trustMetrics: {
    activeListingsCount: number;
    reviewsCount: number;
    averageRating: number;
    completedRentalsCount: number;
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
  seats: number;
  transmission: string;
  fuelType: string;
  dailyRate: number;
  motorcycleStyle?: MotorcycleStyle | null;
  engineCc?: number | null;
  hasAbs?: boolean | null;
  hasTopCase?: boolean | null;
  hasInsurance?: boolean | null;
  mechanicsCondition?: string | null;
  hasDetranIssues?: boolean | null;
  trunkSize?: number | null;
  weeklyRate?: number | null;
  kmPolicy?: 'FREE' | 'FIXED' | null;
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
  transmission: TransmissionType;
  fuelType: FuelType;
  seats: number;
  dailyRate: number;
  motorcycleStyle?: MotorcycleStyle | null;
  engineCc?: number | null;
  hasAbs?: boolean | null;
  hasTopCase?: boolean | null;
  hasInsurance?: boolean | null;
  mechanicsCondition?: string | null;
  hasDetranIssues?: boolean | null;
  trunkSize?: number | null;
  weeklyRate?: number | null;
  kmPolicy?: 'FREE' | 'FIXED' | null;
  latitude?: number | null;
  longitude?: number | null;
  description: string;
  addressLine?: string | null;
  isActive: boolean;
  isPublished: boolean;
  ratingAverage: number;
  reviewsCount: number;
  viewsCount: number;
  viewsLast30Days: number;
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

export interface MostViewedVehicleItem {
  vehicle: VehicleCardItem;
  viewCount: number;
}

export interface MostViewedVehiclesResponse {
  items: MostViewedVehicleItem[];
  meta: {
    period: 'all' | '30d' | '7d' | 'today';
    limit: number;
    generatedAt: string;
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
  transmission: TransmissionType;
  fuelType: FuelType;
  seats: number;
  dailyRate: number;
  motorcycleStyle?: MotorcycleStyle | null;
  engineCc?: number | null;
  hasAbs?: boolean;
  hasTopCase?: boolean;
  hasInsurance?: boolean;
  mechanicsCondition?: string;
  hasDetranIssues?: boolean;
  trunkSize?: number;
  weeklyRate?: number;
  kmPolicy?: 'FREE' | 'FIXED';
  description: string;
  addressLine?: string;
  latitude?: number;
  longitude?: number;
  isPublished?: boolean;
}

export type UpdateVehiclePayload = Partial<CreateVehiclePayload>;

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
