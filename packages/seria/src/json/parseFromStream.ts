/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Sender } from "../channel";
import { deferredPromise, type DeferredPromise } from "../deferredPromise";
import { SeriaError } from "../error";
import { isTrackingAsyncIterable } from "../trackingAsyncIterable";
import { isTrackingPromise } from "../trackingPromise";
import { STREAMING_DONE } from "./constants";
import { internal_deserialize } from "./internal/deserialize";
import { type Revivers } from "./parse";

export function parseFromResumableStream(
  json: string,
  resumeStream: ReadableStream<string> | null,
  revivers?: Revivers,
) {
  const { data, pendingChannels, pendingPromises } = internal_deserialize(json, {
    revivers,
    deferPromises: true,
  });

  if (resumeStream == null) {
    return data;
  }

  const promisesMap = new Map<number, DeferredPromise<unknown>>();
  const channelsMap = new Map<number, Sender<unknown>>();

  for (const [id, deferred] of pendingPromises.entries()) {
    promisesMap.set(id, deferred);
  }

  for (const [id, channelSender] of pendingChannels.entries()) {
    channelsMap.set(id, channelSender);
  }

  const resumeChunks = {
    channelsMap,
    promisesMap,
  };

  const stream = parsePendingChunks(resumeChunks, resumeStream, revivers);
  const reader = stream.getReader();

  void Promise.resolve().then(async () => {
    const promises: Promise<any>[] = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (value instanceof Promise) {
        promises.push(value);
      }
    }

    await Promise.all(promises); // If a promise reject will be here and not in the object?
  });

  return data;
}

/**
 * Takes a stream and parse each value until it resolves.
 * @param stream The stream to parse.
 * @param revivers An object with custom deserializers.
 * @returns A promise that resolve to the parsed value.
 */
export async function parseFromStream(stream: ReadableStream<string>, revivers?: Revivers) {
  const reader = createParseStream(stream, revivers).getReader();
  const deferred = deferredPromise();
  let resolved = false;

  void Promise.resolve().then(async () => {
    const promises: Promise<any>[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
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

    await Promise.allSettled(promises);
  });

  return deferred.promise;
}

function createParseStream(stream: ReadableStream<string>, revivers?: Revivers) {
  const promisesMap = new Map<number, DeferredPromise<unknown>>();
  const channelsMap = new Map<number, Sender<unknown>>();
  const resumeChunks = {
    channelsMap,
    promisesMap,
  };

  return parsePendingChunks(resumeChunks, stream, revivers);
}

type ResumeChunks = {
  promisesMap: Map<number, DeferredPromise<unknown>>;
  channelsMap: Map<number, Sender<unknown>>;
};

function parsePendingChunks(
  resumeChunks: ResumeChunks,
  stream: ReadableStream<string>,
  revivers?: Revivers,
) {
  const { channelsMap, promisesMap } = resumeChunks;
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

            if (deferred) {
              try {
                const returnValue = await data;
                deferred.resolve(returnValue);
              } catch (err) {
                deferred.reject(err);
              }
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

            const isDone = data.context === STREAMING_DONE;
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
