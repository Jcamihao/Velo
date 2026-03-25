import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BookingApprovalMode,
  CancellationPolicy,
  FuelType,
  MotorcycleStyle,
  Transmission,
  VehicleCategory,
  VehicleType,
} from '@prisma/client';
import {
  Type,
} from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class VehicleAddonDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  id?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @ApiProperty({ example: 45 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CreateVehicleDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  brand: string;

  @ApiProperty()
  @IsString()
  @MaxLength(60)
  model: string;

  @ApiProperty()
  @IsInt()
  @Min(1990)
  @Max(2100)
  year: number;

  @ApiProperty()
  @IsString()
  @MaxLength(16)
  plate: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  city: string;

  @ApiProperty()
  @IsString()
  @MaxLength(2)
  state: string;

  @ApiPropertyOptional({ enum: VehicleType, default: VehicleType.CAR })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiProperty({ enum: VehicleCategory })
  @IsEnum(VehicleCategory)
  category: VehicleCategory;

  @ApiPropertyOptional({ enum: BookingApprovalMode, default: BookingApprovalMode.MANUAL })
  @IsOptional()
  @IsEnum(BookingApprovalMode)
  bookingApprovalMode?: BookingApprovalMode;

  @ApiPropertyOptional({ enum: CancellationPolicy, default: CancellationPolicy.FLEXIBLE })
  @IsOptional()
  @IsEnum(CancellationPolicy)
  cancellationPolicy?: CancellationPolicy;

  @ApiProperty({ enum: Transmission })
  @IsEnum(Transmission)
  transmission: Transmission;

  @ApiProperty({ enum: FuelType })
  @IsEnum(FuelType)
  fuelType: FuelType;

  @ApiProperty()
  @IsInt()
  @Min(2)
  @Max(12)
  seats: number;

  @ApiProperty({ example: 189.9 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  dailyRate: number;

  @ApiPropertyOptional({
    example: [
      {
        id: 'delivery',
        name: 'Entrega no local',
        description: 'Receba o veículo em um ponto combinado.',
        price: 45,
        enabled: true,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VehicleAddonDto)
  addons?: VehicleAddonDto[];

  @ApiPropertyOptional({ minimum: 0, maximum: 90, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  firstBookingDiscountPercent?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 90, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  weeklyDiscountPercent?: number;

  @ApiPropertyOptional({ example: 'PRIMEIRAVIAGEM' })
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== '')
  @IsString()
  @MaxLength(32)
  @Matches(/^[A-Za-z0-9_-]+$/)
  couponCode?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 90, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  couponDiscountPercent?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 90, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  weekendSurchargePercent?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 90, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  holidaySurchargePercent?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 90, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  highDemandSurchargePercent?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 90, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(90)
  advanceBookingDiscountPercent?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 365, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  advanceBookingDaysThreshold?: number;

  @ApiPropertyOptional({ enum: MotorcycleStyle })
  @IsOptional()
  @IsEnum(MotorcycleStyle)
  motorcycleStyle?: MotorcycleStyle;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(2500)
  engineCc?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasAbs?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasTopCase?: boolean;

  @ApiProperty()
  @IsString()
  @MaxLength(1200)
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressLine?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 7 })
  longitude?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
