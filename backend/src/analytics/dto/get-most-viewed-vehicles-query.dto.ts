import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { AnalyticsPeriod } from '../analytics.service';

const ANALYTICS_PERIODS: AnalyticsPeriod[] = ['all', '30d', '7d', 'today'];

export class GetMostViewedVehiclesQueryDto {
  @ApiPropertyOptional({ enum: ANALYTICS_PERIODS, default: '30d' })
  @IsOptional()
  @IsIn(ANALYTICS_PERIODS)
  period?: AnalyticsPeriod = '30d';

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}
