import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista veículos disponíveis com filtros de busca' })
  findAll(@Query() query: ListVehiclesQueryDto) {
    return this.vehiclesService.findAll(query);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista veículos do usuário autenticado' })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.vehiclesService.findMine(user.sub);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalha um veículo específico' })
  findOne(@Param('id') vehicleId: string) {
    return this.vehiclesService.findOne(vehicleId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cadastra um novo veículo' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(user.sub, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza os dados de um veículo do usuário autenticado' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') vehicleId: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(user.sub, vehicleId, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desativa um veículo do usuário autenticado' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') vehicleId: string,
  ) {
    return this.vehiclesService.remove(user.sub, vehicleId);
  }
}
