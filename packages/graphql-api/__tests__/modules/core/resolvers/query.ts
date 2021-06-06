import { Query } from '../../../../src/modules/core/resolvers/query';

describe('accounts resolvers query', () => {
  const user = { id: 'idTest' };

  describe('getUser', () => {
    it('should return null if context is empty', async () => {
      const res = await Query.getUser!({}, {}, {} as any, {} as any);
      expect(res).toBeNull();
    });

    it('should return user', async () => {
      const res = await Query.getUser!({}, {}, { user } as any, {} as any);
      expect(res).toEqual(user);
    });
  });
});
