import { writable } from 'svelte/store';

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error';

interface SyncState {
	status: SyncStatus;
	error?: string;
	lastSyncedAt?: string;
}

function createSyncStore() {
	const { subscribe, update } = writable<SyncState>({ status: 'idle' });
	return {
		subscribe,
		setSyncing: () => update((s) => ({ ...s, status: 'syncing', error: undefined })),
		setOk: () => update(() => ({ status: 'ok', lastSyncedAt: new Date().toISOString() })),
		setError: (error: string) => update((s) => ({ ...s, status: 'error', error })),
		setIdle: () => update((s) => ({ ...s, status: 'idle' }))
	};
}

export const syncStatus = createSyncStore();
