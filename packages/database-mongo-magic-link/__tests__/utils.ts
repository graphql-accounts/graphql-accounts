import { ObjectID } from 'mongodb';
import { toMongoID } from '../src/utils';

describe('toMongoID', () => {
  it('should convert to ObjectId if param is a string', () => {
    expect(typeof toMongoID('589871d1c9393d445745a57c')).toBe('object');
  });

  it('should do nothing if passing an ObjectId', () => {
    const id = new ObjectID('589871d1c9393d445745a57c');
    expect(toMongoID(new ObjectID('589871d1c9393d445745a57c'))).toEqual(id);
  });
});
