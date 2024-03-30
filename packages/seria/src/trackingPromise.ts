/* eslint-disable @typescript-eslint/no-explicit-any */
const TRACKING_PROMISE_SYMBOL = Symbol("TRACKING_PROMISE_SYMBOL");

type PromiseStatus<T> =
  | { state: "pending" }
  | { state: "resolved"; data: T }
  | { state: "rejected"; error: unknown };

export type TrackingPromise<T> = Promise<T> & {
  id: number;
  status: PromiseStatus<T>;
  [TRACKING_PROMISE_SYMBOL]: true;
};

export function trackPromise<T>(
  id: number,
  promise: Promise<T>
): TrackingPromise<T> {
  const tracking = Object.assign(promise, {
    id,
    status: { state: "pending" },
    [TRACKING_PROMISE_SYMBOL]: true,
  }) as TrackingPromise<T>;

  tracking
    .then((data) => {
      tracking.status = {
        state: "resolved",
        data,
      };
    })
    .catch((error) => {
      tracking.status = {
        state: "rejected",
        error,
      };
    });

  return tracking;
}

export function isTrackingPromise(
  value: any
): value is TrackingPromise<unknown> {
  return (
    value != null &&
    typeof value.id === "number" &&
    typeof value.status === "object" &&
    value[TRACKING_PROMISE_SYMBOL] === true &&
    value instanceof Promise
  );
}

export async function forEachPromise<T = unknown>(
  promises: TrackingPromise<T>[],
  callbacks: {
    onResolved: (state: { data: T; id: number }) => void;
    onRejected?: (state: { error: unknown; id: number }) => void;
  }
) {
  const { onResolved, onRejected } = callbacks;
  const pendingPromises: Promise<void>[] = [];

  for (const p of promises) {
    let resolving = p.then((data) => {
      onResolved({ id: p.id, data });
    });

    if (onRejected) {
      resolving = resolving.catch((error) => {
        onRejected({ id: p.id, error });
      });
    }

    pendingPromises.push(resolving);
  }

  await Promise.all(pendingPromises);
}
