import { Prisma } from '../../generated/prisma/client';

const TENANT_SCOPED_MODELS = new Set([
  'User',
  'Subject',
  'StudentGroup',
  'Room',
  'CourseSession',
  'Payment',
  'CenterCost',
  'CenterExpense',
  'RolePermission',
  'Notification',
]);

const ACTIONS_WITH_WHERE = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
  'upsert',
]);

const ACTIONS_WITH_CREATE_DATA = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
]);
const ACTIONS_WITH_MUTATION_DATA = new Set([
  'update',
  'updateMany',
  'updateManyAndReturn',
]);

type RecordValue = Record<string, unknown>;

export const isTenantScopedModel = (model: string): boolean =>
  TENANT_SCOPED_MODELS.has(model);

export const createTenantQueryExtension = (getCenterId: () => string | null) =>
  Prisma.defineExtension({
    name: 'tenant-center-filter',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const centerId = getCenterId();
          if (!centerId || !model || !isTenantScopedModel(model)) {
            return query(args);
          }

          const scopedArgs = applyTenantCenterIdToArgs(
            operation,
            args,
            centerId,
          );
          return query(scopedArgs);
        },
      },
    },
  });

export const applyTenantCenterIdToArgs = <TArgs>(
  operation: string,
  args: TArgs,
  centerId: string,
): TArgs => {
  if (!isPlainObject(args)) {
    return args;
  }

  const scopedArgs: RecordValue = { ...args };

  if (ACTIONS_WITH_WHERE.has(operation)) {
    scopedArgs.where = applyCenterIdToWhere(scopedArgs.where, centerId);
  }

  if (ACTIONS_WITH_CREATE_DATA.has(operation)) {
    scopedArgs.data = applyCenterIdToData(scopedArgs.data, centerId);
  }

  if (ACTIONS_WITH_MUTATION_DATA.has(operation)) {
    scopedArgs.data = removeCenterIdFromData(scopedArgs.data);
  }

  if (operation === 'upsert') {
    scopedArgs.create = applyCenterIdToData(scopedArgs.create, centerId);
    scopedArgs.update = removeCenterIdFromData(scopedArgs.update);
  }

  return scopedArgs as TArgs;
};

const applyCenterIdToWhere = (
  where: unknown,
  centerId: string,
): RecordValue => {
  if (!isPlainObject(where)) {
    return { centerId };
  }

  return {
    ...where,
    centerId,
  };
};

const applyCenterIdToData = (data: unknown, centerId: string): unknown => {
  if (Array.isArray(data)) {
    return (data as unknown[]).map((item): unknown =>
      isPlainObject(item) ? { ...item, centerId } : item,
    );
  }

  if (isPlainObject(data)) {
    return {
      ...data,
      centerId,
    };
  }

  return data;
};

const removeCenterIdFromData = (data: unknown): unknown => {
  if (Array.isArray(data)) {
    return (data as unknown[]).map((item): unknown =>
      isPlainObject(item) ? omitCenterId(item) : item,
    );
  }

  if (isPlainObject(data)) {
    return omitCenterId(data);
  }

  return data;
};

const omitCenterId = (value: RecordValue): RecordValue => {
  const nextValue = { ...value };
  delete nextValue.centerId;
  return nextValue;
};

const isPlainObject = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
