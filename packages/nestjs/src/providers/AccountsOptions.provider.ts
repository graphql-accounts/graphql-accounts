import {
  NestAccountsOptions,
  NestAccountsOptionsProvider,
  AccountsOptionsFactory,
  AsyncNestAccountsOptions,
} from '../interfaces/AccountsNestModuleOptions';
import { ACCOUNTS_JS_OPTIONS } from '../utils/accounts.constants';
import { isProvider, isClassProvider, isExistingProvider } from '../utils/typeguards';

/**
 * Takes the accounts options and coerces it to a custom Nest provider.
 * If the options look like a provider (it has a useClass, useFactory or useValue property)
 * then all this does is set the provide property to ACCOUNTS_JS_OPTIONS
 *
 * otherwise the value is put into a new custom providers useValue property
 *
 *
 * @param {AccountsOptions} options Either a POJO to use, or a Nest Custom provider
 */
export function accountsOptionsToProvider(options: AsyncNestAccountsOptions): NestAccountsOptionsProvider[] {
  if (!isProvider(options)) {
    return [
      {
        provide: ACCOUNTS_JS_OPTIONS,
        useValue: options as NestAccountsOptions,
      },
    ];
  }

  if (isClassProvider(options) || isExistingProvider(options)) {
    const { useClass, useExisting } = options as any;
    let FactoryProvider = { provide: useClass, useClass };
    return [
      FactoryProvider,
      {
        provide: ACCOUNTS_JS_OPTIONS,
        inject: [useClass || useExisting],
        useFactory: async (optionsFactory: AccountsOptionsFactory) => await optionsFactory.createAccountsOptions(),
      },
    ];
  }

  return [
    {
      ...options,
      provide: ACCOUNTS_JS_OPTIONS,
    },
  ];
}
