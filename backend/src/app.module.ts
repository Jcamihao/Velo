import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CacheQueueModule } from './cache-queue/cache-queue.module';
import { ChatModule } from './chat/chat.module';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';
import { cacheConfig } from './config/cache.config';
import { storageConfig } from './config/storage.config';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PrivacyModule } from './privacy/privacy.module';
import { ReviewsModule } from './reviews/reviews.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { VehicleImagesModule } from './vehicle-images/vehicle-images.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { AdminModule } from './admin/admin.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SearchAlertsModule } from './search-alerts/search-alerts.module';
import { LookupsModule } from './lookups/lookups.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(__dirname, '../../.env'),
        resolve(__dirname, '../.env'),
        resolve(__dirname, '../.env.example'),
      ],
      load: [appConfig, authConfig, cacheConfig, storageConfig],
    }),
    PrismaModule,
    CacheQueueModule,
    StorageModule,
    UsersModule,
    ProfilesModule,
    PrivacyModule,
    AuthModule,
    ChatModule,
    VehicleImagesModule,
    VehiclesModule,
    FavoritesModule,
    AnalyticsModule,
    SearchAlertsModule,
    LookupsModule,
    NotificationsModule,
    ReviewsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
