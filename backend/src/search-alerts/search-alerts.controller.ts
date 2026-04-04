import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateSearchAlertDto } from './dto/create-search-alert.dto';
import { ListSearchAlertsQueryDto } from './dto/list-search-alerts-query.dto';
import { SearchAlertsService } from './search-alerts.service';

@ApiTags('search-alerts')
@ApiBearerAuth()
@Controller('search-alerts')
export class SearchAlertsController {
  constructor(private readonly searchAlertsService: SearchAlertsService) {}

  @Post()
  @ApiOperation({ summary: 'Salva um alerta de busca para o usuário autenticado' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSearchAlertDto,
  ) {
    return this.searchAlertsService.create(user.sub, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Lista alertas de busca do usuário autenticado' })
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSearchAlertsQueryDto,
  ) {
    return this.searchAlertsService.listMine(
      user.sub,
      query.includeInactive === 'true',
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove um alerta de busca do usuário autenticado' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') alertId: string,
  ) {
    return this.searchAlertsService.remove(user.sub, alertId);
  }
}
