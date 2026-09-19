import { DashboardPage } from '@/features/dashboard/components/DashboardPage';
import type { BoxControllerState, TrafficStats } from '@/types/box';

type TabHomeProps = Pick<
  BoxControllerState,
  | 'status'
  | 'config'
  | 'actionLoading'
  | 'handleServiceAction'
  | 'handleChange'
  | 'handleToggle'
  | 'handleToggleAutoStart'
> & {
  trafficStats?: TrafficStats | null;
};

export function TabHome(props: TabHomeProps) {
  return <DashboardPage {...props} />;
}
