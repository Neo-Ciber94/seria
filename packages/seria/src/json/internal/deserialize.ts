/* eslint-disable @typescript-eslint/no-explicit-any */

import { type Sender, createChannel } from "../../channel";
import { type DeferredPromise, deferredPromise } from "../../deferredPromise";
import { SeriaError } from "../../error";
import { Tag, isTypedArrayTag } from "../../tag";
import { trackAsyncIterable } from "../../trackingAsyncIterable";
import { trackPromise } from "../../trackingPromise";
import { isPlainObject, base64ToBuffer } from "../../utils";
import { type Revivers } from "../parse";

type Context = {
    references: readonly unknown[];
};

type Options = {
    deferPromises?: boolean;
    revivers?: Revivers;
};

/**
 * @internal
 */
export function internal_deserialize(value: string, opts?: Options) {
    const { deferPromises = false, revivers } = opts || {};
    const pendingPromises = new Map<number, DeferredPromise<unknown>>();
    const pendingChannels = new Map<number, Sender<unknown>>();
    const references = new Map<number, any>();

    const indices = (function () {
        try {
            return JSON.parse(value) as readonly unknown[];
        } catch {
            throw new SeriaError(`Failed to parse base value: ${value}`);
        }
    })();

    const deserialize = (input: any): unknown => {
        switch (typeof input) {
            case "number":
                return input;
            case "boolean":
                return input;
            case "string": {
                if (input[0] === "$") {
                    const maybeTag = input.slice(1);

                    // Custom keys are in the form of: `$_{key}_`
                    if (revivers && maybeTag.startsWith("_")) {
                        const type = maybeTag.slice(1, maybeTag.lastIndexOf("_"));
                        const reviver = revivers[type];

                        if (reviver == null) {
                            throw new SeriaError(`Reviver for key '${type}' was not found`);
                        }

                        const rawId = maybeTag.slice(type.length + 2);
                        const id = parseTagId(rawId);
                        const val = deserialize(indices[id]);
                        return reviver(val);
                    }

                    if (maybeTag[0] === Tag.String) {
                        return input.slice(2);
                    } else if (maybeTag[0] === Tag.Symbol) {
                        return Symbol.for(input.slice(2));
                    } else if (maybeTag[0] === Tag.Date) {
                        return new Date(input.slice(2));
                    } else if (maybeTag[0] === Tag.BigInt) {
                        return BigInt(input.slice(2));
                    } else if (maybeTag === Tag.Undefined) {
                        return undefined;
                    } else if (maybeTag === Tag.Infinity_) {
                        return Infinity;
                    } else if (maybeTag === Tag.NegativeInfinity) {
                        return -Infinity;
                    } else if (maybeTag === Tag.NegativeZero) {
                        return -0;
                    } else if (maybeTag === Tag.NaN_) {
                        return NaN;
                    }

                    // All these reference types have an id
                    const id = parseTagId(input.slice(2));

                    if (references.has(id)) {
                        return references.get(id);
                    }

                    if (maybeTag[0] === Tag.Object) {
                        const value = indices[id];

                        if (isPlainObject(value)) {
                            const obj: Record<string, unknown> = {};
                            references.set(id, obj);
                            for (const [k, v] of Object.entries(value)) {
                                obj[k] = deserialize(v);
                            }
                            return obj;
                        }

                        return undefined;
                    } else if (maybeTag[0] === Tag.Array) {
                        const values = indices[id];

                        if (Array.isArray(values)) {
                            const arr: any[] = [];

                            for (const item of values) {
                                arr.push(deserialize(item));
                            }

                            return arr;
                        }

                        return undefined;
                    }
                    else if (maybeTag[0] === Tag.Set) {
                        const values = indices[id];

                        if (values && Array.isArray(values)) {
                            const set = new Set<any>();

                            for (const item of values) {
                                set.add(deserialize(item));
                            }
                            return set;
                        }

                        return undefined;
                    } else if (maybeTag[0] === Tag.Map) {
                        const values = indices[id];

                        if (values && Array.isArray(values)) {
                            const map = new Map<any, any>();

                            for (const [key, value] of values) {
                                const decodedKey = deserialize(key);
                                const decodedValue = deserialize(value);
                                map.set(decodedKey, decodedValue);
                            }
                            return map;
                        }

                        return undefined;
                    } else if (maybeTag[0] === Tag.Promise) {
                        const rawValue = indices[id];

                        if (rawValue === undefined) {
                            if (deferPromises) {
                                const deferred = deferredPromise();
                                pendingPromises.set(id, deferred);
                                return deferred.promise;
                            }

                            throw new SeriaError("Failed to find promise resolved value");
                        }

                        try {
                            const resolvedValue = deserialize(rawValue);
                            return trackPromise(id, Promise.resolve(resolvedValue));
                        } catch {
                            throw new SeriaError("Unable to resolve promise value");
                        }
                    } else if (maybeTag[0] === Tag.AsyncIterator) {
                        const asyncIteratorValues = indices[id];

                        if (!asyncIteratorValues) {
                            const [sender, receiver] = createChannel({ id });
                            pendingChannels.set(id, sender);
                            return receiver;
                        }

                        if (Array.isArray(asyncIteratorValues)) {
                            const length = asyncIteratorValues.length - 1;
                            const isDone = asyncIteratorValues[length] === "done";

                            const values = isDone
                                ? asyncIteratorValues.slice(0, -1)
                                : asyncIteratorValues;

                            const generator = (async function* () {
                                for (const item of values) {
                                    const resolvedValue = deserialize(item);
                                    yield resolvedValue;
                                }
                            })();

                            const trackedAsyncIterator = trackAsyncIterable(
                                id,
                                generator,
                                isDone ? "done" : undefined
                            );

                            return trackedAsyncIterator;
                        } else {
                            throw new SeriaError(
                                "Failed to parse async iterator, expected array of values"
                            );
                        }
                    } else if (isTypedArrayTag(maybeTag[0])) {
                        return deserializeBuffer(maybeTag[0], input, {
                            references: indices,
                        });
                    } else {
                        throw new SeriaError(`Unknown value: ${input}`);
                    }
                } else {
                    throw new SeriaError(`Invalid reference value: ${input}`);
                }
            }
            case "object": {
                if (input === null) {
                    return null;
                } else {
                    throw new SeriaError(
                        `Invalid object value: ${JSON.stringify(input)}`
                    );
                }
            }
            default:
                throw new SeriaError(`Invalid value: ${input}`);
        }
    };

    const data = deserialize(indices[0]);
    return { data, pendingPromises, pendingChannels };
}

