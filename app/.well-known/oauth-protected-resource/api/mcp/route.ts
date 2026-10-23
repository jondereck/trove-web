import { protectedResourceOptions, protectedResourceResponse } from '@/lib/mcp/protectedResource'

export function GET(req: Request) {
  return protectedResourceResponse(req)
}

export function OPTIONS() {
  return protectedResourceOptions()
}
