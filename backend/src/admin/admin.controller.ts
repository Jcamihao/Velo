import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Resumo administrativo básico do sistema' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'Lista usuários da plataforma' })
  getUsers() {
    return this.adminService.getUsers();
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'Lista veículos da plataforma' })
  getVehicles() {
    return this.adminService.getVehicles();
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Lista reservas da plataforma' })
  getBookings() {
    return this.adminService.getBookings();
  }

  @Patch('users/:id/block')
  @ApiOperation({ summary: 'Bloqueia um usuário' })
  blockUser(@Param('id') userId: string) {
    return this.adminService.blockUser(userId);
  }

  @Patch('vehicles/:id/deactivate')
  @ApiOperation({ summary: 'Desativa um veículo' })
  deactivateVehicle(@Param('id') vehicleId: string) {
    return this.adminService.deactivateVehicle(vehicleId);
  }
}
