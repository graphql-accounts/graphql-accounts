import * as jwt from 'jsonwebtoken';
import { User } from '@accounts/types';
import { EmailTemplatesType } from './email-templates-type';
import { UserObjectSanitizerFunction } from './user-object-sanitizer-function';
import { ResumeSessionValidator } from './resume-session-validator';
import { PrepareMailFunction } from './prepare-mail-function';
import { SendMailType } from './send-mail-type';
import { TokenCreator } from './token-creator';
import { JwtData } from './jwt-data';

export interface AccountsServerOptions<CustomUser extends User = User> {
  micro?: boolean;
  /**
   * Return ambiguous error messages from login failures to prevent user enumeration. Defaults to true.
   */
  ambiguousErrorMessages?: boolean;
  tokenSecret:
    | string
    | {
        publicKey: jwt.Secret;
        privateKey: jwt.Secret;
      };
  tokenConfigs?: {
    accessToken?: jwt.SignOptions;
    refreshToken?: jwt.SignOptions;
  };
  emailTemplates?: EmailTemplatesType;
  userObjectSanitizer?: UserObjectSanitizerFunction;
  impersonationAuthorize?: (user: User, impersonateToUser: User) => Promise<any>;
  resumeSessionValidator?: ResumeSessionValidator;
  siteUrl?: string;
  prepareMail?: PrepareMailFunction;
  sendMail?: SendMailType;
  tokenCreator?: TokenCreator;
  /**
   * Creates a new session token each time a user refreshes his access token
   */
  createNewSessionTokenOnRefresh?: boolean;
  /**
   * Function to add addition information in jwt payload of accessToken
   */
  createJwtPayload?: (data: JwtData, user: CustomUser) => Promise<Record<string, any>>;
  /**
   * If this flag is set to true - user will be automatically logged in after registration.
   * LoginResult data will be included into registration response.
   */
  enableAutologin?: boolean;
  /**
   * Set this false to `false` if you wish to skip internal user sanitazing method, and expose
   * the original User object as-is.
   */
  useInternalUserObjectSanitizer?: boolean;
}
