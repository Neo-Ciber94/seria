/* eslint-disable @typescript-eslint/no-explicit-any */
const TRACKING_ASYNC_ITERABLE_SYMBOL = Symbol("TRACKING_ASYNC_ITERABLE_SYMBOL");

export type TrackingAsyncIterable<T, TContext = unknown> = AsyncIterable<T> & {
  id: number;
  context?: TContext;
  [TRACKING_ASYNC_ITERABLE_SYMBOL]: true;
};

export function trackAsyncIterable<T, TContext = unknown>(
  id: number,
  asyncIterator: AsyncIterable<T>,
  context?: TContext
): TrackingAsyncIterable<T> {
  return Object.assign(asyncIterator, {
    id,
    context,
    [TRACKING_ASYNC_ITERABLE_SYMBOL]: true as const,
  });
}

export function isTrackingAsyncIterable(
  value: any
): value is TrackingAsyncIterable<unknown> {
  return (
    value != null &&
    typeof value.id === "number" &&
    typeof value[Symbol.asyncIterator] === "function" &&
    value[TRACKING_ASYNC_ITERABLE_SYMBOL] === true
  );
}
