import { App, ApiVersion } from './main'

const routes = {
	api: {},
	admin: {},
	webhook: {},
}

const app = new App({
	apiKey: 'eewfefwe',
	secret: 'efwfwe',
	sessionKey: 'eweffwew',
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
	webhooks: [],
	accessMode: 'online',
	logger: true,
	staticPath: '/static',
	afterAuth: async () => {},
})
