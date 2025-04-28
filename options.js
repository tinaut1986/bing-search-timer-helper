// --- Set active locale ---
const params = new URLSearchParams(location.search);
const ACTIVE_LOCALE = (params.get('lang') // ?lang=es
    || browser.i18n.getUILanguage()       // browser UI language
    || 'en'
).split('-')[0];                          // es-ES → es
console.log('Options locale:', ACTIVE_LOCALE);


// --- Define path mapping for configuration files ---
const configKeys = {
    userSearchTemplates: `data/${ACTIVE_LOCALE}/searchTemplates.json`,
    userSystems: `data/${ACTIVE_LOCALE}/systems.json`,
    userDevelopers: `data/${ACTIVE_LOCALE}/developers.json`,
    userSagas: `data/${ACTIVE_LOCALE}/sagas.json`,
    userGenres: `data/${ACTIVE_LOCALE}/genres.json`,
    userParts: `data/${ACTIVE_LOCALE}/parts.json`,
    userNumbers: `data/${ACTIVE_LOCALE}/numbers.json`,
    userAesthetics: `data/${ACTIVE_LOCALE}/aesthetics.json`
};

// --- Load status div and apply UI translations if available ---
const statusDiv = document.getElementById('status');
if (window.t) {
    document.querySelectorAll('[data-i18n]').forEach(n => n.textContent = t(n.dataset.i18n));
}

/**
 * Show a status message to the user.
 * @param {string} message - Message to display.
 * @param {string} [type='info'] - Type of message ('info', 'success', 'error').
 * @param {number} [duration=3000] - Duration in milliseconds, 0 = permanent.
 */
function showStatus(message, type = 'info', duration = 3000) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    if (duration > 0) {
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, duration);
    }
}

/**
 * Load default JSON data from a file, fallback to English if missing.
 * @param {string} filePath - Path to the localized JSON file.
 * @returns {Promise<Array<string>|null>}
 */
async function loadDefaultFromFile(filePath) {
    try {
        const response = await fetch(browser.runtime.getURL(filePath));
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error(`Data in ${filePath} is not an array.`);
        return data;
    } catch (error) {
        console.warn(`⚠️ Error loading ${filePath}: ${error.message}. Trying fallback...`);

        // Attempt fallback to English
        const fallbackPath = filePath.replace(/\/(es|fr|it|pt|ca)\//, '/en/');
        try {
            const fallbackRes = await fetch(browser.runtime.getURL(fallbackPath));
            if (!fallbackRes.ok) throw new Error(`Fallback HTTP error ${fallbackRes.status}`);
            const fallbackData = await fallbackRes.json();
            if (!Array.isArray(fallbackData)) throw new Error(`Fallback data not array.`);
            console.info(`✅ Fallback loaded for ${fallbackPath}`);
            return fallbackData;
        } catch (fallbackError) {
            console.error(`❌ Failed to load fallback for ${fallbackPath}: ${fallbackError.message}`);
            return [];
        }
    }
}


/**
 * Save current textarea contents to browser.storage.local.
 * @param {Event} e - Submit event.
 */
async function saveOptions(e) {
    e.preventDefault();

    const settingsToSave = {};
    let hasError = false;

    // Process each configured key/textarea
    for (const key in configKeys) {
        const textarea = document.getElementById(key);
        if (textarea) {
            const textValue = textarea.value;
            const arrayValue = textValue
                .split('\n')
                .map(line => line.trim())
                .filter(line => line);
            settingsToSave[`${key}_${ACTIVE_LOCALE}`] = arrayValue;
        } else {
            console.error(`Save Error: Textarea with id "${key}" not found!`);
            hasError = true;
        }
    }

    if (hasError) {
        showStatus('Internal error: Could not find all textareas.', 'error', 0);
        return;
    }

    // Save processed settings
    try {
        await browser.storage.local.set(settingsToSave);
        showStatus('Options saved successfully.', 'success');
    } catch (error) {
        console.error("Error saving options:", error);
        showStatus(`Error saving options: ${error.message}`, 'error', 0);
    }
}

/**
 * Load saved settings from storage or fallback to defaults.
 */
async function restoreOptions() {
    const storageRequest = {};
    for (const key in configKeys)
        storageRequest[`${key}_${ACTIVE_LOCALE}`] = null;

    const userSettings = await browser.storage.local.get(storageRequest);

    try {
        const defaultsPromises = [];
        const loadedDefaults = {};

        for (const baseKey in configKeys) {
            const storageKey = `${baseKey}_${ACTIVE_LOCALE}`;
            if (userSettings[storageKey] === null) {
                const filePath = configKeys[baseKey];
                defaultsPromises.push(
                    loadDefaultFromFile(filePath).then(def => {
                        if (def) loadedDefaults[baseKey] = def;
                    })
                );
            }
        }

        await Promise.all(defaultsPromises);

        // Populate textareas
        for (const key in configKeys) {
            const textarea = document.getElementById(key);
            if (textarea) {
                let dataToShow = userSettings[`${key}_${ACTIVE_LOCALE}`];
                if (dataToShow === null) {
                    dataToShow = await loadDefaultFromFile(configKeys[key]) || [];
                }
                textarea.value = dataToShow.join('\n');
            } else {
                console.error(`RestoreOptions Error: Textarea with id "${key}" not found!`);
            }
        }

    } catch (error) {
        console.error("Error restoring options:", error);
        showStatus(`Error loading configuration: ${error.message}`, 'error', 0);
    }
}

/**
 * Reset all settings to their default values.
 */
async function resetOptions() {
    if (!confirm(t('confirmRestoreDefaults'))) {
        return;
    }

    const keysToRemove = Object.keys(configKeys).map(k => `${k}_${ACTIVE_LOCALE}`);

    try {
        await browser.storage.local.remove(keysToRemove);
        await restoreOptions();
        showStatus(t('msgRestored'), 'success');
    } catch (error) {
        console.error("Error resetting options:", error);
        showStatus(`Error restoring defaults: ${error.message}`, 'error', 0);
    }
}


// --- Set up event listeners ---
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('options-form').addEventListener('submit', saveOptions);
document.getElementById('reset').addEventListener('click', resetOptions);