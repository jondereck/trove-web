export type DailyStatusKind =
  | 'keep_going'
  | 'one_left'
  | 'completing'
  | 'small_steps'
  | 'day_spent'

export function resolveDailyStatus(input: {
  enabled: boolean
  open: number
  doneToday: number
  completing?: boolean
}): DailyStatusKind | null {
  if (!input.enabled) return null
  if (input.completing) return 'completing'
  if (input.open === 0 && input.doneToday > 0) return 'day_spent'
  if (input.open === 1) return 'one_left'
  if (input.open > 1 && input.doneToday > 0) {
    const total = input.open + input.doneToday
    const pct = total === 0 ? 0 : input.doneToday / total
    if (pct >= 0.5) return 'keep_going'
    return 'small_steps'
  }
  return null
}

export const DAILY_STATUS_COPY: Record<
  DailyStatusKind,
  { title: string; sub?: string }
> = {
  keep_going: { title: 'Keep going!', sub: "You're almost there." },
  one_left: { title: 'One last task!' },
  completing: { title: 'Completing your day...' },
  small_steps: { title: 'Small steps today', sub: 'create a brighter tomorrow.' },
  day_spent: { title: 'Day well spent.', sub: 'See you again tomorrow!' },
}
