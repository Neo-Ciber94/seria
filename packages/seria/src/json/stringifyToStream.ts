/* eslint-disable @typescript-eslint/no-explicit-any */
import { type TrackingAsyncIterable, trackAsyncIterable } from "../trackingAsyncIterable";
import { forEachPromise, trackResolvedPromise } from "../trackingPromise";
import { internal_serialize } from "./internal/serialize";
import { type Replacers } from "./stringify";

/**
 * Convert a value to a `ReadableStream` that stringify each value.
 * @param value The value to convert.
 * @param replacers A function that encode a custom value.
 * @param space Adds indentation, white space to the json values line-breaks.
 * @returns A stream that stringify each value.
 */
export function stringifyToStream(
  value: unknown,
  replacers?: Replacers | null,
  space?: number | string,
) {
  const result = internal_serialize(value, { replacers, space });
  const json = JSON.stringify(result.output, null, space);
  const pendingIteratorsMap = new Map<number, TrackingAsyncIterable<unknown>>();

  return new ReadableStream<string>({
    async start(controller) {
      // We send the first chunk which may be the container or the final value
      controller.enqueue(`${json}\n\n`);

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
          for await (const item of iter) {
            const isDone = item === "done";
            const gen = (async function* () {
              yield item;
            })(); // FIXME: We can maybe cache this?
            const onceAsyncIterable = trackAsyncIterable(iter.id, gen, {
              resolved: isDone ? item : (item as any).item,
              isDone,
            });

            const serializedAsyncIterator = internal_serialize(onceAsyncIterable, {
              initialId: iter.id,
              replacers,
            });

            await Promise.all(serializedAsyncIterator.pendingPromises);
            for await (const _ of serializedAsyncIterator.pendingIterators) { /* */ }

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
