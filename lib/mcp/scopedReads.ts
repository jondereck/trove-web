const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Arguments for mcp_private.count_own_visible_saves.
 * The function itself excludes vault rows and other users.
 */
export function mcpOwnSavesArgs(userId: string): { p_user_id: string } {
  const id = userId.trim()
  if (!USER_ID.test(id)) throw new Error('user id required')
  return { p_user_id: id }
}
