/* eslint-disable @typescript-eslint/no-explicit-any */
const TRACKING_ASYNC_ITERATOR_SYMBOL = Symbol("TRACKING_ASYNC_ITERATOR_SYMBOL");

export type TrackingAsyncIterator<T> = AsyncIterable<T> & {
  id: number;
  [TRACKING_ASYNC_ITERATOR_SYMBOL]: symbol;
};

export function trackAsyncIterator<T>(
  id: number,
  asyncIterator: AsyncIterable<T>
): TrackingAsyncIterator<T> {
  return Object.assign(asyncIterator, {
    id,
    [TRACKING_ASYNC_ITERATOR_SYMBOL]: TRACKING_ASYNC_ITERATOR_SYMBOL,
  });
}

export function isTrackingAsyncIterator(
  value: any
): value is TrackingAsyncIterator<unknown> {
  return (
    value != null &&
    typeof value === "object" &&
    typeof value.id === "number" &&
    typeof value[Symbol.asyncIterator] === "function" &&
    value[TRACKING_ASYNC_ITERATOR_SYMBOL] === TRACKING_ASYNC_ITERATOR_SYMBOL
  );
}
