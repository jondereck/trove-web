import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  dailyTasksWouldUpload,
  guestImportAction,
  guestImportDoneMessage,
  guestImportPercent,
  guestImportPromptBody,
  shouldPromptGuestImport,
  type GuestImportFacts,
} from './guestImportPrompt'

function facts(partial: Partial<GuestImportFacts> = {}): GuestImportFacts {
  return {
    canUploadToCloud: true,
    saveCount: 0,
    collectionCount: 0,
    dailyWouldUpload: false,
    dailyFingerprint: 'local',
    stored: null,
    ...partial,
  }
}

describe('dailyTasksWouldUpload', () => {
  it('uploads guest edits even when this account already owns the document', () => {
    assert.equal(dailyTasksWouldUpload({
      guestDirty: true,
      ownerUserId: 'user',
      userId: 'user',
      localMeaningful: true,
      remoteExists: true,
      mergedDiffersFromRemote: false,
    }), true)
  })

  it('lets a cloud-owned device sync without a prompt', () => {
    assert.equal(dailyTasksWouldUpload({
      guestDirty: false,
      ownerUserId: 'user',
      userId: 'user',
      localMeaningful: true,
      remoteExists: true,
      mergedDiffersFromRemote: true,
    }), false)
  })

  it('treats an unowned local document as guest data', () => {
    assert.equal(dailyTasksWouldUpload({
      guestDirty: false,
      ownerUserId: null,
      userId: 'user',
      localMeaningful: true,
      remoteExists: false,
      mergedDiffersFromRemote: false,
    }), true)
    assert.equal(dailyTasksWouldUpload({
      guestDirty: false,
      ownerUserId: null,
      userId: 'user',
      localMeaningful: true,
      remoteExists: true,
      mergedDiffersFromRemote: false,
    }), false)
  })
})

describe('guest import prompt', () => {
  it('does not prompt a free session that cannot upload', () => {
    const next = facts({ canUploadToCloud: false, saveCount: 3, dailyWouldUpload: true })
    assert.equal(shouldPromptGuestImport(next), false)
    assert.equal(guestImportAction(next), 'sync')
  })

  it('prompts when guest saves or daily tasks would upload', () => {
    assert.equal(guestImportAction(facts({ saveCount: 2 })), 'prompt')
    assert.equal(guestImportAction(facts({ dailyWouldUpload: true })), 'prompt')
    assert.match(guestImportPromptBody({ saveCount: 1, collectionCount: 0, dailyWouldUpload: true }), /saves and daily tasks/)
  })

  it('keeps a Don\'t import choice from uploading until the device copy grows', () => {
    const stored = {
      choice: 'skip' as const,
      saveCount: 2,
      collectionCount: 1,
      dailyFingerprint: 'local',
    }
    const same = facts({
      saveCount: 2,
      collectionCount: 1,
      dailyWouldUpload: true,
      dailyFingerprint: 'local',
      stored,
    })
    assert.equal(shouldPromptGuestImport(same), false)
    assert.equal(guestImportAction(same), 'withhold')
    const grew = facts({
      saveCount: 3,
      collectionCount: 1,
      dailyWouldUpload: true,
      dailyFingerprint: 'local',
      stored,
    })
    assert.equal(guestImportAction(grew), 'prompt')
  })

  it('does not ask again after Import', () => {
    const next = facts({
      saveCount: 2,
      dailyWouldUpload: true,
      stored: { choice: 'import', saveCount: 2, collectionCount: 0, dailyFingerprint: 'local' },
    })
    assert.equal(guestImportAction(next), 'sync')
  })
})

describe('guest import progress', () => {
  it('uses a determinate percent and a done sentence', () => {
    assert.equal(guestImportPercent(0, 4), 0)
    assert.equal(guestImportPercent(1, 4), 25)
    assert.equal(guestImportPercent(4, 4), 100)
    assert.equal(guestImportPercent(5, 0), 0)
    assert.equal(
      guestImportDoneMessage({ saves: 2, collections: 1, dailyTasks: true }),
      'Imported 2 saves, 1 collection, and daily tasks into this account.',
    )
  })
})
