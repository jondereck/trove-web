import { getPublicOrigin, metadataCorsOptionsRequestHandler, protectedResourceHandler } from 'mcp-handler'
import { isNeonDataBackend } from '@/lib/dataBackend'
import { neonAuthUrl } from '@/lib/neon/env'
import { supabaseUrl } from '@/lib/env'

export function protectedResourceResponse(req: Request): Response {
  const origin = getPublicOrigin(req).replace(/\/$/, '')
  const authorizationServer = isNeonDataBackend()
    ? neonAuthUrl()
    : `${supabaseUrl().replace(/\/$/, '')}/auth/v1`
  if (!authorizationServer) {
    return Response.json({ error: 'NEON_AUTH_URL is not configured' }, { status: 500 })
  }
  return protectedResourceHandler({
    authServerUrls: [authorizationServer],
    resourceUrl: `${origin}/api/mcp`,
  })(req)
}

export function protectedResourceOptions(): Response {
  return metadataCorsOptionsRequestHandler()()
}
