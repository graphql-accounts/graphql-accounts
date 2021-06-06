import { AccountsServer, AccountsJsError } from '@accounts/server';
import {
  AccountsPassword,
  SendResetPasswordEmailErrors,
  SendVerificationEmailErrors,
} from '@accounts/password';
import { LoginResult } from '@accounts/types';
import { Mutation } from '../../../../src/modules/password/resolvers/mutation';
import { CreateUserInput } from '../../../../src';

describe('accounts-password resolvers mutation', () => {
  const accountsServerMock = {
    options: {},
  };
  const accountsPasswordMock = {
    addEmail: jest.fn(),
    changePassword: jest.fn(),
    createUser: jest.fn(),
    resetPassword: jest.fn(),
    sendResetPasswordEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
    verifyEmail: jest.fn(),
    twoFactor: {
      set: jest.fn(),
      unset: jest.fn(),
    },
  };
  let injector: { get: jest.Mock };
  const user = { id: 'idTest' };
  const infos = {
    ip: 'ipTest',
    userAgent: 'userAgentTest',
  };

  beforeEach(() => {
    injector = {
      get: jest.fn((arg) => (arg === AccountsPassword ? accountsPasswordMock : accountsServerMock)),
    };
    jest.clearAllMocks();
  });

  describe('addEmail', () => {
    const newEmail = 'newEmailTest';

    it('should throw if no user in context', async () => {
      await expect(Mutation.addEmail!({}, { newEmail }, {} as any, {} as any)).rejects.toThrowError(
        'Unauthorized'
      );
    });

    it('should call addEmail', async () => {
      await Mutation.addEmail!({}, { newEmail }, { user, injector } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(accountsPasswordMock.addEmail).toHaveBeenCalledWith(user.id, newEmail);
    });
  });

  describe('changePassword', () => {
    const oldPassword = 'oldPasswordTest';
    const newPassword = 'newPasswordTest';

    it('should throw if no user in context', async () => {
      await expect(
        Mutation.changePassword!({}, { oldPassword, newPassword }, {} as any, {} as any)
      ).rejects.toThrowError('Unauthorized');
    });

    it('should call changePassword', async () => {
      await Mutation.changePassword!(
        {},
        { oldPassword, newPassword },
        { user, injector } as any,
        {} as any
      );
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(accountsPasswordMock.changePassword).toHaveBeenCalledWith(
        user.id,
        oldPassword,
        newPassword
      );
    });
  });

  describe('createUser', () => {
    it('should call createUser', async () => {
      await Mutation.createUser!({}, { user } as any, { injector } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(injector.get).toHaveBeenCalledWith(AccountsServer);
      expect(accountsPasswordMock.createUser).toHaveBeenCalledWith(user);
    });

    it('should call createUser and obfuscate EmailAlreadyExists error if server have ambiguousErrorMessages', async () => {
      const createdUserMock = jest.fn(() => {
        throw new AccountsJsError('EmailAlreadyExists', 'EmailAlreadyExists');
      });
      injector.get = jest.fn((arg) =>
        arg === AccountsPassword
          ? {
              createUser: createdUserMock,
            }
          : {
              options: { ambiguousErrorMessages: true },
            }
      );
      const res = await Mutation.createUser!({}, { user } as any, { injector } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(injector.get).toHaveBeenCalledWith(AccountsServer);
      expect(createdUserMock).toHaveBeenCalledWith(user);
      expect(res).toEqual({});
    });

    it('should call createUser and obfuscate UsernameAlreadyExists error if server have ambiguousErrorMessages', async () => {
      const createdUserMock = jest.fn(() => {
        throw new AccountsJsError('UsernameAlreadyExists', 'UsernameAlreadyExists');
      });
      injector.get = jest.fn((arg) =>
        arg === AccountsPassword
          ? {
              createUser: createdUserMock,
            }
          : {
              options: { ambiguousErrorMessages: true },
            }
      );
      const res = await Mutation.createUser!({}, { user } as any, { injector } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(injector.get).toHaveBeenCalledWith(AccountsServer);
      expect(createdUserMock).toHaveBeenCalledWith(user);
      expect(res).toEqual({});
    });

    it('should rethrow all errors if server have ambiguousErrorMessages', async () => {
      const createdUserMock = jest.fn(() => {
        throw new AccountsJsError('AnyError', 'AnyError');
      });
      injector.get = jest.fn((arg) =>
        arg === AccountsPassword
          ? {
              createUser: createdUserMock,
            }
          : {
              options: { ambiguousErrorMessages: true },
            }
      );
      await expect(
        Mutation.createUser!({}, { user } as any, { injector } as any, {} as any)
      ).rejects.toThrowError('AnyError');
    });

    it('should automatically login user after registration if enableAutologin flag is set to true', async () => {
      const createdUser = {
        id: '123',
        emails: [
          {
            address: 'test@test.com',
          },
        ],
      };

      const accountsServerLocalMock = {
        options: {
          enableAutologin: true,
          ambiguousErrorMessages: false,
        },
        findUserById: jest.fn(() => createdUser),
        loginWithUser: jest.fn(
          () =>
            ({
              user: createdUser,
              tokens: {
                accessToken: 'accessToken',
                refreshToken: 'refreshToken',
              },
            } as LoginResult)
        ),
      };

      const accountsPasswordLocalMock = {
        ...accountsPasswordMock,
        createUser: jest.fn(() => '123'),
      };

      const injector = {
        get: jest.fn((arg) =>
          arg === AccountsPassword ? accountsPasswordLocalMock : accountsServerLocalMock
        ),
      };

      const createUserInput: CreateUserInput = {
        email: 'test@test.com',
        password: 'test',
      };

      const response = await Mutation.createUser!(
        {},
        { user: createUserInput },
        { injector, infos } as any,
        {} as any
      );
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(injector.get).toHaveBeenCalledWith(AccountsServer);
      expect(accountsPasswordLocalMock.createUser).toHaveBeenCalledWith(createUserInput);
      expect(accountsServerLocalMock.loginWithUser).toHaveBeenCalledWith(createdUser, infos);
      expect(response?.loginResult).not.toBeNull();
      expect(response?.loginResult!.user).toEqual(createdUser);
      expect(response?.loginResult!.tokens?.accessToken).toEqual('accessToken');
      expect(response?.loginResult!.tokens?.refreshToken).toEqual('refreshToken');
    });
  });

  describe('twoFactorSet', () => {
    const code = 'codeTest';
    const secret = 'secretTest';

    it('should throw if no user in context', async () => {
      await expect(
        Mutation.twoFactorSet!({}, { code, secret } as any, {} as any, {} as any)
      ).rejects.toThrowError('Unauthorized');
    });

    it('should call twoFactor.set', async () => {
      await Mutation.twoFactorSet!(
        {},
        { code, secret } as any,
        { injector, user } as any,
        {} as any
      );
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(accountsPasswordMock.twoFactor.set).toHaveBeenCalledWith(user.id, secret, code);
    });
  });

  describe('twoFactorUnset', () => {
    const code = 'codeTest';

    it('should throw if no user in context', async () => {
      await expect(
        Mutation.twoFactorUnset!({}, { code } as any, {} as any, {} as any)
      ).rejects.toThrowError('Unauthorized');
    });

    it('should call twoFactor.unset', async () => {
      await Mutation.twoFactorUnset!({}, { code } as any, { injector, user } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(accountsPasswordMock.twoFactor.unset).toHaveBeenCalledWith(user.id, code);
    });
  });

  describe('resetPassword', () => {
    const token = 'tokenTest';
    const newPassword = 'newPasswordTest';

    it('should call resetPassword', async () => {
      await Mutation.resetPassword!(
        {},
        { token, newPassword } as any,
        { injector, infos } as any,
        {} as any
      );
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(accountsPasswordMock.resetPassword).toHaveBeenCalledWith(token, newPassword, infos);
    });
  });

  describe('sendResetPasswordEmail', () => {
    const email = 'emailTest';

    it('should call sendResetPasswordEmail', async () => {
      await Mutation.sendResetPasswordEmail!({}, { email } as any, { injector } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(accountsPasswordMock.sendResetPasswordEmail).toHaveBeenCalledWith(email);
    });

    it('should rethrow all errors if server have ambiguousErrorMessages', async () => {
      const sendResetPasswordEmailMock = jest.fn(() => {
        throw new AccountsJsError('AnyError', 'AnyError');
      });
      injector.get = jest.fn((arg) =>
        arg === AccountsPassword
          ? {
              sendResetPasswordEmail: sendResetPasswordEmailMock,
            }
          : {
              options: { ambiguousErrorMessages: true },
            }
      );
      await expect(
        Mutation.sendResetPasswordEmail!({}, { email } as any, { injector } as any, {} as any)
      ).rejects.toThrowError('AnyError');
    });

    it('should hide UserNotFound error when ambiguousErrorMessages is true', async () => {
      const sendResetPasswordEmailMock = jest.fn(() => {
        throw new AccountsJsError('User not found', SendResetPasswordEmailErrors.UserNotFound);
      });
      injector.get = jest.fn((arg) =>
        arg === AccountsPassword
          ? {
              sendResetPasswordEmail: sendResetPasswordEmailMock,
            }
          : {
              options: { ambiguousErrorMessages: true },
            }
      );

      await Mutation.sendResetPasswordEmail!({}, { email } as any, { injector } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(sendResetPasswordEmailMock).toHaveBeenCalledWith(email);
    });
  });

  describe('verifyEmail', () => {
    const token = 'tokenTest';

    it('should call verifyEmail', async () => {
      await Mutation.verifyEmail!({}, { token } as any, { injector } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(accountsPasswordMock.verifyEmail).toHaveBeenCalledWith(token);
    });
  });

  describe('sendVerificationEmail', () => {
    const email = 'emailTest';

    it('should call sendVerificationEmail', async () => {
      await Mutation.sendVerificationEmail!({}, { email } as any, { injector } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(accountsPasswordMock.sendVerificationEmail).toHaveBeenCalledWith(email);
    });

    it('should rethrow all errors if server have ambiguousErrorMessages', async () => {
      const sendVerificationEmailMock = jest.fn(() => {
        throw new AccountsJsError('AnyError', 'AnyError');
      });
      injector.get = jest.fn((arg) =>
        arg === AccountsPassword
          ? {
              sendVerificationEmail: sendVerificationEmailMock,
            }
          : {
              options: { ambiguousErrorMessages: true },
            }
      );
      await expect(
        Mutation.sendVerificationEmail!({}, { email } as any, { injector } as any, {} as any)
      ).rejects.toThrowError('AnyError');
    });

    it('should hide UserNotFound error when ambiguousErrorMessages is true', async () => {
      const sendVerificationEmailMock = jest.fn(() => {
        throw new AccountsJsError('User not found', SendVerificationEmailErrors.UserNotFound);
      });
      injector.get = jest.fn((arg) =>
        arg === AccountsPassword
          ? {
              sendVerificationEmail: sendVerificationEmailMock,
            }
          : {
              options: { ambiguousErrorMessages: true },
            }
      );

      await Mutation.sendVerificationEmail!({}, { email } as any, { injector } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsPassword);
      expect(sendVerificationEmailMock).toHaveBeenCalledWith(email);
    });
  });
});
