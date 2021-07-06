import { Connection, createConnection } from 'typeorm';
import { AccountsTypeorm, entities } from '../src';

const user = {
  username: 'johndoe',
  email: 'john@doe.com',
  password: 'toto',
};

let connection: Connection;
const url = 'postgres://postgres@localhost:5432/accounts-js-tests-e2e';

describe('TypeormServicePassword', () => {
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

  describe('createUser', () => {
    it('should create a new user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      const ret = await accountsTypeorm.findUserById(userId);
      expect(userId).toBeTruthy();
      expect(ret).toMatchObject({
        id: expect.any(String),
        username: 'johndoe',
        emails: [
          {
            address: user.email,
            verified: false,
          },
        ],
        services: {
          password: {
            bcrypt: 'toto',
          },
        },
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should not overwrite service', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser({
        ...user,
        services: 'test',
      });
      const ret = await accountsTypeorm.findUserById(userId);
      expect(userId).toBeTruthy();
      expect(ret!.services).toEqual({
        password: {
          bcrypt: 'toto',
        },
      });
    });

    it('should not set username', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser({
        email: user.email,
        password: user.password,
      });
      const ret = await accountsTypeorm.findUserById(userId);
      expect(ret!.id).toBeTruthy();
      expect(ret!.username).not.toBeTruthy();
    });

    it('should not set email', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser({
        username: user.username,
        password: user.password,
      });
      const ret = await accountsTypeorm.findUserById(userId);
      expect(ret!.id).toBeTruthy();
      expect(ret!.emails).toHaveLength(0);
    });

    it('email should be lowercase', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser({
        email: 'JohN@doe.com',
        password: user.password,
      });
      const ret = await accountsTypeorm.findUserById(userId);
      expect(ret!.id).toBeTruthy();
      expect(ret!.emails![0].address).toEqual('john@doe.com');
    });
  });

  describe('findUserById', () => {
    it('should return null for not found user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const ret = await accountsTypeorm.findUserById('402fcb56-e325-4950-9166-63855da0a3fe');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      const ret = await accountsTypeorm.findUserById(userId);
      expect(ret).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findUserByEmail', () => {
    it('should return null for not found user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const ret = await accountsTypeorm.findUserByEmail('unknow@user.com');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      await accountsTypeorm.createUser(user);
      const ret = await accountsTypeorm.findUserByEmail(user.email);
      expect(ret).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });

    it('should return user with uppercase email', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      await accountsTypeorm.createUser({ email: 'JOHN@DOES.COM', password: user.password });
      const ret = await accountsTypeorm.findUserByEmail('JOHN@DOES.COM');
      expect(ret!.id).toBeTruthy();
      expect(ret!.emails![0].address).toEqual('john@does.com');
    });
  });

  describe('findUserByUsername', () => {
    it('should return null for not found user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const ret = await accountsTypeorm.findUserByUsername('unknowuser');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      await accountsTypeorm.createUser(user);
      const ret = await accountsTypeorm.findUserByUsername(user.username);
      expect(ret).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findUserByServiceIdd', () => {
    it('should return null for not found user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection, cache: 1 });
      const ret = await accountsTypeorm.findUserByServiceId(
        'password',
        '11111111-1111-1111-1111-11111111'
      );
      expect(ret).toBeFalsy();
    });

    it('should return user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection, cache: 1 });
      const userId = await accountsTypeorm.createUser(user);

      let ret = await accountsTypeorm.findUserByServiceId('facebook', '1');
      expect(ret).not.toBeTruthy();
      await accountsTypeorm.setService(userId, 'facebook', { id: '1' });
      ret = await accountsTypeorm.findUserByServiceId('facebook', '1');
      expect(ret).toBeTruthy();
      expect(ret!.id).toEqual(userId);
    });
  });

  describe('findUserByEmailVerificationToken', () => {
    it('should return null for not found user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const ret = await accountsTypeorm.findUserByEmailVerificationToken('token');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addEmailVerificationToken(userId, 'john@doe.com', 'token');
      const ret = await accountsTypeorm.findUserByEmailVerificationToken('token');
      expect(ret).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findUserByResetPasswordToken', () => {
    it('should return null for not found user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const ret = await accountsTypeorm.findUserByResetPasswordToken('token');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addResetPasswordToken(userId, 'john@doe.com', 'token', 'test');
      const ret = await accountsTypeorm.findUserByResetPasswordToken('token');
      expect(ret).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findUserByServiceId', () => {
    it('should return null for not found user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const ret = await accountsTypeorm.findUserByServiceId('facebook', 'invalid');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      let ret = await accountsTypeorm.findUserByServiceId('facebook', '1');
      expect(ret).not.toBeTruthy();
      await accountsTypeorm.setService(userId, 'facebook', { id: '1' });
      ret = await accountsTypeorm.findUserByServiceId('facebook', '1');
      expect(ret).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findPasswordHash', () => {
    it('should return null on not found user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const ret = await accountsTypeorm.findPasswordHash('402fcb56-e325-4950-9166-63855da0a3fe');
      expect(ret).toEqual(null);
    });

    it('should return hash', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      const retUser = await accountsTypeorm.findUserById(userId);
      const ret = await accountsTypeorm.findPasswordHash(userId);
      const services: any = retUser!.services;
      expect(ret).toBeTruthy();
      expect(ret).toEqual(services.password.bcrypt);
    });
  });

  describe('addEmail', () => {
    it('should throw if user is not found', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      await expect(
        accountsTypeorm.addEmail('402fcb56-e325-4950-9166-63855da0a3fe', 'unknowemail', false)
      ).rejects.toThrowError('User not found');
    });

    it('should add email', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const email = 'johns@doe.com';
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addEmail(userId, email, false);
      const retUser = await accountsTypeorm.findUserByEmail(email);
      expect(retUser!.emails!.length).toEqual(2);
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });

    it('should add lowercase email', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const email = 'johnS@doe.com';
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addEmail(userId, email, false);
      const retUser = await accountsTypeorm.findUserByEmail(email);
      expect(retUser!.emails!.length).toEqual(2);
      expect(retUser!.emails![1].address).toEqual('johns@doe.com');
    });
  });

  describe('removeEmail', () => {
    it('should throw if user is not found', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      await expect(
        accountsTypeorm.removeEmail('402fcb56-e325-4950-9166-63855da0a3fe', 'unknowemail')
      ).rejects.toThrowError('User not found');
    });

    it('should throw if email is not found', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      await expect(accountsTypeorm.removeEmail(userId, 'unknowemail')).rejects.toThrowError(
        'Email not found'
      );
    });

    it('should remove email', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const email = 'johns@doe.com';
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addEmail(userId, email, false);
      await accountsTypeorm.removeEmail(userId, user.email);
      const retUser = await accountsTypeorm.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toEqual(email);
      expect(retUser!.createdAt).not.toEqual(retUser!.updatedAt);
    });

    it('should remove uppercase email', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const email = 'johns@doe.com';
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addEmail(userId, email, false);
      await accountsTypeorm.removeEmail(userId, 'JOHN@doe.com');
      const retUser = await accountsTypeorm.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toEqual(email);
    });
  });

  describe('verifyEmail', () => {
    it('should throw if user is not found', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      await expect(
        accountsTypeorm.verifyEmail('402fcb56-e325-4950-9166-63855da0a3fe', 'unknowemail')
      ).rejects.toThrowError('User not found');
    });

    it('should throw if email is not found', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      await expect(accountsTypeorm.verifyEmail(userId, 'unknowemail')).rejects.toThrowError(
        'Email not found'
      );
    });

    it('should verify email', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      let retUser = await accountsTypeorm.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toBe(user.email);
      expect(retUser!.emails![0].verified).toBe(false);
      await accountsTypeorm.verifyEmail(userId, user.email);
      retUser = await accountsTypeorm.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toBe(user.email);
      expect(retUser!.emails![0].verified).toBe(true);
      expect(retUser!.createdAt).not.toEqual(retUser!.updatedAt);
    });
  });

  describe('setUsername', () => {
    it('should throw if user is not found', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      await expect(
        accountsTypeorm.setUsername('402fcb56-e325-4950-9166-63855da0a3fe', 'username')
      ).rejects.toThrowError('User not found');
    });

    it('should change username', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const username = 'johnsdoe';
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.setUsername(userId, username);
      const retUser = await accountsTypeorm.findUserById(userId);
      expect(retUser!.username).toEqual(username);
      expect(retUser!.createdAt).not.toEqual(retUser!.updatedAt);
    });
  });

  describe('setPassword', () => {
    it('should throw if user is not found', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      await expect(
        accountsTypeorm.setPassword('402fcb56-e325-4950-9166-63855da0a3fe', 'toto')
      ).rejects.toThrowError('User not found');
    });

    it('should change password', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const newPassword = 'newpass';
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.setPassword(userId, newPassword);
      const retUser = await accountsTypeorm.findUserById(userId);
      const services: any = retUser!.services;
      expect(services.password.bcrypt).toBeTruthy();
      expect(services.password.bcrypt).toEqual(newPassword);
      expect(retUser!.createdAt).not.toEqual(retUser!.updatedAt);
    });
  });

  describe('setService', () => {
    it('should set service', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      let ret = await accountsTypeorm.findUserByServiceId('google', '1');
      expect(ret).not.toBeTruthy();
      await accountsTypeorm.setService(userId, 'google', { id: 1 });
      ret = await accountsTypeorm.findUserByServiceId('google', '1');
      expect(ret).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('unsetService', () => {
    it('should unset service', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.setService(userId, 'telegram', { id: '1' });
      await accountsTypeorm.unsetService(userId, 'telegram');
      const ret = await accountsTypeorm.findUserByServiceId('telegram', '1');
      expect(ret).not.toBeTruthy();
    });
  });

  describe('setUserDeactivated', () => {
    // TODO: This should be added
    // it('should throw if user is not found', async () => {
    //   const accountsTypeorm = new AccountsTypeorm({ connection });
    //   await expect(
    //     accountsTypeorm.setUserDeactivated('402fcb56-e325-4950-9166-63855da0a3fe', true)
    //   ).rejects.toThrowError('User not found');
    // });

    it('should deactivate user', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      const ret = await accountsTypeorm.findUserById(userId);
      expect(ret!.deactivated).toBeFalsy();
      await accountsTypeorm.setUserDeactivated(userId, true);
      const ret1 = await accountsTypeorm.findUserById(userId);
      expect(ret1!.deactivated).toBeTruthy();
    });
  });

  describe('removeAllResetPasswordTokens', () => {
    it('should remove the password reset tokens', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const testToken = 'testVerificationToken';
      const testReason = 'testReason';
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addResetPasswordToken(userId, user.email, testToken, testReason);
      const userWithTokens = await accountsTypeorm.findUserByResetPasswordToken(testToken);
      expect(userWithTokens).toBeTruthy();
      await accountsTypeorm.removeAllResetPasswordTokens(userId);
      const userWithDeletedTokens = await accountsTypeorm.findUserByResetPasswordToken(testToken);
      expect(userWithDeletedTokens).not.toBeTruthy();
    });
  });

  describe('addEmailVerificationToken', () => {
    it('should add a token', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addEmailVerificationToken(userId, 'john@doe.com', 'token');
      const retUser = await accountsTypeorm.findUserById(userId);
      const services: any = retUser!.services;
      expect(services.email.verificationTokens.length).toEqual(1);
      expect(services.email.verificationTokens[0].address).toEqual('john@doe.com');
      expect(services.email.verificationTokens[0].token).toEqual('token');
      expect(services.email.verificationTokens[0].when).toBeTruthy();
    });
  });

  describe('addResetPasswordToken', () => {
    it('should add a token', async () => {
      const accountsTypeorm = new AccountsTypeorm({ connection });
      const userId = await accountsTypeorm.createUser(user);
      await accountsTypeorm.addResetPasswordToken(userId, 'john@doe.com', 'token', 'reset');
      const retUser = await accountsTypeorm.findUserById(userId);
      const services: any = retUser!.services;
      expect(services.password.reset.length).toEqual(1);
      expect(services.password.reset[0].address).toEqual('john@doe.com');
      expect(services.password.reset[0].token).toEqual('token');
      expect(services.password.reset[0].when).toBeTruthy();
      expect(services.password.reset[0].reason).toEqual('reset');
    });
  });
});
