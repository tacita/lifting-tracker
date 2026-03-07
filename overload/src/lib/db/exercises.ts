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

export async function getExerciseHistory(exerciseId: string): Promise<WorkoutSet[]> {
	const db = await getDB();
	const sets = await db.getAllFromIndex('sets', 'by-exercise', exerciseId);
	return sets.filter((s) => s.reps > 0).sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

export async function getPreviousSetForExercise(exerciseId: string, setNumber: number): Promise<WorkoutSet | null> {
	const db = await getDB();
	const sets = await db.getAllFromIndex('sets', 'by-exercise', exerciseId);
	const matching = sets
		.filter((s) => s.setNumber === setNumber && s.reps > 0)
		.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
	return matching[0] ?? null;
}
