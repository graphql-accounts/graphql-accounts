import { registerPassword } from '../../../src/endpoints/password/register';
import { LoginResult } from '@accounts/types';

const res: any = {
  json: jest.fn(),
  status: jest.fn(() => res),
};

describe('registerPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls password.createUser and returns the user json response', async () => {
    const userId = '1';
    const passwordService = {
      createUser: jest.fn(() => userId),
    };
    const accountsServer = {
      options: {},
      getServices: () => ({
        password: passwordService,
      }),
    };
    const middleware = registerPassword(accountsServer as any);

    const req = {
      body: {
        user: {
          username: 'toto',
        },
        extraFieldThatShouldNotBePassed: 'hey',
      },
      headers: {},
    };
    const reqCopy = { ...req };

    await middleware(req as any, res);

    expect(req).toEqual(reqCopy);
    expect(accountsServer.getServices().password.createUser).toHaveBeenCalledWith({
      username: 'toto',
    });
    expect(res.json).toHaveBeenCalledWith({ userId: '1' });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls password.createUser and returns null if server have ambiguousErrorMessages', async () => {
    const userId = '1';
    const passwordService = {
      createUser: jest.fn(() => userId),
    };
    const accountsServer = {
      options: { ambiguousErrorMessages: true },
      getServices: () => ({
        password: passwordService,
      }),
    };
    const middleware = registerPassword(accountsServer as any);

    const req = {
      body: {
        user: {
          username: 'toto',
        },
        extraFieldThatShouldNotBePassed: 'hey',
      },
      headers: {},
    };
    const reqCopy = { ...req };

    await middleware(req as any, res);

    expect(req).toEqual(reqCopy);
    expect(accountsServer.getServices().password.createUser).toHaveBeenCalledWith({
      username: 'toto',
    });
    expect(res.json).toHaveBeenCalledWith({ userId: null });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should automatically login user after registration if enableAutologin flag is set to true', async () => {
    const userId = '1';
    const userEmail = 'test@test.com';

    const passwordService = {
      createUser: jest.fn(() => userId),
    };

    const createdUser = {
      id: userId,
      emails: [
        {
          address: userEmail,
        },
      ],
    };

    const loginResult = {
      user: createdUser,
      tokens: {
        accessToken: 'accessToken',
        refreshToken: 'refreshToken',
      },
    } as LoginResult;

    const accountsServer = {
      options: { enableAutologin: true, ambiguousErrorMessages: false },
      getServices: () => ({
        password: passwordService,
      }),
      findUserById: jest.fn(() => createdUser),
      loginWithUser: jest.fn(() => loginResult),
    };
    const middleware = registerPassword(accountsServer as any);

    const req = {
      body: {
        user: {
          email: userEmail,
        },
      },
      headers: {},
    };
    const reqCopy = { ...req };

    await middleware(req as any, res);

    expect(req).toEqual(reqCopy);
    expect(accountsServer.getServices().password.createUser).toHaveBeenCalledWith({
      email: userEmail,
    });
    expect(res.json).toHaveBeenCalledWith({
      userId,
      loginResult,
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('Sends error if it was thrown on loginWithService', async () => {
    const error = { message: 'Could not login' };
    const passwordService = {
      createUser: jest.fn(() => {
        throw error;
      }),
    };
    const accountsServer = {
      getServices: () => ({
        password: passwordService,
      }),
    };
    const middleware = registerPassword(accountsServer as any);
    const req = {
      body: {
        user: {
          username: 'toto',
        },
        extraFieldThatShouldNotBePassed: 'hey',
      },
      headers: {},
    };
    const reqCopy = { ...req };

    await middleware(req as any, res);

    expect(req).toEqual(reqCopy);
    expect(accountsServer.getServices().password.createUser).toHaveBeenCalledWith({
      username: 'toto',
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(error);
  });
});
