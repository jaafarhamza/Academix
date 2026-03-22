export class RegisterCenterResponseDto {
  id!: string;
  superAdminId!: string;
  firstName!: string;
  lastName!: string;
  centerName!: string;
  email!: string;
  phone!: string;
  logoUrl!: string | null;
  subdomain!: string;
  isActive!: boolean;
  createdAt!: Date;
}
