
# App purpose:
Enable me to easily create, edit, follow and complete a workout.  I can see the last weight and reps i did in a set while i'm in a workout. I can access all my history so I can see my progress over time.

# Requirements:
* It's optimized for iphone use. It can run as a PWA.
* my data is saved to the cloud
* i login with two approved gmail accounts (tacita.om@gmail.com and nico.p.morway@gmail.com) or a magic link.
* i can import exercises
* i can import workout programs 
* a workout program has a title and can have 1 or more workouts in it.
* a workout has a title, an optional note, and is made up of 1 or more exercises
* an exercise has a title, an optional note, lbs, reps, suggested rest time (defualt is 90 seconds if none is set), and an optional suggested number of sets
* i can export my history
* zooming when you double tap on the screen is disabled
* we use supabase for our database cloud storage

# App Flow on a workout day:
- i open the PWA
- I see a list of workout programs
- i can open and close them to see the workouts available within each program
- i click a workout or click to start an Empty workout.

## Workouts
- clicking a workout opens that workout and starts a timer 
- i have the option to pause the workout timer or cancel the workout
- all of the exercises and/or supersets associated with this workout are listed in the right order, with the correct number of sets, if that had been defined
- when i'm done with a workout i can click to complete it. 
	- this stops the workout timer and ends the session
	- i see a simple celebration popup with a summary
	- when i close the celebration popup it takes me back to the main landing page
- there's a button to add a new exercise. This pulls up the same window for adding an exercise from my exercises library view.
- if there is a note with a workout, it is dsplayed  in small type under the workout title

## Excercises
- if there is a note with an excercise, it is displayed in small type under the workout title
- there's a drag-and-drop handler on the top left of an exercise next to the title so I can reorder exercises within my workout on the fly.
- under the excercise title is the suggested sets, reps and rest time. on this same line is a button to pull up a graph of the history of what weight i've lifted for this excercise before 
- i can click to swap an exercise within the workout
	- this opens a view of all the excercises in my library (this is the same view that is used for adding excercise to a workout. see "App flow for creating a workout")

## Supersets
* when creating or importing a workout I can add excercises OR supersets. a super set is two or more excercises that are completed back to back before a rest is taken. the reps and weights can differ between them, but the number of sets are the same.

## Sets
- if there is a record that i have done a set from an exercise in the past, then the last reps and weight i did are displayed 
- i can complete a set with 0 or no weight entered, but i can't complete a set with no reps entered
- when i complete a set: 
	- my sets and reps are saved to the cloud
	- a rest timer starts
	- i can add or subtract 10 seconds, or end the rest timer.
- if there is a history for set, it's listed in grey in the input(s).
	- if i click into an input the full integer becomes white and it's completely selected so if i start typing it replaces whatever was there.
- if there is no history, the input is empty
- I have an option to delete any set by clicking a small x button

- important note: if i refresh the page while i'm in an active workout session, the timer should continue. i should not lose any of the sets and reps i've done. if i get logged out those sets and reps should still be saved to my history.

# App flow for creating a workout
* i can associate a workout with a program by either creating a new workout program name, or selecting an existing workout program to add it to.
* there is a button to add exercises. this opens a view of all the exercises in my library. this is the same searchable view from the workout "add an exercise" button. 
	* there's a search input at the top. As I start typing it filters down to possible matches of exercises
	* i can select multiple exercises. 
	* i can select a checkbox to indicate that the excercises i'm choosing are part of a superset. 
	* i can create a new exercise. an exercise has a title, an optional note, lbs, reps, suggested rest time (default is 90 seconds if none is set), and an optional suggested number of sets

# Exercises library
* there is a view for browsing through all of the exercises in my library. 
* i can add, edit and delete. 
* i see the title for each and summary of reps, sets, rest, note and history.
* i can add new exercises from here

# workout programs library
* there is a view to see all my workout programs
* i can manage the programs to:
	* change the name
	* change the order
	* delete it all together
* i can edit a program