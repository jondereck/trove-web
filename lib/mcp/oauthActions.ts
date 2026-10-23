'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function decideOAuthAuthorization(formData: FormData): Promise<void> {
  const authorizationId = String(formData.get('authorization_id') ?? '')
  const decision = String(formData.get('decision') ?? '')
  if (!authorizationId) throw new Error('Missing authorization request')

  const supabase = await createClient()
  const result =
    decision === 'approve'
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })

  if (result.error || !result.data?.redirect_url) {
    throw new Error(result.error?.message ?? 'Could not finish authorization')
  }
  redirect(result.data.redirect_url)
}

export type OAuthGrantRow = {
  clientId: string
  name: string
  scopes: string[]
  grantedAt: string
}

export async function listOAuthGrants(): Promise<OAuthGrantRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.oauth.listGrants()
  if (error) throw new Error(error.message)
  return (data ?? []).map((grant) => ({
    clientId: grant.client.id,
    name: grant.client.name,
    scopes: grant.scopes,
    grantedAt: grant.granted_at,
  }))
}

export async function revokeOAuthGrant(clientId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.auth.oauth.revokeGrant({ clientId })
  if (error) throw new Error(error.message)
}
