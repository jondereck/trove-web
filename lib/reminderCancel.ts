import type { StoredSaveReminder } from './saveRemindersCore'
import { cancelReminder } from './saveReminders'

export function promptCancelReminder(
  reminder: StoredSaveReminder,
  onDone: () => void | Promise<void>,
  options?: Parameters<typeof cancelReminder>[1],
): void {
  if (!window.confirm('Cancel reminder?\n\nThis upcoming reminder will be removed.')) return
  void cancelReminder(reminder.id, options).then(onDone)
}
