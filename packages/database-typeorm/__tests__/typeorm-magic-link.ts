import { Connection, createConnection } from 'typeorm';
import { AccountsTypeorm, entities } from '../src';

const user = {
  username: 'johndoe',
  email: 'john@doe.com',
  password: 'toto',
};

let connection: Connection;
const url = 'postgres://postgres@localhost:5432/accounts-js-tests-e2e';

describe('TypeormServiceMagicLink', () => {
  beforeAll(async () => {
    connection = await createConnection({
      type: 'postgres',
      url,
      entities,
      synchronize: true,
    });
  });

  afterEach(async () => {
    await connection.query('delete from "user"');
    await connection.query('delete from "user_email"');
    await connection.query('delete from "user_service"');
    await connection.query('delete from "user_session"');
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('#constructor', () => {
    it('should have default options', () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      expect((accountsTypeorm as any).options).toBeTruthy();
    });

    it('should get default connection if connection is not provided', () => {
      const accountsTypeorm = new AccountsTypeorm();
      expect((accountsTypeorm as any).userRepository).toBeTruthy();
      expect((accountsTypeorm as any).emailRepository).toBeTruthy();
      expect((accountsTypeorm as any).serviceRepository).toBeTruthy();
      expect((accountsTypeorm as any).sessionRepository).toBeTruthy();
    });
  });

  describe('findUserByLoginToken', () => {
    it('should return null for not found user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const ret = await accountsTypeorm.findUserByLoginToken('token');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addLoginToken(userId, 'john@doe.com', 'token');
      const ret = await accountsTypeorm.findUserByLoginToken('token');
      expect(ret).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('removeAllLoginTokens', () => {
    it('should remove the login tokens', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const testToken = 'testVerificationToken';
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addLoginToken(userId, user.email, testToken);
      const userWithTokens = await accountsTypeorm.findUserByLoginToken(testToken);
      expect(userWithTokens).toBeTruthy();
      await accountsTypeorm.removeAllLoginTokens(userId);
      const userWithDeletedTokens = await accountsTypeorm.findUserByLoginToken(testToken);
      expect(userWithDeletedTokens).not.toBeTruthy();
    });
  });

  describe('addLoginToken', () => {
    it('should add a login token', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addLoginToken(userId, 'john@doe.com', 'token');
      const retUser = await accountsTypeorm.findUserById(userId);
      const services: any = retUser!.services;
      expect(services.magicLink.loginTokens.length).toEqual(1);
      expect(services.magicLink.loginTokens[0].address).toEqual('john@doe.com');
      expect(services.magicLink.loginTokens[0].token).toEqual('token');
      expect(services.magicLink.loginTokens[0].when).toBeTruthy();
    });
  });
});
