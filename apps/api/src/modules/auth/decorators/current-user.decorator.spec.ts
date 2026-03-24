import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { extractCurrentUser } from './current-user.decorator';

describe('extractCurrentUser', () => {
  const createContext = (user?: {
    id: string;
    center_id: string;
    email: string;
    role: 'ADMIN' | 'SECRETARY' | 'TEACHER' | 'STUDENT';
  }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('returns authenticated user from request', () => {
    const user = {
      id: 'user-1',
      center_id: '2cc4267d-f618-478f-aa2f-9699ecbe332f',
      email: 'admin@academix-demo.com',
      role: 'ADMIN' as const,
    };

    const result = extractCurrentUser(createContext(user));

    expect(result).toEqual(user);
  });

  it('throws UnauthorizedException when request user is missing', () => {
    expect(() => extractCurrentUser(createContext())).toThrow(
      UnauthorizedException,
    );
  });
});
