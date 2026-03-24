import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolePermissionController } from './controllers/role-permission.controller';
import { RolePermissionService } from './services/role-permission.service';

@Module({
  imports: [AuthModule],
  controllers: [RolePermissionController],
  providers: [RolePermissionService],
})
export class RolePermissionModule {}
