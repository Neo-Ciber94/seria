export type Sender<T, TContext = unknown> = {
  id: number;
  context?: TContext;
  send: (value: T | Promise<T>) => void;
  close: () => void;
};

export type Receiver<T, TContext = unknown> = {
  id: number;
  context?: TContext;
  recv: () => Promise<T> | undefined;
  isClosed: () => boolean;
  [Symbol.asyncIterator]: () => AsyncIterator<T>;
};

type ChannelOptions<TContext> = {
  id: number;
  context?: TContext;
};
/**
 * Create a multi-producer and single consumer channel.
 * @param options Options used to create the channel.
 * @returns A tuple with the sender and receiver.
 */
export function createChannel<T, TContext = unknown>(
  options: ChannelOptions<TContext>
) {
  const { id, context } = options;
  const promiseQueue: Promise<T>[] = [];
  let pendingResolve: ((value: T | Promise<T>) => void) | undefined = undefined;
  let closed = false;

  function send(value: T | Promise<T>) {
    if (closed) {
      throw new Error("Channel was closed");
    }

    const promise = value instanceof Promise ? value : Promise.resolve(value);

    if (pendingResolve) {
      pendingResolve(promise);
      pendingResolve = undefined;
      return;
    }

    promiseQueue.push(promise);
  }

  function recv() {
    if (closed && promiseQueue.length === 0) {
      return undefined;
    }

    return new Promise<T>((resolve) => {
      const promise = promiseQueue.shift();
      if (promise) {
        resolve(promise);
      } else {
        pendingResolve = resolve;
      }
    });
  }

  async function* asyncIterator() {
    while (true) {
      const item = await recv();
      if (item === undefined) {
        return;
      }

      yield item;
    }
  }

  const sender: Sender<T, TContext> = {
    id,
    context,
    send,
    close: () => {
      closed = true;
    },
  };

  const receiver: Receiver<T, TContext> = {
    id,
    context,
    recv,
    isClosed: () => closed,
    [Symbol.asyncIterator]: asyncIterator,
  };

  return [sender, receiver] as const;
}
