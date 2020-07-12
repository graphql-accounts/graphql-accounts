import { IUser } from '../entity/User';
import { Email } from '../entity/Email';
import { Service } from '../entity/Service';
import { Session } from '../entity/Session';
import { EntityManager, Constructor } from 'mikro-orm';

export interface AccountsMikroOrmOptions<
  CustomUser extends IUser<any, any, any>,
  CustomEmail extends Email<any>,
  CustomSession extends Session<any>,
  CustomService extends Service<any>
> {
  em: EntityManager;
  UserEntity?: Constructor<CustomUser | IUser<any, any, any>>;
  EmailEntity?: Constructor<CustomEmail | Email<any>>;
  SessionEntity?: Constructor<CustomSession | Session<any>>;
  ServiceEntity?: Constructor<CustomService | Service<any>>;
}
