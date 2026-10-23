import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mcpOwnSavesArgs } from './scopedReads'

const USER_ID = '750fa7c7-c1f8-4339-8239-d7fc841b2745'

describe('mcpOwnSavesArgs', () => {
  it('passes a user id into the private save-scope function', () => {
    assert.deepEqual(mcpOwnSavesArgs(USER_ID), { p_user_id: USER_ID })
  })

  it('rejects a blank user id', () => {
    assert.throws(() => mcpOwnSavesArgs('   '), /user id required/)
  })
})
