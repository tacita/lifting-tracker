/**
 * Local-first sync engine.
 *
 * IndexedDB is always the source of truth.
 * Supabase is a sync target — never a full replacement for local data.
 *
 * On write: save to IndexedDB immediately, queue a background push.
 * On pull: merge cloud rows; a cloud row overwrites local only if
 *   cloud.updated_at > local.updatedAt. In-progress workout sets
 *   are never lost due to a sync failure.
 */

import { getDB } from '$lib/db/index.js';
import { getSupabase } from './supabase.js';
import { syncStatus } from '$lib/stores/sync.js';
import type { Exercise, Folder, Template, TemplateItem, Session, WorkoutSet } from '$lib/db/schema.js';

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight = false;

export function scheduleSync(delayMs = 500): void {
	if (typeof window === 'undefined') return;
	if (syncTimer) clearTimeout(syncTimer);
	syncTimer = setTimeout(() => {
		syncTimer = null;
		runSync().catch((err) => {
			console.warn('[sync] background sync error', err);
			syncStatus.setError(String(err));
		});
	}, delayMs);
}

export async function syncNow(): Promise<void> {
	if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
	await runSync();
}

async function runSync(): Promise<void> {
	if (syncInFlight) return;
	const supabase = getSupabase();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return;

	syncInFlight = true;
	syncStatus.setSyncing();
	try {
		await Promise.all([
			pushTable('exercises', 'exercises', user.id, toCloudExercise),
			pushTable('folders', 'folders', user.id, toCloudFolder),
			pushTable('templates', 'templates', user.id, toCloudTemplate),
			pushTable('templateItems', 'template_items', user.id, toCloudTemplateItem),
			pushTable('sessions', 'sessions', user.id, toCloudSession),
			pushTable('sets', 'sets', user.id, toCloudSet)
		]);
		syncStatus.setOk();
	} catch (err) {
		syncStatus.setError(String(err));
		throw err;
	} finally {
		syncInFlight = false;
	}
}

type StoreName = 'exercises' | 'folders' | 'templates' | 'templateItems' | 'sessions' | 'sets';
type AnyRow = { id: string; synced: boolean; updatedAt: string };

async function pushTable(
	store: StoreName,
	table: string,
	userId: string,
	mapper: (row: AnyRow, userId: string) => Record<string, unknown>
): Promise<void> {
	const db = await getDB();
	// idb's generic typing doesn't support dynamic store names, so we use unknown casts here
	const allInStore = await (db as unknown as { getAll: (s: string) => Promise<AnyRow[]> }).getAll(store);
	const unsynced = allInStore.filter((r) => !r.synced);
	if (unsynced.length === 0) return;

	const supabase = getSupabase();
	const { error } = await supabase.from(table).upsert(
		unsynced.map((r) => mapper(r, userId)),
		{ onConflict: 'id' }
	);
	if (error) throw new Error(`[sync] ${table}: ${error.message}`);

	// Mark rows as synced
	for (const row of unsynced) {
		const dbAny = db as unknown as { put: (s: string, v: unknown) => Promise<void> };
		await dbAny.put(store, { ...row, synced: true });
	}
}

export async function pullFromCloud(userId: string): Promise<void> {
	const supabase = getSupabase();
	const db = await getDB();

	await mergeTable('exercises', 'exercises', userId, supabase, db, fromCloudExercise);
	await mergeTable('folders', 'folders', userId, supabase, db, fromCloudFolder);
	await mergeTable('templates', 'templates', userId, supabase, db, fromCloudTemplate);
	await mergeTable('templateItems', 'template_items', userId, supabase, db, fromCloudTemplateItem);
	await mergeTable('sessions', 'sessions', userId, supabase, db, fromCloudSession);
	await mergeTable('sets', 'sets', userId, supabase, db, fromCloudSet);
}

async function mergeTable(
	store: StoreName,
	table: string,
	userId: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	supabase: ReturnType<typeof getSupabase>,
	db: Awaited<ReturnType<typeof getDB>>,
	mapper: (row: Record<string, unknown>) => AnyRow
): Promise<void> {
	const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
	if (error) { console.warn(`[sync] pull ${table}:`, error.message); return; }
	if (!data?.length) return;

	const dbAny = db as unknown as {
		get: (s: string, id: string) => Promise<AnyRow | undefined>;
		put: (s: string, v: unknown) => Promise<void>;
	};
	for (const cloudRow of data) {
		const local = await dbAny.get(store, cloudRow.id as string);
		const mapped = { ...mapper(cloudRow as Record<string, unknown>), synced: true };
		if (!local || (cloudRow.updated_at as string) > local.updatedAt) {
			await dbAny.put(store, mapped);
		}
	}
}

// ─── local → cloud ────────────────────────────────────────────────────────────

