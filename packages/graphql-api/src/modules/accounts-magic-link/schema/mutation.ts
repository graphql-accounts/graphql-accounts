import gql from 'graphql-tag';
import { AccountsMagicLinkModuleConfig } from '..';

export default (config: AccountsMagicLinkModuleConfig) => gql`
    ${config.extendTypeDefs ? 'extend' : ''} type ${config.rootMutationName || 'Mutation'} {
        requestMagicLinkEmail(email: String!): Boolean
    }
`;
