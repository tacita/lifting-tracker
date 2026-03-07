import { writable } from 'svelte/store';

export type ToastType = 'info' | 'success' | 'error' | 'warn';

export interface ToastItem {
	id: number;
	message: string;
	type: ToastType;
}

export const toasts = writable<ToastItem[]>([]);

let counter = 0;

export function showToast(message: string, type: ToastType = 'info', durationMs = 2500) {
	const id = ++counter;
	toasts.update((t) => [...t, { id, message, type }]);
	setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), durationMs);
}
