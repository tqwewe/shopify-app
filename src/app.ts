import path from 'path'
import Koa, { Context, DefaultState } from 'koa'
import cors from '@koa/cors'
import Router from '@koa/router'
import bodyParser from 'koa-bodyparser'
import koaLogger from 'koa-logger'
import send from 'koa-send'
import session from 'koa-session'
import createShopifyAuth, { verifyRequest } from '@shopify/koa-shopify-auth'
import type { AccessMode } from '@shopify/koa-shopify-auth/dist/src/types'
import {
	receiveWebhook,
	registerWebhook,
	DeliveryMethod,
	Options as WebhookOptions,
} from '@shopify/koa-shopify-webhooks'
import type { ApiVersion } from '@shopify/koa-shopify-webhooks/build/ts/register'
import applyRoutes from './utils/apply-routes'
import DEV from './utils/dev'
import shouldValidateShopify from './utils/should-validate-shopify'

type KoaContext = Koa.ParameterizedContext<Koa.DefaultState, Koa.DefaultContext>

type Routes<StateT = any, CustomT = Record<string, unknown>> = Record<
	string,
	Record<
		string,
		Router.Middleware<StateT, CustomT> | Router.Middleware<StateT, CustomT>[]
	>
>

export default class App {
	private static instance: App

	public static get() {
		return this.instance
	}

	public server: Koa

	constructor(
		private settings: {
			apiKey: string
			secret: string
			sessionKey: string
			apiVersion: ApiVersion
			routes: {
				api: {
					routes: Routes<any, {}>
					middleware?: Router.Middleware<DefaultState, Context>
				}
				admin: {
					routes: Routes<any, {}>
					middleware?: Router.Middleware<DefaultState, Context>
				}
				webhooks: Routes<any, {}>
			}
			scopes?: string[]
			webhooks?: {
				address: WebhookOptions['address']
				topic: WebhookOptions['topic']
			}[]
			accessMode?: AccessMode
			logger?: boolean
			staticPath?: string | ((ctx: KoaContext) => boolean)
			afterAuth: (
				ctx: KoaContext,
				{
					shop,
					accessToken,
					shopID,
				}: { shop: string; accessToken: string; shopID: string }
			) => Promise<any>
		}
	) {
		App.instance = this

		this.server = new Koa()

		if (this.settings.logger || (DEV && this.settings.logger == null)) {
			this.useLogger()
		}

		// Cookies & headers
		this.useCookiesHeaders()

		// Cors
		this.useCors()

		// Static
		if (this.settings.staticPath) {
			this.useStaticPath()
		}

		// Session
		this.useSession()

		// Shopify auth
		this.useShopifyAuth()

		// Shopify verify request
		this.useShopifyVerifyRequest()

		// Body parser
		this.useBodyParser()

		// Router
		this.useRouter()
	}

	public listen(port: number) {
		this.server.listen(port, () => {
			console.log(`Listening on :${port}`)
		})
	}

	private useBodyParser() {
		this.server.use(
			bodyParser({
				detectJSON: function (ctx) {
					return ctx.path.startsWith('/api')
				},
			})
		)
	}

	private useCookiesHeaders() {
		this.server.use(async (ctx, next) => {
			ctx.cookies.secure = true
			ctx.set('X-Frame-Options', 'ALLOWALL')
			await next()
		})
	}

	private useCors() {
		this.server.use(
			cors({
				origin: ctx => ctx.request.header.origin,
			})
		)
	}

	private useLogger() {
		this.server.use(koaLogger())
	}

	private useRouter() {
		const apiRouter = new Router<DefaultState, Context>({
			prefix: '/api',
		})

		if (this.settings.routes.api.middleware) {
			apiRouter.use(this.settings.routes.api.middleware)
		}

		applyRoutes(apiRouter, {
			...this.settings.routes.api.routes,
			post: {
				...(this.settings.routes.api.routes.post || {}),
				...Object.entries(this.settings.routes.webhooks).reduce(
					(acc, [route, fn]) => ({
						...acc,
						[route]: [
							receiveWebhook({ secret: process.env.SHOPIFY_API_SECRET_KEY }),
							fn,
						],
					}),
					{}
				),
			},
		})

		const adminRouter = new Router<DefaultState, Context>({
			prefix: '/api/admin',
		})

		if (this.settings.routes.admin.middleware) {
			apiRouter.use(this.settings.routes.admin.middleware)
		}

		applyRoutes(adminRouter, this.settings.routes.admin.routes)

		const routers = [adminRouter, apiRouter]
		routers.forEach(router => {
			this.server.use(router.routes()).use(router.allowedMethods())
		})
	}

	private useStaticPath() {
		this.server.use(async (ctx, next) => {
			let isStaticPath: boolean
			if (typeof this.settings.staticPath === 'function') {
				isStaticPath = this.settings.staticPath(ctx)
			} else {
				isStaticPath = ctx.path.startsWith(this.settings.staticPath)
			}

			if (isStaticPath) {
				await send(ctx, ctx.path, {
					root: path.join(__dirname, '../admin/public'),
				})
			} else {
				await next()
			}
		})
	}

	private useSession() {
		this.server.keys = [this.settings.secret]
		this.server.use(
			session(
				{
					key: this.settings.sessionKey,
					sameSite: 'none',
					secure: true,
				},
				this.server
			)
		)
	}

	private useShopifyAuth() {
		const {
			apiKey,
			secret,
			apiVersion,
			scopes,
			accessMode,
			webhooks,
			afterAuth,
		} = this.settings

		this.server.use(
			shouldValidateShopify(
				createShopifyAuth({
					apiKey: apiKey,
					secret: secret,
					scopes: scopes || [],
					accessMode: accessMode || 'online',
					async afterAuth(ctx) {
						const { shop, accessToken } = ctx.session
						const shopID = shop.split('.')[0]
						ctx.session.shopID = shopID

						await Promise.all([
							afterAuth
								? afterAuth(ctx, { shop, accessToken, shopID })
								: () => Promise.resolve(null),
							...(webhooks || []).map(async ({ address, topic }) => {
								try {
									await registerWebhook({
										address,
										topic,
										accessToken,
										shop,
										apiVersion: apiVersion,
										deliveryMethod: DeliveryMethod.Http,
									})
								} catch (err) {
									console.error(err)
								}
							}),
						])
					},
				})
			)
		)
	}

	private useShopifyVerifyRequest() {
		this.server.use(shouldValidateShopify(verifyRequest()))
	}
}
