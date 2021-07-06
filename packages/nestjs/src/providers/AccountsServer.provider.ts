import AccountsServer from '@accounts/server';
import { FactoryProvider } from '@nestjs/common/interfaces';
import { NestAccountsOptions } from '../interfaces/AccountsNestModuleOptions';
import { ACCOUNTS_JS_OPTIONS, ACCOUNTS_JS_SERVER } from '../utils/accounts.constants';

export const AccountsServerProvider: FactoryProvider<AccountsServer> = {
  provide: ACCOUNTS_JS_SERVER,
  useFactory: (options: NestAccountsOptions) => {
    const { serverOptions, services } = options;
    return new AccountsServer(serverOptions, services || {});
  },
  inject: [ACCOUNTS_JS_OPTIONS],
};
