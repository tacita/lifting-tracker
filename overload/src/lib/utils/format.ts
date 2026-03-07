export function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m${s > 0 ? ` ${s}s` : ''}`;
	return `${s}s`;
}

export function formatTimer(seconds: number): string {
	const abs = Math.abs(seconds);
	const m = Math.floor(abs / 60);
	const s = abs % 60;
	return `${seconds < 0 ? '-' : ''}${m}:${String(s).padStart(2, '0')}`;
}

export function formatWeight(w: number | undefined): string {
	if (w === undefined || w === null) return '';
	return w % 1 === 0 ? String(w) : w.toFixed(1);
}

export function elapsedSeconds(startedAt: string, pausedDurationSeconds = 0): number {
	return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) - pausedDurationSeconds;
}
