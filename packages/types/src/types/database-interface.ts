import { User } from './user';
import { DatabaseInterfaceSessions } from './session/database-interface';
import { DatabaseInterfaceServicePassword } from './services/password/database-interface';
import { DatabaseInterfaceServiceMagicLink } from './services/magic-link/database-interface';

export interface DatabaseInterface<CustomUser extends User = User>
  extends DatabaseInterfaceSessions,
    DatabaseInterfaceServicePassword<CustomUser>,
    DatabaseInterfaceServiceMagicLink<CustomUser> {
  // Find user by identity fields
  findUserById(userId: string): Promise<CustomUser | null>;

  // Auth services related operations
  findUserByServiceId(serviceName: string, serviceId: string): Promise<CustomUser | null>;

  setService(userId: string, serviceName: string, data: object): Promise<void>;

  unsetService(userId: string, serviceName: string): Promise<void>;

  setUserDeactivated(userId: string, deactivated: boolean): Promise<void>;
}
