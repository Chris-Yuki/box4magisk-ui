// 需要用户组
export interface AppInfo {
  packageName: string;
  appLabel: string;
  isSystem: boolean;
}

export interface BoxStatus {
  running: boolean;
  pid: string;
  bin_name: string;
  proxy_mode?: number | string;
  app_proxy_enable?: boolean;
  app_proxy_mode?: string;
  clash_api_port: string;
  clash_api_secret: string;
  box_config_file?: string;
  tproxy_config_file?: string;
  module_root?: string;
  manual_mode?: boolean;
  module_disabled?: boolean;
  autostart_enabled?: boolean | number | string;
  manager_control_enabled?: boolean;
  transparent_proxy_running?: boolean;
  autoStart?: boolean;
}

export interface BoxConfig {
  bin_name?: string;
  CORE_USER_GROUP?: string;
  ROUTING_MARK?: string;
  FORCE_MARK_BYPASS?: number;
  PROXY_MODE?: number;
  PERFORMANCE_MODE?: number;
  PROXY_TCP_PORT?: string;
  PROXY_UDP_PORT?: string;
  DNS_HIJACK_ENABLE?: number;
  DNS_PORT?: string;
  MOBILE_INTERFACE?: string;
  WIFI_INTERFACE?: string;
  HOTSPOT_INTERFACE?: string;
  USB_INTERFACE?: string;
  OTHER_BYPASS_INTERFACES?: string;
  OTHER_PROXY_INTERFACES?: string;
  PROXY_MOBILE?: number;
  PROXY_WIFI?: number;
  PROXY_HOTSPOT?: number;
  PROXY_USB?: number;
  PROXY_TCP?: number;
  PROXY_UDP?: number;
  PROXY_IPV6?: number;
  BYPASS_IPv4_LIST?: string;
  BYPASS_IPv6_LIST?: string;
  PROXY_IPv4_LIST?: string;
  PROXY_IPv6_LIST?: string;
  HOTSPOT_SUBNET_IPV4?: string;
  HOTSPOT_SUBNET_IPV6?: string;
  MARK_VALUE?: number;
  MARK_VALUE6?: number;
  TABLE_ID?: number;
  APP_PROXY_ENABLE?: number;
  APP_PROXY_MODE?: 'whitelist' | 'blacklist';
  PROXY_APPS_LIST?: string;
  BYPASS_APPS_LIST?: string;
  BYPASS_CN_IP?: number;
  CN_IP_FILE?: string;
  CN_IPV6_FILE?: string;
  CN_IP_URL?: string;
  CN_IPV6_URL?: string;
  BLOCK_QUIC?: number;
  MAC_FILTER_ENABLE?: number;
  MAC_PROXY_MODE?: 'whitelist' | 'blacklist';
  PROXY_MACS_LIST?: string;
  BYPASS_MACS_LIST?: string;
  box_user_group?: string;
  clash_api_port?: string | number;
  clash_api_secret?: string;
  use_custom_direct?: string;
  ctr_mode?: string;
  select_outbound?: string;
  default_outbound?: string;
  direct_outbound?: string;
  proxy_outbound?: string;
  direct_outbound_list?: string;
  default_clash_mode?: string;
  direct_clash_mode?: string;
  proxy_clash_mode?: string;
  direct_clash_mode_list?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface BoxControllerState {
  loading: boolean;
  status: BoxStatus;
  config: BoxConfig;
  appList: AppInfo[];
  actionLoading: string | null;
  hasChanges: boolean;
  handleServiceAction: (action: string) => Promise<void>;
  handleToggle: (key: string, value: boolean) => void;
  handleChange: <K extends keyof BoxConfig>(key: K, value: BoxConfig[K]) => void;
  handleSaveAndApply: () => Promise<void>;
  handleToggleAutoStart: (value: boolean) => Promise<void>;
  /** 切换透明代理开关 */
  handleToggleTproxy: (enabled: boolean) => Promise<void>;
}

// ── 订阅信息 ──────────────────────────────────────────────────────────────────

/** 单条订阅的元数据（与后端 box.webui subscription-list 返回结构一致） */
export interface SubscriptionInfo {
  name: string;
  url: string;
  path: string;
  /** ISO 时间字符串，最后更新时间 */
  last_updated: string;
  /** 文件大小（字节） */
  size: number;
  /** 是否为当前生效/使用的订阅 */
  active?: boolean;
}

// ── 流量统计 ──────────────────────────────────────────────────────────────────

/** 累计流量和实时速率统计 */
export interface TrafficStats {
  /** 当前上行速率（字节/秒） */
  uploadSpeed: number;
  /** 当前下行速率（字节/秒） */
  downloadSpeed: number;
  /** 本次会话累计上传（字节） */
  totalUpload: number;
  /** 本次会话累计下载（字节） */
  totalDownload: number;
}

