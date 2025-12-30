export const isObject = (value: unknown) => {
  return typeof value === "object" && value !== null;
};

export const isFunction = (value: unknown) => {
  return typeof value === "function";
};

export const isString = (value: unknown) => {
  return typeof value === "string";
};

export const isSymbol = (val: unknown): val is symbol =>
  typeof val === "symbol";

export const isNumber = (value: unknown) => {
  return typeof value === "number";
};
export const isIntegerKey = (key: unknown) =>
  isString(key) &&
  key !== "NaN" &&
  key[0] !== "-" &&
  "" + parseInt(key, 10) === key;

export const hasChanged = (value: unknown, oldValue: unknown): boolean => {
  return !Object.is(value, oldValue);
};
const hasOwnProperty = Object.prototype.hasOwnProperty;
export const hasOwn = (
  val: object,
  key: string | symbol
): key is keyof typeof val => hasOwnProperty.call(val, key);

export const isArray = Array.isArray;
export const assign = Object.assign;

export const objectToString = Object.prototype.toString;
export const toTypeString = (value: unknown): string =>
  objectToString.call(value);
export const toRawType = (value: unknown): string => {
  // extract "RawType" from strings like "[object RawType]"
  return toTypeString(value).slice(8, -1);
};
