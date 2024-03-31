export type Sender<T> = {
  id: number;
  send: (value: T | Promise<T>) => void;
  close: () => void;
};

export type Receiver<T> = {
  id: number;
  recv: () => Promise<T> | undefined;
  next: () => Promise<IteratorResult<T>>;
  isClosed: () => boolean;
  [Symbol.asyncIterator]: () => AsyncIterator<T>;
};

type ChannelOptions = {
  id: number;
};

type ResolvePromise<T> = (value: T | Promise<T>) => void;

/**
 * Create a multi-producer and single consumer channel.
 * @param options Options used to create the channel.
 * @returns A tuple with the sender and receiver.
 */
export function createChannel<T>(options: ChannelOptions) {
  const { id } = options;
  const queue: Promise<T>[] = [];
  const resolveQueue: ResolvePromise<T>[] = [];
  let closed = false;

  function send(value: T | Promise<T>) {
    if (closed) {
      throw new Error("Channel was closed");
    }

    const promise = value instanceof Promise ? value : Promise.resolve(value);
    const resolve = resolveQueue.shift();

    if (resolve) {
      resolve(promise);
    } else {
      queue.push(promise);
    }
  }

  function recv() {
    if (closed && queue.length === 0) {
      return undefined;
    }

    const promise = queue.shift();
    if (promise) {
      return promise;
    }

    return new Promise<T>((resolve) => {
      resolveQueue.push(resolve);
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

  async function next(): Promise<IteratorResult<T>> {
    const promise = recv();

    if (!promise) {
      return { done: true, value: undefined };
    }

    const value = await promise;
    return { value };
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
    next,
    isClosed: () => closed,
    [Symbol.asyncIterator]: asyncIterator,
  };

  return [sender, receiver] as const;
}
