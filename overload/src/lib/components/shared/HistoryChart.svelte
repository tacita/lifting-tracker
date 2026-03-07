<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { WorkoutSet } from '$lib/db/schema.js';
	import { formatDate } from '$lib/utils/format.js';

	export let sets: WorkoutSet[] = [];
	export let exerciseName = '';

	let canvas: HTMLCanvasElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let chart: any;

	$: chartData = (() => {
		const byDate = new Map<string, { maxWeight: number; maxReps: number }>();
		for (const s of sets) {
			const date = s.completedAt.slice(0, 10);
			const ex = byDate.get(date);
			if (!ex) { byDate.set(date, { maxWeight: s.weight ?? 0, maxReps: s.reps }); }
			else {
				if ((s.weight ?? 0) > ex.maxWeight) ex.maxWeight = s.weight ?? 0;
				if (s.reps > ex.maxReps) ex.maxReps = s.reps;
			}
		}
		const sorted = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b));
		return {
			labels: sorted.map(([d]) => formatDate(d)),
			values: sorted.map(([, v]) => v.maxWeight > 0 ? v.maxWeight : v.maxReps),
			hasWeight: sorted.some(([, v]) => v.maxWeight > 0)
		};
	})();

	interface SessionGroup {
		date: string;
		label: string;
		sets: WorkoutSet[];
	}

	$: sessionGroups = (() => {
		const sorted = [...sets].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
		const groups: SessionGroup[] = [];
		let currentDate = '';
		let current: SessionGroup | null = null;

		for (const s of sorted) {
			const date = s.completedAt.slice(0, 10);
			if (date !== currentDate) {
				currentDate = date;
				current = { date, label: formatDate(date), sets: [] };
				groups.push(current);
			}
			current!.sets.push(s);
		}

		for (const g of groups) {
			g.sets.sort((a, b) => a.setNumber - b.setNumber);
		}

		return groups;
	})();

	$: hasWeight = sets.some(s => (s.weight ?? 0) > 0);

	onMount(async () => {
		if (sets.length === 0) return;
		const { Chart, registerables } = await import('chart.js');
		Chart.register(...registerables);
		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: chartData.labels,
				datasets: [{
					label: chartData.hasWeight ? 'Max Weight (lbs)' : 'Max Reps',
					data: chartData.values,
					borderColor: '#6c8fff',
					backgroundColor: 'rgba(108,143,255,0.1)',
					borderWidth: 2,
					pointBackgroundColor: '#6c8fff',
					pointRadius: 4,
					tension: 0.3,
					fill: true
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: { legend: { display: false } },
				scales: {
					x: { ticks: { color: '#636b80', font: { size: 11 } }, grid: { color: '#2e3340' } },
					y: { ticks: { color: '#636b80', font: { size: 11 } }, grid: { color: '#2e3340' } }
				}
			}
		});
	});

	onDestroy(() => chart?.destroy());
</script>

{#if sets.length === 0}
	<p class="empty-state" style="padding:32px">No history yet for {exerciseName}</p>
{:else}
	<div class="chart-wrap">
		<canvas bind:this={canvas}></canvas>
	</div>

	<div class="set-log">
		{#each sessionGroups as group}
			<div class="session-date">{group.label}</div>
			<div class="set-table">
				<div class="set-row set-header">
					<span class="col-set">Set</span>
					{#if hasWeight}<span class="col-weight">lbs</span>{/if}
					<span class="col-reps">Reps</span>
				</div>
				{#each group.sets as s, i}
					<div class="set-row" class:alt={i % 2 === 1}>
						<span class="col-set">{s.setNumber}</span>
						{#if hasWeight}<span class="col-weight">{s.weight ?? '–'}</span>{/if}
						<span class="col-reps">{s.reps}</span>
					</div>
				{/each}
			</div>
		{/each}
	</div>
{/if}

<style>
	.chart-wrap { height: 220px; position: relative; }
	canvas { width: 100% !important; height: 100% !important; }

	.set-log {
		margin-top: 16px;
		max-height: 300px;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
	.session-date {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary, #a0a8c0);
		padding: 10px 0 4px;
		border-bottom: 1px solid var(--border, #2e3340);
	}
	.set-table { display: flex; flex-direction: column; }
	.set-row {
		display: flex;
		padding: 6px 0;
		font-size: 0.9rem;
		color: var(--text-primary, #e0e4f0);
	}
	.set-row.set-header {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary, #636b80);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 6px 0 2px;
	}
	.set-row.alt { background: rgba(255, 255, 255, 0.02); }
	.col-set { width: 40px; text-align: center; }
	.col-weight { flex: 1; text-align: right; padding-right: 16px; }
	.col-reps { flex: 1; text-align: right; }
</style>
