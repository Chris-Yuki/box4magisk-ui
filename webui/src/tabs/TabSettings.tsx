import { SettingsPage } from '@/features/settings/components/SettingsPage';
import type { BoxControllerState } from '@/types/box';

type TabSettingsProps = Pick<BoxControllerState, 'status' | 'config' | 'handleToggle' | 'handleChange'>;

/** 设置 Tab：将原 TabAdvanced 的逻辑迁移过来 */
export function TabSettings(props: TabSettingsProps) {
  return <SettingsPage {...props} />;
}
