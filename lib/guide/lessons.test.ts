import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  GUIDE_GROUPS,
  GUIDE_LESSONS,
  TROVE_MCP_URL,
  cursorMcpConfig,
  groupDoneCount,
  guideProgress,
  isLessonId,
  lessonById,
  nextLessonId,
  readDoneIds,
} from './lessons'

describe('guide lessons', () => {
  it('keeps unique ids and a lesson in every group', () => {
    const ids = GUIDE_LESSONS.map(lesson => lesson.id)
    assert.equal(new Set(ids).size, ids.length)
    for (const group of GUIDE_GROUPS) {
      assert.ok(GUIDE_LESSONS.some(lesson => lesson.group === group.id))
    }
  })

  it('falls back to the first lesson for an unknown id', () => {
    assert.equal(lessonById(null).id, GUIDE_LESSONS[0].id)
    assert.equal(lessonById('missing').id, GUIDE_LESSONS[0].id)
    assert.equal(isLessonId('mcp-cursor'), true)
    assert.equal(isLessonId('missing'), false)
  })

  it('walks to the next lesson and stops at the end', () => {
    assert.equal(nextLessonId(GUIDE_LESSONS[0].id), GUIDE_LESSONS[1].id)
    assert.equal(nextLessonId(GUIDE_LESSONS[GUIDE_LESSONS.length - 1].id), null)
  })

  it('counts only known lesson ids', () => {
    assert.deepEqual(readDoneIds(null), [])
    assert.deepEqual(readDoneIds('nope'), [])
    assert.deepEqual(readDoneIds(JSON.stringify(['mcp-cursor', 'mcp-cursor', 'nope'])), ['mcp-cursor'])
    assert.deepEqual(guideProgress(['mcp-cursor', 'nope']), {
      count: 1,
      total: GUIDE_LESSONS.length,
    })
    assert.equal(groupDoneCount('agents', ['mcp-token', 'library']), 1)
  })

  it('points Cursor at the public MCP url with a bearer placeholder', () => {
    const config = cursorMcpConfig()
    assert.match(config, new RegExp(TROVE_MCP_URL.replace(/[.]/g, '\\.')))
    assert.match(config, /Bearer trove_sk_paste_your_token/)
    assert.equal(config.includes('eyJ'), false)
    const cursor = GUIDE_LESSONS.find(lesson => lesson.id === 'mcp-cursor')
    assert.ok(cursor?.blocks.some(block => block.type === 'code' && block.text === config))
  })
})
