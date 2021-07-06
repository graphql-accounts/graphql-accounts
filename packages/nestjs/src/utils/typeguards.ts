import { Provider } from '@nestjs/common';
import { Type, ClassProvider, ExistingProvider } from '@nestjs/common/interfaces';

export function isProvider<T = any>(obj: any): obj is Provider<T> {
  // test if the object is a class too, if it's a POJO that doesn't have the other fields, it shouldn't pass this
  return obj && (isClassProvider(obj) || isExistingProvider(obj) || 'useValue' in obj || 'useFactory' in obj);
}

export function isClassProvider<T = any>(obj: any): obj is ClassProvider<T> {
  return obj && 'useClass' in obj;
}
export function isExistingProvider<T = any>(obj: any): obj is ExistingProvider<T> {
  return obj && 'useExisting' in obj;
}

export function isClass<T = any>(obj: any): obj is Type<T> {
  return obj && obj.constructor !== Object;
}