function deserializeBuffer(tag: Tag, input: string, context: Context) {
    const getBufferData = () => {
        const id = parseTagId(input.slice(2));
        const data = context.references[id];
        if (!data) {
            throw new SeriaError(`Unable to get '${input}' buffer data`);
        }
        return String(data);
    };

    switch (tag) {
        case Tag.ArrayBuffer: {
            const bytes = base64ToBuffer(getBufferData(), Uint8Array);
            return bytes.buffer;
        }
        case Tag.Int8Array:
            return base64ToBuffer(getBufferData(), Int8Array);
        case Tag.Uint8Array:
            return base64ToBuffer(getBufferData(), Uint8Array);
        case Tag.Uint8ClampedArray:
            return base64ToBuffer(getBufferData(), Uint8ClampedArray);
        case Tag.Int16Array:
            return base64ToBuffer(getBufferData(), Int16Array);
        case Tag.Uint16Array:
            return base64ToBuffer(getBufferData(), Uint16Array);
        case Tag.Int32Array:
            return base64ToBuffer(getBufferData(), Int32Array);
        case Tag.Uint32Array:
            return base64ToBuffer(getBufferData(), Uint32Array);
        case Tag.Float32Array:
            return base64ToBuffer(getBufferData(), Float32Array);
        case Tag.Float64Array:
            return base64ToBuffer(getBufferData(), Float64Array);
        case Tag.BigInt64Array: {
            const bytes = base64ToBuffer(getBufferData(), Uint8Array);
            return new BigInt64Array(bytes.buffer);
        }
        case Tag.BigUint64Array: {
            const bytes = base64ToBuffer(getBufferData(), Uint8Array);
            return new BigUint64Array(bytes.buffer);
        }
        case Tag.DataView: {
            const bytes = base64ToBuffer(getBufferData(), Uint8Array);
            return new DataView(bytes.buffer);
        }
        default:
            throw new SeriaError(`Unknown typed array buffer: ${input}`);
    }
}

function parseTagId(input: string) {
    const id = parseInt(input);

    if (!Number.isFinite(id) || Number.isNaN(id)) {
        throw new SeriaError(`Invalid tag id: '${input}'`);
    }

    return id;
}
