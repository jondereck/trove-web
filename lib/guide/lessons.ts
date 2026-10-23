export const TROVE_MCP_URL = 'https://web-trove.vercel.app/api/mcp'
export const GUIDE_PROGRESS_KEY = 'trove-guide-done'

export type GuideGroupId = 'start' | 'library' | 'agents'

export type GuideBlock =
  | { type: 'p'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'code'; label: string; text: string }
  | { type: 'note'; text: string }

export type GuideLesson = {
  id: string
  group: GuideGroupId
  title: string
  summary: string
  blocks: GuideBlock[]
}

export const GUIDE_GROUPS: { id: GuideGroupId; label: string }[] = [
  { id: 'start', label: 'Getting started' },
  { id: 'library', label: 'Your library' },
  { id: 'agents', label: 'Agents and MCP' },
]

export function cursorMcpConfig(tokenPlaceholder = 'trove_sk_paste_your_token'): string {
  return JSON.stringify(
    {
      mcpServers: {
        trove: {
          url: TROVE_MCP_URL,
          headers: {
            Authorization: `Bearer ${tokenPlaceholder}`,
          },
        },
      },
    },
    null,
    2,
  )
}

export const GUIDE_LESSONS: GuideLesson[] = [
  {
    id: 'save-first',
    group: 'start',
    title: 'Save a link or a note',
    summary: 'Quick Save always stops on a preview so you can fix the title before it lands in your library.',
    blocks: [
      {
        type: 'steps',
        items: [
          'On the phone, tap +. On Trove Web, choose Add new. Saving on the web needs a Trove Cloud account. Demo and imported libraries stay read-only.',
          'Paste a link or write a note. You can attach a photo.',
          'Wait through Analyzing.',
          'On the preview, edit the title, pick a folder or leave it in Unsorted, then save.',
        ],
      },
      {
        type: 'note',
        text: 'The preview is the confirm step. Do not treat Analyzing as the save.',
      },
    ],
  },
  {
    id: 'library',
    group: 'start',
    title: 'Browse your Library',
    summary: 'Library is the home for everything you saved, with chips for the slice you want right now.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Open Library.',
          'Use the chips along the top: All, Unread, Favorites, Reminders, Links, Notes, Images, and the rest.',
          'Open a card to read the save. Pinned saves stay in their own row at the top.',
        ],
      },
    ],
  },
  {
    id: 'collections',
    group: 'start',
    title: 'Make a collection',
    summary: 'A collection is a folder for one topic: a trip, a project, a reading list.',
    blocks: [
      {
        type: 'steps',
        items: [
          'On the phone, create the folder from Collections.',
          'Trove Web lists those folders. An empty web library says to create them on mobile first.',
          'The next time you save, pick that folder on the Quick Save preview. You can also move saves into it later.',
        ],
      },
    ],
  },
  {
    id: 'notes',
    group: 'start',
    title: 'Notes and checklists',
    summary: 'A checklist is a note made of rows you can tick. The app shows boxes, not markdown.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Save a note, then open it.',
          'On the phone, tap List item. Each new row is a checkbox.',
          'Tick a row when it is done. Checked rows sit under a checked-items header.',
          'On the web, the same note shows those boxes. You will not see raw checklist markup.',
        ],
      },
    ],
  },
  {
    id: 'search',
    group: 'library',
    title: 'Search and Unsorted',
    summary: 'Search looks across titles, tags, and notes. Unsorted is the tray for saves that are not in a folder yet.',
    blocks: [
      {
        type: 'steps',
        items: [
          'On the phone, open the Search tab. On the web, open Search and type a title, tag, or collection name.',
          'Open Unsorted for saves that still have no collection. On the web it is in the sidebar.',
          'Move the ones you want to keep into a collection, and leave the rest until you are ready.',
        ],
      },
    ],
  },
  {
    id: 'reminders',
    group: 'library',
    title: 'Set a reminder',
    summary: 'A reminder is attached to a save. It shows up again when that time arrives.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Open the save.',
          'Choose Reminder and pick a time.',
          'Find it later with the Reminders chip in Library. Active reminders also show on Today.',
        ],
      },
    ],
  },
  {
    id: 'share',
    group: 'library',
    title: 'Share a collection',
    summary: 'Sharing starts on the phone, from a collection you own, while you are signed in.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Open the collection and choose Share.',
          'Turn on Anyone with the link for a public view-only page, then copy the link.',
          'Or invite someone by email as a Viewer or an Editor. The invite link is copied so you can send it.',
        ],
      },
      {
        type: 'note',
        text: 'Vault collections, and collections that contain a vault save, cannot be shared.',
      },
    ],
  },
  {
    id: 'vault',
    group: 'library',
    title: 'Keep something in the Vault',
    summary: 'The Vault is a locked place on your phone. Those saves stay out of share links and out of agents.',
    blocks: [
      {
        type: 'steps',
        items: [
          'When you save on the phone, you can pick Trove Vault as the destination if Vault is set up.',
          'Unlock it with your passphrase when you want to read what is inside.',
          'Leave everyday saves outside the Vault so you can still search them, share a folder, and let an agent read them.',
        ],
      },
    ],
  },
  {
    id: 'mcp-what',
    group: 'agents',
    title: 'What an agent can see',
    summary: 'Trove MCP lets an agent read your library. It cannot see the Vault.',
    blocks: [
      {
        type: 'p',
        text: 'The server is Trove Web. An agent connects to it, then calls a small set of read tools:',
      },
      {
        type: 'steps',
        items: [
          'search_items — search non-vault saves, up to 20.',
          'get_item — read one non-vault save.',
          'list_collections — list non-vault collections and how many saves are in each.',
          'list_collection_items — list saves inside one collection.',
          'list_reminders — list reminders on non-vault saves.',
          'ping — a hello check that does not read the library.',
        ],
      },
      {
        type: 'note',
        text: 'There is no write tool. An agent can look. It cannot create, edit, or delete saves.',
      },
    ],
  },
  {
    id: 'mcp-token',
    group: 'agents',
    title: 'Create a personal token',
    summary: 'Cursor and other clients that send a header use a personal token from Settings.',
    blocks: [
      {
        type: 'steps',
        items: [
          'Sign in to Trove Web with your Trove Cloud account.',
          'Open Settings, then Agents & MCP.',
          'Type a label, for example Cursor, and choose Create token.',
          'Copy the token immediately. It starts with trove_sk_ and is shown only once.',
          'Revoke it from the same list when you are done with that agent.',
        ],
      },
      {
        type: 'note',
        text: 'The token is a password for your library reads. Do not commit it, and do not paste it into a chat.',
      },
    ],
  },
  {
    id: 'mcp-cursor',
    group: 'agents',
    title: 'Connect Cursor',
    summary: 'Point Cursor at the Trove MCP URL and send the token as a Bearer header.',
    blocks: [
      {
        type: 'steps',
        items: [
          'In Cursor, open Settings and search for MCP, or create .cursor/mcp.json in the project.',
          'Add the server below. Replace the placeholder with the token you just copied.',
          'Reload MCP, then ask Cursor to list your collections or search your saves.',
        ],
      },
      {
        type: 'code',
        label: 'Cursor MCP config',
        text: cursorMcpConfig(),
      },
      {
        type: 'note',
        text: 'The header must say Bearer, then a space, then the token. An empty tool argument should be omitted.',
      },
    ],
  },
  {
    id: 'mcp-oauth',
    group: 'agents',
    title: 'Connect Grok, Claude, or ChatGPT',
    summary: 'Apps that can sign in use OAuth. You allow them once, and you can revoke them later.',
    blocks: [
      {
        type: 'steps',
        items: [
          `In Grok, add a custom connector for ${TROVE_MCP_URL}.`,
          'Sign in with the same Trove Cloud account and choose Allow.',
          'Ask it to list your collections.',
          'Claude and ChatGPT use that same URL when they ask for a remote MCP server. After you allow them, they show up in Settings under Connected apps.',
        ],
      },
      {
        type: 'note',
        text: 'OAuth apps are not the same as personal tokens. Tokens stay under Agents & MCP. Connected apps stay under Connected apps. Revoke either one without touching the other.',
      },
    ],
  },
]

