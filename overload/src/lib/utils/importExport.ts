import { getExercises, addExercise } from '$lib/db/exercises.js';
import { getTemplates, addTemplate, setTemplateItems, getFolders, addFolder } from '$lib/db/templates.js';
import { getSessions } from '$lib/db/sessions.js';
import { getDB } from '$lib/db/index.js';
import { refreshAll } from '$lib/stores/data.js';

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
