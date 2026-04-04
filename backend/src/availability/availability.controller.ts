import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { SetBlockedDatesDto } from './dto/set-blocked-dates.dto';
import { SetWeeklyAvailabilityDto } from './dto/set-weekly-availability.dto';
import { AvailabilityService } from './availability.service';

@ApiTags('availability')
@Controller('vehicles')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Public()
  @Get(':id/availability')
  @ApiOperation({ summary: 'Consulta calendário de disponibilidade do veículo' })
  getVehicleAvailability(@Param('id') vehicleId: string) {
    return this.availabilityService.getVehicleAvailability(vehicleId);
  }

  @Put(':id/availability')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Define a disponibilidade semanal do veículo' })
  setWeeklyAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') vehicleId: string,
    @Body() dto: SetWeeklyAvailabilityDto,
  ) {
    return this.availabilityService.setWeeklyAvailability(user.sub, vehicleId, dto);
  }

  @Post(':id/blocked-dates')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bloqueia um período manualmente para o veículo' })
  blockDates(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') vehicleId: string,
    @Body() dto: SetBlockedDatesDto,
  ) {
    return this.availabilityService.blockDates(user.sub, vehicleId, dto);
  }
}
