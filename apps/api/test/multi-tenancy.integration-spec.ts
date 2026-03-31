import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionAction, UserRole } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { RequestContextService } from '../src/common/services/request-context.service';
import { hashPassword } from '../src/common/utils/password-hash.util';
import { PrismaService } from '../src/database/prisma/prisma.service';

const runInTenantContext = <T>(
  requestContextService: RequestContextService,
  centerId: string,
  callback: () => Promise<T>,
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    requestContextService.run({ center_id: centerId }, () => {
      callback().then(resolve).catch(reject);
    });
  });

describe('Multi-tenancy integration', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let requestContextService: RequestContextService;

  const suffix = Date.now().toString(36);
  const state: {
    superAdminId?: string;
    centerAId?: string;
    centerBId?: string;
    permissionAId?: string;
    permissionBId?: string;
    createdPermissionIds: string[];
  } = {
    createdPermissionIds: [],
  };

  const requiredId = (value: string | undefined, fieldName: string): string => {
    if (!value) {
      throw new Error(`${fieldName} is not initialized`);
    }

    return value;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = app.get(PrismaService);
    requestContextService = app.get(RequestContextService);

    const superAdmin = await prismaService.superAdmin.create({
      data: {
        firstName: 'Integration',
        lastName: 'Owner',
        email: `integration.superadmin.${suffix}@academix.com`,
        phone: '+212600770001',
        passwordHash: await hashPassword('Academix.Super.2026'),
        isActive: true,
      },
      select: { id: true },
    });
    state.superAdminId = superAdmin.id;

    const centerA = await prismaService.center.create({
      data: {
        superAdminId: superAdmin.id,
        firstName: 'Center',
        lastName: 'A',
        centerName: `Integration Center A ${suffix}`,
        email: `integration.center.a.${suffix}@academix.com`,
        passwordHash: await hashPassword('Academix.Center.A.2026'),
        phone: '+212600770011',
        subdomain: `integration-center-a-${suffix}`,
        isActive: true,
      },
      select: { id: true },
    });
    state.centerAId = centerA.id;

    const centerB = await prismaService.center.create({
      data: {
        superAdminId: superAdmin.id,
        firstName: 'Center',
        lastName: 'B',
        centerName: `Integration Center B ${suffix}`,
        email: `integration.center.b.${suffix}@academix.com`,
        passwordHash: await hashPassword('Academix.Center.B.2026'),
        phone: '+212600770012',
        subdomain: `integration-center-b-${suffix}`,
        isActive: true,
      },
      select: { id: true },
    });
    state.centerBId = centerB.id;

    const permissionA = await prismaService.rolePermission.create({
      data: {
        centerId: centerA.id,
        role: UserRole.SECRETARY,
        permission: PermissionAction.MANAGE_USERS,
        isGranted: true,
      },
      select: { id: true },
    });
    state.permissionAId = permissionA.id;
    state.createdPermissionIds.push(permissionA.id);

    const permissionB = await prismaService.rolePermission.create({
      data: {
        centerId: centerB.id,
        role: UserRole.SECRETARY,
        permission: PermissionAction.MANAGE_USERS,
        isGranted: true,
      },
      select: { id: true },
    });
    state.permissionBId = permissionB.id;
    state.createdPermissionIds.push(permissionB.id);
  });

  afterAll(async () => {
    if (state.createdPermissionIds.length > 0) {
      await prismaService.rolePermission.deleteMany({
        where: { id: { in: state.createdPermissionIds } },
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

  it('scopes read queries to the tenant center_id from request context', async () => {
    const rowsForCenterA = await runInTenantContext(
      requestContextService,
      requiredId(state.centerAId, 'centerAId'),
      () =>
        prismaService.rolePermission.findMany({
          orderBy: { id: 'asc' },
          select: { id: true, centerId: true },
        }),
    );

    expect(rowsForCenterA.length).toBeGreaterThan(0);
    expect(
      rowsForCenterA.every((row) => row.centerId === state.centerAId),
    ).toBe(true);
    expect(rowsForCenterA.some((row) => row.id === state.permissionBId)).toBe(
      false,
    );
  });

  it('overrides spoofed centerId during create with tenant context center_id', async () => {
    const created = await runInTenantContext(
      requestContextService,
      requiredId(state.centerAId, 'centerAId'),
      () =>
        prismaService.rolePermission.create({
          data: {
            centerId: requiredId(state.centerBId, 'centerBId'),
            role: UserRole.TEACHER,
            permission: PermissionAction.VIEW_REPORTS,
            isGranted: true,
          },
          select: { id: true, centerId: true },
        }),
    );

    state.createdPermissionIds.push(created.id);
    expect(created.centerId).toBe(state.centerAId);
  });

  it('overrides spoofed centerId for createManyAndReturn rows', async () => {
    const createdRows = await runInTenantContext(
      requestContextService,
      requiredId(state.centerAId, 'centerAId'),
      () =>
        prismaService.rolePermission.createManyAndReturn({
          data: [
            {
              centerId: requiredId(state.centerBId, 'centerBId'),
              role: UserRole.TEACHER,
              permission: PermissionAction.MANAGE_SUBJECTS,
              isGranted: true,
            },
            {
              centerId: requiredId(state.centerBId, 'centerBId'),
              role: UserRole.STUDENT,
              permission: PermissionAction.VIEW_REPORTS,
              isGranted: true,
            },
          ],
          select: { id: true, centerId: true },
        }),
    );

    expect(createdRows).toHaveLength(2);
    expect(createdRows.every((row) => row.centerId === state.centerAId)).toBe(
      true,
    );

    for (const row of createdRows) {
      state.createdPermissionIds.push(row.id);
    }
  });

  it('blocks cross-tenant read-by-id attempts', async () => {
    const row = await runInTenantContext(
      requestContextService,
      requiredId(state.centerAId, 'centerAId'),
      () =>
        prismaService.rolePermission.findFirst({
          where: { id: requiredId(state.permissionBId, 'permissionBId') },
          select: { id: true },
        }),
    );

    expect(row).toBeNull();
  });

  it('blocks cross-tenant update attempts', async () => {
    await expect(
      runInTenantContext(
        requestContextService,
        requiredId(state.centerAId, 'centerAId'),
        () =>
          prismaService.rolePermission.update({
            where: { id: requiredId(state.permissionBId, 'permissionBId') },
            data: { isGranted: false },
          }),
      ),
    ).rejects.toMatchObject({ code: 'P2025' });
  });

  it('scopes updateManyAndReturn to tenant center_id and does not touch other center rows', async () => {
    const centerARecord = await runInTenantContext(
      requestContextService,
      requiredId(state.centerAId, 'centerAId'),
      () =>
        prismaService.rolePermission.create({
          data: {
            centerId: requiredId(state.centerBId, 'centerBId'),
            role: UserRole.TEACHER,
            permission: PermissionAction.MANAGE_COSTS,
            isGranted: false,
          },
          select: { id: true, centerId: true },
        }),
    );
    state.createdPermissionIds.push(centerARecord.id);

    const centerBRecord = await prismaService.rolePermission.create({
      data: {
        centerId: requiredId(state.centerBId, 'centerBId'),
        role: UserRole.TEACHER,
        permission: PermissionAction.MANAGE_COSTS,
        isGranted: false,
      },
      select: { id: true, centerId: true },
    });
    state.createdPermissionIds.push(centerBRecord.id);

    const updatedRows = await runInTenantContext(
      requestContextService,
      requiredId(state.centerAId, 'centerAId'),
      () =>
        prismaService.rolePermission.updateManyAndReturn({
          where: {
            centerId: requiredId(state.centerBId, 'centerBId'),
            role: UserRole.TEACHER,
            permission: PermissionAction.MANAGE_COSTS,
          },
          data: {
            centerId: requiredId(state.centerBId, 'centerBId'),
            isGranted: true,
          },
          select: { id: true, centerId: true, isGranted: true },
        }),
    );

    expect(updatedRows).toHaveLength(1);
    expect(updatedRows[0]).toMatchObject({
      id: centerARecord.id,
      centerId: requiredId(state.centerAId, 'centerAId'),
      isGranted: true,
    });

    const untouchedCenterBRow = await prismaService.rolePermission.findUnique({
      where: { id: centerBRecord.id },
      select: { id: true, centerId: true, isGranted: true },
    });

    expect(untouchedCenterBRow).toMatchObject({
      id: centerBRecord.id,
      centerId: requiredId(state.centerBId, 'centerBId'),
      isGranted: false,
    });
  });
});
