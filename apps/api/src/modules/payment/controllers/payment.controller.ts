import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  SetMetadata,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PermissionAction, UserRole } from '../../../generated/prisma/enums';
import { AppJwtAuthGuard } from '../../../common/guards/app-jwt-auth.guard';
import { USER_PERMISSION_KEY } from '../../auth/constants/user-auth.constants';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';
import { PaymentStatusResponseDto } from '../dto/payment-status-response.dto';
import { QueryPaymentDto } from '../dto/query-payment.dto';
import { PaymentReceiptAccessService } from '../services/payment-receipt-access.service';
import { PaymentService } from '../services/payment.service';

@Controller('payments')
@SkipThrottle({ default: true, auth: true })
@UseGuards(AppJwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SECRETARY)
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly paymentReceiptAccessService: PaymentReceiptAccessService,
  ) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_PAYMENTS)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentService.create(user.center_id, payload);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_PAYMENTS)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryPaymentDto,
  ): Promise<PaymentResponseDto[]> {
    return this.paymentService.findAll(user.center_id, query);
  }

  @Get(':id/receipt')
  @UseGuards(PermissionsGuard)
  @SetMetadata(USER_PERMISSION_KEY, PermissionAction.MANAGE_PAYMENTS)
  async downloadReceipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') paymentId: string,
  ): Promise<StreamableFile> {
    const receipt = await this.paymentReceiptAccessService.downloadReceipt(
      user.center_id,
      paymentId,
    );

    return new StreamableFile(receipt.stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="${receipt.fileName}"`,
    });
  }

  @Get('status')
  getStatus(): PaymentStatusResponseDto {
    return this.paymentService.getStatus();
  }
}
