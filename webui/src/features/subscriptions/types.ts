// 订阅数据结构
export interface Subscription {
  name: string;
  url: string;
  path: string;
  last_updated: string;
  size: number;
  /** 是否为当前生效/使用的订阅 */
  active?: boolean;
}
