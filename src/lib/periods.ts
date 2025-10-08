export type Period = {
  year: number;
  month: number;
};

export function getLastNMonths(n: number): Period[] {
  const periods: Period[] = [];
  const now = new Date();

  for (let i = 0; i < n; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1, // 1-12
    });
  }

  return periods;
}

export function formatPeriodLabel(period: Period): string {
  const date = new Date(period.year, period.month - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function periodToKey(period: Period): string {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

export function getCurrentPeriod(): Period {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}
