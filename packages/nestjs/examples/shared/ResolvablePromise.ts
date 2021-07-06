export class ResolvablePromise<T = any> implements PromiseLike<T> {
  __promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: T) => void;
  constructor() {
    this.__promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: any) => TResult2 | PromiseLike<TResult2>,
  ): PromiseLike<TResult1 | TResult2> {
    return this.__promise.then(onfulfilled, onrejected);
  }
  catch(...args) {
    return this.__promise.catch(...args);
  }
  finally(...args) {
    return this.__promise.finally(...args);
  }
}
