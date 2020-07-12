import { GraphQLModule } from '@graphql-modules/core';
import { ProviderScope } from '@graphql-modules/di';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { User, ConnectionInformations } from '@accounts/types';
import { IncomingMessage } from 'http';
import TypesTypeDefs from './schema/types';
import getQueryTypeDefs from './schema/query';
import getMutationTypeDefs from './schema/mutation';
import getSchemaDef from './schema/schema-def';
import { Query } from './resolvers/query';
import { Mutation } from './resolvers/mutation';
import { User as UserResolvers } from './resolvers/user';
import { AccountsPasswordModule } from '../accounts-password';
import { AuthenticatedDirective } from '../../utils/authenticated-directive';
import { context } from '../../utils';
import { CoreAccountsModule } from '../core';
import { AccountsPassword } from '@accounts/password';
import { AccountsOauth } from '@accounts/oauth';
import { AccountsMikroOrm } from '@accounts/mikro-orm';
import { AccountsTypeorm } from '@accounts/typeorm';
import { AccountsServerOptions } from '@accounts/server';
import { RedisSessions } from '@accounts/redis';

export interface ServicesCtor {
  password?: ConstructorParameters<typeof AccountsPassword>;
  oauth?: ConstructorParameters<typeof AccountsOauth>;
}

export interface Services<CustomUser extends User = User> {
  password?: AccountsPassword<CustomUser>;
  oauth?: AccountsOauth<CustomUser>;
}

export interface AccountsRequest {
  req: IncomingMessage;
}

export type DatabaseManagerOrInterfaceCtor =
  | { codegen: true }
  | DatabaseInterfaceCtor
  | DatabaseManagerCtor;

export type DatabaseManagerCtor = {
  userStorage: DatabaseInterfaceCtor;
  sessionStorage: DatabaseInterfaceCtor | DatabaseInterfaceSessionsCtor;
};

export type DatabaseInterfaceCtor =
  | { mikroOrm: ConstructorParameters<typeof AccountsMikroOrm> }
  | { typeorm: ConstructorParameters<typeof AccountsTypeorm> };

export type DatabaseInterfaceSessionsCtor = {
  redis: ConstructorParameters<typeof RedisSessions>;
};

export function isDatabaseManager(obj: DatabaseManagerOrInterfaceCtor): obj is DatabaseManagerCtor {
  return (obj as DatabaseManagerCtor).userStorage != null;
}

export function isCodegen(obj: DatabaseManagerOrInterfaceCtor): obj is { codegen: true } {
  return (obj as { codegen: true }).codegen === true;
}

export function isMikroOrm(
  obj: DatabaseInterfaceCtor | DatabaseInterfaceSessionsCtor
): obj is { mikroOrm: ConstructorParameters<typeof AccountsMikroOrm> } {
  return (obj as { mikroOrm: ConstructorParameters<typeof AccountsMikroOrm> }).mikroOrm != null;
}

export function isTypeorm(
  obj: DatabaseInterfaceCtor | DatabaseInterfaceSessionsCtor
): obj is { typeorm: ConstructorParameters<typeof AccountsTypeorm> } {
  return (obj as { typeorm: ConstructorParameters<typeof AccountsTypeorm> }).typeorm != null;
}

export type AccountsModuleConfig = AccountsServerOptions & {
  db: DatabaseManagerOrInterfaceCtor;
  services: ServicesCtor;
  scope?: ProviderScope;
  rootQueryName?: string;
  rootMutationName?: string;
  extendTypeDefs?: boolean;
  withSchemaDefinition?: boolean;
  headerName?: string;
  userAsInterface?: boolean;
  excludeAddUserInContext?: boolean;
};

export interface AccountsModuleContext<IUser = User> {
  authToken?: string;
  user?: IUser;
  userId?: string;
  userAgent: string | null;
  ip: string | null;
  infos: ConnectionInformations;
}

// You can see the below. It is really easy to create a reusable GraphQL-Module with different configurations

export const AccountsModule: GraphQLModule<
  AccountsModuleConfig,
  AccountsRequest,
  AccountsModuleContext
> = new GraphQLModule<AccountsModuleConfig, AccountsRequest, AccountsModuleContext>({
  name: 'accounts',
  typeDefs: ({ config }) =>
    mergeTypeDefs(
      [
        TypesTypeDefs,
        getQueryTypeDefs(config),
        getMutationTypeDefs(config),
        ...getSchemaDef(config),
      ],
      {
        useSchemaDefinition: config.withSchemaDefinition,
      }
    ),
  resolvers: ({ config }) =>
    ({
      [config.rootQueryName || 'Query']: Query,
      [config.rootMutationName || 'Mutation']: Mutation,
      User: UserResolvers,
    } as any),
  // If necessary, import AccountsPasswordModule together with this module
  imports: ({ config }) => [
    CoreAccountsModule.forRoot({ ...config }),
    ...(config.services.password
      ? [
          AccountsPasswordModule.forRoot({
            ...config,
            ctorParams: config.services.password,
          }),
        ]
      : []),
  ],
  context: context('accounts'),
  schemaDirectives: {
    auth: AuthenticatedDirective,
  },
  configRequired: true,
});
