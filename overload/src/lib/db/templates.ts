import { getDB, createId, now } from './index.js';
import type { Folder, Template, TemplateItem } from './schema.js';
import { scheduleSync } from '$lib/sync/engine.js';

export async function getFolders(): Promise<Folder[]> {
	const db = await getDB();
	const all = await db.getAll('folders');
	return all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
}

export async function addFolder(data: Omit<Folder, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<Folder> {
	const db = await getDB();
	const folder: Folder = { ...data, id: createId(), createdAt: now(), updatedAt: now(), synced: false };
	await db.put('folders', folder);
	scheduleSync();
	return folder;
}

export async function updateFolder(id: string, data: Partial<Omit<Folder, 'id'>>): Promise<Folder> {
	const db = await getDB();
	const existing = await db.get('folders', id);
	if (!existing) throw new Error(`Folder ${id} not found`);
	const updated: Folder = { ...existing, ...data, id, updatedAt: now(), synced: false };
	await db.put('folders', updated);
	scheduleSync();
	return updated;
}

export async function deleteFolder(id: string): Promise<void> {
	const db = await getDB();
	const templates = await db.getAllFromIndex('templates', 'by-folder', id);
	for (const t of templates) {
		const { folderId: _f, ...rest } = t;
		await db.put('templates', { ...rest, updatedAt: now(), synced: false });
	}
	await db.delete('folders', id);
	scheduleSync();
}

export async function getTemplates(): Promise<Template[]> {
	const db = await getDB();
	const all = await db.getAll('templates');
	return all.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
}

export async function getTemplate(id: string): Promise<Template | undefined> {
	const db = await getDB();
	return db.get('templates', id);
}

export async function addTemplate(data: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<Template> {
	const db = await getDB();
	const template: Template = { ...data, id: createId(), createdAt: now(), updatedAt: now(), synced: false };
	await db.put('templates', template);
	scheduleSync();
	return template;
}

export async function updateTemplate(id: string, data: Partial<Omit<Template, 'id'>>): Promise<Template> {
	const db = await getDB();
	const existing = await db.get('templates', id);
	if (!existing) throw new Error(`Template ${id} not found`);
	const updated: Template = { ...existing, ...data, id, updatedAt: now(), synced: false };
	await db.put('templates', updated);
	scheduleSync();
	return updated;
}

export async function deleteTemplate(id: string): Promise<void> {
	const db = await getDB();
	const items = await db.getAllFromIndex('templateItems', 'by-template', id);
	for (const item of items) {
		await db.delete('templateItems', item.id);
	}
	await db.delete('templates', id);
	scheduleSync();
}

export async function getTemplateItems(templateId: string): Promise<TemplateItem[]> {
	const db = await getDB();
	const items = await db.getAllFromIndex('templateItems', 'by-template', templateId);
	return items.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function setTemplateItems(
	templateId: string,
	items: Omit<TemplateItem, 'id' | 'templateId' | 'createdAt' | 'updatedAt' | 'synced'>[]
): Promise<TemplateItem[]> {
	const db = await getDB();
	const existing = await db.getAllFromIndex('templateItems', 'by-template', templateId);
	for (const item of existing) {
		await db.delete('templateItems', item.id);
	}
	const saved: TemplateItem[] = [];
	for (const item of items) {
		const ti: TemplateItem = { ...item, id: createId(), templateId, createdAt: now(), updatedAt: now(), synced: false };
		await db.put('templateItems', ti);
		saved.push(ti);
	}
	scheduleSync();
	return saved;
}
