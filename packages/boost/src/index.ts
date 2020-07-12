import { DatabaseManager } from '@accounts/database-manager';
import { AccountsModule, authenticated } from '@accounts/graphql-api';
import { AccountsServerOptions } from '@accounts/server';
import { AuthenticationService } from '@accounts/types';
import { ApolloServer } from 'apollo-server';
import { get, merge } from 'lodash';

export { AccountsModule };

export { AccountsServerOptions };

export { authenticated };

export interface AccountsBoostOptions extends AccountsServerOptions {
  storage?: {
    uri?: string;
    name?: string;
  };
  micro?: boolean;
}

const defaultAccountsBoostOptions = {
  storage: {
    uri: 'mongodb://localhost:27017',
    name: 'accounts-js',
  },
};

const requirePackage = (packageName: string) => {
  if (require.resolve(packageName)) {
    return require(packageName);
  }
};

export const accountsBoost = async (userOptions?: AccountsBoostOptions): Promise<AccountsBoost> => {
  const options = merge({}, defaultAccountsBoostOptions, userOptions);

  const databasePackages = {
    ['@accounts/mongo']: async (requiredPackage: any): Promise<any> => {
      // The `@accounts/mongo` package comes with the `mongodb` driver
      // eslint-disable-next-line
      const mongodb = require('mongodb');

      const mongoClient = (await mongodb.MongoClient.connect(get(options, 'storage.uri'))).db(
        get(options, 'storage.name')
      );

      return new requiredPackage.Mongo(mongoClient, options);
    },
  };

  const storage = await Object.keys(databasePackages).reduce(
    async (res, packageName: string): Promise<any> => {
      const requiredPackage = requirePackage(packageName);
      if (requiredPackage) {
        return (databasePackages as any)[packageName](requiredPackage);
      }
      return res;
    },
    Promise.resolve<any>([])
  );

  if (!storage) {
    throw new Error('A database package could not be loaded. Did you install one?');
  }

  // FIXME (boost needs to be fixed yet)
  (options as any).db = new DatabaseManager({
    userStorage: storage,
    sessionStorage: storage,
  });

  const servicePackages = {
    ['@accounts/password']: async (requiredPackage: any): Promise<any> => {
      const AccountsPassword = requiredPackage.default;
      return new AccountsPassword(get(options, ['services', 'password']));
    },
  };

  const services = await Object.keys(servicePackages).reduce(
    async (res, packageName: string): Promise<any> => {
      const requiredPackage = requirePackage(packageName);
      if (requiredPackage) {
        const service = await (servicePackages as any)[packageName](requiredPackage);
        return {
          ...res,
          [service.serviceName]: service,
        };
      }
      return res;
    },
    Promise.resolve({})
  );

  // eslint-disable-next-line
  return new AccountsBoost(options, services);
};

export interface AccountsBoostListenOptions {
  port?: number;
}

const defaultAccountsBoostListenOptions: AccountsBoostListenOptions = {
  port: 4003,
};

export class AccountsBoost {
  public apolloServer: ApolloServer;
  public accountsGraphQL: typeof AccountsModule;

  constructor(options: AccountsBoostOptions, services: { [key: string]: AuthenticationService }) {
    // FIXME (boost needs to be fixed yet)
    this.accountsGraphQL = AccountsModule.forRoot({
      ...options,
      services,
    } as any);

    const { schema, context } = this.accountsGraphQL;

    this.apolloServer = new ApolloServer({
      schema,
      context,
    });
  }

  public async listen(options?: AccountsBoostListenOptions): Promise<any> {
    const res = await this.apolloServer.listen(
      merge({}, defaultAccountsBoostListenOptions, options)
    );

    console.log(`Accounts GraphQL server running at ${res.url}`);

    return res;
  }

  public graphql(): typeof AccountsModule {
    // Cache `this.accountsGraphQL` to avoid regenerating the schema if the user calls `accountsBoost.graphql()` multple times.
    return this.accountsGraphQL;
  }
}

export default accountsBoost;
