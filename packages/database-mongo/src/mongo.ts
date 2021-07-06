import { Collection, Db, ObjectID, IndexOptions } from 'mongodb';
import {
  ConnectionInformations,
  CreateUserServicePassword,
  DatabaseInterface,
  User,
  Session,
} from '@accounts/types';
import { MongoSessions } from '@accounts/mongo-sessions';
import { MongoServicePassword } from '@accounts/mongo-password';
import { AccountsMongoOptions } from './types';

const toMongoID = (objectId: string | ObjectID) => {
  if (typeof objectId === 'string') {
    return new ObjectID(objectId);
  }
  return objectId;
};

const defaultOptions = {
  collectionName: 'users',
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  convertUserIdToMongoObjectId: true,
  convertSessionIdToMongoObjectId: true,
  caseSensitiveUserName: true,
  dateProvider: (date?: Date) => (date ? date.getTime() : Date.now()),
};

export class Mongo implements DatabaseInterface {
  // Options of Mongo class
  private options: AccountsMongoOptions & typeof defaultOptions;
  // Db object
  private db: Db;
  // Account collection
  private collection: Collection;
  // Session adaptor
  private sessions: MongoSessions;
  // Password service
  private servicePassword: MongoServicePassword;

  constructor(db: any, options: AccountsMongoOptions = {}) {
    this.options = {
      ...defaultOptions,
      ...options,
      timestamps: { ...defaultOptions.timestamps, ...options.timestamps },
    };
    if (!db) {
      throw new Error('A database connection is required');
    }
    this.db = db;
    this.collection = this.db.collection(this.options.collectionName);
    this.sessions = new MongoSessions({ ...this.options, database: this.db });
    this.servicePassword = new MongoServicePassword({ ...this.options, database: this.db });
  }

  /**
   * Setup the mongo indexes needed.
   * @param options Options passed to the mongo native `createIndex` method.
   */
  public async setupIndexes(options: Omit<IndexOptions, 'unique' | 'sparse'> = {}): Promise<void> {
    await this.sessions.setupIndexes(options);
    await this.servicePassword.setupIndexes(options);
  }

  public async findUserById(userId: string): Promise<User | null> {
    return this.servicePassword.findUserById(userId);
  }

  public async createUser(user: CreateUserServicePassword): Promise<string> {
    return this.servicePassword.createUser(user);
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    return this.servicePassword.findUserByEmail(email);
  }
  public async findUserByUsername(username: string): Promise<User | null> {
    return this.servicePassword.findUserByUsername(username);
  }

  public async findPasswordHash(userId: string): Promise<string | null> {
    return this.servicePassword.findPasswordHash(userId);
  }

  public async findUserByEmailVerificationToken(token: string): Promise<User | null> {
    return this.servicePassword.findUserByEmailVerificationToken(token);
  }

  public async findUserByResetPasswordToken(token: string): Promise<User | null> {
    return this.servicePassword.findUserByResetPasswordToken(token);
  }

  public async addEmail(userId: string, newEmail: string, verified: boolean): Promise<void> {
    return this.servicePassword.addEmail(userId, newEmail, verified);
  }

  public async removeEmail(userId: string, email: string): Promise<void> {
    return this.servicePassword.removeEmail(userId, email);
  }

  public async verifyEmail(userId: string, email: string): Promise<void> {
    return this.servicePassword.verifyEmail(userId, email);
  }

  public async setUsername(userId: string, newUsername: string): Promise<void> {
    return this.servicePassword.setUsername(userId, newUsername);
  }

  public async setPassword(userId: string, newPassword: string): Promise<void> {
    return this.servicePassword.setPassword(userId, newPassword);
  }

  public async removeAllResetPasswordTokens(userId: string): Promise<void> {
    return this.servicePassword.removeAllResetPasswordTokens(userId);
  }

  public async addEmailVerificationToken(
    userId: string,
    email: string,
    token: string
  ): Promise<void> {
    return this.servicePassword.addEmailVerificationToken(userId, email, token);
  }

  public async addResetPasswordToken(
    userId: string,
    email: string,
    token: string,
    reason: string,
    expireAfterSeconds: number
  ): Promise<void> {
    return this.servicePassword.addResetPasswordToken(
      userId,
      email,
      token,
      reason,
      expireAfterSeconds
    );
  }

  public async createSession(
    userId: string,
    token: string,
    connection: ConnectionInformations = {},
    extraData?: object
  ): Promise<string> {
    return this.sessions.createSession(userId, token, connection, extraData);
  }

  public async findSessionById(sessionId: string): Promise<Session | null> {
    return this.sessions.findSessionById(sessionId);
  }

  public async findSessionByToken(token: string): Promise<Session | null> {
    return this.sessions.findSessionByToken(token);
  }

  public async updateSession(
    sessionId: string,
    connection: ConnectionInformations,
    newToken?: string
  ): Promise<void> {
    return this.sessions.updateSession(sessionId, connection, newToken);
  }

  public async invalidateSession(sessionId: string): Promise<void> {
    return this.sessions.invalidateSession(sessionId);
  }

  public async invalidateAllSessions(userId: string, excludedSessionIds?: string[]): Promise<void> {
    return this.sessions.invalidateAllSessions(userId, excludedSessionIds);
  }

  public async findUserByServiceId(serviceName: string, serviceId: string): Promise<User | null> {
    const user = await this.collection.findOne({
      [`services.${serviceName}.id`]: serviceId,
    });
    if (user) {
      user.id = user._id.toString();
    }
    return user;
  }

  public async setService(userId: string, serviceName: string, service: object): Promise<void> {
    const id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    await this.collection.updateOne(
      { _id: id },
      {
        $set: {
          [`services.${serviceName}`]: service,
          [this.options.timestamps.updatedAt]: this.options.dateProvider(),
        },
      }
    );
  }

  public async unsetService(userId: string, serviceName: string): Promise<void> {
    const id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    await this.collection.updateOne(
      { _id: id },
      {
        $set: {
          [this.options.timestamps.updatedAt]: this.options.dateProvider(),
        },
        $unset: {
          [`services.${serviceName}`]: '',
        },
      }
    );
  }

  public async setUserDeactivated(userId: string, deactivated: boolean): Promise<void> {
    const id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    await this.collection.updateOne(
      { _id: id },
      {
        $set: {
          deactivated,
          [this.options.timestamps.updatedAt]: this.options.dateProvider(),
        },
      }
    );
  }
}
