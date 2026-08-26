import { scoreColorClass, scoreBgClass, riskLevelFromScore } from '@/types';

export function RiskScoreGauge({ score, level }: { score: number; level?: string }) {
  const displayLevel = level || riskLevelFromScore(score);
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-200" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 213.6} 213.6`}
            className={scoreColorClass(score)}
          />
        </svg>
        <span className={`absolute text-xl font-bold ${scoreColorClass(score)}`}>{score}</span>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Risk Level</p>
        <p className={`text-lg font-bold ${scoreColorClass(score)}`}>{displayLevel}</p>
        <p className="text-xs text-slate-400">Score: {score}/100</p>
      </div>
    </div>
  );
}
