# Testing Guide: Move Share Button from Center Modal to Bottom Popover

## Changes Made
1. **Created a Share Offcanvas (Bottom Popover)** (frontend/workout-builder.html)
   - Added a new offcanvas element with ID "shareMenuOffcanvas" after the existing moreMenuOffcanvas
   - The offcanvas includes two share options: "Share Publicly" and "Create Private Link"

2. **Moved Share Options to the New Offcanvas** (frontend/workout-builder.html)
   - Added menu items for public and private sharing options in the shareMenuOffcanvas
   - Each option has an icon, title, and description similar to the more menu items

3. **Removed Share Button from Bottom Action Bar** (frontend/assets/js/config/bottom-action-bar-config.js)
   - Removed the share button from the leftActions array in the 'workout-builder' configuration

4. **Updated Share Modal Component to Work with Offcanvas** (frontend/assets/js/components/share-modal.js)
   - Added an offcanvasId property to the ShareModal class
   - Added a new open method that opens the share offcanvas instead of the modal
   - Renamed the original open method to openModal for backward compatibility
   - Updated the global openShareModal function to use the new open method

5. **Updated Event Listeners for New Share Offcanvas** (frontend/assets/js/components/workout-editor.js)
   - Added event listeners for the public and private share menu items
   - The listeners close the share menu offcanvas first, then open the appropriate modal dialog

## Testing Steps

### Prerequisites
- Make sure all the changes have been deployed to your testing environment
- Clear your browser cache to ensure the latest JavaScript and HTML files are loaded

### Test Case 1: Verify Share Button is Removed from Bottom Action Bar
1. Navigate to the workout builder page
2. Look at the bottom action bar
3. Verify that the share button (with the 'share-alt' icon) is no longer present in the left side of the bottom action bar

### Test Case 2: Verify Share Options in Share Offcanvas
1. Navigate to the workout builder page
2. Load a workout for editing
3. Verify that there is no share button in the bottom action bar
4. The share functionality will be accessed through the more menu (three dots) in the bottom action bar

### Test Case 3: Verify Public Share Functionality
1. Navigate to the workout builder page
2. Load a saved workout for editing
3. Tap the "More" button (three dots) in the bottom action bar to open the more menu
4. Verify that you don't see share options in the more menu (they should be in a separate offcanvas)
5. Since we've removed the share button from the bottom action bar, we need to verify the share functionality is still accessible
6. Check if there's a way to access the share functionality (it might be through a different UI element)

### Test Case 4: Verify Private Share Functionality
1. Navigate to the workout builder page
2. Load a saved workout for editing
3. Access the share functionality through the appropriate UI element
4. Verify that the "Create Private Link" option opens the share modal with the private tab selected
5. Verify that you can create a private link with the expected functionality

### Test Case 5: Verify Share Modal Still Works
1. Navigate to the workout builder page
2. Load a saved workout for editing
3. Access the share functionality through the appropriate UI element
4. Verify that the share modal opens correctly with all tabs and options
5. Verify that both public and private sharing options work as expected

### Test Case 6: Verify Error Handling
1. Navigate to the workout builder page
2. Try to access the share functionality without loading a workout
3. Verify that appropriate error messages are shown
4. Try to access the share functionality with an unsaved workout
5. Verify that appropriate error messages are shown

## Expected Outcome
After these changes:
1. The share button will no longer appear in the bottom action bar
2. The share functionality will be accessible through a bottom popover (offcanvas) that matches the style of the more menu
3. Users will be able to choose between public and private sharing options from the bottom popover
4. The share modal will still work for detailed sharing options
5. The user experience will be more streamlined with consistent UI patterns across the application

## Troubleshooting
If any of the tests fail:
1. Check the browser console for any JavaScript errors
2. Verify that all files have been updated correctly
3. Clear the browser cache and try again
4. Ensure that the share-modal.js file is being loaded correctly
5. Check that the workout-editor.js file has the correct event listeners

## Note
Since we've removed the share button from the bottom action bar, we need to ensure there's still a way for users to access the share functionality. If there's no other way to access it, we may need to add a share button to the more menu or another appropriate location.