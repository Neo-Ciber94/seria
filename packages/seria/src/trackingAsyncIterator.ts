/* eslint-disable @typescript-eslint/no-explicit-any */
const TRACKING_ASYNC_ITERABLE_SYMBOL = Symbol("TRACKING_ASYNC_ITERABLE_SYMBOL");

export type TrackingAsyncIterator<T, TContext = unknown> = AsyncIterable<T> & {
  id: number;
  context?: TContext;
  [TRACKING_ASYNC_ITERABLE_SYMBOL]: symbol;
};

export function trackAsyncIterable<T, TContext = unknown>(
  id: number,
  asyncIterator: AsyncIterable<T>,
  context?: TContext
): TrackingAsyncIterator<T> {
  return Object.assign(asyncIterator, {
    id,
    context,
    [TRACKING_ASYNC_ITERABLE_SYMBOL]: TRACKING_ASYNC_ITERABLE_SYMBOL,
  });
}

export function isTrackingAsyncIterable(
  value: any
): value is TrackingAsyncIterator<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    typeof value.id === "number" &&
    typeof value[Symbol.asyncIterator] === "function" &&
    value[TRACKING_ASYNC_ITERABLE_SYMBOL] === TRACKING_ASYNC_ITERABLE_SYMBOL
  );
}
