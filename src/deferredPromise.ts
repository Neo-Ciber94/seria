export type DeferredPromise<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason: unknown) => void;
};

export function deferredPromise<T>(): DeferredPromise<T> {
  let resolve = (_value: T | PromiseLike<T>) => {};
  let reject = (_reason: unknown) => {};

  const promise = new Promise<T>((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  });

  return {
    promise,
    resolve,
    reject,
  };
}
