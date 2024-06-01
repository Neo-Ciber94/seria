/* eslint-disable @typescript-eslint/no-explicit-any */
import { type TrackingAsyncIterable, trackAsyncIterable } from "../trackingAsyncIterable";
import { forEachPromise, trackResolvedPromise } from "../trackingPromise";
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
  const result = internal_serialize(value, { replacers, space });
  const firstChunk = JSON.stringify(result.output, null, space);
  const pendingIteratorsMap = new Map<number, TrackingAsyncIterable<unknown>>();

  const canStream = result.pendingPromises.length > 0 || result.pendingIterators.length > 0;

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

        // Resolve and send all the promises
        await forEachPromise(result.pendingPromises, {
          async onResolved({ data, id }) {
            const resolved = trackResolvedPromise(id, data);

            // `stringifyAsync` with an initial `id`
            // We use the initial to set the promise on the correct slot
            const serializedPromise = internal_serialize(resolved, {
              replacers,
              initialId: id,
            });

            await Promise.all(serializedPromise.pendingPromises);
            const promiseJson = JSON.stringify(serializedPromise.output, null, space);

            if (serializedPromise.pendingIterators.length > 0) {
              for (const gen of serializedPromise.pendingIterators) {
                pendingIteratorsMap.set(gen.id, gen);
              }
            }

            controller.enqueue(`${promiseJson}\n\n`);
          },
        });

        // The resolved promises may return other async generator we need to also resolve
        if (result.pendingIterators.length > 0) {
          for (const gen of result.pendingIterators) {
            pendingIteratorsMap.set(gen.id, gen);
          }
        }

        // Resolve and send all the async generators
        if (pendingIteratorsMap.size > 0) {
          const pendingIterators = Array.from(pendingIteratorsMap.values());
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
              await Promise.all(serializedAsyncIterator.pendingPromises);
              for await (const _ of serializedAsyncIterator.pendingIterators) {
                /* */
              }

              const genJson = JSON.stringify(serializedAsyncIterator.output, null, space);
              controller.enqueue(`${genJson}\n\n`);
            }
          });

          await Promise.all(resolveIterators);
        }

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
