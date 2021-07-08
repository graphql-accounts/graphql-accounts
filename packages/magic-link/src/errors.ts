import { ErrorMessages } from './types';

export const errors: ErrorMessages = {
  userNotFound: 'User not found',
  unrecognizedOptionsForLogin: 'Unrecognized options for login request',
  matchFailed: 'Match failed',
  invalidEmail: 'Invalid email',
  loginTokenExpired: 'Login token expired',
};

export enum MagicLinkAuthenticatorErrors {
  LoginTokenExpired = 'LoginTokenExpired',
}

export enum AuthenticateErrors {
  UnrecognizedOptionsForLogin = 'UnrecognizedOptionsForLogin',
  MatchFailed = 'MatchFailed',
}

export enum RequestMagicLinkEmailErrors {
  InvalidEmail = 'InvalidEmail',
  UserNotFound = 'UserNotFound',
}
