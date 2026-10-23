import { getPublicOrigin, metadataCorsOptionsRequestHandler, protectedResourceHandler } from 'mcp-handler'
import { supabaseUrl } from '@/lib/env'

export function protectedResourceResponse(req: Request): Response {
  const origin = getPublicOrigin(req).replace(/\/$/, '')
  const authorizationServer = `${supabaseUrl().replace(/\/$/, '')}/auth/v1`
  return protectedResourceHandler({
    authServerUrls: [authorizationServer],
    resourceUrl: `${origin}/api/mcp`,
  })(req)
}

export function protectedResourceOptions(): Response {
  return metadataCorsOptionsRequestHandler()()
}
