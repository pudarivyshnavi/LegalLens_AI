import { riskBadgeClass } from '@/types';

export function RiskBadge({ level }: { level: string }) {
  return <span className={riskBadgeClass(level)}>{level}</span>;
}
