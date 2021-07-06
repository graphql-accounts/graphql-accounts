import AccountsServer from '@accounts/server';
import { Provider } from '@nestjs/common';
import { AccountsSessionInterceptorProvider } from '../interceptors/ResumeSession.interceptor';
import { AsyncNestAccountsOptions } from '../interfaces/AccountsNestModuleOptions';
import { accountsOptionsToProvider } from '../providers/AccountsOptions.provider';
import { AccountsServerProvider } from '../providers/AccountsServer.provider';
import { GraphQLModuleProvider } from '../providers/GraphQLModule';
import { ACCOUNTS_JS_SERVER } from './accounts.constants';

export function buildProviders(options: AsyncNestAccountsOptions, server?: AccountsServer): Provider[] {
  if (!server || !(server instanceof AccountsServer)) {
    return buildAsyncProviders(options);
  }

  return [
    AccountsSessionInterceptorProvider,
    ...accountsOptionsToProvider(options),
    {
      provide: ACCOUNTS_JS_SERVER,
      useValue: server,
    },
    GraphQLModuleProvider,
  ];
}
/**
 * Check and get the providers from the options passed in.
 * This will create the custom providers for the ACCOUNTS_JS_SERVER and ACCOUNTS_JS_OPTIONS
 * so that they can be injected anywhere with Nest.
 *
 * This will also create the AccountsSessionInterceptor as a global interceptor
 * so that the accounts session is restored on every request.
 *
 * @param {AsyncNestAccountsOptions} options for the accounts module
 */
export function buildAsyncProviders(options: AsyncNestAccountsOptions): Provider[] {
  const { providers = [], ...accountsOptions } = options;

  return [
    ...providers,
    AccountsSessionInterceptorProvider,
    ...accountsOptionsToProvider(accountsOptions),
    AccountsServerProvider,
    GraphQLModuleProvider,
  ];
}
