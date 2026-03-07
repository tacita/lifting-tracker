import { getExercises, addExercise } from '$lib/db/exercises.js';
import { getTemplates, addTemplate, setTemplateItems, getFolders, addFolder } from '$lib/db/templates.js';
import { getSessions } from '$lib/db/sessions.js';
import { getDB, now as getNow } from '$lib/db/index.js';
import { refreshAll } from '$lib/stores/data.js';
import { scheduleSync } from '$lib/sync/engine.js';
import type { Session, WorkoutSet } from '$lib/db/schema.js';

export async function exportAll() {
	const [exercises, folders, templates, sessions] = await Promise.all([
		getExercises(), getFolders(), getTemplates(), getSessions()
	]);
	const db = await getDB();
	const sets = await db.getAll('sets');
	const templateItems = await db.getAll('templateItems');

	return {
		version: 2,
		exportedAt: new Date().toISOString(),
		exercises, folders, templates, templateItems, sessions, sets
	};
}

export function downloadJson(data: unknown, filename: string) {
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export async function importWorkoutPrograms(jsonData: unknown) {
	// Compatible with the existing overload-workouts-v1 format
	const data = jsonData as {
		format?: string;
		folders?: Array<{ name: string }>;
		templates: Array<{
			name: string;
			note?: string;
			folder?: string;
			items: Array<{
				exercise: string;
				sets?: number;
				reps?: string;
				restSeconds?: number;
				supersetId?: string;
				supersetOrder?: number;
				note?: string;
			}>;
		}>;
	};

	const existingExercises = await getExercises();
	const existingFolders = await getFolders();
	const exerciseMap = new Map(existingExercises.map((e) => [e.name.toLowerCase(), e.id]));
	const folderMap = new Map(existingFolders.map((f) => [f.name.toLowerCase(), f.id]));

	for (const template of data.templates) {
		// Ensure folder exists
		let folderId: string | undefined;
		if (template.folder) {
			const key = template.folder.toLowerCase();
			if (!folderMap.has(key)) {
				const f = await addFolder({ name: template.folder });
				folderMap.set(key, f.id);
			}
			folderId = folderMap.get(key);
		}

		// Ensure exercises exist
		const itemsWithIds = await Promise.all(
			template.items.map(async (item) => {
				const key = item.exercise.toLowerCase();
				if (!exerciseMap.has(key)) {
					const ex = await addExercise({ name: item.exercise, note: item.note });
					exerciseMap.set(key, ex.id);
				}
				return { exerciseId: exerciseMap.get(key)!, ...item };
			})
		);

		const tpl = await addTemplate({ name: template.name, note: template.note, folderId });
		await setTemplateItems(tpl.id, itemsWithIds.map((item, i) => ({
			exerciseId: item.exerciseId,
			sortOrder: i,
			sets: item.sets,
			reps: item.reps,
			restSeconds: item.restSeconds ?? 90,
			supersetId: item.supersetId,
			supersetOrder: item.supersetOrder
		})));
	}

	await refreshAll();
}

interface LegacyExercise {
	id: string | number;
	name: string;
}

interface LegacySession {
	id: string | number;
	status: string;
	templateId?: string | number;
	startedAt?: string;
	finishedAt?: string;
	date?: string;
}

interface LegacySet {
	id: string | number;
	sessionId: string | number;
	exerciseId: string | number;
	setNumber: number;
	weight?: number | null;
	reps: number;
	completedAt?: string;
	isComplete?: boolean;
}

interface LegacyBackup {
	exercises?: LegacyExercise[];
	sessions?: LegacySession[];
	sets?: LegacySet[];
	templates?: Array<{ id: string | number; name: string }>;
}

export async function importLegacyHistory(jsonData: unknown): Promise<{ sessions: number; sets: number; skipped: number }> {
	const data = jsonData as LegacyBackup;
	if (!data.sessions?.length || !data.sets?.length) {
		throw new Error('No sessions or sets found in backup');
	}

	const db = await getDB();
	const ts = getNow();

	const legacyExMap = new Map<string, string>();
	for (const ex of data.exercises ?? []) {
		legacyExMap.set(String(ex.id), ex.name);
	}

	const templateNameMap = new Map<string, string>();
	for (const tpl of data.templates ?? []) {
		templateNameMap.set(String(tpl.id), tpl.name);
	}

	const existingExercises = await getExercises();
	const exByName = new Map(existingExercises.map(e => [e.name.trim().toLowerCase(), e]));
	const exById = new Map(existingExercises.map(e => [e.id, e]));

	function resolveExercise(legacyId: string | number): { id: string; name: string } | null {
		const sid = String(legacyId);
		if (exById.has(sid)) return { id: sid, name: exById.get(sid)!.name };
		const legacyName = legacyExMap.get(sid);
		if (legacyName) {
			const byName = exByName.get(legacyName.trim().toLowerCase());
			if (byName) return { id: byName.id, name: byName.name };
			return { id: sid, name: legacyName };
		}
		return null;
	}

	const existingSessions = await getSessions();
	const existingIds = new Set(existingSessions.map(s => s.id));

	const completeSessions = data.sessions.filter(s => s.status === 'complete');
	const setsBySession = new Map<string, LegacySet[]>();
	for (const set of data.sets) {
		const key = String(set.sessionId);
		if (!setsBySession.has(key)) setsBySession.set(key, []);
		setsBySession.get(key)!.push(set);
	}

	let importedSessions = 0;
	let importedSets = 0;
	let skipped = 0;

	for (const legacySess of completeSessions) {
		const sessId = String(legacySess.id);
		if (existingIds.has(sessId)) { skipped++; continue; }

		const sessSets = setsBySession.get(sessId);
		if (!sessSets?.length) { skipped++; continue; }

		const startedAt = legacySess.startedAt ?? legacySess.date ?? ts;
		const finishedAt = legacySess.finishedAt ?? ts;
		const durationSeconds = Math.max(0, Math.round(
			(new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000
		)) || undefined;

		const session: Session = {
			id: sessId,
			templateId: legacySess.templateId ? String(legacySess.templateId) : undefined,
			templateName: legacySess.templateId ? templateNameMap.get(String(legacySess.templateId)) : undefined,
			status: 'complete',
			startedAt,
			finishedAt,
			durationSeconds,
			createdAt: ts,
			updatedAt: ts,
			synced: false
		};
		await db.put('sessions', session);
		importedSessions++;

		for (const legacySet of sessSets) {
			const ex = resolveExercise(legacySet.exerciseId);
			if (!ex) continue;

			const completedAt = legacySet.completedAt ?? startedAt;
			const w = legacySet.weight != null && legacySet.weight > 0 ? legacySet.weight : undefined;

			const set: WorkoutSet = {
				id: String(legacySet.id),
				sessionId: sessId,
				exerciseId: ex.id,
				exerciseName: ex.name,
				setNumber: legacySet.setNumber,
				weight: w,
				reps: legacySet.reps,
				completedAt,
				createdAt: ts,
				updatedAt: ts,
				synced: false
			};
			await db.put('sets', set);
			importedSets++;
		}
	}

	scheduleSync();
	await refreshAll();
	return { sessions: importedSessions, sets: importedSets, skipped };
}
