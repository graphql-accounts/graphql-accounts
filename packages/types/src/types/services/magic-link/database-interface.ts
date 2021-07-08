import { User } from '../../user';

export interface DatabaseInterfaceServiceMagicLink<CustomUser extends User = User> {
  findUserByLoginToken(token: string): Promise<CustomUser | null>;

  addLoginToken(userId: string, email: string, token: string): Promise<void>;

  removeAllLoginTokens(userId: string): Promise<void>;
}
