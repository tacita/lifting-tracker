import { getDB, createId, now } from './index.js';
import type { Session, WorkoutSet } from './schema.js';
import { scheduleSync } from '$lib/sync/engine.js';

export async function getSessions(): Promise<Session[]> {
	const db = await getDB();
	const all = await db.getAll('sessions');
	return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getCompletedSessions(): Promise<Session[]> {
	const db = await getDB();
	const all = await db.getAllFromIndex('sessions', 'by-status', 'complete');
	return all.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getDraftSession(): Promise<Session | null> {
	const db = await getDB();
	const drafts = await db.getAllFromIndex('sessions', 'by-status', 'draft');
	return drafts[0] ?? null;
}

export async function getSession(id: string): Promise<Session | undefined> {
	const db = await getDB();
	return db.get('sessions', id);
}

export async function createSession(data: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<Session> {
	const db = await getDB();
	const session: Session = { ...data, id: createId(), createdAt: now(), updatedAt: now(), synced: false };
	await db.put('sessions', session);
	scheduleSync();
	return session;
}

export async function updateSession(id: string, data: Partial<Omit<Session, 'id'>>): Promise<Session> {
	const db = await getDB();
	const existing = await db.get('sessions', id);
	if (!existing) throw new Error(`Session ${id} not found`);
	const updated: Session = { ...existing, ...data, id, updatedAt: now(), synced: false };
	await db.put('sessions', updated);
	scheduleSync();
	return updated;
}

export async function deleteSession(id: string): Promise<void> {
	const db = await getDB();
	const sets = await db.getAllFromIndex('sets', 'by-session', id);
	for (const s of sets) {
		await db.delete('sets', s.id);
	}
	await db.delete('sessions', id);
	scheduleSync();
}

export async function getSetsForSession(sessionId: string): Promise<WorkoutSet[]> {
	const db = await getDB();
	const sets = await db.getAllFromIndex('sets', 'by-session', sessionId);
	return sets.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

export async function addSet(data: Omit<WorkoutSet, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<WorkoutSet> {
	const db = await getDB();
	const set: WorkoutSet = { ...data, id: createId(), createdAt: now(), updatedAt: now(), synced: false };
	await db.put('sets', set);
	scheduleSync();
	return set;
}

export async function updateSet(id: string, data: Partial<Omit<WorkoutSet, 'id'>>): Promise<WorkoutSet> {
	const db = await getDB();
	const existing = await db.get('sets', id);
	if (!existing) throw new Error(`Set ${id} not found`);
	const updated: WorkoutSet = { ...existing, ...data, id, updatedAt: now(), synced: false };
	await db.put('sets', updated);
	scheduleSync();
	return updated;
}

export async function deleteSet(id: string): Promise<void> {
	const db = await getDB();
	await db.delete('sets', id);
	scheduleSync();
}
