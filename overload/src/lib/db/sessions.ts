import { getDB, createId, now } from './index.js';
import type { Session, WorkoutSet } from './schema.js';
import { scheduleSync } from '$lib/sync/engine.js';
import { getSupabase } from '$lib/sync/supabase.js';

const MAX_ACTIVE_DRAFT_MS = 16 * 60 * 60 * 1000; // 16 hours

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
	if (drafts.length === 0) return null;

	const sorted = [...drafts].sort((a, b) => {
		const aTime = Date.parse(a.startedAt || '') || 0;
		const bTime = Date.parse(b.startedAt || '') || 0;
		return bTime - aTime;
	});
	const newest = sorted[0];
	const nowMs = Date.now();
	let changed = false;

	// Clean up duplicate drafts from legacy/buggy states.
	const staleOrExtra = sorted.slice(1);
	for (const extra of staleOrExtra) {
		await db.put('sessions', {
			...extra,
			status: 'cancelled',
			updatedAt: now(),
			synced: false
		});
		changed = true;
	}

	// Ignore absurdly old drafts (prevents ancient timers like 10963:20).
	const startedMs = Date.parse(newest.startedAt || '');
	const isInvalidStart = Number.isNaN(startedMs);
	const isStale = !isInvalidStart && nowMs - startedMs > MAX_ACTIVE_DRAFT_MS;
	if (isInvalidStart || isStale) {
		await db.put('sessions', {
			...newest,
			status: 'cancelled',
			updatedAt: now(),
			synced: false
		});
		changed = true;
	}

	if (changed) scheduleSync();
	if (isInvalidStart || isStale) return null;
	return newest;
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

	// Also delete from Supabase so the record doesn't come back on next sync pull
	try {
		const supabase = getSupabase();
		await supabase.from('sets').delete().eq('session_id', id);
		await supabase.from('sessions').delete().eq('id', id);
	} catch (err) {
		console.warn('[deleteSession] cloud delete failed, will retry on next sync', err);
	}
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

	// Also delete from Supabase so the record doesn't come back on next sync pull
	try {
		const supabase = getSupabase();
		await supabase.from('sets').delete().eq('id', id);
	} catch (err) {
		console.warn('[deleteSet] cloud delete failed', err);
	}
}
