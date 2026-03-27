import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePrivacyPreferencesDto {
  @ApiProperty({
    description: 'Permite analytics não essencial para entender navegação e melhorar o produto.',
  })
  @IsBoolean()
  analyticsConsentGranted: boolean;
}
