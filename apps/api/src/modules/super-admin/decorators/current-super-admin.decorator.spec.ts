import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { extractCurrentSuperAdmin } from './current-super-admin.decorator';

describe('extractCurrentSuperAdmin', () => {
  const createContext = (user?: {
    id: string;
    email: string;
    role: 'SUPER_ADMIN';
  }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('returns authenticated super admin from request', () => {
    const superAdmin = {
      id: 'sa-1',
      email: 'superadmin@academix.com',
      role: 'SUPER_ADMIN' as const,
    };

    const result = extractCurrentSuperAdmin(createContext(superAdmin));

    expect(result).toEqual(superAdmin);
  });

  it('throws UnauthorizedException when request user is missing', () => {
    expect(() => extractCurrentSuperAdmin(createContext())).toThrow(
      UnauthorizedException,
    );
  });
});
