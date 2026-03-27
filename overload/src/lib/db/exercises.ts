import { getDB, createId, now } from './index.js';
import type { Exercise, WorkoutSet } from './schema.js';
import { scheduleSync } from '$lib/sync/engine.js';

export async function getExercises(): Promise<Exercise[]> {
	const db = await getDB();
	const all = await db.getAll('exercises');
	return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getExercise(id: string): Promise<Exercise | undefined> {
	const db = await getDB();
	return db.get('exercises', id);
}

export async function addExercise(data: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<Exercise> {
	const db = await getDB();
	const exercise: Exercise = { ...data, id: createId(), createdAt: now(), updatedAt: now(), synced: false };
	await db.put('exercises', exercise);
	scheduleSync();
	return exercise;
}

export async function updateExercise(id: string, data: Partial<Omit<Exercise, 'id'>>): Promise<Exercise> {
	const db = await getDB();
	const existing = await db.get('exercises', id);
	if (!existing) throw new Error(`Exercise ${id} not found`);
	const updated: Exercise = { ...existing, ...data, id, updatedAt: now(), synced: false };
	await db.put('exercises', updated);
	scheduleSync();
	return updated;
}

export async function deleteExercise(id: string): Promise<void> {
	const db = await getDB();
	await db.delete('exercises', id);
	scheduleSync();
}

function normName(value: string | undefined): string {
	return String(value ?? '').trim().toLowerCase();
}

export async function getExerciseHistory(exerciseId: string, exerciseName?: string): Promise<WorkoutSet[]> {
	const db = await getDB();
	const byId = await db.getAllFromIndex('sets', 'by-exercise', exerciseId);
	const merged = new Map<string, WorkoutSet>();

	for (const s of byId) {
		if (s.reps > 0) merged.set(s.id, s);
	}

	// Migration/legacy fallback: same exercise can exist under a different id.
	// If caller provides name, merge by normalized exercise_name as well.
	const targetName = normName(exerciseName);
	if (targetName) {
		const all = await db.getAll('sets');
		for (const s of all) {
			if (s.reps > 0 && normName(s.exerciseName) === targetName) {
				merged.set(s.id, s);
			}
		}
	}

	return [...merged.values()].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

export async function getPreviousSetForExercise(exerciseId: string, setNumber: number, exerciseName?: string, excludeSessionId?: string): Promise<WorkoutSet | null> {
	const db = await getDB();
	const byId = await db.getAllFromIndex('sets', 'by-exercise', exerciseId);
	let matching = byId
		.filter((s) => s.setNumber === setNumber && s.reps > 0 && (!excludeSessionId || s.sessionId !== excludeSessionId))
		.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
	if (matching.length > 0) return matching[0] ?? null;

	const targetName = normName(exerciseName);
	if (!targetName) return null;
	const all = await db.getAll('sets');
	matching = all
		.filter((s) => s.setNumber === setNumber && s.reps > 0 && normName(s.exerciseName) === targetName && (!excludeSessionId || s.sessionId !== excludeSessionId))
		.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
	return matching[0] ?? null;
}
