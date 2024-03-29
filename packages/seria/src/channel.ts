export type Sender<T> = {
  id: number;
  send: (value: T | Promise<T>) => void;
  close: () => void;
};

export type Receiver<T> = {
  id: number;
  recv: () => Promise<T> | undefined;
  isClosed: () => boolean;
  [Symbol.asyncIterator]: () => AsyncIterator<T>;
};

type ChannelOptions = {
  id: number;
};
/**
 * Create a multi-producer and single consumer channel.
 * @param options Options used to create the channel.
 * @returns A tuple with the sender and receiver.
 */
export function createChannel<T>(options: ChannelOptions) {
  const { id } = options;
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

  const sender: Sender<T> = {
    id,
    send,
    close: () => {
      closed = true;
    },
  };

  const receiver: Receiver<T> = {
    id,
    recv,
    isClosed: () => closed,
    [Symbol.asyncIterator]: asyncIterator,
  };

  return [sender, receiver] as const;
}
