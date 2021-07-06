import { DatabaseManager } from '../src';

// eslint-disable-next-line jest/no-export
export default class Database {
  public name: any;

  constructor(name: any) {
    this.name = name;
  }

  public createUser() {
    return this.name;
  }

  public findUserById() {
    return this.name;
  }

  public findUserByEmail() {
    return this.name;
  }

  public findUserByUsername() {
    return this.name;
  }

  public findPasswordHash() {
    return this.name;
  }

  public findUserByEmailVerificationToken() {
    return this.name;
  }

  public findUserByResetPasswordToken() {
    return this.name;
  }

  public findUserByServiceId() {
    return this.name;
  }

  public addEmail() {
    return this.name;
  }

  public removeEmail() {
    return this.name;
  }

  public verifyEmail() {
    return this.name;
  }

  public setUsername() {
    return this.name;
  }

  public setPassword() {
    return this.name;
  }

  public setService() {
    return this.name;
  }

  public unsetService() {
    return this.name;
  }

  public createSession() {
    return this.name;
  }

  public updateSession() {
    return this.name;
  }

  public invalidateSession() {
    return this.name;
  }

  public invalidateAllSessions() {
    return this.name;
  }

  public removeAllResetPasswordTokens() {
    return this.name;
  }

  public findSessionByToken() {
    return this.name;
  }

  public findSessionById() {
    return this.name;
  }

  public addEmailVerificationToken() {
    return this.name;
  }

  public addResetPasswordToken() {
    return this.name;
  }

  public setUserDeactivated() {
    return this.name;
  }
}

const databaseManager = new DatabaseManager({
  userStorage: new Database('userStorage'),
  sessionStorage: new Database('sessionStorage'),
});

describe('DatabaseManager configuration', () => {
  it('should throw if no configuration object specified', () => {
    expect(() => (databaseManager as any).validateConfiguration(null as any)).toThrow();
  });

  it('should throw if no userStorage specified', () => {
    expect(() =>
      (databaseManager as any).validateConfiguration({ sessionStorage: true })
    ).toThrow();
  });

  it('should throw if no sessionStorage specified', () => {
    expect(() => (databaseManager as any).validateConfiguration({ userStorage: true })).toThrow();
  });

  it('should not throw if sessionStorage specified', () => {
    expect(() =>
      (databaseManager as any).validateConfiguration({
        userStorage: true,
        sessionStorage: true,
      })
    ).not.toThrow();
  });
});

describe('DatabaseManager', () => {
  it('createUser should be called on userStorage', () => {
    expect(databaseManager.createUser({ email: 'test', password: 'test' })).toBe('userStorage');
  });

  it('findUserById should be called on userStorage', () => {
    expect(databaseManager.findUserById('userId')).toBe('userStorage');
  });

  it('findUserByEmail should be called on userStorage', () => {
    expect(databaseManager.findUserByEmail('email')).toBe('userStorage');
  });

  it('findUserByUsername should be called on userStorage', () => {
    expect(databaseManager.findUserByUsername('username')).toBe('userStorage');
  });

  it('findPasswordHash should be called on userStorage', () => {
    expect(databaseManager.findPasswordHash('userId')).toBe('userStorage');
  });

  it('findUserByEmailVerificationToken should be called on userStorage', () => {
    expect(databaseManager.findUserByEmailVerificationToken('token')).toBe('userStorage');
  });

  it('findUserByResetPasswordToken should be called on userStorage', () => {
    expect(databaseManager.findUserByResetPasswordToken('token')).toBe('userStorage');
  });

  it('findUserByServiceId should be called on userStorage', () => {
    expect(databaseManager.findUserByServiceId('serviceName', 'serviceId')).toBe('userStorage');
  });

  it('addEmail should be called on userStorage', () => {
    expect(databaseManager.addEmail('userId', 'email', false)).toBe('userStorage');
  });

  it('removeEmail should be called on userStorage', () => {
    expect(databaseManager.removeEmail('userId', 'email')).toBe('userStorage');
  });

  it('verifyEmail should be called on userStorage', () => {
    expect(databaseManager.verifyEmail('userId', 'email')).toBe('userStorage');
  });

  it('setUsername should be called on userStorage', () => {
    expect(databaseManager.setUsername('userId', 'username')).toBe('userStorage');
  });

  it('setPassword should be called on userStorage', () => {
    expect(databaseManager.setPassword('userId', 'password')).toBe('userStorage');
  });

  it('setService should be called on userStorage', () => {
    expect(databaseManager.setService('userId', 'serviceName', {})).toBe('userStorage');
  });

  it('unsetService should be called on userStorage', () => {
    expect(databaseManager.unsetService('userId', 'serviceName')).toBe('userStorage');
  });

  it('createSession should be called on sessionStorage', () => {
    expect(databaseManager.createSession('userId', 'token', {})).toBe('sessionStorage');
  });

  it('updateSession should be called on sessionStorage', () => {
    expect(databaseManager.updateSession('sessionId', {})).toBe('sessionStorage');
  });

  it('invalidateSession should be called on sessionStorage', () => {
    expect(databaseManager.invalidateSession('sessionId')).toBe('sessionStorage');
  });

  it('invalidateAllSessions should be called on sessionStorage', () => {
    expect(databaseManager.invalidateAllSessions('userId')).toBe('sessionStorage');
  });

  it('findSessionByToken should be called on sessionStorage', () => {
    expect(databaseManager.findSessionByToken('token')).toBe('sessionStorage');
  });

  it('findSessionById should be called on sessionStorage', () => {
    expect(databaseManager.findSessionById('sessionId')).toBe('sessionStorage');
  });

  it('addEmailVerificationToken should be called on sessionStorage', () => {
    expect(databaseManager.addEmailVerificationToken('userId', 'email', 'token')).toBe(
      'userStorage'
    );
  });

  it('addResetPasswordToken should be called on sessionStorage', () => {
    expect(databaseManager.addResetPasswordToken('userId', 'email', 'token', 'reason', 1000)).toBe(
      'userStorage'
    );
  });

  it('setUserDeactivated should be called on sessionStorage', () => {
    expect(databaseManager.setUserDeactivated('userId', true)).toBe('userStorage');
  });

  it('removeAllResetPasswordTokens should be called on userStorage', () => {
    expect(databaseManager.removeAllResetPasswordTokens('userId')).toBe('userStorage');
  });
});
