/**
 * 响应式系统操作类型
 * 此文件定义了 Vue 响应式系统中用于依赖追踪和触发更新的操作类型
 */

/**
 * 可被响应式系统拦截的追踪操作类型
 * - GET: 属性访问操作
 * - HAS: 属性存在性检查（例如：使用 'in' 运算符）
 * - ITERATE: 迭代操作（例如：for...in, Object.keys）
 */
export const enum TrackOpTypes {
  GET = "get",
  HAS = "has",
  ITERATE = "iterate",
}

/**
 * 触发响应式系统更新的操作类型
 * - SET: 修改属性值
 * - ADD: 添加新属性
 * - DELETE: 删除属性
 * - CLEAR: 清空集合（例如：Map.clear(), Set.clear()）
 */
export const enum TriggerOpTypes {
  SET = "set",
  ADD = "add",
  DELETE = "delete",
  CLEAR = "clear",
}
