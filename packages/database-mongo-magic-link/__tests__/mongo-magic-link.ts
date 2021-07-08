import { MongoClient, Db, ObjectId } from 'mongodb';
import { MongoServiceMagicLink } from '../src/';
import { MongoServicePassword } from '@accounts/mongo-password';

const user = {
  username: 'johndoe',
  email: 'john@doe.com',
  password: 'toto',
};

describe('MongoServiceMagicLink', () => {
  let connection: MongoClient;
  let database: Db;

  beforeAll(async () => {
    const url = 'mongodb://localhost:27017';
    connection = await MongoClient.connect(url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    database = await connection.db('accounts-mongo-magic-link-tests');
  });

  beforeEach(async () => {
    await database.collection('users').deleteMany({});
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('#constructor', () => {
    it('should have default options', () => {
      const mongoServiceMagicLink = new MongoServiceMagicLink({
        database,
      });
      expect((mongoServiceMagicLink as any).options).toBeTruthy();
    });

    it('should overwrite options', () => {
      const mongoServiceMagicLink = new MongoServiceMagicLink({
        database,
        userCollectionName: 'usersTest',
      });
      expect((mongoServiceMagicLink as any).options.userCollectionName).toEqual('usersTest');
    });
  });

  describe('setupIndexes', () => {
    it('should create indexes', async () => {
      const mongoServiceMagicLink = new MongoServiceMagicLink({
        database,
      });
      await mongoServiceMagicLink.setupIndexes();
      const ret = await database.collection('users').indexInformation();
      expect(ret).toEqual({
        _id_: [['_id', 1]],
        'services.magicLink.loginTokens.token_1': [['services.magicLink.loginTokens.token', 1]],
      });
    });
  });

  describe('findUserByLoginToken', () => {
    it('should return null for not found user', async () => {
      const mongoServiceMagicLink = new MongoServiceMagicLink({
        database,
      });
      const ret = await mongoServiceMagicLink.findUserByLoginToken('589871d1c9393d445745a57c');
      expect(ret).not.toBeTruthy();
    });

    it('should return user', async () => {
      const mongoServicePassword = new MongoServicePassword({ database });
      const mongoServiceMagicLink = new MongoServiceMagicLink({
        database,
      });
      const userId = await mongoServicePassword.createUser(user);

      const token = 'generatedToken';
      await mongoServiceMagicLink.addLoginToken(userId, user.email, token);

      const ret = await mongoServiceMagicLink.findUserByLoginToken(token);
      expect(ret).toBeTruthy();
      expect((ret as any)._id).toBeTruthy();
      expect(ret!.id).toBeTruthy();
    });

    describe('addLoginToken', () => {
      // eslint-disable-next-line jest/expect-expect
      it('should not convert id', async () => {
        const mongoServicePassword = new MongoServicePassword({
          database,
          convertUserIdToMongoObjectId: false,
          idProvider: () => new ObjectId().toString(),
        });
        const mongoServiceMagicLink = new MongoServiceMagicLink({
          database,
          convertUserIdToMongoObjectId: false,
        });
        const userId = await mongoServicePassword.createUser(user);
        await expect(
          mongoServiceMagicLink.addLoginToken(userId, 'john@doe.com', 'token')
        ).resolves.not.toThrowError();
      });

      it('should add a token', async () => {
        const mongoServicePassword = new MongoServicePassword({ database });
        const mongoServiceMagicLink = new MongoServiceMagicLink({
          database,
        });
        const userId = await mongoServicePassword.createUser(user);
        await mongoServiceMagicLink.addLoginToken(userId, 'john@doe.com', 'token');
        const retUser = await mongoServiceMagicLink.findUserByLoginToken('token');
        const services: any = retUser!.services;
        expect(services.magicLink.loginTokens.length).toEqual(1);
        expect(services.magicLink.loginTokens[0].address).toEqual('john@doe.com');
        expect(services.magicLink.loginTokens[0].token).toEqual('token');
        expect(services.magicLink.loginTokens[0].when).toBeTruthy();
      });
    });

    describe('removeAllLoginTokens', () => {
      it('should not convert id', async () => {
        const mongoServicePassword = new MongoServicePassword({
          database,
          convertUserIdToMongoObjectId: false,
        });
        const mongoServiceMagicLink = new MongoServiceMagicLink({
          database,
          convertUserIdToMongoObjectId: false,
        });
        const userId = await mongoServicePassword.createUser(user);
        await expect(
          mongoServiceMagicLink.removeAllLoginTokens(userId)
        ).resolves.not.toThrowError();
      });

      it('should remove the login tokens', async () => {
        const mongoServicePassword = new MongoServicePassword({ database });
        const mongoServiceMagicLink = new MongoServiceMagicLink({
          database,
        });
        const testToken = 'testLoginToken';
        const userId = await mongoServicePassword.createUser(user);
        await mongoServiceMagicLink.addLoginToken(userId, user.email, testToken);
        const userWithTokens = await mongoServiceMagicLink.findUserByLoginToken(testToken);
        expect(userWithTokens).toBeTruthy();
        await mongoServiceMagicLink.removeAllLoginTokens(userId);
        const userWithDeletedTokens = await mongoServiceMagicLink.findUserByLoginToken(testToken);
        expect(userWithDeletedTokens).not.toBeTruthy();
      });
    });
  });
});
