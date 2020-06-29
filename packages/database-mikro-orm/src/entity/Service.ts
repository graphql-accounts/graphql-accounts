import { IdentifiedReference, Reference, EntitySchema } from 'mikro-orm';
import { IUser, UserCtor } from './User';

export class Service<CustomUser extends IUser<any, any, any>> {
  id!: number;

  user!: IdentifiedReference<CustomUser>;

  name: string;

  token?: string;

  options?: object;

  constructor({ name, user, password }: ServiceCtorArgs<CustomUser>) {
    this.name = name;

    if (user) {
      this.user = Reference.create(user);
    }

    if (password) {
      this.options = { bcrypt: password };
    }
  }
}

export type ServiceCtorArgs<CustomUser extends IUser<any, any, any>> = {
  name: string;
  user?: CustomUser;
  password?: string;
};

export type ServiceCtor<CustomUser extends IUser<any, any, any>> = new (
  args: ServiceCtorArgs<CustomUser>
) => Service<CustomUser>;

export const getServiceCtor = <CustomUser extends IUser<any, any, any>>({
  abstract = false,
}: {
  abstract?: boolean;
} = {}): ServiceCtor<CustomUser> => {
  if (abstract) {
    Object.defineProperty(Service, 'name', { value: 'AccountsService' });
  }
  return Service as ServiceCtor<CustomUser>;
};

export const getServiceSchema = ({
  UserEntity,
  abstract = false,
}: {
  UserEntity?: UserCtor<any, any, any, any>;
  abstract?: boolean;
} = {}) => {
  if (abstract) {
    Object.defineProperty(Service, 'name', { value: 'AccountsService' });
  }
  return new EntitySchema<Service<any>>({
    class: Service,
    abstract,
    properties: {
      id: { type: 'number', primary: true },
      user: { reference: 'm:1', wrappedReference: true, type: UserEntity?.name ?? 'User' },
      name: { type: 'string' },
      token: { type: 'string', nullable: true },
      options: { type: 'json', nullable: true },
    },
  });
};
