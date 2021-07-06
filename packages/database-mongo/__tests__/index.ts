import { randomBytes } from 'crypto';
import { ObjectID, ObjectId } from 'mongodb';

import { Mongo } from '../src';
import { DatabaseTests } from './database-tests';

const databaseTests = new DatabaseTests();

const generateRandomToken = (length = 43): string => randomBytes(length).toString('hex');

const user = {
  username: 'johndoe',
  email: 'john@doe.com',
  password: 'toto',
};
const session = {
  userId: '123',
  ip: '127.0.0.1',
  userAgent: 'user agent',
};

function delay(time: number) {
  return new Promise((resolve) => setTimeout(() => resolve(), time));
}

describe('Mongo', () => {
  beforeAll(databaseTests.setup);
  afterAll(databaseTests.teardown);
  beforeEach(databaseTests.beforeEach);

  describe('toMongoID', () => {
    it('should not throw when mongo id is valid', () => {
      expect(async () => {
        await databaseTests.database.findUserById('589871d1c9393d445745a57c');
      }).not.toThrow();
    });

    it('should throw when mongo id is not valid', async () => {
      const mongoTmp = new Mongo(databaseTests.db);
      await expect(mongoTmp.findUserById('invalid_hex')).rejects.toThrowError(
        'Argument passed in must be a single String of 12 bytes or a string of 24 hex characters'
      );
    });

    it('should not auto convert to mongo object id when users collection has string ids', async () => {
      const mongoWithStringIds = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
      });
      const mockFindOne = jest.fn();
      (mongoWithStringIds as any).servicePassword.userCollection.findOne = mockFindOne;
      await mongoWithStringIds.findUserById('589871d1c9393d445745a57c');

      expect(mockFindOne.mock.calls[0][0]).toHaveProperty('_id', '589871d1c9393d445745a57c');
    });
  });

  describe('#constructor', () => {
    it('should have default options', () => {
      expect((databaseTests as any).database.options).toBeTruthy();
    });

    it('should overwrite options', () => {
      const mongoTestOptions = new Mongo(databaseTests.db, {
        collectionName: 'users-test',
        sessionCollectionName: 'sessions-test',
      });
      expect((mongoTestOptions as any).options).toBeTruthy();
      expect((mongoTestOptions as any).options.collectionName).toEqual('users-test');
      expect((mongoTestOptions as any).options.sessionCollectionName).toEqual('sessions-test');
    });

    it('should throw with an invalid database connection object', () => {
      expect(() => new Mongo(null as any)).toThrowError('A database connection is required');
    });
  });

  describe('setupIndexes', () => {
    it('should create indexes', async () => {
      await databaseTests.database.setupIndexes();
      const ret = await (databaseTests as any).database.collection.indexInformation();
      expect(ret).toBeTruthy();
      expect(ret._id_[0]).toEqual(['_id', 1]); // eslint-disable-line no-underscore-dangle
      expect(ret.username_1[0]).toEqual(['username', 1]);
      expect(ret['emails.address_1'][0]).toEqual(['emails.address', 1]);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userId = await databaseTests.database.createUser(user);
      const ret = await databaseTests.database.findUserById(userId);
      expect(userId).toBeTruthy();
      expect(ret).toEqual({
        _id: expect.any(ObjectID),
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
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
      });
    });

    it('should not overwrite service', async () => {
      const userId = await databaseTests.database.createUser({
        ...user,
        services: 'test',
      });
      const ret = await databaseTests.database.findUserById(userId);
      expect(userId).toBeTruthy();
      expect(ret!.services).toEqual({
        password: {
          bcrypt: 'toto',
        },
      });
    });

    it('should not set username', async () => {
      const userId = await databaseTests.database.createUser({
        email: user.email,
        password: user.password,
      });
      const ret = await databaseTests.database.findUserById(userId);
      expect(ret!.id).toBeTruthy();
      expect(ret!.username).not.toBeTruthy();
    });

    it('should not set email', async () => {
      const userId = await databaseTests.database.createUser({
        username: user.username,
        password: user.password,
      });
      const ret = await databaseTests.database.findUserById(userId);
      expect(ret!.id).toBeTruthy();
      expect(ret!.emails).not.toBeTruthy();
    });

    it('email should be lowercase', async () => {
      const userId = await databaseTests.database.createUser({
        email: 'JohN@doe.com',
        password: user.password,
      });
      const ret = await databaseTests.database.findUserById(userId);
      expect(ret!.id).toBeTruthy();
      expect(ret!.emails![0].address).toEqual('john@doe.com');
    });

    it('call options.idProvider', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        idProvider: () => 'toto',
        convertUserIdToMongoObjectId: false,
      });
      const userId = await mongoOptions.createUser({
        email: 'JohN@doe.com',
        password: user.password,
      });
      const ret = await mongoOptions.findUserById(userId);
      expect(userId).toBe('toto');
      expect(ret!.id).toBeTruthy();
      expect(ret!.emails![0].address).toEqual('john@doe.com');
    });
  });

  describe('findUserById', () => {
    it('should return null for not found user', async () => {
      const ret = await databaseTests.database.findUserById('589871d1c9393d445745a57c');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const userId = await databaseTests.database.createUser(user);
      const ret = await databaseTests.database.findUserById(userId);
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findUserByEmail', () => {
    it('should return null for not found user', async () => {
      const ret = await databaseTests.database.findUserByEmail('unknow@user.com');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      await databaseTests.database.createUser(user);
      const ret = await databaseTests.database.findUserByEmail(user.email);
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });

    it('should return user with uppercase email', async () => {
      await databaseTests.database.createUser({ email: 'JOHN@DOES.COM', password: user.password });
      const ret = await databaseTests.database.findUserByEmail('JOHN@DOES.COM');
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.emails![0].address).toEqual('john@does.com');
    });
  });

  describe('findUserByUsername', () => {
    it('should return null for not found user', async () => {
      const ret = await databaseTests.database.findUserByUsername('unknowuser');
      expect(ret).not.toBeTruthy();
    });

    it('should return username for case insensitive query', async () => {
      const mongoWithOptions = new Mongo(databaseTests.db, { caseSensitiveUserName: false });
      await mongoWithOptions.createUser(user);
      const ret = await mongoWithOptions.findUserByUsername(user.username.toUpperCase());
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });

    it('should return null for incomplete matching user when using insensitive', async () => {
      const mongoWithOptions = new Mongo(databaseTests.db, { caseSensitiveUserName: false });
      const ret = await mongoWithOptions.findUserByUsername('john');
      expect(ret).not.toBeTruthy();
    });

    it('should return null when using regex wildcards when using insensitive', async () => {
      const mongoWithOptions = new Mongo(databaseTests.db, { caseSensitiveUserName: false });
      const ret = await mongoWithOptions.findUserByUsername('*');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      await databaseTests.database.createUser(user);
      const ret = await databaseTests.database.findUserByUsername(user.username);
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findUserByEmailVerificationToken', () => {
    it('should return null for not found user', async () => {
      const ret = await databaseTests.database.findUserByEmailVerificationToken('token');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const userId = await databaseTests.database.createUser(user);
      await databaseTests.database.addEmailVerificationToken(userId, 'john@doe.com', 'token');
      const ret = await databaseTests.database.findUserByEmailVerificationToken('token');
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findUserByResetPasswordToken', () => {
    it('should return null for not found user', async () => {
      const ret = await databaseTests.database.findUserByResetPasswordToken('token');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const userId = await databaseTests.database.createUser(user);
      await databaseTests.database.addResetPasswordToken(
        userId,
        'john@doe.com',
        'token',
        'test',
        1000
      );
      const ret = await databaseTests.database.findUserByResetPasswordToken('token');
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findUserByServiceId', () => {
    it('should return null for not found user', async () => {
      const ret = await databaseTests.database.findUserByServiceId('facebook', 'invalid');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const userId = await databaseTests.database.createUser(user);
      let ret = await databaseTests.database.findUserByServiceId('facebook', '1');
      expect(ret).not.toBeTruthy();
      await databaseTests.database.setService(userId, 'facebook', { id: '1' });
      ret = await databaseTests.database.findUserByServiceId('facebook', '1');
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findPasswordHash', () => {
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
      });
      await expect(mongoOptions.findPasswordHash('toto')).resolves.toBe(null);
    });

    it('should return null on not found user', async () => {
      const ret = await databaseTests.database.findPasswordHash('589871d1c9393d445745a57c');
      expect(ret).toEqual(null);
    });

    it('should return hash', async () => {
      const userId = await databaseTests.database.createUser(user);
      const retUser = await databaseTests.database.findUserById(userId);
      const ret = await databaseTests.database.findPasswordHash(userId);
      const services: any = retUser!.services;
      expect(ret).toBeTruthy();
      expect(ret).toEqual(services.password.bcrypt);
    });
  });

  describe('addEmail', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
        idProvider: () => new ObjectId().toString(),
      });
      const userId = await mongoOptions.createUser(user);
      await mongoOptions.addEmail(userId, 'hey', false);
    });

    it('should throw if user is not found', async () => {
      await expect(
        databaseTests.database.addEmail('589871d1c9393d445745a57c', 'unknowemail', false)
      ).rejects.toThrowError('User not found');
    });

    it('should add email', async () => {
      const email = 'johns@doe.com';
      const userId = await databaseTests.database.createUser(user);
      await delay(10);
      await databaseTests.database.addEmail(userId, email, false);
      const retUser = await databaseTests.database.findUserByEmail(email);
      expect(retUser!.emails!.length).toEqual(2);
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });

    it('should add lowercase email', async () => {
      const email = 'johnS@doe.com';
      const userId = await databaseTests.database.createUser(user);
      await databaseTests.database.addEmail(userId, email, false);
      const retUser = await databaseTests.database.findUserByEmail(email);
      expect(retUser!.emails!.length).toEqual(2);
      expect(retUser!.emails![1].address).toEqual('johns@doe.com');
    });
  });

  describe('removeEmail', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
        idProvider: () => new ObjectId().toString(),
      });
      const userId = await mongoOptions.createUser(user);
      await mongoOptions.removeEmail(userId, 'hey');
    });

    it('should throw if user is not found', async () => {
      await expect(
        databaseTests.database.removeEmail('589871d1c9393d445745a57c', 'unknowemail')
      ).rejects.toThrowError('User not found');
    });

    it('should remove email', async () => {
      const email = 'johns@doe.com';
      const userId = await databaseTests.database.createUser(user);
      await delay(10);
      await databaseTests.database.addEmail(userId, email, false);
      await databaseTests.database.removeEmail(userId, user.email);
      const retUser = await databaseTests.database.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toEqual(email);
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });

    it('should remove uppercase email', async () => {
      const email = 'johns@doe.com';
      const userId = await databaseTests.database.createUser(user);
      await databaseTests.database.addEmail(userId, email, false);
      await databaseTests.database.removeEmail(userId, 'JOHN@doe.com');
      const retUser = await databaseTests.database.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toEqual(email);
    });
  });

  describe('verifyEmail', () => {
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
      });
      await expect(mongoOptions.verifyEmail('toto', 'hey')).rejects.toThrowError('User not found');
    });

    it('should throw if user is not found', async () => {
      await expect(
        databaseTests.database.verifyEmail('589871d1c9393d445745a57c', 'unknowemail')
      ).rejects.toThrowError('User not found');
    });

    it('should verify email', async () => {
      const userId = await databaseTests.database.createUser(user);
      await delay(10);
      let retUser = await databaseTests.database.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toBe(user.email);
      expect(retUser!.emails![0].verified).toBe(false);
      await databaseTests.database.verifyEmail(userId, user.email);
      retUser = await databaseTests.database.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toBe(user.email);
      expect(retUser!.emails![0].verified).toBe(true);
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });
  });

  describe('setUsername', () => {
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
      });
      await expect(mongoOptions.setUsername('toto', 'hey')).rejects.toThrowError('User not found');
    });

    it('should throw if user is not found', async () => {
      await expect(
        databaseTests.database.setUsername('589871d1c9393d445745a57c', 'username')
      ).rejects.toThrowError('User not found');
    });

    it('should change username', async () => {
      const username = 'johnsdoe';
      const userId = await databaseTests.database.createUser(user);
      await delay(10);
      await databaseTests.database.setUsername(userId, username);
      const retUser = await databaseTests.database.findUserById(userId);
      expect(retUser!.username).toEqual(username);
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });
  });

  describe('setPassword', () => {
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
      });
      await expect(mongoOptions.setPassword('toto', 'hey')).rejects.toThrowError('User not found');
    });

    it('should throw if user is not found', async () => {
      await expect(
        databaseTests.database.setPassword('589871d1c9393d445745a57c', 'toto')
      ).rejects.toThrowError('User not found');
    });

    it('should change password', async () => {
      const newPassword = 'newpass';
      const userId = await databaseTests.database.createUser(user);
      await delay(10);
      await databaseTests.database.setPassword(userId, newPassword);
      const retUser = await databaseTests.database.findUserById(userId);
      const services: any = retUser!.services;
      expect(services.password.bcrypt).toBeTruthy();
      expect(services.password.bcrypt).toEqual(newPassword);
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });
  });

  describe('setService', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
      });
      await mongoOptions.setService('toto', 'twitter', { id: '1' });
    });

    it('should set service', async () => {
      const userId = await databaseTests.database.createUser(user);
      let ret = await databaseTests.database.findUserByServiceId('google', '1');
      expect(ret).not.toBeTruthy();
      await databaseTests.database.setService(userId, 'google', { id: '1' });
      ret = await databaseTests.database.findUserByServiceId('google', '1');
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('unsetService', () => {
    it('should not convert id', async () => {
      const collection: any = { updateOne: jest.fn() };
      const mockDb: any = { collection: () => collection };
      const mongoOptions = new Mongo(mockDb, {
        convertUserIdToMongoObjectId: false,
      });
      await mongoOptions.unsetService('toto', 'twitter');
      expect(collection.updateOne.mock.calls[0][0]._id).toBe('toto');
    });

    it('should unset service', async () => {
      const userId = await databaseTests.database.createUser(user);
      await databaseTests.database.setService(userId, 'telegram', { id: '1' });
      await databaseTests.database.unsetService(userId, 'telegram');
      const ret = await databaseTests.database.findUserByServiceId('telegram', '1');
      expect(ret).not.toBeTruthy();
    });
  });

  describe('createSession', () => {
    it('should create session', async () => {
      const token = generateRandomToken();
      const sessionId = await databaseTests.database.createSession(session.userId, token, {
        ip: session.ip,
        userAgent: session.userAgent,
      });
      const ret = await databaseTests.database.findSessionById(sessionId);
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.userId).toEqual(session.userId);
      expect(ret!.ip).toEqual(session.ip);
      expect(ret!.userAgent).toEqual(session.userAgent);
      expect(ret!.token).toEqual(token);
      expect(ret!.valid).toEqual(true);
      expect(ret!.createdAt).toBeTruthy();
      expect(ret!.createdAt).toEqual(new Date(ret!.createdAt).getTime());
      expect(ret!.updatedAt).toBeTruthy();
    });

    it('should create session with extra data', async () => {
      const impersonatorUserId = '789';
      const token = generateRandomToken();
      const sessionId = await databaseTests.database.createSession(
        session.userId,
        token,
        { ip: session.ip, userAgent: session.userAgent },
        { impersonatorUserId }
      );
      const ret = await databaseTests.database.findSessionById(sessionId);
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.userId).toEqual(session.userId);
      expect(ret!.ip).toEqual(session.ip);
      expect(ret!.userAgent).toEqual(session.userAgent);
      expect(ret!.valid).toEqual(true);
      expect(ret!.token).toEqual(token);
      expect(ret!.createdAt).toEqual(new Date(ret!.createdAt).getTime());
      expect(ret!.updatedAt).toBeTruthy();
      expect((ret as any).extraData).toEqual({ impersonatorUserId });
    });

    it('using date provider on create session', async () => {
      const mongoTestOptions = new Mongo(databaseTests.db, {
        dateProvider: () => new Date(),
      });
      const sessionId = await mongoTestOptions.createSession(session.userId, 'token', {
        ip: session.ip,
        userAgent: session.userAgent,
      });
      const ret = await mongoTestOptions.findSessionById(sessionId);
      expect(ret!.createdAt).toBeTruthy();
      expect(ret!.createdAt).not.toEqual(new Date(ret!.createdAt).getTime());
      expect(ret!.createdAt).toEqual(new Date(ret!.createdAt));
    });

    it('using id provider on create session', async () => {
      const mongoTestOptions = new Mongo(databaseTests.db, {
        idProvider: () => new ObjectID().toHexString(),
        convertSessionIdToMongoObjectId: false,
      });
      const sessionId = await mongoTestOptions.createSession(session.userId, 'token', {
        ip: session.ip,
        userAgent: session.userAgent,
      });
      const ret = await mongoTestOptions.findSessionById(sessionId);
      expect((ret as any)._id).toBeTruthy();
      expect((ret as any)._id).not.toEqual(new ObjectID((ret as any)._id));
      expect((ret as any)._id).toEqual(new ObjectID((ret as any)._id).toHexString());
    });
  });

  describe('findSessionByToken', () => {
    it('should return null for not found session', async () => {
      const ret = await databaseTests.database.findSessionByToken('589871d1c9393d445745a57c');
      expect(ret).not.toBeTruthy();
    });

    it('should find session', async () => {
      const token = generateRandomToken();
      await databaseTests.database.createSession(session.userId, token, {
        ip: session.ip,
        userAgent: session.userAgent,
      });
      const ret = await databaseTests.database.findSessionByToken(token);
      expect(ret).toBeTruthy();
    });
  });

  describe('findSessionById', () => {
    it('should return null for not found session', async () => {
      const ret = await databaseTests.database.findSessionById('589871d1c9393d445745a57c');
      expect(ret).not.toBeTruthy();
    });

    it('should find session', async () => {
      const sessionId = await databaseTests.database.createSession(session as any, 'token');
      const ret = await databaseTests.database.findSessionById(sessionId);
      expect(ret).toBeTruthy();
    });
  });

  describe('updateSession', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertSessionIdToMongoObjectId: false,
      });
      await mongoOptions.updateSession('toto', { ip: 'new ip', userAgent: 'new user agent' });
    });

    it('should update session', async () => {
      const token = generateRandomToken();
      const sessionId = await databaseTests.database.createSession(session.userId, token, {
        ip: session.ip,
        userAgent: session.userAgent,
      });
      await delay(10);
      await databaseTests.database.updateSession(sessionId, {
        ip: 'new ip',
        userAgent: 'new user agent',
      });
      const ret = await databaseTests.database.findSessionById(sessionId);
      expect(ret!.userId).toEqual(session.userId);
      expect(ret!.ip).toEqual('new ip');
      expect(ret!.userAgent).toEqual('new user agent');
      expect(ret!.valid).toEqual(true);
      expect(ret!.token).toEqual(token);
      expect(ret!.createdAt).toBeTruthy();
      expect(ret!.updatedAt).toBeTruthy();
      expect(ret!.createdAt).not.toEqual(ret!.updatedAt);
    });

    it('should update session with token', async () => {
      const token = generateRandomToken();
      const token2 = generateRandomToken();
      const sessionId = await databaseTests.database.createSession(session.userId, token, {
        ip: session.ip,
        userAgent: session.userAgent,
      });
      await delay(10);
      await databaseTests.database.updateSession(
        sessionId,
        {
          ip: 'new ip',
          userAgent: 'new user agent',
        },
        token2
      );
      const ret = await databaseTests.database.findSessionById(sessionId);
      expect(ret!.userId).toEqual(session.userId);
      expect(ret!.ip).toEqual('new ip');
      expect(ret!.userAgent).toEqual('new user agent');
      expect(ret!.valid).toEqual(true);
      expect(ret!.token).toEqual(token2);
      expect(ret!.createdAt).toBeTruthy();
      expect(ret!.updatedAt).toBeTruthy();
      expect(ret!.createdAt).not.toEqual(ret!.updatedAt);
    });
  });

  describe('invalidateSession', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertSessionIdToMongoObjectId: false,
      });
      await mongoOptions.invalidateSession('toto');
    });

    it('invalidates a session', async () => {
      const token = generateRandomToken();
      const sessionId = await databaseTests.database.createSession(session.userId, token, {
        ip: session.ip,
        userAgent: session.userAgent,
      });
      await delay(10);
      await databaseTests.database.invalidateSession(sessionId);
      const ret = await databaseTests.database.findSessionById(sessionId);
      expect(ret!.valid).toEqual(false);
      expect(ret!.createdAt).not.toEqual(ret!.updatedAt);
    });
  });

  describe('invalidateAllSessions', () => {
    it('invalidates all sessions', async () => {
      const sessionId1 = await databaseTests.database.createSession(
        session.userId,
        generateRandomToken(),
        {
          ip: session.ip,
          userAgent: session.userAgent,
        }
      );
      const sessionId2 = await databaseTests.database.createSession(
        session.userId,
        generateRandomToken(),
        {
          ip: session.ip,
          userAgent: session.userAgent,
        }
      );
      await delay(10);
      await databaseTests.database.invalidateAllSessions(session.userId);
      const session1 = await databaseTests.database.findSessionById(sessionId1);
      const session2 = await databaseTests.database.findSessionById(sessionId2);
      expect(session1!.valid).toEqual(false);
      expect(session1!.createdAt).not.toEqual(session1!.updatedAt);
      expect(session2!.valid).toEqual(false);
      expect(session2!.createdAt).not.toEqual(session2!.updatedAt);
    });

    it('invalidates all sessions except given list', async () => {
      const sessionId1 = await databaseTests.database.createSession(
        session.userId,
        generateRandomToken(),
        {
          ip: session.ip,
          userAgent: session.userAgent,
        }
      );
      const sessionId2 = await databaseTests.database.createSession(
        session.userId,
        generateRandomToken(),
        {
          ip: session.ip,
          userAgent: session.userAgent,
        }
      );
      const sessionId3 = await databaseTests.database.createSession(
        session.userId,
        generateRandomToken(),
        {
          ip: session.ip,
          userAgent: session.userAgent,
        }
      );
      const sessionId4 = await databaseTests.database.createSession(
        session.userId,
        generateRandomToken(),
        {
          ip: session.ip,
          userAgent: session.userAgent,
        }
      );
      await delay(10);
      await databaseTests.database.invalidateAllSessions(session.userId, [sessionId2, sessionId4]);

      const session1 = await databaseTests.database.findSessionById(sessionId1);
      const session2 = await databaseTests.database.findSessionById(sessionId2);
      const session3 = await databaseTests.database.findSessionById(sessionId3);
      const session4 = await databaseTests.database.findSessionById(sessionId4);

      expect(session1!.valid).toEqual(false);
      expect(session2!.valid).toEqual(true);
      expect(session3!.valid).toEqual(false);
      expect(session4!.valid).toEqual(true);
    });
  });

  describe('removeAllResetPasswordTokens', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
      });
      const userId = await mongoOptions.createUser(user);
      await mongoOptions.removeAllResetPasswordTokens(userId);
    });

    it('should remove the password reset tokens', async () => {
      const testToken = 'testVerificationToken';
      const testReason = 'testReason';
      const userId = await databaseTests.database.createUser(user);
      await databaseTests.database.addResetPasswordToken(
        userId,
        user.email,
        testToken,
        testReason,
        1000
      );
      const userWithTokens = await databaseTests.database.findUserByResetPasswordToken(testToken);
      expect(userWithTokens).toBeTruthy();
      await databaseTests.database.removeAllResetPasswordTokens(userId);
      const userWithDeletedTokens = await databaseTests.database.findUserByResetPasswordToken(
        testToken
      );
      expect(userWithDeletedTokens).not.toBeTruthy();
    });
  });

  describe('addEmailVerificationToken', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
        idProvider: () => new ObjectId().toString(),
      });
      const userId = await mongoOptions.createUser(user);
      await mongoOptions.addEmailVerificationToken(userId, 'john@doe.com', 'token');
    });

    it('should add a token', async () => {
      const userId = await databaseTests.database.createUser(user);
      await databaseTests.database.addEmailVerificationToken(userId, 'john@doe.com', 'token');
      const retUser = await databaseTests.database.findUserById(userId);
      const services: any = retUser!.services;
      expect(services.email.verificationTokens.length).toEqual(1);
      expect(services.email.verificationTokens[0].address).toEqual('john@doe.com');
      expect(services.email.verificationTokens[0].token).toEqual('token');
      expect(services.email.verificationTokens[0].when).toBeTruthy();
    });
  });

  describe('addResetPasswordToken', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
        idProvider: () => new ObjectId().toString(),
      });
      const userId = await mongoOptions.createUser(user);
      await mongoOptions.addResetPasswordToken(userId, 'john@doe.com', 'token', 'reset', 1000);
    });

    it('should add a token', async () => {
      const userId = await databaseTests.database.createUser(user);
      await databaseTests.database.addResetPasswordToken(
        userId,
        'john@doe.com',
        'token',
        'reset',
        1000
      );
      const retUser = await databaseTests.database.findUserByResetPasswordToken('token');
      const services: any = retUser!.services;
      expect(services.password.reset.length).toEqual(1);
      expect(services.password.reset[0].address).toEqual('john@doe.com');
      expect(services.password.reset[0].token).toEqual('token');
      expect(services.password.reset[0].when).toBeTruthy();
      expect(services.password.reset[0].reason).toEqual('reset');
    });
  });

  describe('setUserDeactivated', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should not convert id', async () => {
      const mongoOptions = new Mongo(databaseTests.db, {
        convertUserIdToMongoObjectId: false,
        idProvider: () => new ObjectId().toString(),
      });
      const userId = await mongoOptions.createUser(user);
      await mongoOptions.setUserDeactivated(userId, true);
    });

    it('should deactivate user', async () => {
      const userId = await databaseTests.database.createUser(user);
      await databaseTests.database.setUserDeactivated(userId, true);
      const retUser = await databaseTests.database.findUserById(userId);
      expect(retUser!.deactivated).toBeTruthy();
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });
  });
});
