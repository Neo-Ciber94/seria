/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Sender } from "../channel";
import { deferredPromise, type DeferredPromise } from "../deferredPromise";
import { SeriaError } from "../error";
import { isTrackingAsyncIterable } from "../trackingAsyncIterable";
import { isTrackingPromise } from "../trackingPromise";
import { internal_deserialize } from "./internal/deserialize";
import { type Revivers } from "./parse";

/**
 * Takes a stream and parse each value until it resolves.
 * @param stream The stream to parse.
 * @param revivers A function to convert a value.
 * @returns A promise that resolve to the parsed value.
 */
export async function parseFromStream(stream: ReadableStream<string>, revivers?: Revivers) {
  const reader = internal_parseFromStream(stream, revivers).getReader();
  let resolved = false;
  const deferred = deferredPromise();

  void Promise.resolve().then(async () => {
    const promises: Promise<any>[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done || value === undefined) {
        break;
      }

      if (!resolved) {
        resolved = true;
        deferred.resolve(value);
      }

      if (value instanceof Promise) {
        promises.push(value);
      }
    }

    if (!resolved) {
      deferred.reject(new SeriaError("Unable to find resolved value"));
    }

    await Promise.all(promises);
  });

  return deferred.promise;
}

/**
 * @internal
 */
export function internal_parseFromStream(stream: ReadableStream<string>, revivers?: Revivers) {
  const promisesMap = new Map<number, DeferredPromise<unknown>>();
  const channelsMap = new Map<number, Sender<unknown>>();
  const reader = stream.getReader();

  return new ReadableStream<unknown>({
    async start(controller) {
      async function processChunk(jsonChunk: string) {
        const { data, pendingPromises, pendingChannels } = internal_deserialize(jsonChunk, {
          deferPromises: true,
          revivers,
        });

        // Send the value
        controller.enqueue(data);

        // Handle promises
        {
          for (const [id, deferred] of pendingPromises.entries()) {
            promisesMap.set(id, deferred);
          }

          // Resolve a pending promise
          if (isTrackingPromise(data)) {
            const deferred = promisesMap.get(data.id);

            if (!deferred) {
              throw new SeriaError(`Promise with id: '${data.id}' was not found`);
            }

            try {
              const returnValue = await data;
              deferred.resolve(returnValue);
            } catch (err) {
              deferred.reject(err);
            }
          }
        }

        // Handle async iterators
        {
          if (pendingChannels.size > 0) {
            for (const [id, channelSender] of pendingChannels.entries()) {
              channelsMap.set(id, channelSender);
            }
          }

          if (isTrackingAsyncIterable(data)) {
            const sender = channelsMap.get(data.id);

            if (!sender) {
              throw new SeriaError(`AsyncIterator sender with id '${data.id}' was not found`);
            }

            const isDone = data.context === "done";
            for await (const item of data) {
              sender.send(item);
            }

            if (isDone) {
              sender.close();
            }
          }
        }
      }

      while (true) {
        const { done, value: raw } = await reader.read();
        if (done || raw === undefined) {
          break;
        }

        const chunks = raw.split("\n\n").filter(Boolean);

        // We process all chunks at once if possible
        if (chunks.length > 1) {
          const promises = chunks.map(processChunk);
          await Promise.all(promises);
        } else {
          await processChunk(chunks[0]);
        }
      }

      controller.close();
    },
  });
}
