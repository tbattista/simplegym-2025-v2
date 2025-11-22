# Testing Guide: Move Cancel Button from Nav Bar to More Menu

## Changes Made
1. **Removed cancel button from bottom action bar configuration** (frontend/assets/js/config/bottom-action-bar-config.js)
   - Removed the cancel button from the leftActions array in the 'workout-builder' configuration

2. **Added cancel option to More Menu Offcanvas** (frontend/workout-builder.html)
   - Added a new menu item for cancel in the moreMenuOffcanvas, positioned above the delete button
   - The cancel menu item has the ID "cancelWorkoutMenuItem"

3. **Updated workout-editor.js to handle the new cancel menu item click** (frontend/assets/js/components/workout-editor.js)
   - Added an event listener for the new cancel menu item
   - The listener closes the more menu offcanvas first, then triggers the cancelEditWorkout function

## Testing Steps

### Prerequisites
- Make sure all the changes have been deployed to your testing environment
- Clear your browser cache to ensure the latest JavaScript and HTML files are loaded

### Test Case 1: Verify Cancel Button is Removed from Bottom Action Bar
1. Navigate to the workout builder page
2. Look at the bottom action bar
3. Verify that the cancel button (with the 'x' icon) is no longer present in the left side of the bottom action bar

### Test Case 2: Verify Cancel Option is Added to More Menu
1. Navigate to the workout builder page
2. Load a workout for editing
3. Tap the "More" button (three dots) in the bottom action bar to open the more menu
4. Verify that the "Cancel Edit" option is now visible in the more menu, positioned above the "Delete Workout" option
5. Verify that the cancel option has the correct icon ('x') and description ("Discard changes and exit")

### Test Case 3: Verify Cancel Functionality
1. Navigate to the workout builder page
2. Load a workout for editing
3. Make some changes to the workout (e.g., change the name or add an exercise)
4. Tap the "More" button to open the more menu
5. Tap the "Cancel Edit" option
6. Verify that the more menu closes
7. Verify that a confirmation dialog appears asking if you want to discard unsaved changes
8. Click "OK" to confirm
9. Verify that you are returned to the empty state (workout editor is closed)
10. Verify that the workout library is expanded again

### Test Case 4: Verify Delete Functionality Still Works
1. Navigate to the workout builder page
2. Load a workout for editing
3. Tap the "More" button to open the more menu
4. Tap the "Delete Workout" option
5. Verify that the more menu closes
6. Verify that a confirmation dialog appears asking if you want to delete the workout
7. Click "OK" to confirm
8. Verify that the workout is deleted and you are returned to the empty state

### Test Case 5: Verify Cancel with No Changes
1. Navigate to the workout builder page
2. Load a workout for editing
3. Don't make any changes
4. Tap the "More" button to open the more menu
5. Tap the "Cancel Edit" option
6. Verify that you are returned to the empty state without seeing a confirmation dialog (since there are no unsaved changes)

## Expected Outcome
After these changes:
1. The cancel button will no longer appear in the bottom action bar
2. The cancel option will be available in the more menu, positioned above the delete option
3. The cancel functionality will work exactly as before, just accessed from a different location
4. The user experience will be more streamlined with related actions grouped together in the more menu

## Troubleshooting
If any of the tests fail:
1. Check the browser console for any JavaScript errors
2. Verify that all files have been updated correctly
3. Clear the browser cache and try again
4. Ensure that the workout-editor.js file is being loaded correctly