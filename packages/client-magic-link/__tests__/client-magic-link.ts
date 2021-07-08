import { AccountsClientMagicLink } from '../src/client-magic-link';

const mockedClient = {
  transport: {
    requestMagicLinkEmail: jest.fn(),
  },
  loginWithService: jest.fn(),
};
const accountsMagicLink = new AccountsClientMagicLink(mockedClient as any);

const user = {
  email: 'john@doe.com',
  token: 'deadbeef',
};

describe('AccountsClientMagicLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires the client', async () => {
    expect(() => new AccountsClientMagicLink(null as any)).toThrowError(
      'A valid client instance is required'
    );
  });

  describe('login', () => {
    it('should call client', async () => {
      await accountsMagicLink.login(user as any);
      expect(mockedClient.loginWithService).toHaveBeenCalledTimes(1);
      expect(mockedClient.loginWithService).toHaveBeenCalledWith('magic-link', {
        email: user.email,
        token: user.token,
      });
    });
  });

  describe('requestMagicLinkEmail', () => {
    it('should call transport', async () => {
      await accountsMagicLink.requestMagicLinkEmail(user.email);
      expect(mockedClient.transport.requestMagicLinkEmail).toHaveBeenCalledWith(user.email);
    });
  });
});
