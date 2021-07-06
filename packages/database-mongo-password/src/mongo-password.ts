import { Collection, Db, ObjectID, IndexOptions } from 'mongodb';
import { CreateUserServicePassword, DatabaseInterfaceServicePassword, User } from '@accounts/types';
import { toMongoID } from './utils';

export interface MongoUser {
  _id: string | object;
  username?: string;
  services: {
    password?: {
      bcrypt: string;
    };
  };
  emails?: [
    {
      address: string;
      verified: boolean;
    }
  ];
  [key: string]: any;
}

export interface MongoResetPasswordToken {
  _id: string | object;
  userId: string;
  token: string;
  address: string;
  when: Date;
  reason: string;
  expireAt: Date;
}

export interface MongoServicePasswordOptions {
  /**
   * Mongo database object.
   */
  database: Db;
  /**
   * The users collection name.
   * Default 'users'.
   */
  userCollectionName?: string;
  /**
   * The password reset token collection name;
   * Default 'resetPasswordTokens'.
   */
  resetPasswordTokenCollectionName?: string;
  /**
   * Should automatically delete the user reset password tokens when they expire via mongo TTL.
   * Default to 'true'.
   */
  resetPasswordTokenTTL?: boolean;
  /**
   * The timestamps for the users collection.
   * Default 'createdAt' and 'updatedAt'.
   */
  timestamps?: {
    createdAt: string;
    updatedAt: string;
  };
  /**
   * Should the user collection use _id as string or ObjectId.
   * Default 'true'.
   */
  convertUserIdToMongoObjectId?: boolean;
  /**
   * Perform case intensitive query for user name.
   * Default 'true'.
   */
  caseSensitiveUserName?: boolean;
  /**
   * Function that generate the id for new objects.
   */
  idProvider?: () => string | object;
  /**
   * Function that generate the date for the timestamps.
   * Default to `(date?: Date) => (date ? date.getTime() : Date.now())`.
   */
  dateProvider?: (date?: Date) => any;
}

const defaultOptions = {
  userCollectionName: 'users',
  resetPasswordTokenCollectionName: 'resetPasswordTokens',
  resetPasswordTokenTTL: true,
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  convertUserIdToMongoObjectId: true,
  caseSensitiveUserName: true,
  dateProvider: (date?: Date) => (date ? date.getTime() : Date.now()),
};

export class MongoServicePassword implements DatabaseInterfaceServicePassword {
  // Merged options that can be used
  private options: MongoServicePasswordOptions & typeof defaultOptions;
  // Mongo database object
  private database: Db;
  // Mongo user collection
  private userCollection: Collection;
  // Mongo password reset token collection
  private resetPasswordTokenCollection: Collection<MongoResetPasswordToken>;

  constructor(options: MongoServicePasswordOptions) {
    this.options = {
      ...defaultOptions,
      ...options,
      timestamps: { ...defaultOptions.timestamps, ...options.timestamps },
    };

    this.database = this.options.database;
    this.userCollection = this.database.collection(this.options.userCollectionName);
    this.resetPasswordTokenCollection = this.database.collection(
      this.options.resetPasswordTokenCollectionName
    );
  }

  /**
   * Setup the mongo indexes needed for the password service.
   * @param options Options passed to the mongo native `createIndex` method.
   */
  public async setupIndexes(options: Omit<IndexOptions, 'unique' | 'sparse'> = {}): Promise<void> {
    // Username index to allow fast queries made with username
    // Username is unique
    await this.userCollection.createIndex('username', {
      ...options,
      unique: true,
      sparse: true,
    });
    // Emails index to allow fast queries made with emails, a user can have multiple emails
    // Email address is unique
    await this.userCollection.createIndex('emails.address', {
      ...options,
      unique: true,
      sparse: true,
    });
    // Token index used to verify the email address of a user
    await this.userCollection.createIndex('services.email.verificationTokens.token', {
      ...options,
      sparse: true,
    });
    // Token index used to verify a password reset request
    await this.resetPasswordTokenCollection.createIndex('token', {
      ...options,
      unique: true,
      sparse: true,
    });
    if (this.options.resetPasswordTokenTTL) {
      await this.resetPasswordTokenCollection.createIndex('expireAt', {
        expireAfterSeconds: 0,
      });
    }
  }

