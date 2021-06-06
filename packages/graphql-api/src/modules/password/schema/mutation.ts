import { gql } from 'graphql-modules';
import { CoreModuleConfig } from '../../core';

export default (config: CoreModuleConfig) =>
  gql(`
  extend type ${config.rootMutationName || 'Mutation'} {
    # Creates a user with a password, returns the id corresponding db ids, such as number IDs, ObjectIDs or UUIDs
    createUser(user: CreateUserInput!): CreateUserResult
    verifyEmail(token: String!): Boolean
    resetPassword(token: String!, newPassword: String!): LoginResult
    sendVerificationEmail(email: String!): Boolean
    sendResetPasswordEmail(email: String!): Boolean
    addEmail(newEmail: String!): Boolean
    changePassword(oldPassword: String!, newPassword: String!): Boolean
    twoFactorSet(secret: TwoFactorSecretKeyInput!, code: String!): Boolean
    twoFactorUnset(code: String!): Boolean
  }
`);
