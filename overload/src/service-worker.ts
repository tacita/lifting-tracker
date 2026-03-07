/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const CACHE = `overload-${version}`;
const ASSETS = [...build, ...files];

self.addEventListener('install', (event) => {
	async function addFilesToCache() {
		const cache = await caches.open(CACHE);
		await cache.addAll(ASSETS);
	}
	event.waitUntil(addFilesToCache());
});

self.addEventListener('activate', (event) => {
	async function deleteOldCaches() {
		for (const key of await caches.keys()) {
			if (key !== CACHE) await caches.delete(key);
		}
	}
	event.waitUntil(deleteOldCaches());
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// Always fetch Supabase requests from network
	if (url.hostname.includes('supabase.co')) {
		event.respondWith(
			fetch(event.request).catch(() => new Response('', { status: 503 }))
		);
		return;
	}

	async function respond() {
		const cache = await caches.open(CACHE);

		// Serve build assets from cache first
		if (ASSETS.includes(url.pathname)) {
			const cachedResponse = await cache.match(url.pathname);
			if (cachedResponse) return cachedResponse;
		}

		// For navigation, always try network then fall back to cache
		try {
			const response = await fetch(event.request);
			const isHttp = url.protocol.startsWith('http');
			if (isHttp && response.status === 200) {
				cache.put(event.request, response.clone());
			}
			return response;
		} catch {
			const cachedResponse = await cache.match(event.request);
			if (cachedResponse) return cachedResponse;
			// Return the app shell for navigation requests
			const appShell = await cache.match('/');
			if (appShell) return appShell;
			return new Response('Offline', { status: 503 });
		}
	}

	event.respondWith(respond());
});
