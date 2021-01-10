import type Router from '@koa/router'

type Routes<StateT = any, CustomT = {}> = Record<
	string,
	Record<
		string,
		Router.Middleware<StateT, CustomT> | Router.Middleware<StateT, CustomT>[]
	>
>

export default function applyRoutes<StateT = any, CustomT = {}>(
	router: Router<StateT, CustomT>,
	routes: Routes<StateT, CustomT>
) {
	for (const method in routes) {
		const route = routes[method]
		for (const path in route) {
			const handler = route[path]
			;(router[method] as Router['get'] | Router['patch'] | Router['post'])(
				path,
				...(Array.isArray(handler) ? handler : [handler])
			)
		}
	}
}
