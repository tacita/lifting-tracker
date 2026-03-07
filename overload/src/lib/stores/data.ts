import { writable, get } from 'svelte/store';
import type { Exercise, Folder, Template, TemplateItem, Session } from '$lib/db/schema.js';
import { getExercises } from '$lib/db/exercises.js';
import { getFolders, getTemplates, getTemplateItems } from '$lib/db/templates.js';
import { getCompletedSessions } from '$lib/db/sessions.js';

export const exercises = writable<Exercise[]>([]);
export const folders = writable<Folder[]>([]);
export const templates = writable<Template[]>([]);
export const templateItemsCache = writable<Record<string, TemplateItem[]>>({});
export const sessions = writable<Session[]>([]);

export async function refreshExercises() { exercises.set(await getExercises()); }
export async function refreshFolders() { folders.set(await getFolders()); }
export async function refreshTemplates() { templates.set(await getTemplates()); }
export async function refreshSessions() { sessions.set(await getCompletedSessions()); }

export async function refreshTemplateItems(templateId: string): Promise<TemplateItem[]> {
	const items = await getTemplateItems(templateId);
	templateItemsCache.update((c) => ({ ...c, [templateId]: items }));
	return items;
}

export async function refreshAll() {
	await Promise.all([refreshExercises(), refreshFolders(), refreshTemplates(), refreshSessions()]);
	const allTemplates = get(templates);
	await Promise.all(allTemplates.map((t) => refreshTemplateItems(t.id)));
}
