import { Global, Module } from '@nestjs/common';
import { RequestContextService } from '../../common/services/request-context.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, RequestContextService],
  exports: [PrismaService, RequestContextService],
})
export class PrismaModule {}
