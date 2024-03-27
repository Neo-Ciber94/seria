export const enum Tag {
  String = "$",
  Date = "D",
  BigInt = "n",
  FormData = "K",
  Promise = "@",
  Symbol = "S",
  Set = "W",
  Map = "Q",
  Undefined = "undefined",
  Infinity_ = "Infinity",
  NegativeInfinity = "-Infinity",
  NegativeZero = "-0",
  NaN_ = "NaN",

  // Others
  File = "k",

  // Buffers
  ArrayBuffer = "A",
  Int8Array = "C",
  Uint8Array = "c",
  Uint8ClampedArray = "U",
  Int16Array = "P",
  Uint16Array = "p",
  Int32Array = "L",
  Uint32Array = "l",
  Float32Array = "F",
  Float64Array = "d",
  BigInt64Array = "N",
  BigUint64Array = "m",
  DataView = "V",
}

const TYPED_ARRAY_TAGS = [
  Tag.ArrayBuffer,
  Tag.Int8Array,
  Tag.Uint8Array,
  Tag.Uint8ClampedArray,
  Tag.Int16Array,
  Tag.Uint16Array,
  Tag.Int32Array,
  Tag.Uint32Array,
  Tag.Float32Array,
  Tag.Float64Array,
  Tag.BigInt64Array,
  Tag.BigUint64Array,
  Tag.DataView,
];

export function isTypedArrayTag(tag: string): tag is Tag {
  return TYPED_ARRAY_TAGS.includes(tag as Tag);
}
