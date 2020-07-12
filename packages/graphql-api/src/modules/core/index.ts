import { GraphQLModule } from '@graphql-modules/core';
import makeSchema from './schema';
import { ProviderScope } from '@graphql-modules/di';
import AccountsServer, { AuthenticationServices, AccountsServerOptions } from '@accounts/server';
import AccountsPassword from '@accounts/password';
import AccountsOauth from '@accounts/oauth';
import {
  ServicesCtor,
  DatabaseManagerOrInterfaceCtor,
  isMikroOrm,
  isTypeorm,
  isCodegen,
  isDatabaseManager,
  DatabaseInterfaceCtor,
  DatabaseInterfaceSessionsCtor,
} from '../accounts';
import { DbInterface } from '@accounts/types';
import { AccountsMikroOrm } from '@accounts/mikro-orm';
import { AccountsTypeorm } from '@accounts/typeorm';
import { DatabaseManager } from '@accounts/database-manager';

export type CoreAccountsModuleConfig = AccountsServerOptions & {
  db: DatabaseManagerOrInterfaceCtor;
  userAsInterface?: boolean;
  services: ServicesCtor;
  scope?: ProviderScope;
};

const getDatabaseInterface = (db: DatabaseInterfaceCtor | DatabaseInterfaceSessionsCtor) => {
  if (isMikroOrm(db)) {
    return new AccountsMikroOrm(...db.mikroOrm);
  }
  if (isTypeorm(db)) {
    return new AccountsTypeorm(...db.typeorm);
  }
  throw new Error('A database driver is required');
};

export const CoreAccountsModule: GraphQLModule<CoreAccountsModuleConfig> = new GraphQLModule<
  CoreAccountsModuleConfig
>({
  name: 'accounts-core',
  typeDefs: ({ config }) => makeSchema(config),
  resolvers: {},
  imports: [],
  providers: ({
    config: {
      db,
      scope = ProviderScope.Application,
      services: { password, oauth },
    },
  }) => [
    {
      provide: DbInterface,
      scope,
      useFactory: () => {
        if (isCodegen(db)) {
          return {};
        } else if (isDatabaseManager(db)) {
          return new DatabaseManager({
            userStorage: getDatabaseInterface(db.userStorage),
            sessionStorage: getDatabaseInterface(db.sessionStorage),
          });
        } else {
          return getDatabaseInterface(db);
        }
      },
    },
    {
      provide: AuthenticationServices,
      scope,
      useFactory: () => {
        return {
          ...(password && {
            password: new AccountsPassword(...password),
          }),
          ...(oauth && {
            oauth: new AccountsOauth(...oauth),
          }),
        };
      },
    },
    {
      provide: AccountsServer,
      scope,
      useClass: AccountsServer,
    },
  ],
});
