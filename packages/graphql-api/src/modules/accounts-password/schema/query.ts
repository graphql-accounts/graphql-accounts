import gql from 'graphql-tag';

export default ({
  rootQueryName,
  extendTypeDefs = true,
}: {
  rootQueryName?: string;
  extendTypeDefs?: boolean;
}) => gql`
  ${extendTypeDefs ? 'extend' : ''} type ${rootQueryName || 'Query'} {
        twoFactorSecret: TwoFactorSecretKey
    }
`;
