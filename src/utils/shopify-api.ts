import fetch from 'node-fetch'
import { ApiVersion } from '@shopify/koa-shopify-webhooks/build/ts/register'

interface Opts {
	method?: string
	data?: Record<string, unknown>
	queryParams?: Record<string, String>
	version?: ApiVersion
}

export async function shopifyApi<T = any>(
	accessToken: string,
	shop: string,
	action: string | string[],
	opts: Opts = {
		method: 'GET',
		version: ApiVersion.October20,
	}
) {
	if (!opts)
		opts = {
			method: 'GET',
			version: ApiVersion.October20,
		}
	if (!opts.method) opts.method = 'GET'
	if (!opts.data) opts.data = {}
	if (!opts.version) opts.version = ApiVersion.October20

	const url = `https://${shop}/admin/api/${opts.version}/${action}.json${
		opts.queryParams
			? `?${Object.entries(opts.queryParams)
					.map(([key, val]) => `${key}=${val}`)
					.join('&')}`
			: ''
	}`

	const resp = await fetch(url, {
		method: opts.method,
		headers: {
			'Content-Type': 'application/json',
			'X-Shopify-Access-Token': accessToken,
		},
		body: opts.method !== 'GET' ? JSON.stringify(opts.data) : undefined,
	})

	if (!resp.ok) {
		const errJson = await resp.json()
		console.error(errJson)
		throw resp.status
	}

	const respJson = await resp.json()

	return respJson as T
}
