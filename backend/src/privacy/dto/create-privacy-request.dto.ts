import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrivacyRequestType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePrivacyRequestDto {
  @ApiProperty({ enum: PrivacyRequestType })
  @IsEnum(PrivacyRequestType)
  type: PrivacyRequestType;

  @ApiPropertyOptional({
    example: 'Quero solicitar a exclusão da minha conta e dos meus dados.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