const LESSON_INDEX = new Map(GUIDE_LESSONS.map(lesson => [lesson.id, lesson]))

export function isLessonId(id: string): boolean {
  return LESSON_INDEX.has(id)
}

export function lessonById(id: string | null | undefined): GuideLesson {
  if (id && LESSON_INDEX.has(id)) return LESSON_INDEX.get(id)!
  return GUIDE_LESSONS[0]
}

export function lessonNumber(id: string): number {
  const index = GUIDE_LESSONS.findIndex(lesson => lesson.id === id)
  return index < 0 ? 1 : index + 1
}

export function nextLessonId(id: string): string | null {
  const index = GUIDE_LESSONS.findIndex(lesson => lesson.id === id)
  if (index < 0 || index >= GUIDE_LESSONS.length - 1) return null
  return GUIDE_LESSONS[index + 1].id
}

export function groupLessons(group: GuideGroupId): GuideLesson[] {
  return GUIDE_LESSONS.filter(lesson => lesson.group === group)
}

export function readDoneIds(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const seen = new Set<string>()
    for (const id of parsed) {
      if (typeof id === 'string' && LESSON_INDEX.has(id)) seen.add(id)
    }
    return [...seen]
  } catch {
    return []
  }
}

export function guideProgress(done: readonly string[]): { count: number; total: number } {
  const finished = new Set(done)
  return {
    count: GUIDE_LESSONS.filter(lesson => finished.has(lesson.id)).length,
    total: GUIDE_LESSONS.length,
  }
}

export function groupDoneCount(group: GuideGroupId, done: readonly string[]): number {
  const finished = new Set(done)
  return groupLessons(group).filter(lesson => finished.has(lesson.id)).length
}
