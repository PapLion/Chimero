import type { Connect } from 'vite'
import { handleWebApiRequest } from './routes/api'

export function createWebApiMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    if (!req.url?.startsWith('/api')) {
      next()
      return
    }

    void handleWebApiRequest(req, res)
  }
}
