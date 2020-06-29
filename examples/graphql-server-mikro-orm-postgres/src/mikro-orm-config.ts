import 'reflect-metadata';
import {
  UserCtorArgs as AccountsUserCtorArgs,
  EmailCtorArgs as AccountsEmailCtorArgs,
  getEmailSchema,
  getServiceSchema,
  getSessionSchema,
  getEmailCtor,
  Session,
  Service,
  ServiceCtorArgs,
} from '@accounts/mikro-orm';
import { ReflectMetadataProvider, Entity, Property } from 'mikro-orm';
import { UserCtor, getUserCtor, getUserSchema } from '@accounts/mikro-orm/lib/entity/User';

const AccountsEmail = getEmailCtor<User>({ abstract: true });

type EmailCtorArgs = AccountsEmailCtorArgs<User> & {
  fullName?: string;
};

@Entity()
export class Email extends AccountsEmail {
  @Property({ nullable: true })
  fullName?: string;

  constructor({ fullName, ...otherProps }: EmailCtorArgs) {
    super(otherProps);
    if (fullName) {
      this.fullName = fullName;
    }
  }
}

type UserCtorArgs = AccountsUserCtorArgs & {
  profile: {
    firstName: string;
    lastName: string;
  };
};

const AccountsUser: UserCtor<Email, Session<User>, Service<User>, UserCtorArgs> = getUserCtor<
  Email,
  Session<User>,
  Service<User>,
  UserCtorArgs,
  EmailCtorArgs,
  ServiceCtorArgs<User>
>({
  abstract: true,
  EmailEntity: Email,
  getCustomEmailArgs: ({ profile: { firstName, lastName } }) => ({
    fullName: `${firstName} ${lastName}`,
  }),
});

@Entity()
export class User extends AccountsUser {
  @Property({ nullable: true })
  firstName?: string;

  @Property({ nullable: true })
  lastName?: string;

  constructor(args: UserCtorArgs) {
    super(args);
    const {
      profile: { firstName, lastName },
    } = args;
    if (firstName) {
      this.firstName = firstName;
    }
    if (lastName) {
      this.lastName = lastName;
    }
  }
}

export default {
  metadataProvider: ReflectMetadataProvider,
  cache: { enabled: false },
  entities: [
    User,
    Email,
    getUserSchema({ AccountsUser, EmailEntity: Email, abstract: true }),
    getEmailSchema({ UserEntity: User, abstract: true }),
    getServiceSchema({ UserEntity: User }),
    getSessionSchema({ UserEntity: User }),
  ],
  dbName: 'accounts',
  user: 'postgres',
  password: 'very-secret',
  type: 'postgresql' as const,
  forceUtcTimezone: true,
  debug: true,
};
