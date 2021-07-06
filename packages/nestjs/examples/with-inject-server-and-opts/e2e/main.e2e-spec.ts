import AccountsServer from '@accounts/server';
import { User } from '@accounts/types';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from 'nestjs-config';
import { ResolvablePromise } from '../../shared/ResolvablePromise';
import { configForPath } from '../../shared/routes';
import { AppModule } from '../app.module';
import { UserService } from '../UserService';
import supertest = require('supertest');

describe('with-inject-server-and-opts', () => {
  let app: INestApplication;
  let userService: UserService;

  beforeAll(async () => {
    jest.setTimeout(30000);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(configForPath('/auth', true))
      .compile();
    userService = moduleFixture.get(UserService);

    app = moduleFixture.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('should call onCreateUser when a user is created', async () => {
    const hookCalledPromise = new ResolvablePromise();
    const user = { password: 'foobar', username: 'foo', email: 'foo@foobar.com' };

    expect.assertions(3);
    jest.spyOn(userService, 'onCreateUser').mockImplementation(async (createdUser: User) => {
      const { password, ...otherUserFields } = user;
      expect(createdUser).toBeDefined();
      expect(createdUser).toMatchObject(otherUserFields);
      expect(createdUser.id).toBeDefined();
      expect((createdUser as any).password).toBe(expect.any(String));
      expect((createdUser as any).password).not.toBe(password);
      expect(createdUser).toBeDefined();
      hookCalledPromise.resolve(null);
    });

    const res = await supertest(app.getHttpServer())
      .post('/auth/password/register')
      .send({ user });

    expect(res.ok).toBe(true);
    expect(res.body).toBeDefined(); // null or string
    jest.advanceTimersByTime(5000);
    jest.runAllTicks();
    jest.runAllTimers();

    return hookCalledPromise;
  });

  it('should have an accounts server', async () => {
    expect((userService as any).accounts).toBeInstanceOf(AccountsServer);
  });
});
