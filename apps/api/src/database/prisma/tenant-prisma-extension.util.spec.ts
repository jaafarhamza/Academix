import {
  applyTenantCenterIdToArgs,
  isTenantScopedModel,
} from './tenant-prisma-extension.util';

const CENTER_ID = '2cc4267d-f618-478f-aa2f-9699ecbe332f';

describe('tenant-prisma-extension util', () => {
  it('marks tenant-scoped models correctly', () => {
    expect(isTenantScopedModel('User')).toBe(true);
    expect(isTenantScopedModel('RolePermission')).toBe(true);
    expect(isTenantScopedModel('SuperAdmin')).toBe(false);
    expect(isTenantScopedModel('Center')).toBe(false);
  });

  it('adds centerId to where clauses', () => {
    const scoped = applyTenantCenterIdToArgs(
      'findMany',
      {
        where: {
          role: 'SECRETARY',
        },
      },
      CENTER_ID,
    ) as { where: { role: string; centerId: string } };

    expect(scoped.where).toEqual({
      role: 'SECRETARY',
      centerId: CENTER_ID,
    });
  });

  it('adds centerId to create data', () => {
    const scoped = applyTenantCenterIdToArgs(
      'create',
      {
        data: {
          role: 'SECRETARY',
        },
      },
      CENTER_ID,
    ) as { data: { role: string; centerId: string } };

    expect(scoped.data).toEqual({
      role: 'SECRETARY',
      centerId: CENTER_ID,
    });
  });

  it('adds centerId to each createMany row', () => {
    const scoped = applyTenantCenterIdToArgs(
      'createMany',
      {
        data: [{ role: 'SECRETARY' }, { role: 'TEACHER' }],
      },
      CENTER_ID,
    ) as { data: Array<{ role: string; centerId: string }> };

    expect(scoped.data).toEqual([
      { role: 'SECRETARY', centerId: CENTER_ID },
      { role: 'TEACHER', centerId: CENTER_ID },
    ]);
  });

  it('adds centerId to update where and strips centerId from update data', () => {
    const scoped = applyTenantCenterIdToArgs(
      'update',
      {
        where: { id: 'rp-1' },
        data: {
          isGranted: true,
          centerId: 'another-center',
        },
      },
      CENTER_ID,
    ) as {
      where: { id: string; centerId: string };
      data: { isGranted: boolean; centerId?: string };
    };

    expect(scoped.where).toEqual({
      id: 'rp-1',
      centerId: CENTER_ID,
    });
    expect(scoped.data).toEqual({
      isGranted: true,
    });
  });

  it('scopes upsert where/create and strips centerId from update payload', () => {
    const scoped = applyTenantCenterIdToArgs(
      'upsert',
      {
        where: { id: 'rp-1' },
        create: { role: 'SECRETARY' },
        update: {
          isGranted: true,
          centerId: 'another-center',
        },
      },
      CENTER_ID,
    ) as {
      where: { id: string; centerId: string };
      create: { role: string; centerId: string };
      update: { isGranted: boolean; centerId?: string };
    };

    expect(scoped.where).toEqual({
      id: 'rp-1',
      centerId: CENTER_ID,
    });
    expect(scoped.create).toEqual({
      role: 'SECRETARY',
      centerId: CENTER_ID,
    });
    expect(scoped.update).toEqual({
      isGranted: true,
    });
  });
});
