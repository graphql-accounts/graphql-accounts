import { IdentifiedReference, Reference, EntitySchema } from 'mikro-orm';
import { IUser, UserCtor } from './User';

export class Session<CustomUser extends IUser<any, any, any>> {
  id!: number;

  createdAt: Date = new Date();

  updatedAt: Date = new Date();

  user: IdentifiedReference<CustomUser>;

  token: string;

  valid: boolean;

  userAgent?: string;

  ip?: string;

  extra?: object;

  constructor({ user, token, valid, userAgent, ip, extra }: SessionCtorArgs<CustomUser>) {
    this.user = Reference.create(user);
    this.token = token;
    this.valid = valid;
    if (userAgent) {
      this.userAgent = userAgent;
    }
    if (ip) {
      this.ip = ip;
    }
    if (extra) {
      this.extra = extra;
    }
  }
}

export type SessionCtorArgs<CustomUser extends IUser<any, any, any>> = {
  user: CustomUser;
  token: string;
  valid: boolean;
  userAgent?: string | null;
  ip?: string | null;
  extra?: object;
};

export type SessionCtor<CustomUser extends IUser<any, any, any>> = new (
  args: SessionCtorArgs<CustomUser>
) => Session<CustomUser>;

export const getSessionCtor = <CustomUser extends IUser<any, any, any>>({
  abstract = false,
}: {
  abstract?: boolean;
} = {}): SessionCtor<CustomUser> => {
  if (abstract) {
    Object.defineProperty(Session, 'name', { value: 'AccountsSession' });
  }
  return Session as SessionCtor<CustomUser>;
};

export const getSessionSchema = ({
  UserEntity,
  abstract = false,
}: {
  UserEntity?: UserCtor<any, any, any, any>;
  abstract?: boolean;
} = {}) => {
  if (abstract) {
    Object.defineProperty(Session, 'name', { value: 'AccountsSession' });
  }
  return new EntitySchema<Session<any>>({
    class: Session,
    abstract,
    properties: {
      id: { type: 'number', primary: true },
      createdAt: { type: 'Date', onCreate: () => new Date(), nullable: true },
      updatedAt: {
        type: 'Date',
        onCreate: () => new Date(),
        onUpdate: () => new Date(),
        nullable: true,
      },
      user: { reference: 'm:1', wrappedReference: true, type: UserEntity?.name ?? 'User' },
      token: { type: 'string' },
      valid: { type: 'boolean' },
      userAgent: { type: 'string', nullable: true },
      ip: { type: 'string', nullable: true },
      extra: { type: 'json', nullable: true },
    },
  });
};
