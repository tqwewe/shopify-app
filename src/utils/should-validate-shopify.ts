import type { Context } from 'koa'
import type { NextFunction } from '@shopify/koa-shopify-auth/dist/src/types'

export default function shouldValidateShopify(
	validator: (ctx: Context, next: NextFunction) => Promise<void>
) {
	return async (ctx: Context, next: NextFunction) => {
		if (ctx.path.startsWith('/api') && !ctx.path.startsWith('/api/admin/')) {
			await next()
			return
		}

		await validator(ctx as Context, next)
	}
}
