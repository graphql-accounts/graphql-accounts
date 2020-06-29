import { ConnectionInformations, CreateUser, DatabaseInterface } from '@accounts/types';
import { IUser, getUserCtor } from './entity/User';
import { Email } from './entity/Email';
import { Service } from './entity/Service';
import { Session } from './entity/Session';
import { AccountsMikroOrmOptions } from './types';
import { EntityRepository, EntityManager, Constructor } from 'mikro-orm';
import { User as AccountsUser } from '@accounts/types/lib/types/user';
import { Session as ISession } from '@accounts/types/lib/types/session/session';

const hasPassword = (opt: object): opt is { bcrypt: string } =>
  !!(opt as { bcrypt: string }).bcrypt;

const toUser = async (user: IUser<any, any, any> | null): Promise<AccountsUser | null> =>
  user && {
    ...user,
    id: String(user.id),
    emails: await user.emails.loadItems(),
  };

const toSession = async (session: Session<any> | null): Promise<ISession | null> =>
  session && {
    ...session,
    id: String(session.id),
    userId: String(session.user.id),
    createdAt: session.createdAt.toDateString(),
    updatedAt: session.updatedAt.toDateString(),
  };

export class AccountsMikroOrm<
  CustomUser extends IUser<any, any, any>,
  CustomEmail extends Email<any>,
  CustomSession extends Session<any>,
  CustomService extends Service<any>
