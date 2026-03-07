import { writable } from 'svelte/store';
import type { Session, TemplateItem } from '$lib/db/schema.js';

export interface ActiveSet {
	id?: string;
	setNumber: number;
	weight?: number;
	reps?: number;
	completed: boolean;
	completedAt?: string;
}

export interface ActiveExercise {
	exerciseId: string;
	exerciseName: string;
	note?: string;
	templateItem?: TemplateItem;
	sets: ActiveSet[];
}

export interface WorkoutState {
	session: Session | null;
	exercises: ActiveExercise[];
	currentExerciseIndex: number;
	restTimer: { active: boolean; targetEndMs: number | null; durationSeconds: number };
	timerPausedAt: number | null;
	pausedDurationMs: number;
}

const DEFAULT: WorkoutState = {
	session: null,
	exercises: [],
	currentExerciseIndex: 0,
	restTimer: { active: false, targetEndMs: null, durationSeconds: 90 },
	timerPausedAt: null,
	pausedDurationMs: 0
};

export const workout = writable<WorkoutState>(DEFAULT);

export function resetWorkout() { workout.set(DEFAULT); }
