import { Collection, Db, IndexOptions } from 'mongodb';
import { DatabaseInterfaceServiceMagicLink, User } from '@accounts/types';
import { toMongoID } from './utils';

export interface MongoServiceMagicLinkOptions {
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
   * Should the user collection use _id as string or ObjectId.
   * Default 'true'.
   */
  convertUserIdToMongoObjectId?: boolean;
  /**
   * Function that generate the date for the timestamps.
   * Default to `(date?: Date) => (date ? date.getTime() : Date.now())`.
   */
  dateProvider?: (date?: Date) => any;
}

const defaultOptions = {
  userCollectionName: 'users',
  convertUserIdToMongoObjectId: true,
  dateProvider: (date?: Date) => (date ? date.getTime() : Date.now()),
};

export class MongoServiceMagicLink implements DatabaseInterfaceServiceMagicLink {
  // Merged options that can be used
  private options: MongoServiceMagicLinkOptions & typeof defaultOptions;
  // Mongo database object
  private database: Db;
  // Mongo user collection
  private userCollection: Collection;

  constructor(options: MongoServiceMagicLinkOptions) {
    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.database = this.options.database;
    this.userCollection = this.database.collection(this.options.userCollectionName);
  }

  /**
   * Setup the mongo indexes needed for the token service.
   * @param options Options passed to the mongo native `createIndex` method.
   */
  public async setupIndexes(options: Omit<IndexOptions, 'unique' | 'sparse'> = {}): Promise<void> {
    // Token index used to verify the email address of a user
    await this.userCollection.createIndex('services.magicLink.loginTokens.token', {
      ...options,
      sparse: true,
    });
  }

  /**
   * Find a user from a login token.
   * @param token Random token used to allow user to login.
   */
  public async findUserByLoginToken(token: string): Promise<User | null> {
    const user = await this.userCollection.findOne({
      'services.magicLink.loginTokens.token': token,
    });
    if (user) {
      user.id = user._id.toString();
    }
    return user;
  }

  /**
   * Add a login token to a user.
   * @param userId Id used to update the user.
   * @param email Which address of the user's to link the token to.
   * @param token Random token used to allow user to login.
   */
  public async addLoginToken(userId: string, email: string, token: string): Promise<void> {
    const _id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    await this.userCollection.updateOne(
      { _id },
      {
        $push: {
          'services.magicLink.loginTokens': {
            token,
            address: email.toLowerCase(),
            when: this.options.dateProvider(),
          },
        },
      }
    );
  }

  /**
   * Remove all the login tokens for a user.
   * @param userId Id used to update the user.
   */
  public async removeAllLoginTokens(userId: string): Promise<void> {
    const id = this.options.convertUserIdToMongoObjectId ? toMongoID(userId) : userId;
    await this.userCollection.updateOne(
      { _id: id },
      {
        $unset: {
          'services.magicLink.loginTokens': '',
        },
      }
    );
  }
}
