import gql from 'graphql-tag';

export default ({ userAsInterface }: { userAsInterface?: boolean }) => gql`
  ${userAsInterface ? 'interface' : 'type'} User {
    id: ID!
    emails: [EmailRecord!]
    username: String
  }

  type EmailRecord {
    address: String
    verified: Boolean
  }
  
  type Tokens {
    refreshToken: String
    accessToken: String
  }

  type LoginResult {
    sessionId: String
    tokens: Tokens
    user: User
  }
`;
