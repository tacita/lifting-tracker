import { openDB, type IDBPDatabase } from 'idb';
import type { Exercise, Folder, Template, TemplateItem, Session, WorkoutSet } from './schema.js';

type AppDB = {
	exercises: { key: string; value: Exercise; indexes: { 'by-name': string; 'by-synced': boolean } };
	folders: { key: string; value: Folder; indexes: { 'by-synced': boolean } };
	templates: { key: string; value: Template; indexes: { 'by-folder': string; 'by-synced': boolean } };
	templateItems: { key: string; value: TemplateItem; indexes: { 'by-template': string; 'by-synced': boolean } };
	sessions: { key: string; value: Session; indexes: { 'by-status': string; 'by-synced': boolean } };
	sets: { key: string; value: WorkoutSet; indexes: { 'by-session': string; 'by-exercise': string; 'by-synced': boolean } };
};

const DB_NAME = 'overload';
const DB_VERSION = 1;

const STORE_NAMES = ['exercises', 'folders', 'templates', 'templateItems', 'sessions', 'sets'] as const;

let _db: IDBPDatabase<AppDB> | null = null;

/** Clear all object stores. Call when switching users so one account never overwrites another. */
export async function clearAllStores(): Promise<void> {
	const db = await getDB();
	for (const name of STORE_NAMES) {
		await db.clear(name);
	}
}

export async function getDB(): Promise<IDBPDatabase<AppDB>> {
	if (_db) return _db;
	_db = await openDB<AppDB>(DB_NAME, DB_VERSION, {
		upgrade(db) {
			if (!db.objectStoreNames.contains('exercises')) {
				const ex = db.createObjectStore('exercises', { keyPath: 'id' });
				ex.createIndex('by-name', 'name');
				ex.createIndex('by-synced', 'synced');
			}
			if (!db.objectStoreNames.contains('folders')) {
				const fl = db.createObjectStore('folders', { keyPath: 'id' });
				fl.createIndex('by-synced', 'synced');
			}
			if (!db.objectStoreNames.contains('templates')) {
				const tpl = db.createObjectStore('templates', { keyPath: 'id' });
				tpl.createIndex('by-folder', 'folderId');
				tpl.createIndex('by-synced', 'synced');
			}
			if (!db.objectStoreNames.contains('templateItems')) {
				const ti = db.createObjectStore('templateItems', { keyPath: 'id' });
				ti.createIndex('by-template', 'templateId');
				ti.createIndex('by-synced', 'synced');
			}
			if (!db.objectStoreNames.contains('sessions')) {
				const sess = db.createObjectStore('sessions', { keyPath: 'id' });
				sess.createIndex('by-status', 'status');
				sess.createIndex('by-synced', 'synced');
			}
			if (!db.objectStoreNames.contains('sets')) {
				const sets = db.createObjectStore('sets', { keyPath: 'id' });
				sets.createIndex('by-session', 'sessionId');
				sets.createIndex('by-exercise', 'exerciseId');
				sets.createIndex('by-synced', 'synced');
			}
		}
	});
	return _db;
}

export function createId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function now(): string {
	return new Date().toISOString();
}