  /**
   * Create a new user by providing an email and/or a username and password.
   * Emails are saved lowercased.
   */
  public async createUser({
    password,
    username,
    email,
    ...cleanUser
  }: CreateUserServicePassword): Promise<string> {
    const user: Omit<MongoUser, '_id'> = {
      ...cleanUser,
      services: {
        password: {
          bcrypt: password,
        },
      },
      [this.options.timestamps.createdAt]: this.options.dateProvider(),
      [this.options.timestamps.updatedAt]: this.options.dateProvider(),
    };
    if (username) {
      user.username = username;
    }
    if (email) {
      user.emails = [{ address: email.toLowerCase(), verified: false }];
    }
    if (this.options.idProvider) {
      user._id = this.options.idProvider();
    }
    const ret = await this.userCollection.insertOne(user);
    return (ret.ops[0]._id as ObjectID).toString();
  }

  /**
   * Get a user by his id.
   * @param userId Id used to query the user.
   */
  public async findUserById(userId: string): Promise<User | null> {
    const id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    const user = await this.userCollection.findOne({ _id: id });
    if (user) {
      user.id = user._id.toString();
    }
    return user;
  }

  /**
   * Get a user by one of his emails.
   * Email will be lowercased before running the query.
   * @param email Email used to query the user.
   */
  public async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.userCollection.findOne({
      'emails.address': email.toLowerCase(),
    });
    if (user) {
      user.id = user._id.toString();
    }
    return user;
  }

  /**
   * Get a user by his username.
   * Set the `caseSensitiveUserName` option to false if you want the username to be case sensitive.
   * @param email Email used to query the user.
   */
  public async findUserByUsername(username: string): Promise<User | null> {
    const filter = this.options.caseSensitiveUserName
      ? { username }
      : {
          $where: `obj.username && (obj.username.toLowerCase() === "${username.toLowerCase()}")`,
        };
    const user = await this.userCollection.findOne(filter);
    if (user) {
      user.id = user._id.toString();
    }
    return user;
  }

  /**
   * Return the user password hash.
   * If the user has no password set, will return null.
   * @param userId Id used to query the user.
   */
  public async findPasswordHash(userId: string): Promise<string | null> {
    const user = await this.findUserById(userId);
    return user?.services?.password?.bcrypt ?? null;
  }

  /**
   * Get a user by one of the email verification token.
   * @param token Verification token used to query the user.
   */
  public async findUserByEmailVerificationToken(token: string): Promise<User | null> {
    const user = await this.userCollection.findOne({
      'services.email.verificationTokens.token': token,
    });
    if (user) {
      user.id = user._id.toString();
    }
    return user;
  }

  /**
   * Get a user by one of the reset password token.
   * @param token Reset password token used to query the user.
   */
  public async findUserByResetPasswordToken(token: string): Promise<User | null> {
    const resetPasswordToken = await this.resetPasswordTokenCollection.findOne({ token });
    if (!resetPasswordToken) {
      return null;
    }

    const userId = this.options.convertUserIdToMongoObjectId
      ? toMongoID(resetPasswordToken.userId)
      : resetPasswordToken.userId;
    const user = await this.userCollection.findOne({ _id: userId });
    if (user) {
      user.id = user._id.toString();
      user.services.password.reset = [
        { ...resetPasswordToken, when: resetPasswordToken.when.getTime() },
      ];
    }
    return user;
  }

  /**
   * Add an email address for a user.
   * @param userId Id used to update the user.
   * @param newEmail A new email address for the user.
   * @param verified Whether the new email address should be marked as verified.
   */
  public async addEmail(userId: string, newEmail: string, verified: boolean): Promise<void> {
    const id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    const ret = await this.userCollection.updateOne(
      { _id: id },
      {
        $addToSet: {
          emails: {
            address: newEmail.toLowerCase(),
            verified,
          },
        },
        $set: {
          [this.options.timestamps.updatedAt]: this.options.dateProvider(),
        },
      }
    );
    if (ret.result.nModified === 0) {
      throw new Error('User not found');
    }
  }

  /**
   * Remove an email address for a user.
   * @param userId Id used to update the user.
   * @param email The email address to remove.
   */
  public async removeEmail(userId: string, email: string): Promise<void> {
    const id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    const ret = await this.userCollection.updateOne(
      { _id: id },
      {
        $pull: { emails: { address: email.toLowerCase() } },
        $set: {
          [this.options.timestamps.updatedAt]: this.options.dateProvider(),
        },
      }
    );
    if (ret.result.nModified === 0) {
      throw new Error('User not found');
    }
  }

  /**
   * Marks the user's email address as verified.
   * @param userId Id used to update the user.
   * @param email The email address to mark as verified.
   */
  public async verifyEmail(userId: string, email: string): Promise<void> {
    const id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    const ret = await this.userCollection.updateOne(
      { _id: id, 'emails.address': email },
      {
        $set: {
          'emails.$.verified': true,
          [this.options.timestamps.updatedAt]: this.options.dateProvider(),
        },
        $pull: { 'services.email.verificationTokens': { address: email } },
      }
    );
    if (ret.result.nModified === 0) {
      throw new Error('User not found');
    }
  }

  /**
   * Change the username of the user.
   * If the username already exists, the function will fail.
   * @param userId Id used to update the user.
   * @param newUsername A new username for the user.
   */
  public async setUsername(userId: string, newUsername: string): Promise<void> {
    const id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    const ret = await this.userCollection.updateOne(
      { _id: id },
      {
        $set: {
          username: newUsername,
          [this.options.timestamps.updatedAt]: this.options.dateProvider(),
        },
      }
    );
    if (ret.result.nModified === 0) {
      throw new Error('User not found');
    }
  }

  /**
   * Change the password for a user.
   * @param userId Id used to update the user.
   * @param newPassword A new password for the user.
   */
  public async setPassword(userId: string, newPassword: string): Promise<void> {
    const id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    const ret = await this.userCollection.updateOne(
      { _id: id },
      {
        $set: {
          'services.password.bcrypt': newPassword,
          [this.options.timestamps.updatedAt]: this.options.dateProvider(),
        },
      }
    );
    if (ret.result.nModified === 0) {
      throw new Error('User not found');
    }
  }

  /**
   * Add an email verification token to a user.
   * @param userId Id used to update the user.
   * @param email Which address of the user's to link the token to.
   * @param token Random token used to verify the user email.
   */
  public async addEmailVerificationToken(
    userId: string,
    email: string,
    token: string
  ): Promise<void> {
    const _id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    await this.userCollection.updateOne(
      { _id },
      {
        $push: {
          'services.email.verificationTokens': {
            token,
            address: email.toLowerCase(),
            when: this.options.dateProvider(),
          },
        },
      }
    );
  }

  /**
   * Add a reset password token to a user.
   * @param userId Id used to update the user.
   * @param email Which address of the user's to link the token to.
   * @param token Random token used to verify the user email.
   * @param reason Reason to use for the token.
   */
  public async addResetPasswordToken(
    userId: string,
    email: string,
    token: string,
    reason: string,
    expireAfterSeconds: number
  ): Promise<void> {
    const now = new Date();
    await this.resetPasswordTokenCollection.insertOne({
      userId,
      address: email.toLowerCase(),
      token,
      when: now,
      reason,
      // Set when the object should be removed by mongo TTL
      expireAt: new Date(now.getTime() + expireAfterSeconds * 1000),
    });
  }

  /**
   * Remove all the reset password tokens for a user.
   * @param userId Id used to update the user.
   */
  public async removeAllResetPasswordTokens(userId: string): Promise<void> {
    await this.resetPasswordTokenCollection.deleteMany({ userId });
  }
}
