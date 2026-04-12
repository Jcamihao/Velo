import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateUserReviewDto } from './dto/create-user-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria uma avaliação para um anúncio' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.sub, dto);
  }

  @Post('user')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cria uma avaliação geral para um anunciante',
  })
  createUserReview(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserReviewDto,
  ) {
    return this.reviewsService.createUserReview(user.sub, dto);
  }

  @Public()
  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Lista avaliações de um veículo' })
  listByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.reviewsService.listByVehicle(vehicleId);
  }
}
