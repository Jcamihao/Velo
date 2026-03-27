import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreatePrivacyRequestDto } from './dto/create-privacy-request.dto';
import { UpdatePrivacyPreferencesDto } from './dto/update-privacy-preferences.dto';
import { PrivacyService } from './privacy.service';

@ApiTags('privacy')
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Public()
  @Get('policy')
  @ApiOperation({ summary: 'Retorna um resumo público da política de privacidade' })
  getPolicy() {
    return this.privacyService.getPolicySummary();
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna preferências e solicitações LGPD do usuário autenticado' })
  getMyPrivacyCenter(@CurrentUser() user: AuthenticatedUser) {
    return this.privacyService.getMyPrivacyCenter(user.sub);
  }

  @Get('me/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exporta os principais dados da conta do usuário autenticado' })
  exportMyData(@CurrentUser() user: AuthenticatedUser) {
    return this.privacyService.exportMyData(user.sub);
  }

  @Get('me/requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista solicitações LGPD abertas pelo usuário autenticado' })
  listMyRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.privacyService.listMyRequests(user.sub);
  }

  @Post('me/requests')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria uma solicitação LGPD para o usuário autenticado' })
  createRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePrivacyRequestDto,
  ) {
    return this.privacyService.createRequest(user.sub, dto);
  }

  @Patch('me/preferences')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza preferências de privacidade do usuário autenticado' })
  updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePrivacyPreferencesDto,
  ) {
    return this.privacyService.updateMyPreferences(user.sub, dto);
  }
}
