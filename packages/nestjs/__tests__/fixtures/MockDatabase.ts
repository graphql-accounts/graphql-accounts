import { ConnectionInformations, CreateUser, DatabaseInterface, Session, User } from '@accounts/types';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class MockDatabase implements DatabaseInterface {
  // tslint:disable-next-line:variable-name
  _users: User[] = []; // Make public for test inspection
  // tslint:disable-next-line:variable-name
  _sessions: Session[] = []; // Make public for test inspection

  async findUserByEmail(email: string): Promise<User> {
    return this._users.find(v => v && this.userHasEmail(v, email));
  }
  async findUserByUsername(username: string): Promise<User> {
    return this.findUserByField('username', username);
  }
  private findUserByField(field: string, value: any): User | undefined {
    return this._users.find(v => v && v[field] === value);
  }

  async findUserById(userId: string): Promise<User> {
    return this.findUserByField('id', userId);
  }
  async createUser(user: CreateUser): Promise<string> {
    const id = Math.floor(Date.now() * Math.random() * 1000).toString();
    this._users.push({
      id,
      deactivated: false,
      ...user,
    });
    return id;
  }
  async setUsername(userId: string, newUsername: string): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    user.username = newUsername;
  }
  private userHasService(user: User, serviceName: string): boolean {
    return user && user.services[serviceName];
  }
  private userHasServiceWithId(user: User, serviceName: string, serviceId: string): boolean {
    return this.userHasService(user, serviceName) && user.services[serviceName] === serviceId;
  }
  async findUserByServiceId(serviceName: string, serviceId: string): Promise<User> {
    return this._users.find(v => this.userHasServiceWithId(v, serviceName, serviceId));
  }

  async setService(userId: string, serviceName: string, data: object): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    user.services[serviceName] = data;
  }
  async unsetService(userId: string, serviceName: string): Promise<void> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    delete user.services[serviceName];
  }
  async findPasswordHash(userId: string): Promise<string> {
    const user = await this.findUserById(userId);
    // todo: implement this
    return (user as any).password;
  }
  findUserByResetPasswordToken(token: string): Promise<User> {
    throw new Error('Method not implemented.');
  }
  async setPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.findUserById(userId);
    // todo: throw if no user
    (user as any).password = newPassword;
  }
  async addResetPasswordToken(userId: string, email: string, token: string, reason: string): Promise<void> {
    const user = await this.findUserById(userId);
    // todo: throw if no user
    if (!(user as any).resetToken) {
      (user as any).resetToken = [];
    }
    (user as any).resetToken.push({
      email,
      token,
      reason,
      expiresAt: Date.now() + 1000 * 60 * 60, // millis * seconds * minutes = 1 hr I think
    });
  }
  async setResetPassword(userId: string, email: string, newPassword: string, token: string): Promise<void> {
    const user = await this.findUserById(userId);
    // todo: throw if no user
    const resetTokenIdx = (user as any).resetToken.findIndex(v => v.token === token && v.email === email);
    ((user as any).resetToken as any[]).splice(resetTokenIdx, 1);
    this.setPassword(userId, newPassword);
  }
  async findUserByEmailVerificationToken(token: string): Promise<User> {
    return this._users.find(v => v.emails && v.emails.find(e => (e as any).token === token));
  }
  private userHasEmail(user: User, email: string, verified: boolean = true): boolean {
    return user.emails && !!user.emails.find(e => e.verified === verified && e.address === email);
  }
  async addEmail(userId: string, newEmail: string, verified: boolean): Promise<void> {
    const user = await this.findUserById(userId);
    // todo: throw if no user
    if (this.userHasEmail(user, newEmail)) {
      // todo: throw
    }
    user.emails.push({
      address: newEmail,
      verified,
    });
  }
  async removeEmail(userId: string, email: string): Promise<void> {
    const user = await this.findUserById(userId);
    // todo: throw if no user

    if (user.emails.length === 1) {
      // todo: can't remove the last email?
    }
    const emailIdx = user.emails.findIndex(v => v.address === email);
    // todo: only allow on verified?
    user.emails.splice(emailIdx, 1);
  }
  async verifyEmail(userId: string, email: string): Promise<void> {
    const user = await this.findUserById(userId);

    // todo: throw if no user
    if (user.emails.length === 1) {
      // todo: can't remove the last email?
    }
    const emailObj = user.emails.find(v => v.address === email);
    emailObj.verified = true;
  }
  async addEmailVerificationToken(userId: string, email: string, token: string): Promise<void> {
    const user = await this.findUserById(userId);
    // todo: throw if no user
    const emailObj = user.emails.find(e => e.address === email);
    (emailObj as any).token = token;
  }
  async setUserDeactivated(userId: string, deactivated: boolean): Promise<void> {
    const user = await this.findUserById(userId);
    // todo: throw if no user
    user.deactivated = deactivated;
  }
  async findSessionById(sessionId: string): Promise<Session> {
    return this._sessions[sessionId];
  }

  async findSessionByToken(token: string): Promise<Session> {
    return this._sessions.find(v => v.token === token);
  }

  async createSession(
    userId: string,
    token: string,
    connection: ConnectionInformations,
    extraData?: object,
  ): Promise<string> {
    const newIdx = this._sessions.length.toString();
    (this._sessions as any[]).push({
      id: newIdx,
      createdAt: Date.now().toString(),
      updatedAt: Date.now().toString(),
      valid: true,
      userId,
      token,
      connection,
      ...extraData,
    });

    return newIdx;
  }

  async updateSession(sessionId: string, connection: ConnectionInformations): Promise<void> {
    const session = this.findSessionById(sessionId);
    // todo: throw if no session
    (session as any).connection = connection;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const idx = this._sessions.findIndex(v => v.id === sessionId);
    this._sessions.splice(idx, 1);
  }
  async invalidateAllSessions(userId: string): Promise<void> {
    this._sessions = this._sessions.filter(v => v.userId !== userId);
  }
}
