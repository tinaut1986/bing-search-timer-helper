// Map storage keys to default data file paths and textarea IDs
const configKeys = {
    userSearchTemplates: 'data/searchTemplates.json',
    userSystems: 'data/systems.json',
    userDevelopers: 'data/developers.json',
    userSagas: 'data/sagas.json',
    userGenres: 'data/genres.json',
    userParts: 'data/parts.json',
    userNumbers: 'data/numbers.json',
    userAesthetics: 'data/aesthetics.json'
};

const statusDiv = document.getElementById('status'); // Div for showing messages

/**
 * Displays status messages to the user (e.g., saved, error).
 * @param {string} message - The message text.
 * @param {string} [type='info'] - Message type ('info', 'success', 'error') for styling.
 * @param {number} [duration=3000] - How long to display (ms), 0 for permanent.
 */
function showStatus(message, type = 'info', duration = 3000) {
    statusDiv.textContent = message;
    statusDiv.className = type; // Apply CSS class based on type
    if (duration > 0) {
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, duration);
    }
}

/**
 * Loads the default array data from a specified JSON file within the extension.
 * @param {string} filePath - The path to the JSON file relative to the extension root.
 * @returns {Promise<Array<string>|null>} The default data array or null on error.
 */
async function loadDefaultFromFile(filePath) {
    try {
        const response = await fetch(browser.runtime.getURL(filePath));
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${filePath}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error(`Data in ${filePath} is not an array.`);
        }
        return data;
    } catch (error) {
        console.error(`Error loading default data from ${filePath}:`, error);
        showStatus(`Error loading default data (${filePath.split('/').pop()}): ${error.message}`, 'error', 0);
        return null; // Indicate failure
    }
}

/**
 * Saves the current content of the textareas to browser.storage.local.
 * Triggered by form submission.
 * @param {Event} e - The form submit event.
 */
async function saveOptions(e) {
    e.preventDefault(); // Prevent default form submission
    // console.log("Attempting to save options...");

    const settingsToSave = {};
    let hasError = false;

    // Iterate through configured keys/textareas
    for (const key in configKeys) {
        const textarea = document.getElementById(key); // Assumes textarea ID matches storage key
        if (textarea) {
            const textValue = textarea.value;
            // Convert textarea content (one item per line) to a clean array
            const arrayValue = textValue
                .split('\n')                // Split into lines
                .map(line => line.trim())   // Remove leading/trailing whitespace
                .filter(line => line);      // Remove empty lines
            settingsToSave[key] = arrayValue;
        } else {
            console.error(`Save Error: Textarea with id "${key}" not found!`);
            hasError = true;
        }
    }

    if (hasError) {
        showStatus('Internal error: Could not find all textareas.', 'error', 0);
        return;
    }

    // Attempt to save the processed settings
    try {
        await browser.storage.local.set(settingsToSave);
        // console.log("Options saved successfully:", settingsToSave);
        showStatus('Options saved successfully.', 'success');
    } catch (error) {
        console.error("Error saving options:", error);
        showStatus(`Error saving options: ${error.message}`, 'error', 0);
    }
}

/**
 * Loads settings from storage or defaults and populates the textareas.
 * Triggered on page load.
 */
async function restoreOptions() {
    // console.log("Restoring options...");
    const keysToLoad = Object.keys(configKeys);
    // Create an object to request keys from storage, defaulting to null
    // This allows us to know if a user setting exists or if we need the default
    const storageRequest = {};
    keysToLoad.forEach(key => storageRequest[key] = null);

    try {
        // Get user settings from storage
        const userSettings = await browser.storage.local.get(storageRequest);
        // console.log("Data loaded from storage:", userSettings);

        // Load default data files *only* for keys that were null in storage
        const defaultsPromises = [];
        const loadedDefaults = {}; // Cache loaded defaults

        for (const key in userSettings) {
            if (userSettings[key] === null) { // If user hasn't saved this setting
                if (!loadedDefaults[key]) { // Avoid reloading if already fetched (unlikely here but safe)
                    const filePath = configKeys[key];
                    // console.log(`No user setting for ${key}, queueing default load from ${filePath}`);
                    defaultsPromises.push(
                        loadDefaultFromFile(filePath).then(defaultData => {
                            if (defaultData !== null) {
                                loadedDefaults[key] = defaultData; // Store the loaded default
                            }
                            // Error is handled within loadDefaultFromFile
                        })
                    );
                }
            }
        }

        // Wait for all necessary default files to be loaded
        await Promise.all(defaultsPromises);
        // console.log("Required defaults loaded:", loadedDefaults);

        // Populate the textareas with user data or the loaded default
        for (const key in configKeys) {
            const textarea = document.getElementById(key);
            if (textarea) {
                let dataToShow = userSettings[key]; // Prefer user's saved data
                if (dataToShow === null) { // If no user data, use the default we loaded
                    dataToShow = loadedDefaults[key] || []; // Fallback to empty array if default loading failed
                    // console.log(`Using default data for ${key}`);
                } else {
                    // console.log(`Using user saved data for ${key}`);
                }
                // Convert array back to newline-separated string for textarea
                textarea.value = Array.isArray(dataToShow) ? dataToShow.join('\n') : '';
            } else {
                console.error(`RestoreOptions Error: Textarea with id "${key}" not found!`);
            }
        }
        // console.log("Options restored to view.");

    } catch (error) {
        console.error("Error restoring options:", error);
        showStatus(`Error loading configuration: ${error.message}`, 'error', 0);
    }
}

/**
 * Resets all settings back to their defaults by removing them from storage.
 * Triggered by the Reset button.
 */
async function resetOptions() {
    if (!confirm("Are you sure you want to restore all default values? Your custom changes will be lost.")) {
        return;
    }
    // console.log("Resetting options to defaults...");
    const keysToRemove = Object.keys(configKeys); // Get all keys we manage

    try {
        // Remove the user's saved settings from storage
        await browser.storage.local.remove(keysToRemove);
        // console.log("User settings removed from storage.");
        // Reload the options view; it will now load the defaults because storage is empty
        await restoreOptions();
        showStatus('Default values restored.', 'success');
    } catch (error) {
        console.error("Error resetting options:", error);
        showStatus(`Error restoring defaults: ${error.message}`, 'error', 0);
    }
}


// --- Add Event Listeners when the DOM is ready ---
document.addEventListener('DOMContentLoaded', restoreOptions); // Load options when page loads
document.getElementById('options-form').addEventListener('submit', saveOptions); // Save on form submit
document.getElementById('reset').addEventListener('click', resetOptions); // Reset on button click