// Pure rules for the sign-in guest import prompt. No storage or network.

export type GuestImportChoice = 'import' | 'skip'

export type StoredGuestImportDecision = {
  choice: GuestImportChoice
  saveCount: number
  collectionCount: number
  dailyFingerprint: string
}

export type GuestImportFacts = {
  /** Signed in and this session would upload into Trove Cloud. */
  canUploadToCloud: boolean
  saveCount: number
  collectionCount: number
  /** Merging on-device daily tasks would change the cloud document. */
  dailyWouldUpload: boolean
  dailyFingerprint: string
  stored: StoredGuestImportDecision | null
}

export type GuestImportAction = 'prompt' | 'withhold' | 'sync'

export function guestPayloadPending(
  facts: Pick<GuestImportFacts, 'saveCount' | 'collectionCount' | 'dailyWouldUpload'>,
): boolean {
  return facts.saveCount > 0 || facts.collectionCount > 0 || facts.dailyWouldUpload
}

export function dailyTasksWouldUpload(input: {
  guestDirty: boolean
  ownerUserId: string | null
  userId: string
  localMeaningful: boolean
  remoteExists: boolean
  mergedDiffersFromRemote: boolean
}): boolean {
  if (input.guestDirty) return true
  if (input.ownerUserId === input.userId) return false
  if (!input.localMeaningful) return false
  if (!input.remoteExists) return true
  return input.mergedDiffersFromRemote
}

export function shouldPromptGuestImport(facts: GuestImportFacts): boolean {
  if (!facts.canUploadToCloud) return false
  if (!guestPayloadPending(facts)) return false
  const stored = facts.stored
  if (!stored) return true
  switch (stored.choice) {
    case 'import':
      return false
    case 'skip':
      return facts.saveCount > stored.saveCount
        || facts.collectionCount > stored.collectionCount
        || (facts.dailyWouldUpload && facts.dailyFingerprint !== stored.dailyFingerprint)
    default: {
      const _never: never = stored.choice
      return _never
    }
  }
}

/** prompt = ask; withhold = do not upload a previous Don't import; sync = normal cloud merge. */
export function guestImportAction(facts: GuestImportFacts): GuestImportAction {
  if (shouldPromptGuestImport(facts)) return 'prompt'
  if (
    facts.canUploadToCloud
    && facts.stored?.choice === 'skip'
    && guestPayloadPending(facts)
  ) {
    return 'withhold'
  }
  return 'sync'
}

export function guestImportPercent(completed: number, total: number): number {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return 0
  const pct = Math.round((Math.max(0, completed) / total) * 100)
  if (pct < 0) return 0
  if (pct > 100) return 100
  return pct
}

export function guestImportPromptBody(input: {
  saveCount: number
  collectionCount: number
  dailyWouldUpload: boolean
}): string {
  const hasSaves = input.saveCount > 0 || input.collectionCount > 0
  const hasTasks = input.dailyWouldUpload
  const keep = 'Choosing Don\'t import leaves this account unchanged and keeps the on-device copy.'
  if (hasSaves && hasTasks) {
    return `This device has saves and daily tasks that are not in this account. Import them into Trove Cloud, or keep them on this device. ${keep}`
  }
  if (hasTasks) {
    return `This device has daily tasks that are not in this account. Import them into Trove Cloud, or keep them on this device. ${keep}`
  }
  return `This device has saves that are not in this account. Import them into Trove Cloud, or keep them on this device. ${keep}`
}

export function guestImportDoneMessage(result: {
  saves: number
  collections: number
  dailyTasks: boolean
}): string {
  const parts: string[] = []
  if (result.saves > 0) parts.push(`${result.saves} ${result.saves === 1 ? 'save' : 'saves'}`)
  if (result.collections > 0) {
    parts.push(`${result.collections} ${result.collections === 1 ? 'collection' : 'collections'}`)
  }
  if (result.dailyTasks) parts.push('daily tasks')
  if (parts.length === 0) return 'Nothing new to import. This account is unchanged.'
  if (parts.length === 1) return `Imported ${parts[0]} into this account.`
  if (parts.length === 2) return `Imported ${parts[0]} and ${parts[1]} into this account.`
  return `Imported ${parts[0]}, ${parts[1]}, and ${parts[2]} into this account.`
}
