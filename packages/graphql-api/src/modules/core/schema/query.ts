import { gql } from 'graphql-modules';
import { CoreModuleConfig } from '..';

export default (config: CoreModuleConfig) =>
  gql(`
    ${config.extendTypeDefs ? 'extend' : ''} type ${config.rootQueryName || 'Query'}  {
        getUser: User
    }
`);
