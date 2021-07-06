import { AccountsModuleConfig } from '@accounts/graphql-api';
import { AccountsExpressOptions } from '@accounts/rest-express/lib/types';
import { AccountsServerOptions } from '@accounts/server';
import { AuthenticationService } from '@accounts/types';
import {
  FactoryProvider,
  ModuleMetadata,
  ValueProvider,
  ClassProvider,
  ExistingProvider,
} from '@nestjs/common/interfaces';
import { NullableProp } from '../utils/typing-helpers';

//#region Components of Nestjs Accounts options
/**
 * Accounts Express options specific to the nest module
 */
export interface NestAccountsExpressOptions extends AccountsExpressOptions {
  /**
   * @default false
   */
  ignoreNestRoute?: boolean;
}

/**
 * Accounts graphql options
 */
export interface NestAccountsGraphQLOptions extends NullableProp<AccountsModuleConfig, 'accountsServer'> {}

/**
 * Accounts services to pass into accounts-server as the second constructor parameter
 */
export interface AccountsServices {
  [key: string]: AuthenticationService;
}

//#endregion Components of Nestjs Accounts options

/**
 * Accounts options for Nest.
 * Holds the config for different parts of the nestjs-accountsjs module
 */
export interface NestAccountsOptions {
  serverOptions: AccountsServerOptions;
  services?: AccountsServices;
  /**
   * rest-express options
   */
  REST?: NestAccountsExpressOptions | boolean;
  GraphQL?: NestAccountsGraphQLOptions | boolean;
}

export type NestAccountsOptionsResult = Promise<NestAccountsOptions> | NestAccountsOptions;

//#region Interfaces for ways to provide NestAccountsOptions
/**
 * Factory class interface
 */
export interface AccountsOptionsFactory {
  createAccountsOptions(): NestAccountsOptionsResult;
}
/**
 * Nest custom provider for NestAccountsOptions
 */
export type NestAccountsOptionsProvider =
  | ValueProvider<NestAccountsOptionsResult>
  | FactoryProvider<NestAccountsOptionsResult>
  | ClassProvider<AccountsOptionsFactory>
  | ExistingProvider<AccountsOptionsFactory>;

/**
 * Nest custom provider without the provide key because it will be defaulted in to ACCOUNTS_JS_OPTIONS internally
 */
export type NestAccountsOptionsPartialProvider = Omit<NestAccountsOptionsProvider, 'provide'>;

//#endregion Interfaces for ways to provide NestAccountsOptions

/**
 * Options for the actual AccountsJs Nest Module register async function
 *
 * Supports sending any valid Nest properties that you would normally set on a module, as well as using a custom provider
 */

export type AsyncNestAccountsOptions = (NestAccountsOptionsProvider | NestAccountsOptionsPartialProvider) &
  Partial<ModuleMetadata>;
