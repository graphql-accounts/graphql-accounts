import accountsExpress from '@accounts/rest-express';
import AccountsServer from '@accounts/server';
import { Inject, Module } from '@nestjs/common';
import { MODULE_PATH } from '@nestjs/common/constants';
import { DynamicModule, MiddlewareConsumer, NestModule } from '@nestjs/common/interfaces';
import { join, normalize } from 'path';
import { resolve } from 'url';
import { debuglog } from 'util';
import { AsyncNestAccountsOptions, NestAccountsOptions } from './interfaces/AccountsNestModuleOptions';
import { ACCOUNTS_JS_GRAPHQL, ACCOUNTS_JS_OPTIONS, ACCOUNTS_JS_SERVER } from './utils/accounts.constants';
import { buildAsyncProviders, buildProviders } from './utils/buildProviders';
import { extractModuleMetadata } from './utils/extractModuleOptions';
import { getRESTOptions } from './utils/getRestOptions';
const debug = debuglog('nestjs-accounts');

type NonServerNestAccountsOptions = Omit<NestAccountsOptions, 'serverOptions' | 'services'>;

@Module({})
export class AccountsJsModule implements NestModule {
  static register(options: NestAccountsOptions): DynamicModule;
  static register(server: AccountsServer, options?: NonServerNestAccountsOptions): DynamicModule;
  static register(
    serverOrOptions: AccountsServer | NestAccountsOptions,
    options?: NonServerNestAccountsOptions,
  ): DynamicModule {
    let providers = [];

    if (serverOrOptions instanceof AccountsServer) {
      providers = buildProviders(options || {}, serverOrOptions);
    } else {
      providers = buildProviders(serverOrOptions);
    }

    return {
      module: AccountsJsModule,
      providers,
      exports: [ACCOUNTS_JS_SERVER, ACCOUNTS_JS_OPTIONS, ACCOUNTS_JS_GRAPHQL],
    };
  }
  /**
   * Register and configure the AccountsJsModule.
   *
   * @param {AsyncNestAccountsOptions} metadata for the accounts module
   * @returns {DynamicModule} Nest module
   */
  static registerAsync(metadata: AsyncNestAccountsOptions): DynamicModule {
    return {
      module: AccountsJsModule,
      ...extractModuleMetadata(metadata),
      providers: buildAsyncProviders(metadata),
      exports: [ACCOUNTS_JS_SERVER, ACCOUNTS_JS_OPTIONS, ACCOUNTS_JS_GRAPHQL],
    };
  }

  constructor(
    @Inject(ACCOUNTS_JS_SERVER) private readonly accountsServer: AccountsServer,
    @Inject(ACCOUNTS_JS_OPTIONS) private readonly options: NestAccountsOptions,
  ) {}
  /**
   * Mount the accountsExpress middleware
   *
   * @param consumer
   */
  configure(consumer: MiddlewareConsumer) {
    if (this.options.REST) {
      const { path, ignoreNestRoute, ...opts } = getRESTOptions(this.options);
      let nestPath = Reflect.getMetadata(MODULE_PATH, AccountsJsModule);

      let pathToUse: string;
      if (!ignoreNestRoute && nestPath) {
        pathToUse = resolve(join(nestPath, '/'), path || '');
      } else {
        pathToUse = resolve('/', path || '/accounts');
      }
      pathToUse = normalize(pathToUse);

      debug(`mounting @accounts/rest-express on path '${pathToUse}'`);
      consumer
        // forRoutes will scope this middleware to it's route and trim the prefix, we'll
        // mount the accountsExpress middleware without a path and use forRoutes to define the prefix
        .apply(accountsExpress(this.accountsServer, { path: '', ...opts }))
        .forRoutes(pathToUse);
    }
  }
}