> implements DatabaseInterface {
  private em: EntityManager;
  private UserEntity: Constructor<CustomUser | IUser<any, any, any>>;
  private EmailEntity: Constructor<CustomEmail | Email<any>>;
  private ServiceEntity: Constructor<CustomService | Service<any>>;
  private SessionEntity: Constructor<CustomSession | Session<any>>;
  private userRepository: EntityRepository<IUser<any, any, any>>;
  private emailRepository: EntityRepository<Email<any>>;
  private serviceRepository: EntityRepository<Service<any>>;
  private sessionRepository: EntityRepository<Session<any>>;

  constructor({
    em,
    EmailEntity = Email,
    ServiceEntity = Service,
    SessionEntity = Session,
    UserEntity = getUserCtor({ EmailEntity, ServiceEntity }),
  }: AccountsMikroOrmOptions<CustomUser, CustomEmail, CustomSession, CustomService>) {
    this.em = em;
    this.UserEntity = UserEntity;
    this.EmailEntity = EmailEntity;
    this.ServiceEntity = ServiceEntity;
    this.SessionEntity = SessionEntity;
    this.userRepository = this.em.getRepository(this.UserEntity);
    this.emailRepository = this.em.getRepository(this.EmailEntity);
    this.serviceRepository = this.em.getRepository(this.ServiceEntity);
    this.sessionRepository = this.em.getRepository(this.SessionEntity);
  }

  public async findUserByEmail(email: string): Promise<AccountsUser | null> {
    return toUser(
      await this.userRepository.findOne({
        emails: {
          address: email.toLocaleLowerCase(),
        },
      })
    );
  }

  public async findUserByUsername(username: string): Promise<AccountsUser | null> {
    return toUser(await this.userRepository.findOne({ username }));
  }

  public async findUserById(userId: string): Promise<AccountsUser | null> {
    return toUser(await this.userRepository.findOne(Number(userId)));
  }

  public async findUserByResetPasswordToken(token: string): Promise<AccountsUser | null> {
    return toUser(
      await this.userRepository.findOne({
        services: {
          name: 'password.reset',
          token,
        },
      })
    );
  }

  public async findUserByEmailVerificationToken(token: string): Promise<AccountsUser | null> {
    return toUser(
      await this.userRepository.findOne({
        services: {
          name: 'password.verificationTokens',
          token,
        },
      })
    );
  }

  public async createUser({
    username,
    email,
    password,
    ...otherFields
  }: CreateUser): Promise<string> {
    const user = new this.UserEntity({
      email,
      password,
      username,
      ...otherFields,
    });
    await this.em.persistAndFlush(user);

    return String(user.id);
  }

  public async setUsername(userId: string, newUsername: string): Promise<void> {
    const user = await this.userRepository.findOneOrFail(Number(userId));
    user.username = newUsername;
    await this.em.flush();
  }

  public async findUserByServiceId(
    serviceName: string,
    serviceId: string
  ): Promise<AccountsUser | null> {
    return toUser(await this.userRepository.findOne({ services: Number(serviceId) }));
  }

  public async setService(
    userId: string,
    serviceName: string,
    data: object,
    token?: string,
    flush = true
  ): Promise<void> {
    const service =
      (await this.serviceRepository.findOne({
        name: serviceName,
        user: Number(userId),
      })) ??
      new this.ServiceEntity({
        name: serviceName,
        user: this.em.getReference(this.UserEntity, Number(userId), true),
      });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...options } = data as any;

    service.options = options;

    if (token) {
      service.token = token;
    }

    await this.em.persist(service);

    if (flush) {
      return this.em.flush();
    }
  }

  public async unsetService(userId: string, serviceName: string): Promise<void> {
    await this.userRepository.remove(
      await this.serviceRepository.findOneOrFail({
        name: serviceName,
        user: Number(userId),
      })
    );
    return this.em.flush();
  }

  public async findPasswordHash(userId: string): Promise<string | null> {
    const service = await this.serviceRepository.findOne({
      name: 'password',
      user: Number(userId),
    });
    return service?.options && hasPassword(service.options) ? service.options.bcrypt : null;
  }

  public async setPassword(userId: string, newPassword: string, flush = true): Promise<void> {
    return await this.setService(userId, 'password', { bcrypt: newPassword }, undefined, flush);
  }

  public async addResetPasswordToken(
    userId: string,
    email: string,
    token: string,
    reason: string
  ): Promise<void> {
    await this.setService(
      userId,
      'password.reset',
      {
        address: email.toLocaleLowerCase(),
        when: new Date().toJSON(),
        reason,
      },
      token
    );
  }

  public async setResetPassword(userId: string, email: string, newPassword: string): Promise<void> {
    await this.setPassword(userId, newPassword, false);
    return this.unsetService(userId, 'password.reset');
  }

  public async addEmail(userId: string, newEmail: string, verified: boolean): Promise<void> {
    return this.em.persistAndFlush(
      new this.EmailEntity({
        user: this.em.getReference(this.UserEntity, Number(userId), true),
        address: newEmail,
        verified,
      })
    );
  }

  public async removeEmail(userId: string, email: string): Promise<void> {
    const deleted = await this.emailRepository.remove({ address: email.toLocaleLowerCase() });
    if (!deleted) {
      throw new Error('Email not found');
    }
    return this.em.flush();
  }

  public async verifyEmail(userId: string, email: string): Promise<void> {
    const userEmail = await this.emailRepository.findOneOrFail({
      address: email.toLocaleLowerCase(),
    });
    userEmail.verified = true;
    return this.unsetService(userId, 'email.verificationTokens');
  }

  public async addEmailVerificationToken(
    userId: string,
    email: string,
    token: string
  ): Promise<void> {
    await this.setService(
      userId,
      'email.verificationTokens',
      {
        address: email.toLocaleLowerCase(),
        when: new Date(),
      },
      token
    );
  }

  public async removeAllResetPasswordTokens(userId: string): Promise<void> {
    await this.unsetService(userId, 'password.reset');
  }

  public async setUserDeactivated(userId: string, deactivated: boolean): Promise<void> {
    const user = await this.userRepository.findOneOrFail(Number(userId));
    user.deactivated = deactivated;
    return this.em.flush();
  }

  public async findSessionById(sessionId: string): Promise<ISession | null> {
    return toSession(await this.sessionRepository.findOne(Number(sessionId)));
  }

  public async findSessionByToken(token: string): Promise<ISession | null> {
    return toSession(await this.sessionRepository.findOne({ token }));
  }

  public async createSession(
    userId: string,
    token: string,
    connection: ConnectionInformations = {},
    extra?: object
  ): Promise<string> {
    const session = new this.SessionEntity({
      user: this.em.getReference(this.UserEntity, Number(userId), true),
      token,
      userAgent: connection.userAgent,
      ip: connection.ip,
      extra,
      valid: true,
    });
    await this.em.persistAndFlush(session);
    return String(session.id);
  }

  public async updateSession(sessionId: string, connection: ConnectionInformations): Promise<void> {
    const session = await this.sessionRepository.findOneOrFail(Number(sessionId));
    session.userAgent = connection.userAgent ?? undefined;
    session.ip = connection.ip ?? undefined;
    return this.em.flush();
  }

  public async invalidateSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOneOrFail(Number(sessionId));
    session.valid = false;
    return this.em.flush();
  }

  public async invalidateAllSessions(userId: string, excludedSessionIds?: string[]): Promise<void> {
    const sessions = await this.sessionRepository.find({
      user: this.em.getReference(this.UserEntity, Number(userId), true),
      ...(excludedSessionIds?.length && {
        id: { $nin: excludedSessionIds.map((id) => Number(id)) },
      }),
    });
    sessions.forEach((session) => (session.valid = false));
    return this.em.flush();
  }
}
