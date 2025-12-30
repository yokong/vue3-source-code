import { isObject } from "@vue/shared"

// reactive({a:13})
export const enum ReactiveFlags{
  IS_REACTIVE='__v_isReactive',
  IS_READONLY= '__v_isReadonly',
  RAW = "__v_raw"
}
export interface Target{
 [ReactiveFlags.IS_REACTIVE]?:boolean
}


export function reactive<T>(target:object){
  return createReactiveObject(
    target,
    false,

  )

}

/**
 *
 * @param target 目标对象
 * @param isReadonly 是否只读
 * @param baseHanlder 基础对象的代理处理器
 * @param collectionHanlders 集合类型的代理处理器
 * @param proxyMap 缓存代理对象的Map(reactive readonly 等使用的是不同的proxyMap)
 */
export function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHanlder: ProxyHandler<any>,
  collectionHanlders: ProxyHandler<any>,
  proxyMap: WeakMap<Target,any>
){
  // 如果传入的target 不是一个对象，直接返回他
  if (!isObject(target)) {
    return target;
  }

  // if target is a Proxy, return it
  // 访问target[ReactiveFlags.IS_REACTIVE] 如果是一个proxy 会触发 [get ProxyHandler], 再[getProxyHandler]里可以做判断
  // TODO: 添加其他判断条件
  if(target[ReactiveFlags.IS_REACTIVE]){
    return target
  }
}
