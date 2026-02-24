# One-Off Template Import Runbook

Use this to import any custom template set into the currently signed-in account.

## Reliability rules
- Open exactly one app tab.
- Sign in to the target account first.
- Import `db.js` without cache-busting query params.
  - Use: `import("/lifting-tracker/db.js")`
  - Do not use: `import("/lifting-tracker/db.js?v=...")`
- Run `forceSyncToCloud()` at the end.
- Hard refresh once after completion.

## 1) Pre-check
```js
(async () => {
  const base = location.pathname.includes("/lifting-tracker/") ? "/lifting-tracker" : "";
  const db = await import(`${base}/db.js`);
  const auth = await db.initAuth();
  const templates = await db.getTemplates();
  console.log("user:", auth?.user?.email || "none");
  console.log("template count:", templates.length);
})();
```

## 2) Generic one-off import script
Edit only `FOLDER`, `EXERCISES`, and `PROGRAM`.

```js
(async () => {
  const base = location.pathname.includes("/lifting-tracker/") ? "/lifting-tracker" : "";
  const db = await import(`${base}/db.js`);
  const auth = await db.initAuth();
  if (!auth?.user) throw new Error("Sign in first");

  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const makeId = () => Date.now() + Math.floor(Math.random() * 1e6);

  const FOLDER = "replace-this-folder-name";

  // name, repFloor, repCeiling, weightIncrement
  const EXERCISES = [
    // ["Cable Curl", 8, 15, 2.5],
  ];

  // Template format:
  // [
  //   ["Template Name", [
  //     ["Exercise Name", sets, "reps text", restSeconds, "optional-superset-id"],
  //   ]],
  // ]
  const PROGRAM = [
    // ["Day 1", [["Cable Curl", 3, "10-12", 60]]],
  ];

  const existingEx = await db.getExercises();
  const byExerciseName = new Map(existingEx.map((e) => [norm(e.name), e]));
  for (const [name, repFloor, repCeiling, weightIncrement] of EXERCISES) {
    if (!byExerciseName.has(norm(name))) {
      const exercise = { id: makeId(), name, repFloor, repCeiling, weightIncrement };
      await db.addExercise(exercise);
      byExerciseName.set(norm(name), exercise);
    }
  }

  await db.addFolder({ id: makeId(), name: FOLDER }).catch(() => {});

  const existingTemplates = await db.getTemplates();
  const byTemplateName = new Map(existingTemplates.map((t) => [norm(t.name), t]));

  for (const [templateName, rows] of PROGRAM) {
    const items = rows.map(([exerciseName, sets, reps, restSeconds, supersetId]) => {
      const ex = byExerciseName.get(norm(exerciseName));
      if (!ex) throw new Error(`Missing exercise: ${exerciseName}`);
      return {
        exerciseId: ex.id,
        sets,
        reps,
        restSeconds,
        supersetId: supersetId || null,
        supersetOrder: 0,
      };
    });

    const payload = {
      id: byTemplateName.get(norm(templateName))?.id ?? makeId(),
      name: templateName,
      folder: FOLDER,
      items,
      exerciseIds: items.map((i) => i.exerciseId),
    };

    if (byTemplateName.has(norm(templateName))) await db.updateTemplate(payload);
    else await db.addTemplate(payload);
  }

  await db.forceSyncToCloud();
  const templates = await db.getTemplates();
  console.log(
    "Imported templates:",
    templates
      .filter((t) => String(t.folder || "").trim().toLowerCase() === FOLDER.toLowerCase())
      .map((t) => t.name)
  );
})();
```

## 3) Post-check
```js
(async () => {
  const base = location.pathname.includes("/lifting-tracker/") ? "/lifting-tracker" : "";
  const db = await import(`${base}/db.js`);
  const folders = await db.getFolders();
  const templates = await db.getTemplates();
  const counts = templates.reduce((acc, t) => {
    const key = String(t.folder || "").trim() || "(unorganized)";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  console.log("folders:", folders.map((f) => f.name));
  console.log("template counts by folder:", counts);
})();
```

## Troubleshooting
- `Multiple GoTrueClient instances detected`
  - Close all app tabs and reopen one tab.
  - Re-run scripts without `?v=...` in the import path.
- Folder exists but no templates
  - Verify `PROGRAM` template names and that each row exercise exists in `EXERCISES` or DB.
- Console shows imported data but UI looks stale
  - Hard refresh once, then reopen Templates.
