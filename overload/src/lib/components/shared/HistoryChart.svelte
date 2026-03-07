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

	onMount(async () => {
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

<div class="chart-wrap">
	{#if sets.length === 0}
		<p class="empty-state" style="padding:32px">No history yet for {exerciseName}</p>
	{:else}
		<canvas bind:this={canvas}></canvas>
	{/if}
</div>

<style>
	.chart-wrap { height: 220px; position: relative; }
	canvas { width: 100% !important; height: 100% !important; }
</style>
