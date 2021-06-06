import { gql } from 'graphql-modules';

export default gql`
  type CreateUserResult {
    # Will be returned only if ambiguousErrorMessages is set to false.
    userId: ID
    # Will be returned only if enableAutologin is set to true.
    loginResult: LoginResult
  }

  type TwoFactorSecretKey {
    ascii: String
    base32: String
    hex: String
    qr_code_ascii: String
    qr_code_hex: String
    qr_code_base32: String
    google_auth_qr: String
    otpauth_url: String
  }

  input TwoFactorSecretKeyInput {
    ascii: String
    base32: String
    hex: String
    qr_code_ascii: String
    qr_code_hex: String
    qr_code_base32: String
    google_auth_qr: String
    otpauth_url: String
  }

  input CreateUserInput {
    username: String
    email: String
    password: String
  }
`;
