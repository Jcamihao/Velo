import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class PricingPreviewQueryDto {
  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;
}
