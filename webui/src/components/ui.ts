// 设计系统统一导出入口
// 从此处导入所有 UI 组件，无需关心具体文件路径

// 导航
export { NavItem } from './nav/NavItem';

// 表单组件
export { SectionTitle } from './forms/SectionTitle';
export { Switch } from './forms/Switch';
export { SwitchRow } from './forms/SwitchRow';
export { Select } from './forms/Select';
export { SelectRow } from './forms/SelectRow';
export { InputRow } from './forms/InputRow';

// 通用 UI 组件（新增）
export { Badge } from './ui/Badge';
export { Modal } from './ui/Modal';
export { CodeBlock } from './ui/CodeBlock';
export { EmptyState } from './ui/EmptyState';

// 类型导出
export type { BadgeProps } from './ui/Badge';
export type { ModalProps } from './ui/Modal';
export type { CodeBlockProps } from './ui/CodeBlock';
export type { EmptyStateProps } from './ui/EmptyState';
