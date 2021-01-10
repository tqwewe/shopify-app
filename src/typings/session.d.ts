import * as session from 'koa-session'

declare module 'koa-session' {
  interface Session {
    accessToken: string
    shop: string
    shopID: string
  }
}
