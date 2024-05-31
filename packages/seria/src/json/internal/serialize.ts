/* eslint-disable @typescript-eslint/no-explicit-any */
import { SeriaError } from "../../error";
import { Tag } from "../../tag";
import { type TrackingAsyncIterable, isTrackingAsyncIterable, trackAsyncIterable } from "../../trackingAsyncIterable";
import { type TrackingPromise, isTrackingPromise, trackPromise } from "../../trackingPromise";
import { isPlainObject, bufferToBase64 } from "../../utils";
import { type Replacers } from "../stringify";

export type Reference = {
    tag: Tag,
    id: number
}

export type SerializeContext = {
    output: unknown[];
    serializedValues: Map<number, unknown>;
    referencesMap: Map<object, Reference>;
    pendingPromisesMap: Map<number, TrackingPromise<any>>;
    pendingIteratorsMap: Map<number, TrackingAsyncIterable<any>>;
    space?: string | number;
    nextId: () => number;
    serialize: (input: any) => unknown;
    checkSerialized: () => void;
};

type SerializeOptions = {
    replacers?: Replacers | null;
    initialId?: number;
    space?: number | string;
    formData?: FormData
}

/**
 * @internal
 */
export function internal_serialize(
    value: unknown,
    opts: SerializeOptions
) {
    const { replacers, space, initialId = 1, formData } = opts;
    const serializedValues = new Map<number, unknown>();
    const referencesMap = new Map<object, Reference>();
    const pendingPromisesMap = new Map<number, TrackingPromise<any>>();
    const pendingIteratorsMap = new Map<number, TrackingAsyncIterable<any>>();
    const output: unknown[] = [];
    let id = initialId;

    // Get the next id
    const nextId = () => {
        return id++;
    };

    // Update the references of the serialized values
    const checkSerialized = () => {
        for (const [id, value] of serializedValues) {
            output[id] = value;
        }
    };

    const context: SerializeContext = {
        output,
        serializedValues,
        referencesMap,
        pendingPromisesMap,
        pendingIteratorsMap,
        space,
        nextId,
        serialize,
        checkSerialized,
    };

    function serialize(input: any) {
        // Custom serializer
        if (replacers) {
            for (const [key, fn] of Object.entries(replacers)) {
                const val = fn(input, context);
                if (val !== undefined) {
                    const id = context.nextId();
                    const replacerKey = `_${key}_`;
                    serializedValues.set(id, serialize(val));
                    return serializeTagValue(replacerKey as Tag, id);
                }
            }
        }

        // Default serializer
        switch (typeof input) {
            case "string":
                return serializeString(input)
            case "boolean":
                return input;
            case "number":
                return serializeNumber(input);
            case "symbol":
                return serializeSymbol(input);
            case "undefined":
                return "$undefined";
            case "bigint":
                return serializeBigInt(input);
            case "object": {
                if (input === null) {
                    return null;
                }
                else if (input instanceof String) {
                    return serializeString(input.toString())
                }
                else if (input instanceof Date) {
                    return serializeDate(input);
                }
                else if (referencesMap.has(input)) {
                    const { tag, id } = referencesMap.get(input)!;
                    return serializeTagValue(tag, id)
                }

                if (input instanceof Map) {
                    return serializeMap(input, context);
                } else if (input instanceof Set) {
                    return serializeSet(input, context);
                } else if (Array.isArray(input)) {
                    return serializeArray(input, context);
                } else if (isPlainObject(input)) {
                    return serializePlainObject(input, context);
                } else if (input instanceof Promise) {
                    return serializePromise(input, context);
                } else if (isAsyncIterable(input)) {
                    return serializeAsyncIterable(input, context);
                }
                // Serialize FormData
                else if (formData && input instanceof FormData) {
                    const id = nextId();
                    for (const [key, entry] of input) {
                        const fieldName = `${id}_${key}`;
                        formData.set(fieldName, entry);
                    }

                    referencesMap.set(input, { id, tag: Tag.FormData })
                    return serializeTagValue(Tag.FormData, id);
                }
                else if (formData && input instanceof File) {
                    const id = nextId();
                    formData.set(`${id}_file`, input);
                    referencesMap.set(input, { id, tag: Tag.File })
                    return serializeTagValue(Tag.File, id);
                }
                // Serialize typed arrrays
                else if (input instanceof ArrayBuffer) {
                    return serializeArrayBuffer(input, context);
                } else if (input instanceof Int8Array) {
                    return serializeTypedArray(Tag.Int8Array, input, context);
                } else if (input instanceof Uint8Array) {
                    return serializeTypedArray(Tag.Uint8Array, input, context);
                } else if (input instanceof Uint8ClampedArray) {
                    return serializeTypedArray(Tag.Uint8ClampedArray, input, context);
                } else if (input instanceof Int16Array) {
                    return serializeTypedArray(Tag.Int16Array, input, context);
                } else if (input instanceof Uint16Array) {
                    return serializeTypedArray(Tag.Uint16Array, input, context);
                } else if (input instanceof Int32Array) {
                    return serializeTypedArray(Tag.Int32Array, input, context);
                } else if (input instanceof Uint32Array) {
                    return serializeTypedArray(Tag.Uint32Array, input, context);
                } else if (input instanceof Float32Array) {
                    return serializeTypedArray(Tag.Float32Array, input, context);
                } else if (input instanceof Float64Array) {
                    return serializeTypedArray(Tag.Float64Array, input, context);
                } else if (input instanceof BigInt64Array) {
                    return serializeTypedArray(Tag.BigInt64Array, input, context);
                } else if (input instanceof BigUint64Array) {
                    return serializeTypedArray(Tag.BigUint64Array, input, context);
                } else if (input instanceof DataView) {
                    return serializeTypedArray(Tag.DataView, input, context);
                } else {
                    throw new SeriaError(
                        `Unable to serialize value: ${JSON.stringify(input)}`
                    );
                }
            }
            case "function": {
                throw new SeriaError("Functions cannot be serialized");
            }
            default:
                throw new SeriaError(
                    `Unreachable. Reaching this code should be considered a bug`
                );
        }
    }

    // The base value contains all the references ids
    const baseValue = serialize(value);
    output[0] = baseValue;

    // Update all the serialized values
    checkSerialized();

    return {
        output,
        get pendingPromises() {
            return Array.from(pendingPromisesMap.values());
        },
        get pendingIterators() {
            return Array.from(pendingIteratorsMap.values());
        },
    };
}

