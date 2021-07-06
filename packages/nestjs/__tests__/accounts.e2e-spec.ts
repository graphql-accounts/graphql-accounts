import { AccountsPassword, ErrorMessages } from '@accounts/password';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AccountsJsModule } from '../lib';
import { MockDatabase } from './fixtures/MockDatabase';
class TestError extends Error {
  constructor(private err: Error, private res: request.Response) {
    super(err.message);
  }
  toString() {
    return `${this.err.toString()}
    Response:
      status: ${this.res.status}: ${this.res.statusType}
      body: ${this.res.body}
    `;
  }
}

const errorLogger = (err: Error, res: request.Response) => {
  if (err) {
    throw new TestError(err, res);
  }
};

describe('AccountsModule e2e', () => {
  let app;
  const cats = ['test'];
  const catsService = { findAll: () => cats, create: cat => cats.push(cat) };
  let db;
  let validatePassword;
  let validateUsername;
  let validateEmail;
  let validateNewUser;
  const errors: Partial<ErrorMessages> = {
    incorrectPassword: 'Incorrect Password',
    invalidPassword: 'Invalid password',
    invalidEmail: 'Invalid email',
    invalidUsername: 'Invalid username',
    invalidNewPassword: 'invalid new password',
    unrecognizedOptionsForLogin: 'invalid options',
  };

  beforeEach(async () => {
    db = new MockDatabase();
    const validate = pass => pass === 'foobar';
    validatePassword = jest.fn(validate);
    validateUsername = jest.fn(validate);
    validateEmail = jest.fn(validate);
    validateNewUser = jest.fn(v => v && v.username && v);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AccountsJsModule.register({
          accountsOptions: {
            serverOptions: {
              db,
              tokenSecret: 'foo',
            },
            services: {
              password: new AccountsPassword({
                validatePassword,
                validateUsername,
                validateEmail,
                validateNewUser,
              }),
            },
            REST: {
              path: '/',
            },
          },
        }),
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  describe('create user', () => {
    it('should successfully register', async () => {
      const user = {
        username: 'foobar',
      };

      await request(app.getHttpServer())
        .post('/password/register')
        .send({ user })
        .expect(200);
    });

    it('should update the service', async () => {
      const user = {
        username: 'foobar',
      };

      await request(app.getHttpServer())
        .post('/password/register')
        .send({ user })
        .expect(200);

      expect(db._users).toHaveLength(1);
      expect(db._users[0]).toBeDefined();
      expect(db._users[0].username).toBe(user.username);
    });
    it('should run validate functions', async () => {
      const user = {
        username: 'foobar',
        email: 'foobar',
        password: 'foobar',
      };

      await request(app.getHttpServer())
        .post('/password/register')
        .send({ user })
        .expect(200);

      expect(validateNewUser).toBeCalledTimes(1);
      expect(validateUsername).toBeCalledTimes(1);
      expect(validatePassword).toBeCalledTimes(1);
      expect(validateEmail).toBeCalledTimes(1);
    });

    it('should validate the password', async () => {
      const user = { username: 'foobar', password: 'foo' };
      const res = await request(app.getHttpServer())
        .post('/password/register')
        .send({ user })
        .expect(400);

      expect(res.body.message).toBe(errors.invalidPassword);
      expect(db._users).toHaveLength(0);
    });

    describe('should validate the username', () => {
      it('should validate the username', async () => {
        const user = { username: 'invalid' };
        const res = await request(app.getHttpServer())
          .post('/password/register')
          .send({ user })
          .expect(400);

        expect(res.body.message).toBe(errors.invalidUsername);
        expect(db._users).toHaveLength(0);
      });
    });
  });

  describe('existing users', () => {
    beforeEach(() => {
      db._users = [
        {
          username: 'existing',
          emails: [{ address: 'existing@foo.com', verified: true }, { address: 'unverified@foo.com', verified: false }],
        },
      ];
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
