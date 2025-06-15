import { hasOwn, isIntegerKey, isObject } from "@vue/shared";
import {
  isReadonly,
  isShallow,
  reactive,
  ReactiveFlags,
  reactiveMap,
  readonly,
  readonlyMap,
  shallowReactiveMap,
  shallowReadonlyMap,
  toRaw,
  type Target,
} from "./reactive";
import { TrackOpTypes } from "./operations";
import { isRef } from "./ref";
import { Target } from "./reactive";

const get = createGetter();
const set = createSetter();
/**
 * e.g.
 * ```ts
 * const arrayInstrumentations = {
 *  push: function instrumentedPush(...args) {  },
 *  pop: function instrumentedPop() { },
 *  splice: function instrumentedSplice(...args) { },
 *  includes: function instrumentedIncludes() { },
 *  indexOf: function instrumentedIndexOf() { },
 *   ... 以及其他方法，如 shift, unshift, lastIndexOf
 * };
 * ```
 */
const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations();

function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {};
  // 处理 Array 的方法
  // 对数组的每个**索引**都进行依赖追踪
  // 确保在使用 includes, indexOf, lastIndexOf 时，能追踪到数组的所有元素
  (["includes", "indexOf", "lastIndexOf"] as const).forEach((key) => {
    instrumentations[key] = function (this: any, ...args: any[]) {
      const arr = toRaw(this); // 获取 **原始** 数组
      for (let i = 0, l = this.length; i < l; i++) {
        // 对每个索引进行依赖收集 - GET 类型
        // 当前的 effect 正在读取（依赖）这个数组的所有索引位置上的元素
        // TODO: track
        // track(arr, TrackOpTypes.GET, i + "");
      }

      // 我们首先使用原始参数运行该方法（这些参数可能具有反应性）
      const res = arr[key](...args);
      if (res == -1 || res == false) {
        // if that did not work, run it again using raw values.
        // 代理对象上没找到就需要去原始对象上找
        return arr[key](...args.map(toRaw));
      } else {
        return res;
      }
    };
  });

  // 1️⃣ effect(()=> arr.push(1))
  // 2️⃣ effect(()=> arr.push(1))
  // 1️⃣ 执行间接触发了和 length 相关的依赖，建立了和 length 相关的依赖
  // 2️⃣ 执行 设置了 length 的值，触发了 length 相关的依赖,因此开始执行所有length 相关的副作用函数,包含 1️⃣ 的副作用函数
  // 此时 2️⃣还没有执行完 又执行了 1️⃣ 的副作用函数，因此 1️⃣ 的副作用函数又触发了 length 相关的依赖，因此又执行了 2️⃣ 的副作用函数
  // 往复出现了死循环
  // 因此在响应式对象触发push\pop\shift\unshift\splice 数组方法时，需要暂停依赖收集 并执行原始的数组方法

  //  !以下方法会直接修改「原数组」
  (["push", "pop", "shift", "unshift", "splice"] as const).forEach((key) => {
    instrumentations[key] = function (this: any, ...args: any[]) {
      // TODO: pauseTracking()
      // !保证调用原始数组方法，调用时，不会触发依赖收集 原因是要避免 死循环，
      // toRaw(this)[key] 是原始数组方法
      const res = toRaw(this)[key].apply(this, args);
      // TODO: resetTracking()
      return res;
    };
  });

  return instrumentations;
}

//! 3.2 这里是叫 shallow 后面改成了 isShallow
function createGetter(isReadonly = false, isShallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    // 1.判断是否是 reactive对象 target[ReactiveFlags.IS_REACTIVE] 会被拦截 返回 true/false
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    } else if (key === ReactiveFlags.IS_SHALLOW) {
      return isShallow;
      /**
       * Raw：获取代理对象所包装的原始（raw）目标对象。要判断 当前 readonly shallow 的状态，来去判断是去哪一个 map 里取
       * receiver: 实际接收属性访问的对象
       * - 如果你直接访问 proxy[ReactiveFlags.RAW]，那么 receiver 就是 proxy 本身
       * - 如果属性访问是通过原型链发生的（例如，一个对象继承自这个代理），那么 receiver 就是那个发起访问的子对象
       *   如果有一个对象 obj 的原型是这个代理 proxy (Object.setPrototypeOf(obj, proxy))，当访问 obj[ReactiveFlags.RAW] 时，this（即 receiver）会是 obj 而不是 proxy
       *! 防止原型链滥用或意外调用
       * @see demo.ts
       */
    } else if (
      key === ReactiveFlags.RAW &&
      receiver ===
        (isReadonly
          ? isShallow
            ? shallowReadonlyMap
            : readonlyMap
          : isShallow
          ? shallowReactiveMap
          : reactiveMap
        ).get(target)
    ) {
      return target;
    }

    const targetIsArray = Array.isArray(target);
    if (!isReadonly) {
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }

      const res = Reflect.get(target, key, receiver);

      if (!isReadonly) {
        // TODO: track
        track(target, TrackOpTypes.GET, key);
      }

      if (isShallow) {
        return res;
      }

      // 对象属性中 如果是ref 自动解包，数组则不自动解包
      if (isRef(res)) {
        return targetIsArray && isIntegerKey(key) ? res : res.value;
      }

      // 深层代理
      if (isObject(res)) {
        return isReadonly ? readonly(res) : reactive(res);
      }
      return res;
    }
  };
}

function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    let oldValue = (target as any)[key];
    // 考虑只读Ref 边界情况
    //!  保护那些被设定为“只读的 ref”的属性槽位，防止它们被一个非 ref 的普通值意外覆盖，从而丢失其原有的“只读 ref”特性
    // const originalCount = ref(10);
    // const readonlyCountRef = readonly(originalCount); // readonlyCountRef 同时是 isReadonly() 和 isRef()
    // const state = reactive({
    //   count: readonlyCountRef,
    // });
    if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
      return false;
    }

    // 说明是深层代理，会有ref解包等处理
    if (!shallow) {
      // A.1: 处理嵌套响应式对象的赋值
      if (!isShallow(value) && !isReadonly(value)) {
        // 这个条件判断的是：
        // 1. !isShallow(value): 新值 value 不是一个浅层响应式对象。这意味着它要么是一个深层响应式对象 (reactive())，要么是一个普通对象/值。
        // 2. !isReadonly(value): 新值 value 不是一个只读对象 (readonly() 或 shallowReadonly())。
        // 综合起来：如果新值 value 是一个可写的、可能是深层响应式的对象（或者是将被深层响应式系统处理的普通对象），
        // 那么在进行某些操作（如下面的 ref 更新）或内部比较时，我们可能需要它们的原始对象。
        oldValue = toRaw(oldValue); // 获取 oldValue 的原始对象（如果它本身是 Proxy）
        value = toRaw(value); // 获取 value 的原始对象（如果它本身是 Proxy）
      }
    }

    const result = Reflect.set(target, key, value, receiver);

    return result;
  };
}
export const mutableHandlers: ProxyHandler<object> = {
  get,
};
