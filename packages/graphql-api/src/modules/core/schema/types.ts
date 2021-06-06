import { gql } from 'graphql-modules';
import { CoreModuleConfig } from '..';

export default ({ userAsInterface }: CoreModuleConfig) =>
  gql(`
  directive @auth on FIELD_DEFINITION | OBJECT

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
  }

  input ImpersonationUserIdentityInput {
    userId: String
    username: String
    email: String
  }
`);
