import { MongoClient, Db, ObjectID, ObjectId } from 'mongodb';
import { MongoServicePassword } from '../src/mongo-password';

const delay = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

const user = {
  username: 'johndoe',
  email: 'john@doe.com',
  password: 'toto',
};

describe('MongoServicePassword', () => {
  let connection: MongoClient;
  let database: Db;

  beforeAll(async () => {
    const url = 'mongodb://localhost:27017';
    connection = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    database = await connection.db('accounts-mongo-password-tests');
  });

  beforeEach(async () => {
    await database.collection('users').deleteMany({});
    await database.collection('resetPasswordTokens').deleteMany({});
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('#constructor', () => {
    it('should have default options', () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      expect((mongoServicePassword as any).options).toBeTruthy();
    });

    it('should overwrite options', () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        userCollectionName: 'usersTest',
      });
      expect((mongoServicePassword as any).options.userCollectionName).toEqual('usersTest');
    });
  });

  describe('setupIndexes', () => {
    it('should create indexes', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      await mongoServicePassword.setupIndexes();
      expect(await database.collection('users').indexInformation()).toEqual({
        _id_: [['_id', 1]],
        'emails.address_1': [['emails.address', 1]],
        'services.email.verificationTokens.token_1': [
          ['services.email.verificationTokens.token', 1],
        ],
        username_1: [['username', 1]],
      });
      expect(await database.collection('resetPasswordTokens').indexInformation()).toEqual({
        _id_: [['_id', 1]],
        expireAt_1: [['expireAt', 1]],
        token_1: [['token', 1]],
      });
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser(user);
      const ret = await mongoServicePassword.findUserById(userId);
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
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser({
        ...user,
        services: 'test',
      });
      const ret = await mongoServicePassword.findUserById(userId);
      expect(userId).toBeTruthy();
      expect(ret!.services).toEqual({
        password: {
          bcrypt: 'toto',
        },
      });
    });

    it('should not set username', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser({
        email: user.email,
        password: user.password,
      });
      const ret = await mongoServicePassword.findUserById(userId);
      expect(ret!.id).toBeTruthy();
      expect(ret!.username).not.toBeTruthy();
    });

    it('should not set email', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser({
        username: user.username,
        password: user.password,
      });
      const ret = await mongoServicePassword.findUserById(userId);
      expect(ret!.id).toBeTruthy();
      expect(ret!.emails).not.toBeTruthy();
    });

    it('email should be lowercase', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser({
        email: 'JohN@doe.com',
        password: user.password,
      });
      const ret = await mongoServicePassword.findUserById(userId);
      expect(ret!.id).toBeTruthy();
      expect(ret!.emails![0].address).toEqual('john@doe.com');
    });

    it('call options.idProvider', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        idProvider: () => 'toto',
        convertUserIdToMongoObjectId: false,
      });
      const userId = await mongoServicePassword.createUser({
        email: 'JohN@doe.com',
        password: user.password,
      });
      const ret = await mongoServicePassword.findUserById(userId);
      expect(userId).toBe('toto');
      expect(ret!.id).toBeTruthy();
      expect(ret!.emails![0].address).toEqual('john@doe.com');
    });
  });

  describe('findUserById', () => {
    it('should return null for not found user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const ret = await mongoServicePassword.findUserById('589871d1c9393d445745a57c');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser(user);
      const ret = await mongoServicePassword.findUserById(userId);
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findUserByEmail', () => {
    it('should return null for not found user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const ret = await mongoServicePassword.findUserByEmail('unknow@user.com');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      await mongoServicePassword.createUser(user);
      const ret = await mongoServicePassword.findUserByEmail(user.email);
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });

    it('should return user with uppercase email', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      await mongoServicePassword.createUser({ email: 'JOHN@DOES.COM', password: user.password });
      const ret = await mongoServicePassword.findUserByEmail('JOHN@DOES.COM');
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.emails![0].address).toEqual('john@does.com');
    });
  });

  describe('findUserByUsername', () => {
    it('should return null for not found user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const ret = await mongoServicePassword.findUserByUsername('unknowuser');
      expect(ret).not.toBeTruthy();
    });

    it('should return username for case insensitive query', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        caseSensitiveUserName: false,
      });
      await mongoServicePassword.createUser(user);
      const ret = await mongoServicePassword.findUserByUsername(user.username.toUpperCase());
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });

    it('should return null for incomplete matching user when using insensitive', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        caseSensitiveUserName: false,
      });
      const ret = await mongoServicePassword.findUserByUsername('john');
      expect(ret).not.toBeTruthy();
    });

    it('should return null when using regex wildcards when using insensitive', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        caseSensitiveUserName: false,
      });
      const ret = await mongoServicePassword.findUserByUsername('*');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      await mongoServicePassword.createUser(user);
      const ret = await mongoServicePassword.findUserByUsername(user.username);
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findUserByEmailVerificationToken', () => {
    it('should return null for not found user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const ret = await mongoServicePassword.findUserByEmailVerificationToken('token');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser(user);
      await mongoServicePassword.addEmailVerificationToken(userId, 'john@doe.com', 'token');
      const ret = await mongoServicePassword.findUserByEmailVerificationToken('token');
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findUserByResetPasswordToken', () => {
    it('should return null for not found user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const ret = await mongoServicePassword.findUserByResetPasswordToken('token');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser(user);
      await mongoServicePassword.addResetPasswordToken(
        userId,
        'john@doe.com',
        'token',
        'test',
        1000
      );
      const ret = await mongoServicePassword.findUserByResetPasswordToken('token');
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });
  });

  describe('findPasswordHash', () => {
    it('should not convert id', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        convertUserIdToMongoObjectId: false,
      });
      await expect(mongoServicePassword.findPasswordHash('toto')).resolves.toBe(null);
    });

    it('should return null on not found user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const ret = await mongoServicePassword.findPasswordHash('589871d1c9393d445745a57c');
      expect(ret).toEqual(null);
    });

    it('should return hash', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser(user);
      const retUser = await mongoServicePassword.findUserById(userId);
      const ret = await mongoServicePassword.findPasswordHash(userId);
      const services: any = retUser!.services;
      expect(ret).toBeTruthy();
      expect(ret).toEqual(services.password.bcrypt);
    });
  });

  describe('addEmail', () => {
    it('should not convert id', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        convertUserIdToMongoObjectId: false,
        idProvider: () => new ObjectId().toString(),
      });
      const userId = await mongoServicePassword.createUser(user);
      await mongoServicePassword.addEmail(userId, 'hey', false);
      const retUser = await mongoServicePassword.findUserById(userId);
      expect(typeof (retUser as any)._id).toBe('string');
    });

    it('should throw if user is not found', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      await expect(
        mongoServicePassword.addEmail('589871d1c9393d445745a57c', 'unknowemail', false)
      ).rejects.toThrowError('User not found');
    });

    it('should add email', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const email = 'johns@doe.com';
      const userId = await mongoServicePassword.createUser(user);
      await delay(10);
      await mongoServicePassword.addEmail(userId, email, false);
      const retUser = await mongoServicePassword.findUserByEmail(email);
      expect(retUser!.emails!.length).toEqual(2);
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });

    it('should add lowercase email', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const email = 'johnS@doe.com';
      const userId = await mongoServicePassword.createUser(user);
      await mongoServicePassword.addEmail(userId, email, false);
      const retUser = await mongoServicePassword.findUserByEmail(email);
      expect(retUser!.emails!.length).toEqual(2);
      expect(retUser!.emails![1].address).toEqual('johns@doe.com');
    });
  });

  describe('removeEmail', () => {
    it('should not convert id', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        convertUserIdToMongoObjectId: false,
        idProvider: () => new ObjectId().toString(),
      });
      const userId = await mongoServicePassword.createUser(user);
      await mongoServicePassword.removeEmail(userId, 'hey');
      const retUser = await mongoServicePassword.findUserById(userId);
      expect(typeof (retUser as any)._id).toBe('string');
    });

    it('should throw if user is not found', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      await expect(
        mongoServicePassword.removeEmail('589871d1c9393d445745a57c', 'unknowemail')
      ).rejects.toThrowError('User not found');
    });

    it('should remove email', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const email = 'johns@doe.com';
      const userId = await mongoServicePassword.createUser(user);
      await delay(10);
      await mongoServicePassword.addEmail(userId, email, false);
      await mongoServicePassword.removeEmail(userId, user.email);
      const retUser = await mongoServicePassword.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toEqual(email);
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });

    it('should remove uppercase email', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const email = 'johns@doe.com';
      const userId = await mongoServicePassword.createUser(user);
      await mongoServicePassword.addEmail(userId, email, false);
      await mongoServicePassword.removeEmail(userId, 'JOHN@doe.com');
      const retUser = await mongoServicePassword.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toEqual(email);
    });
  });

  describe('verifyEmail', () => {
    it('should not convert id', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        convertUserIdToMongoObjectId: false,
      });
      await expect(mongoServicePassword.verifyEmail('toto', 'hey')).rejects.toThrowError(
        'User not found'
      );
    });

    it('should throw if user is not found', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      await expect(
        mongoServicePassword.verifyEmail('589871d1c9393d445745a57c', 'unknowemail')
      ).rejects.toThrowError('User not found');
    });

    it('should verify email', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser(user);
      await delay(10);
      let retUser = await mongoServicePassword.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toBe(user.email);
      expect(retUser!.emails![0].verified).toBe(false);
      await mongoServicePassword.verifyEmail(userId, user.email);
      retUser = await mongoServicePassword.findUserById(userId);
      expect(retUser!.emails!.length).toEqual(1);
      expect(retUser!.emails![0].address).toBe(user.email);
      expect(retUser!.emails![0].verified).toBe(true);
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });
  });

  describe('setUsername', () => {
    it('should not convert id', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        convertUserIdToMongoObjectId: false,
      });
      await expect(mongoServicePassword.setUsername('toto', 'hey')).rejects.toThrowError(
        'User not found'
      );
    });

    it('should throw if user is not found', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      await expect(
        mongoServicePassword.setUsername('589871d1c9393d445745a57c', 'username')
      ).rejects.toThrowError('User not found');
    });

    it('should change username', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const username = 'johnsdoe';
      const userId = await mongoServicePassword.createUser(user);
      await delay(10);
      await mongoServicePassword.setUsername(userId, username);
      const retUser = await mongoServicePassword.findUserById(userId);
      expect(retUser!.username).toEqual(username);
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });
  });

  describe('setPassword', () => {
    it('should not convert id', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        convertUserIdToMongoObjectId: false,
      });
      await expect(mongoServicePassword.setPassword('toto', 'hey')).rejects.toThrowError(
        'User not found'
      );
    });

    it('should throw if user is not found', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      await expect(
        mongoServicePassword.setPassword('589871d1c9393d445745a57c', 'toto')
      ).rejects.toThrowError('User not found');
    });

    it('should change password', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const newPassword = 'newpass';
      const userId = await mongoServicePassword.createUser(user);
      await delay(10);
      await mongoServicePassword.setPassword(userId, newPassword);
      const retUser = await mongoServicePassword.findUserById(userId);
      const services: any = retUser!.services;
      expect(services.password.bcrypt).toBeTruthy();
      expect(services.password.bcrypt).toEqual(newPassword);
      expect((retUser as any).createdAt).not.toEqual((retUser as any).updatedAt);
    });
  });

  describe('removeAllResetPasswordTokens', () => {
    it('should not convert id', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        convertUserIdToMongoObjectId: false,
      });
      const userId = await mongoServicePassword.createUser(user);
      await expect(
        mongoServicePassword.removeAllResetPasswordTokens(userId)
      ).resolves.not.toThrowError();
    });

    it('should remove the password reset tokens', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const testToken = 'testVerificationToken';
      const testReason = 'testReason';
      const userId = await mongoServicePassword.createUser(user);
      await mongoServicePassword.addResetPasswordToken(
        userId,
        user.email,
        testToken,
        testReason,
        1000
      );
      const userWithTokens = await mongoServicePassword.findUserByResetPasswordToken(testToken);
      expect(userWithTokens).toBeTruthy();
      await mongoServicePassword.removeAllResetPasswordTokens(userId);
      const userWithDeletedTokens = await mongoServicePassword.findUserByResetPasswordToken(
        testToken
      );
      expect(userWithDeletedTokens).not.toBeTruthy();
    });
  });

  describe('addEmailVerificationToken', () => {
    // eslint-disable-next-line jest/expect-expect
    it('should not convert id', async () => {
      const mongoServicePassword = new MongoServicePassword({
        database,
        convertUserIdToMongoObjectId: false,
        idProvider: () => new ObjectId().toString(),
      });
      const userId = await mongoServicePassword.createUser(user);
      await expect(
        mongoServicePassword.addEmailVerificationToken(userId, 'john@doe.com', 'token')
      ).resolves.not.toThrowError();
    });

    it('should add a token', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser(user);
      await mongoServicePassword.addEmailVerificationToken(userId, 'john@doe.com', 'token');
      const retUser = await mongoServicePassword.findUserById(userId);
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
      const mongoServicePassword = new MongoServicePassword({
        database,
        convertUserIdToMongoObjectId: false,
        idProvider: () => new ObjectId().toString(),
      });
      const userId = await mongoServicePassword.createUser(user);
      await expect(
        mongoServicePassword.addResetPasswordToken(userId, 'john@doe.com', 'token', 'reset', 1000)
      ).resolves.not.toThrowError();
    });

    it('should add a token', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const userId = await mongoServicePassword.createUser(user);
      await mongoServicePassword.addResetPasswordToken(
        userId,
        'john@doe.com',
        'token',
        'reset',
        1000
      );
      const retUser = await mongoServicePassword.findUserByResetPasswordToken('token');
      const services: any = retUser!.services;
      expect(services.password.reset.length).toEqual(1);
      expect(services.password.reset[0].address).toEqual('john@doe.com');
      expect(services.password.reset[0].token).toEqual('token');
      expect(services.password.reset[0].when).toBeTruthy();
      expect(services.password.reset[0].reason).toEqual('reset');
    });
  });
});
