export interface Exercise {
	id: string;
	name: string;
	note?: string;
	defaultReps?: string;
	defaultWeight?: number;
	defaultRestSeconds?: number;
	defaultSets?: number;
	createdAt: string;
	updatedAt: string;
	synced: boolean;
}

export interface Folder {
	id: string;
	name: string;
	sortOrder?: number;
	createdAt: string;
	updatedAt: string;
	synced: boolean;
}

export interface Template {
	id: string;
	name: string;
	note?: string;
	folderId?: string;
	sortOrder?: number;
	createdAt: string;
	updatedAt: string;
	synced: boolean;
}

export interface TemplateItem {
	id: string;
	templateId: string;
	exerciseId: string;
	sortOrder: number;
	sets?: number;
	reps?: string;
	restSeconds?: number;
	supersetId?: string;
	supersetOrder?: number;
	createdAt: string;
	updatedAt: string;
	synced: boolean;
}

export interface Session {
	id: string;
	templateId?: string;
	templateName?: string;
	status: 'draft' | 'complete' | 'cancelled';
	startedAt: string;
	finishedAt?: string;
	durationSeconds?: number;
	pausedAt?: string;
	pausedDurationSeconds?: number;
	createdAt: string;
	updatedAt: string;
	synced: boolean;
}

export interface WorkoutSet {
	id: string;
	sessionId: string;
	exerciseId: string;
	exerciseName: string;
	setNumber: number;
	weight?: number;
	reps: number;
	completedAt: string;
	createdAt: string;
	updatedAt: string;
	synced: boolean;
}
