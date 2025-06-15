import { isObject, toRawType } from "@vue/shared";
import { mutableHandlers } from "./baseHandlers";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
  IS_READONLY = "__v_isReadonly",
  IS_SHALLOW = "__v_isShallow",
  RAW = "__v_raw",
  IS_SKIP = "__v_skip",
}

export interface Target {
  [ReactiveFlags.IS_REACTIVE]?: boolean;
  [ReactiveFlags.IS_READONLY]?: boolean;
  [ReactiveFlags.IS_SHALLOW]?: boolean;
  [ReactiveFlags.RAW]?: boolean;
  [ReactiveFlags.IS_SKIP]?: boolean;
}

export const reactiveMap = new WeakMap<Target, any>();
export const readonlyMap = new WeakMap<Target, any>();
export const shallowReactiveMap = new WeakMap<Target, any>();
export const shallowReadonlyMap = new WeakMap<Target, any>();
const enum TargetType {
  INVALID = 0, // 无效类型
  COMMON = 1, // 普通对象 Array
  COLLECTION = 2, // Map, Set, WeakMap, WeakSet
}

function targetTypeMap(rawType: string) {
  switch (rawType) {
    case "Object":
    case "Array":
      return TargetType.COMMON;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return TargetType.COLLECTION;
    default:
      return TargetType.INVALID;
  }
}

export function getTargetType(value: Target) {
  return value[ReactiveFlags.IS_SKIP] || !Object.isExtensible(value)
    ? TargetType.INVALID
    : // {} =>  [Object {Array}] => Array
      targetTypeMap(toRawType(value));
}

export function isReadonly(value: unknown) {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY]);
}

export function reactive(target: object) {
  if (isReadonly(target)) {
    return target;
  }
  return createReactiveObject(target, false, mutableHandlers, {}, reactiveMap);
}

export function readonly<T extends object>(target: T) {
  return createReactiveObject(
    target,
    true,
    mutableHandlers,
    mutableHandlers,
    readonlyMap
  );
}

/**
 *
 * @param target 目标对象
 * @param isReadonly 只读
 * @param baseHandler 普通对象和数组的处理器
 * @param collectionHandlers 集合类型(Map, Set, WeakMap, WeakSet)的处理器
 * @param proxyMap 缓存代理对象的Map
 */
export function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandler: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {
  // 如果目标不是对象，直接返回
  if (!isObject(target)) {
    return target;
  }

  // target is already a Proxy, return it.
  // exception: calling readonly() on a reactive object
  // 1.target[ReactiveFlags.RAW] 一个对象被reactive 或 readonly 后，会被添加一个__v_raw属性，指向原始对象
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target;
  }

  // 判断缓存里是否有
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }

  // !此处还有个处理就是当类型不是可以处理的类型的时候 返回原始对象

  /**
   * 判断target 类型
   * @param target 目标对象
   * 流程
   * 1.判断是否是可跳过或扩展的对象，此类对象直接返回target
   * 2.通过 Object.prototype.toString 来判断类型，区分是 普通对象还是集合类型
   */
  const targetType = getTargetType(target);
  if (targetType === TargetType.INVALID) return target;
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandler
  );

  proxyMap.set(target, proxy);
  return proxy;
}
/**
 * Checks if an object is a proxy created by {@link reactive} or
 * {@link shallowReactive} (or {@link ref} in some cases).
 *
 * @example
 * ```js
 * isReactive(reactive({}))            // => true
 * isReactive(readonly(reactive({})))  // => true
 * isReactive(ref({}).value)           // => true
 * isReactive(readonly(ref({})).value) // => true
 * isReactive(ref(true))               // => false
 * isReactive(shallowRef({}).value)    // => false
 * isReactive(shallowReactive({}))     // => true
 * ```
 *
 * @param value - The value to check.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isreactive}
 */

/**
 * 返回由Vue创建的代理对象的原始对象。
 * ！从一个可能是 Vue 响应式代理的对象中，安全且深度地获取其最根本的原始（非代理）对象
 *
 * `toRaw()`可以返回由以下方法创建的代理的原始对象：
 * {@link reactive()}, {@link readonly()}, {@link shallowReactive()} 或
 * {@link shallowReadonly()}。
 *
 * 这是一个逃生舱，可用于临时读取而不产生代理访问/跟踪开销，或写入而不触发
 * 变更。**不**建议持久引用原始对象。请谨慎使用。
 *
 * @example
 * ```js
 * const foo = {}
 * const reactiveFoo = reactive(foo)
 *
 * console.log(toRaw(reactiveFoo) === foo) // true
 *
 *
 * ```
 *
 * @param observed - 请求"原始"值的对象。
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#toraw}
 */
export function toRaw<T>(observed: T): T {
  // observed && 防止 Null Undefined 属性访问报错
  const raw = observed && (observed as Target)[ReactiveFlags.RAW];
  return raw ? (toRaw(raw) as T) : observed;
}

export function isShallow(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW]);
}
