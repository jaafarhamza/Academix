export class CenterProfileDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  centerName!: string;
  email!: string;
  phone!: string;
  logoUrl!: string | null;
  stampUrl!: string | null;
  subdomain!: string;
  isActive!: boolean;
  createdAt!: Date;
}
