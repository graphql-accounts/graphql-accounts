import gql from 'graphql-tag';

export default ({
  rootQueryName,
  extendTypeDefs = false,
}: {
  rootQueryName?: string;
  extendTypeDefs?: boolean;
}) => gql`
    ${extendTypeDefs ? 'extend' : ''} type ${rootQueryName || 'Query'}  {
        getUser: User
    }
`;