function toCloudExercise(r: AnyRow, userId: string) {
	const e = r as unknown as Exercise;
	return { id: e.id, user_id: userId, name: e.name, note: e.note ?? null, default_reps: e.defaultReps ?? null, default_weight: e.defaultWeight ?? null, default_rest_seconds: e.defaultRestSeconds ?? null, default_sets: e.defaultSets ?? null, created_at: e.createdAt, updated_at: e.updatedAt };
}
function toCloudFolder(r: AnyRow, userId: string) {
	const f = r as unknown as Folder;
	return { id: f.id, user_id: userId, name: f.name, sort_order: f.sortOrder ?? null, created_at: f.createdAt, updated_at: f.updatedAt };
}
function toCloudTemplate(r: AnyRow, userId: string) {
	const t = r as unknown as Template;
	return { id: t.id, user_id: userId, name: t.name, note: t.note ?? null, folder_id: t.folderId ?? null, sort_order: t.sortOrder ?? null, created_at: t.createdAt, updated_at: t.updatedAt };
}
function toCloudTemplateItem(r: AnyRow, userId: string) {
	const t = r as unknown as TemplateItem;
	return { id: t.id, user_id: userId, template_id: t.templateId, exercise_id: t.exerciseId, sort_order: t.sortOrder, sets: t.sets ?? null, reps: t.reps ?? null, rest_seconds: t.restSeconds ?? null, superset_id: t.supersetId ?? null, superset_order: t.supersetOrder ?? null, created_at: t.createdAt, updated_at: t.updatedAt };
}
function toCloudSession(r: AnyRow, userId: string) {
	const s = r as unknown as Session;
	return { id: s.id, user_id: userId, template_id: s.templateId ?? null, template_name: s.templateName ?? null, status: s.status, started_at: s.startedAt, finished_at: s.finishedAt ?? null, duration_seconds: s.durationSeconds ?? null, paused_at: s.pausedAt ?? null, paused_duration_seconds: s.pausedDurationSeconds ?? null, created_at: s.createdAt, updated_at: s.updatedAt };
}
function toCloudSet(r: AnyRow, userId: string) {
	const s = r as unknown as WorkoutSet;
	return { id: s.id, user_id: userId, session_id: s.sessionId, exercise_id: s.exerciseId, exercise_name: s.exerciseName, set_number: s.setNumber, weight: s.weight ?? null, reps: s.reps, completed_at: s.completedAt, created_at: s.createdAt, updated_at: s.updatedAt };
}

// ─── cloud → local ────────────────────────────────────────────────────────────

function fromCloudExercise(r: Record<string, unknown>): Exercise {
	return { id: r.id as string, name: r.name as string, note: r.note as string | undefined, defaultReps: r.default_reps as string | undefined, defaultWeight: r.default_weight as number | undefined, defaultRestSeconds: r.default_rest_seconds as number | undefined, defaultSets: r.default_sets as number | undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string, synced: true };
}
function fromCloudFolder(r: Record<string, unknown>): Folder {
	return { id: r.id as string, name: r.name as string, sortOrder: r.sort_order as number | undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string, synced: true };
}
function fromCloudTemplate(r: Record<string, unknown>): Template {
	return { id: r.id as string, name: r.name as string, note: r.note as string | undefined, folderId: r.folder_id as string | undefined, sortOrder: r.sort_order as number | undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string, synced: true };
}
function fromCloudTemplateItem(r: Record<string, unknown>): TemplateItem {
	return { id: r.id as string, templateId: r.template_id as string, exerciseId: r.exercise_id as string, sortOrder: r.sort_order as number, sets: r.sets as number | undefined, reps: r.reps as string | undefined, restSeconds: r.rest_seconds as number | undefined, supersetId: r.superset_id as string | undefined, supersetOrder: r.superset_order as number | undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string, synced: true };
}
function fromCloudSession(r: Record<string, unknown>): Session {
	return { id: r.id as string, templateId: r.template_id as string | undefined, templateName: r.template_name as string | undefined, status: r.status as Session['status'], startedAt: r.started_at as string, finishedAt: r.finished_at as string | undefined, durationSeconds: r.duration_seconds as number | undefined, pausedAt: r.paused_at as string | undefined, pausedDurationSeconds: r.paused_duration_seconds as number | undefined, createdAt: r.created_at as string, updatedAt: r.updated_at as string, synced: true };
}
function fromCloudSet(r: Record<string, unknown>): WorkoutSet {
	return { id: r.id as string, sessionId: r.session_id as string, exerciseId: r.exercise_id as string, exerciseName: r.exercise_name as string, setNumber: r.set_number as number, weight: r.weight as number | undefined, reps: r.reps as number, completedAt: r.completed_at as string, createdAt: r.created_at as string, updatedAt: r.updated_at as string, synced: true };
}
