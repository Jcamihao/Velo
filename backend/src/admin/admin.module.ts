import { Module } from '@nestjs/common';
import { PrivacyModule } from '../privacy/privacy.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ProfilesModule, PrivacyModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
