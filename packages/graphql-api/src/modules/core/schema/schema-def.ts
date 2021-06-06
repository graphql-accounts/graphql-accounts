import { gql } from 'graphql-modules';
import { CoreModuleConfig } from '..';

export default (config: CoreModuleConfig) =>
  config.withSchemaDefinition
    ? [
        gql(`
          schema {
            query: ${config.rootQueryName || 'Query'}
            mutation: ${config.rootMutationName || 'Mutation'}
          }
        `),
      ]
    : [];
