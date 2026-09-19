import { LogsPage } from '@/features/logs/components/LogsPage';
import type { BoxStatus } from '@/types/box';

export function TabLogs({ status }: { status: BoxStatus }) {
  return <LogsPage status={status} />;
}
