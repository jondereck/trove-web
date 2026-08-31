export function greetingForHour(hour: number, firstName?: string): string {
  const base = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return firstName?.trim() ? `${base}, ${firstName.trim()}` : base
}

export function weekdayLabel(date = new Date()): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).toUpperCase()
}

export function libraryKicker(total: number, date = new Date()): string {
  return `${total} SAVED • ${weekdayLabel(date)}`
}
