import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionAction, UserRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { hashPassword } from '../src/common/utils/password-hash.util';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AppModule } from '../src/app.module';

type AuthLoginResponse = {
  accessToken: string;
};

type RolePermissionRow = {
  id: string;
  center_id: string;
  role: UserRole;
  permission: PermissionAction;
  isGranted: boolean;
};

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const suffix = Date.now().toString(36);
  const superAdminEmail = `superadmin.rls.${suffix}@academix.com`;

  const centerA = {
    email: `center.a.${suffix}@academix.com`,
    subdomain: `center-a-${suffix}`,
    userEmail: `admin.a.${suffix}@academix.com`,
    userPassword: 'Academix.AdminA.2026',
  };

  const centerB = {
    email: `center.b.${suffix}@academix.com`,
    subdomain: `center-b-${suffix}`,
    userEmail: `admin.b.${suffix}@academix.com`,
    userPassword: 'Academix.AdminB.2026',
  };

  const state: {
    superAdminId?: string;
    centerAId?: string;
    centerBId?: string;
    userAId?: string;
    userBId?: string;
    rolePermissionAId?: string;
    rolePermissionBId?: string;
  } = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = app.get(PrismaService);

    const superAdminPasswordHash = await hashPassword('Academix.Super.2026');
    const centerPasswordHash = await hashPassword('Academix.Center.2026');
    const adminAPasswordHash = await hashPassword(centerA.userPassword);
    const adminBPasswordHash = await hashPassword(centerB.userPassword);

    const superAdmin = await prismaService.superAdmin.create({
      data: {
        firstName: 'Tenant',
        lastName: 'Owner',
        email: superAdminEmail,
        phone: '+212600990001',
        passwordHash: superAdminPasswordHash,
        isActive: true,
      },
      select: { id: true },
    });
    state.superAdminId = superAdmin.id;

    const createdCenterA = await prismaService.center.create({
      data: {
        superAdminId: superAdmin.id,
        firstName: 'Center',
        lastName: 'A',
        centerName: `Academix Center A ${suffix}`,
        email: centerA.email,
        passwordHash: centerPasswordHash,
        phone: '+212600990011',
        subdomain: centerA.subdomain,
        isActive: true,
      },
      select: { id: true },
    });
    state.centerAId = createdCenterA.id;

    const createdCenterB = await prismaService.center.create({
      data: {
        superAdminId: superAdmin.id,
        firstName: 'Center',
        lastName: 'B',
        centerName: `Academix Center B ${suffix}`,
        email: centerB.email,
        passwordHash: centerPasswordHash,
        phone: '+212600990012',
        subdomain: centerB.subdomain,
        isActive: true,
      },
      select: { id: true },
    });
    state.centerBId = createdCenterB.id;

    const createdUserA = await prismaService.user.create({
      data: {
        centerId: createdCenterA.id,
        firstName: 'Admin',
        lastName: 'A',
        email: centerA.userEmail,
        passwordHash: adminAPasswordHash,
        phone: '+212600990021',
        role: UserRole.ADMIN,
        cin: `CIN-A-${suffix}`,
        isActive: true,
      },
      select: { id: true },
    });
    state.userAId = createdUserA.id;

    const createdUserB = await prismaService.user.create({
      data: {
        centerId: createdCenterB.id,
        firstName: 'Admin',
        lastName: 'B',
        email: centerB.userEmail,
        passwordHash: adminBPasswordHash,
        phone: '+212600990022',
        role: UserRole.ADMIN,
        cin: `CIN-B-${suffix}`,
        isActive: true,
      },
      select: { id: true },
    });
    state.userBId = createdUserB.id;

    const createdRolePermissionA = await prismaService.rolePermission.create({
      data: {
        centerId: createdCenterA.id,
        role: UserRole.SECRETARY,
        permission: PermissionAction.MANAGE_USERS,
        isGranted: true,
      },
      select: { id: true },
    });
    state.rolePermissionAId = createdRolePermissionA.id;

    const createdRolePermissionB = await prismaService.rolePermission.create({
      data: {
        centerId: createdCenterB.id,
        role: UserRole.SECRETARY,
        permission: PermissionAction.MANAGE_USERS,
        isGranted: false,
      },
      select: { id: true },
    });
    state.rolePermissionBId = createdRolePermissionB.id;
  });

  afterAll(async () => {
    if (state.rolePermissionAId || state.rolePermissionBId) {
      await prismaService.rolePermission.deleteMany({
        where: {
          id: {
            in: [state.rolePermissionAId, state.rolePermissionBId].filter(
              (id): id is string => Boolean(id),
            ),
          },
        },
      });
    }

    if (state.userAId || state.userBId) {
      await prismaService.user.deleteMany({
        where: {
          id: {
            in: [state.userAId, state.userBId].filter((id): id is string =>
              Boolean(id),
            ),
          },
        },
      });
    }

    if (state.centerAId || state.centerBId) {
      await prismaService.center.deleteMany({
        where: {
          id: {
            in: [state.centerAId, state.centerBId].filter((id): id is string =>
              Boolean(id),
            ),
          },
        },
      });
    }

    if (state.superAdminId) {
      await prismaService.superAdmin.delete({
        where: { id: state.superAdminId },
      });
    }

    await app.close();
  });

  it('prevents center A from reading center B role permissions', async () => {
    const loginAResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: centerA.userEmail,
        center_id: state.centerAId,
        password: centerA.userPassword,
      })
      .expect(200);

    const accessTokenA = (loginAResponse.body as AuthLoginResponse).accessToken;

    const listResponse = await request(app.getHttpServer())
      .get('/role-permissions')
      .set('Authorization', `Bearer ${accessTokenA}`)
      .expect(200);

    const permissions = listResponse.body as RolePermissionRow[];
    expect(permissions.length).toBeGreaterThan(0);
    expect(
      permissions.every(
        (permission) => permission.center_id === state.centerAId,
      ),
    ).toBe(true);
    expect(
      permissions.some(
        (permission) => permission.id === state.rolePermissionBId,
      ),
    ).toBe(false);

    await request(app.getHttpServer())
      .get(`/role-permissions/${state.rolePermissionBId ?? ''}`)
      .set('Authorization', `Bearer ${accessTokenA}`)
      .expect(404);
  });

  it('prevents center B from reading center A role permissions', async () => {
    const loginBResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: centerB.userEmail,
        center_id: state.centerBId,
        password: centerB.userPassword,
      })
      .expect(200);

    const accessTokenB = (loginBResponse.body as AuthLoginResponse).accessToken;

    const listResponse = await request(app.getHttpServer())
      .get('/role-permissions')
      .set('Authorization', `Bearer ${accessTokenB}`)
      .expect(200);

    const permissions = listResponse.body as RolePermissionRow[];
    expect(permissions.length).toBeGreaterThan(0);
    expect(
      permissions.every(
        (permission) => permission.center_id === state.centerBId,
      ),
    ).toBe(true);
    expect(
      permissions.some(
        (permission) => permission.id === state.rolePermissionAId,
      ),
    ).toBe(false);
  });
});
