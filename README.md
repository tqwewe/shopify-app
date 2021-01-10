<h1 align="center">Shopify App</h1>

<div align="center">
  Shopify app development utility.
</div>

### Example

```typescript
import { App, ApiVersion } from './main'

import GET_products from './routes/api/get/products'
import POST_save from './routes/admin/post/save'
import HOOK_shopUpdate from './routes/hook/shop-update'

const routes = {
  // Routes at /api
  api: {
    get: {
      '/products': GET_products,
    },
  },

  // Routes at /api/admin
  admin: {
    post: {
      '/save': POST_save,
    },
  },

  // Routes at /api/hook
  webhook: {
    '/shop-update': HOOK_shopUpdate,
  },
}

const app = new App({
  apiKey: process.env.SHOPIFY_API_KEY,
  secret: process.env.SHOPIFY_API_SECRET_KEY,
  sessionKey: 'my_app',
  apiVersion: ApiVersion.October20,
  routes: {
    api: {
      routes: routes.api,
    },
    admin: {
      routes: routes.admin,
    },
    webhooks: routes.webhook,
  },
  scopes: ['read_products'],
  webhooks: [
    {
      topic: 'SHOP_UPDATE',
      address: `${process.env.APP_HOST}/api/hooks/shop-update`,
    },
  ],
  accessMode: 'online',
  logger: process.env.NODE_ENV !== 'production',
  staticPath: '/static',
  afterAuth: async (ctx, { shop, accessToken, shopID }) => {
    ctx.redirect('/')
  },
})

app.server.use(async ctx => {
  // Frontend handler for all non-api routes
  ctx.body = 'Hello, world!'
})

app.listen(8080)
```
