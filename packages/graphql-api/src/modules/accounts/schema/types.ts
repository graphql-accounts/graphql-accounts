import gql from 'graphql-tag';

export default gql`
  directive @auth on FIELD_DEFINITION | OBJECT

  type ImpersonateReturn {
    authorized: Boolean
    tokens: Tokens
    user: User
  }

  input UserInput {
    id: ID
    email: String
    username: String
  }

  input AuthenticateParamsInput {
    # Twitter, Instagram
    access_token: String
    # Twitter
    access_token_secret: String
    # OAuth
    provider: String
    # Password
    password: String
    # Password
    user: UserInput
    # Two factor
    code: String
    # Token
    token: String
  }

  input ImpersonationUserIdentityInput {
    userId: String
    username: String
    email: String
  }
`;
