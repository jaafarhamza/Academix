import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { hashPassword } from '../src/common/utils/password-hash.util';
import { PrismaService } from '../src/database/prisma/prisma.service';

type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  superAdmin: {
    id: string;
    email: string;
  };
};

type SuperAdminProfileResponse = {
  id: string;
  email: string;
};

describe('SuperAdmin auth integration', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  const suffix = Date.now().toString(36);
  const credentials = {
    email: `integration.superadmin.auth.${suffix}@academix.com`,
    password: 'Academix.SuperAdmin.Auth.2026',
  };

  const state: {
    superAdminId?: string;
  } = {};

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = app.get(PrismaService);

    const created = await prismaService.superAdmin.create({
      data: {
        firstName: 'Integration',
        lastName: 'SuperAdmin',
        email: credentials.email,
        phone: '+212600880001',
        passwordHash: await hashPassword(credentials.password),
        isActive: true,
      },
      select: { id: true },
    });

    state.superAdminId = created.id;
  });

  afterAll(async () => {
    if (state.superAdminId) {
      await prismaService.superAdmin.delete({
        where: { id: state.superAdminId },
      });
    }

    await app.close();
  });

  it('logs in and accesses guarded profile endpoint with super-admin JWT', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/super-admin/login')
      .send({
        email: credentials.email.toUpperCase(),
        password: credentials.password,
      })
      .expect(200);

    const payload = loginResponse.body as LoginResponse;
    expect(payload.tokenType).toBe('Bearer');
    expect(payload.accessToken).toEqual(expect.any(String));
    expect(payload.superAdmin.id).toBe(state.superAdminId);
    expect(payload.superAdmin.email).toBe(credentials.email);

    const profileResponse = await request(app.getHttpServer())
      .get('/super-admin/profile')
      .set('Authorization', `Bearer ${payload.accessToken}`)
      .expect(200);

    const profile = profileResponse.body as SuperAdminProfileResponse;
    expect(profile.id).toBe(state.superAdminId);
    expect(profile.email).toBe(credentials.email);
  });

  it('rejects invalid login credentials', async () => {
    await request(app.getHttpServer())
      .post('/super-admin/login')
      .send({
        email: credentials.email,
        password: 'invalid-password',
      })
      .expect(401);
  });

  it('rejects profile access when JWT is missing', async () => {
    await request(app.getHttpServer()).get('/super-admin/profile').expect(401);
  });

  it('rate limits repeated super-admin login attempts', async () => {
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/super-admin/login')
        .send({
          email: credentials.email,
          password: `wrong-password-${attempt}`,
        });

      statuses.push(response.status);
      if (response.status === 429) {
        break;
      }
    }

    expect(statuses).toContain(429);
  });
});
