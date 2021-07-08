export const isString = (x: any): x is string => {
  return typeof x === 'string';
};

export const isObject = (x: any): x is object => {
  return x !== null && typeof x === 'object';
};
