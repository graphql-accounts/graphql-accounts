import { gql } from 'graphql-modules';
import { CoreModuleConfig } from '../../core';

export default (config: CoreModuleConfig) =>
  gql(`
  extend type ${config.rootQueryName || 'Query'} {
    twoFactorSecret: TwoFactorSecretKey
  }
`);
