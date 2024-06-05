/* eslint-disable @typescript-eslint/no-explicit-any */
import { type TrackingAsyncIterable, trackAsyncIterable } from "../trackingAsyncIterable";
import {
  forEachPromise,
  trackRejectedPromise,
  trackResolvedPromise,
  type TrackingPromise,
} from "../trackingPromise";
import { STREAMING_DONE } from "./constants";
import { internal_serialize } from "./internal/serialize";
import { type Replacers } from "./stringify";

/**
 * A result from `stringifyToResumableStream`.
 */
export type StringifyResumableStreamResult = {
  /**
   * The serialized value.
   */
  json: string;

  /**
   * A stream that resolves any pending promises/async iterator in the serialized value.
   */
  resumeStream: ReadableStream<string> | null;
};

/**
 * Serialize a value and return the result value and a `ReadableStream` that resolves all the pending values.
 * @param value The value to serialize.
 * @param replacers An object with custom serializers.
 * @param space Adds indentation, white space to the json values line-breaks.
 * @returns An object containing the serialized value and a stream that resolve to any pending value.
 */
export function stringifyToResumableStream(
  value: unknown,
  replacers?: Replacers | null,
  space?: number | string,
): StringifyResumableStreamResult {
  const { firstChunk, resumeStream } = createStringifyStream({
    value,
    replacers,
    space,
    splitFromFirstChunk: true,
  });

  return {
    json: firstChunk!,
    resumeStream,
  };
}

/**
 * Serialize a value and return the value and all its pending values in a `ReadableStream`.
 * @param value The value to serialize.
 * @param replacers An object with custom serializers.
 * @param space Adds indentation, white space to the json values line-breaks.
 * @returns A stream that stringify each value.
 */
export function stringifyToStream(
  value: unknown,
  replacers?: Replacers | null,
  space?: number | string,
): ReadableStream<string> {
  const { resumeStream } = createStringifyStream({
    value,
    replacers,
    space,
    splitFromFirstChunk: false,
  });

  return resumeStream!;
}

interface CreateStringifyStreamOptions {
  value: unknown;
  replacers?: Replacers | null;
  space?: number | string;

  // Whether if include the first chunk on the initial stream response, if included the `firstChunk` value will be null
  splitFromFirstChunk: boolean;
}

function createStringifyStream(options: CreateStringifyStreamOptions) {
  const { value, replacers, space, splitFromFirstChunk } = options;
  const result = internal_serialize(value, { replacers, space }); // We do not deconstruct this because the getter may resolve before have actually any value
  const firstChunk = JSON.stringify(result.output, null, space);
  const canStream = result.pendingPromises.length > 0 || result.pendingIterators.length > 0;

  const promisesMap = new Map<number, TrackingPromise<unknown>>();
  const generatorsMap = new Map<number, TrackingAsyncIterable<unknown>>();
  let pendingResultGenerators = false;

  function createStreamResume(chunk?: string) {
    return new ReadableStream<string>({
      async start(controller) {
        /*
         * The first chunk is the first serialized value, this may be either:
         * - The final value
         * - The container for the pending promises/generators
         */
        if (chunk) {
          controller.enqueue(`${chunk}\n\n`);
        }

        for (const p of result.pendingPromises) {
          promisesMap.set(p.id, p);
        }

        do {
          const onPromiseSettled = async (type: "resolved" | "rejected", id: number, data: any) => {
            const promise = (() => {
              switch (type) {
                case "resolved":
                  return trackResolvedPromise(id, data);
                case "rejected":
                  return trackRejectedPromise(id, data);
              }
            })();

            promise.catch(() => null); // This prevent an unhandled error

            // `stringifyAsync` with an initial `id`
            // We use the initial to set the promise on the correct slot
            const serializedPromise = internal_serialize(promise, {
              replacers,
              initialId: id,
            });

            await Promise.allSettled(serializedPromise.pendingPromises);
            const promiseJson = JSON.stringify(serializedPromise.output, null, space);

            if (serializedPromise.pendingIterators.length > 0) {
              for (const gen of serializedPromise.pendingIterators) {
                generatorsMap.set(gen.id, gen);
              }
            }

            if (serializedPromise.pendingPromises.length > 0) {
              for (const p of serializedPromise.pendingPromises) {
                promisesMap.set(p.id, p);
              }
            }

            promisesMap.delete(id);
            controller.enqueue(`${promiseJson}\n\n`);
          };

          // Resolve and send all the promises
          const pendingPromises = Array.from(promisesMap.values());
          await forEachPromise(pendingPromises, {
            onResolved({ id, data }) {
              return onPromiseSettled("resolved", id, data);
            },
            onRejected({ id, error }) {
              return onPromiseSettled("rejected", id, error);
            },
          });

          // The resolved promises may return other async generator we need to also resolve
          if (!pendingResultGenerators) {
            pendingResultGenerators = true;

            if (result.pendingIterators.length > 0) {
              for (const gen of result.pendingIterators) {
                generatorsMap.set(gen.id, gen);
              }
            }
          }

          // Resolve and send all the async generators
          if (generatorsMap.size > 0) {
            const pendingIterators = Array.from(generatorsMap.values());
            const resolveIterators = pendingIterators.map(async (iter) => {
              for await (const next of iter) {
                // FIXME: We can maybe cache this?
                const gen = async function* () {
                  yield next;
                };

                const isDone = next === STREAMING_DONE;
                const resolved = isDone ? next : (next as any).value;
                const resolvedAsyncIterable = trackAsyncIterable(iter.id, gen(), {
                  resolved,
                  isDone,
                });

                const serializedAsyncIterator = internal_serialize(resolvedAsyncIterable, {
                  initialId: iter.id,
                  replacers,
                });

                // FIXME: We should not have any pending promises or async iterators at this point
                await Promise.allSettled(serializedAsyncIterator.pendingPromises);
                for await (const _ of serializedAsyncIterator.pendingIterators) {
                  /* */
                }

                for (const p of serializedAsyncIterator.pendingPromises) {
                  promisesMap.set(p.id, p);
                }

                const genJson = JSON.stringify(serializedAsyncIterator.output, null, space);
                controller.enqueue(`${genJson}\n\n`);
              }

              generatorsMap.delete(iter.id);
            });

            await Promise.allSettled(resolveIterators);
          }
        } while (promisesMap.size > 0 || generatorsMap.size > 0);

        controller.close();
      },
    });
  }

  if (splitFromFirstChunk) {
    const resumeStream = canStream ? createStreamResume() : null;
    return { firstChunk, resumeStream };
  }

  return { firstChunk: null, resumeStream: createStreamResume(firstChunk) };
}