function serializeString(input: string) {
    return `$$${input}`;
}

function serializeNumber(input: number) {
    if (Number.isFinite(input)) {
        if (input === 0 && 1 / input === -Infinity) {
            return serializeTagValue(Tag.NegativeZero);
        } else {
            return input;
        }
    } else {
        if (input === Infinity) {
            return serializeTagValue(Tag.Infinity_);
        } else if (input === -Infinity) {
            return serializeTagValue(Tag.NegativeInfinity);
        } else {
            return serializeTagValue(Tag.NaN_);
        }
    }
}

function serializeSymbol(input: symbol) {
    return serializeTagValue(Tag.Symbol, input.description);
}

function serializeBigInt(input: bigint) {
    return serializeTagValue(Tag.BigInt, String(input));
}

function serializeDate(input: Date) {
    const invalid = isNaN(input.getTime());
    return serializeTagValue(Tag.Date, invalid ? '' : input.toISOString());
}

function serializeArray(input: Array<any>, context: SerializeContext) {
    const items: unknown[] = [];
    const id = context.nextId();
    context.referencesMap.set(input, { id, tag: Tag.Array })
    context.serializedValues.set(id, items);

    for (const val of input) {
        items.push(context.serialize(val));
    }

    return serializeTagValue(Tag.Array, id);
}

function serializeSet(input: Set<any>, context: SerializeContext) {
    const { serializedValues } = context;
    const items: unknown[] = [];
    const id = context.nextId();
    context.referencesMap.set(input, { id, tag: Tag.Set })

    for (const val of input) {
        items.push(context.serialize(val));
    }

    serializedValues.set(id, items);
    return serializeTagValue(Tag.Set, id);
}

function serializeMap(input: Map<any, any>, context: SerializeContext) {
    const { serializedValues } = context;
    const items: [unknown, unknown][] = [];
    const id = context.nextId();
    context.referencesMap.set(input, { id, tag: Tag.Map })

    for (const [k, v] of input) {
        const encodedKey = context.serialize(k);
        const encodedValue = context.serialize(v);
        items.push([encodedKey, encodedValue]);
    }

    serializedValues.set(id, items);
    return serializeTagValue(Tag.Map, id);
}

