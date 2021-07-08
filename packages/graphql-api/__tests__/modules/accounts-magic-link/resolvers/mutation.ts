import { AccountsJsError } from '@accounts/server';
import { AccountsMagicLink, RequestMagicLinkEmailErrors } from '@accounts/magic-link';
import { Mutation } from '../../../../src/modules/accounts-magic-link/resolvers/mutation';

describe('accounts-magic-link resolvers mutation', () => {
  const accountsServerMock = {
    options: {},
  };
  const accountsMagicLinkMock = {
    requestMagicLinkEmail: jest.fn(),
  };
  let injector: { get: jest.Mock };

  beforeEach(() => {
    injector = {
      get: jest.fn((arg) =>
        arg === AccountsMagicLink ? accountsMagicLinkMock : accountsServerMock
      ),
    };
    jest.clearAllMocks();
  });

  describe('requestMagicLinkEmail', () => {
    const email = 'emailTest';

    it('should call requestMagicLinkEmail', async () => {
      await Mutation.requestMagicLinkEmail!({}, { email } as any, { injector } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsMagicLink);
      expect(accountsMagicLinkMock.requestMagicLinkEmail).toHaveBeenCalledWith(email);
    });

    it('should rethrow all errors if server have ambiguousErrorMessages', async () => {
      const requestMagicLinkEmailMock = jest.fn(() => {
        throw new AccountsJsError('AnyError', 'AnyError');
      });
      injector.get = jest.fn((arg) =>
        arg === AccountsMagicLink
          ? {
              requestMagicLinkEmail: requestMagicLinkEmailMock,
            }
          : {
              options: { ambiguousErrorMessages: true },
            }
      );
      await expect(
        Mutation.requestMagicLinkEmail!({}, { email } as any, { injector } as any, {} as any)
      ).rejects.toThrowError('AnyError');
    });

    it('should hide UserNotFound error when ambiguousErrorMessages is true', async () => {
      const requestMagicLinkEmailMock = jest.fn(() => {
        throw new AccountsJsError('User not found', RequestMagicLinkEmailErrors.UserNotFound);
      });
      injector.get = jest.fn((arg) =>
        arg === AccountsMagicLink
          ? {
              requestMagicLinkEmail: requestMagicLinkEmailMock,
            }
          : {
              options: { ambiguousErrorMessages: true },
            }
      );

      await Mutation.requestMagicLinkEmail!({}, { email } as any, { injector } as any, {} as any);
      expect(injector.get).toHaveBeenCalledWith(AccountsMagicLink);
      expect(requestMagicLinkEmailMock).toHaveBeenCalledWith(email);
    });
  });
});
