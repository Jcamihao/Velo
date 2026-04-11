import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class TrackVehicleViewDto {
  @ApiProperty()
  @IsUUID()
  vehicleId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(120)
  visitorId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(255)
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;
}