function serializePlainObject(
    input: Record<string, unknown>,
    context: SerializeContext
) {
    const obj: Record<string, unknown> = {};
    const id = context.nextId();
    context.serializedValues.set(id, obj);
    context.referencesMap.set(input, { id, tag: Tag.Object })

    for (const [key, value] of Object.entries(input)) {
        if (typeof key === 'symbol') {
            throw new SeriaError("Cannot serialize an object with a 'symbol' as key")
        }

        obj[key] = context.serialize(value);
    }

    return serializeTagValue(Tag.Object, id);
}

function serializePromise(input: Promise<any>, context: SerializeContext) {
    const id = context.nextId();

    if (isTrackingPromise(input) && input.status.state === 'resolved') {
        const ret = context.serialize(input.status.data);
        context.serializedValues.set(id, ret);
        context.checkSerialized(); // Update the values with the new one
        return serializeTagValue(Tag.Promise, id);
    }

    // We create a new promise that resolve to the serialized value
    const resolvingPromise = input.then((value) => {
        const ret = context.serialize(value);
        context.serializedValues.set(id, ret);
        context.checkSerialized(); // Update the values with the new one
        return value;
    });

    const trackingPromise = trackPromise(id, resolvingPromise);
    context.pendingPromisesMap.set(id, trackingPromise);
    return serializeTagValue(Tag.Promise, id);
}

function serializeArrayBuffer(input: ArrayBuffer, context: SerializeContext) {
    return serializeTypedArray(Tag.ArrayBuffer, new Uint8Array(input), context);
}

function serializeTypedArray(
    tag: Tag,
    input: ArrayBufferView,
    context: SerializeContext
) {
    const id = context.nextId();
    const buffer = bufferToBase64(input.buffer);
    context.serializedValues.set(id, buffer);
    context.referencesMap.set(input, { id, tag })
    return serializeTagValue(tag, id);
}

function serializeAsyncIterable(
    input: AsyncIterable<unknown>,
    context: SerializeContext
) {
    const id = context.nextId();

    // This is a shortcut in case the iterator already contains a resolved value
    if (isTrackingAsyncIterable(input) && input.context) {
        const iteratorContext = input.context as { resolved?: unknown, isDone?: boolean };
        const isDone = iteratorContext.isDone === true;

        if (isDone) {
            context.serializedValues.set(id, ["done"]);
            context.checkSerialized();
        }
        else {
            const ret = context.serialize(iteratorContext.resolved);
            context.serializedValues.set(id, [ret]);
            context.checkSerialized();
        }

        return serializeTagValue(Tag.AsyncIterator, id);
    }

    // We send all the async iterable emited and any nested async iterable values.
    // Flattening the nested iterable would make no sense because we are not returning the exact
    // value was originally stringified. So we could:
    // 1. Throw an error and don't stringify nested async iterables
    // 2. Attempt to stringify nested async iterables which could lead to infinite loops.
    async function* resolveAsyncIterable(
        iter: AsyncIterable<unknown>
    ): AsyncGenerator<unknown> {
        for await (const item of iter) {
            if (isAsyncIterable(item)) {
                // console.warn("Avoid returning nested async iterables, prefer using `yield*` instead")
                yield* resolveAsyncIterable(item);
            } else {
                yield item;
            }
        }
    }

    const generator = (async function* () {
        for await (const item of resolveAsyncIterable(input)) {
            const ret = context.serialize(item);

            // Push the new generated value
            const items = [...((context.output[id] as any[]) || []), ret];
            context.serializedValues.set(id, items);
            context.checkSerialized();
            yield { item };
        }

        // Notify is done
        const items = [...((context.output[id] as any[]) || []), "done"];
        context.serializedValues.set(id, items);
        context.checkSerialized();
        yield "done";
    })();

    const tracked = trackAsyncIterable(id, generator);
    context.pendingIteratorsMap.set(id, tracked);
    return serializeTagValue(Tag.AsyncIterator, id);
}

/**
 * @internal
 */
export function serializeTagValue(tag: Tag, value?: number | string) {
    return value !== undefined ? `$${tag}${value}` : `$${tag}`;
}

function isAsyncIterable(value: any): value is AsyncIterable<unknown> {
    return value != null && typeof value[Symbol.asyncIterator] === "function";
}
