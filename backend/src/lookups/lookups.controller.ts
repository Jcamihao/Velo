import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { LookupsService } from './lookups.service';

@ApiTags('lookups')
@Controller('lookups')
export class LookupsController {
  constructor(private readonly lookupsService: LookupsService) {}

  @Public()
  @Get('cep/:zipCode')
  @ApiOperation({ summary: 'Consulta endereço por CEP' })
  lookupZipCode(@Param('zipCode') zipCode: string) {
    return this.lookupsService.lookupZipCode(zipCode);
  }
}
