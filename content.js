(async function () {
    'use strict';
    // --- Configuration Constants ---
    const DEFAULT_TARGET_MINUTES = 15; // Default timer goal in minutes
    const TIMER_INITIAL_RED_DURATION = 10; // Seconds the timer stays red initially

    // --- Variables for Data Loaded from Files/Storage ---
    // These will hold the lists used for search generation
    let defaultSearchTemplates, defaultSystems, defaultDevelopers, defaultSagas, defaultGenres, defaultParts, defaultNumbers, defaultAesthetics;
    let searchTemplates, systems, developers, sagas, genres, parts, numbers, aesthetics;

    // --- Timer State Variables ---
    let TARGET_MINUTES;        // Current timer goal (loaded from storage or default)
    let TARGET_SECONDS;        // Current timer goal in seconds
    let secondsRemaining;      // Current countdown value
    let timerInterval = null;  // Holds the interval ID for the timer
    let timerActive = false;   // Is the timer currently running?

    // --- Drag State Variables ---
    let isDragging = false;    // Is the user currently dragging the widget?
    let currentX, currentY, initialX, initialY; // Coordinates used during drag
    let xOffset = 0;           // Saved X offset (from top-left) for widget position
    let yOffset = 0;           // Saved Y offset for widget position

    // --- Unique Search State Variables ---
    let usedSearchesToday = []; // Holds searches suggested today to avoid repeats
    let lastUsedDate = '';      // YYYY-MM-DD date for resetting usedSearchesToday

    // --- Interface Element Variables ---
    let container, dragHandle, timerTitle, timerDisplay, searchTitle, searchInput, copyButton, newSearchButton, showUsedButton;
    let optionsButton, pasteSearchButton, autoSearchCheckbox, simulateTypingCheckbox, autoSearchLabel, simulateTypingLabel;

    let autoSearchEnabled = false;      // Loaded/saved state
    let simulateTypingEnabled = false;  // Loaded/saved state

    // --- URL Tracking Variable ---
    let lastHref = document.location.href; // Used by MutationObserver to detect navigation

    // ==================================
    // === Utility Helper Functions ===
    // ==================================

    /**
     * Formats a number of seconds into MM:SS format.
     * @param {number} seconds - The total seconds.
     * @returns {string} Formatted time string or "--:--" if input is invalid.
     */
    function formatTime(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) { return "--:--"; }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    /**
     * Gets a random element from an array.
     * @param {Array<any>} arr - The array to pick from.
     * @returns {any|undefined} A random element or undefined if the array is empty/invalid.
     */
    function getRandomElement(arr) {
        if (!arr || arr.length === 0) {
            console.warn("getRandomElement: Received empty or invalid array.");
            return undefined;
        }
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * Debounce function to limit the rate at which a function can fire.
     * @param {Function} func - The function to debounce.
     * @param {number} wait - The debounce duration in milliseconds.
     * @param {boolean} [immediate] - Trigger the function on the leading edge instead of the trailing.
     * @returns {Function} The debounced function.
     */
    function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    // ========================================
    // === Search Suggestion Generation Logic ===
    // ========================================

    /**
     * Generates a random search query based on templates and data lists.
     * @returns {string} A generated search query or an error placeholder string.
     */
    function generateDynamicSearch() {
        // Ensure global lists are populated before proceeding
        if (!searchTemplates || !systems || !developers || !sagas || !genres || !parts || !numbers || !aesthetics) {
            console.error("generateDynamicSearch: Core data lists are not loaded!");
            return "[Data Load Error]";
        }

        let template = getRandomElement(searchTemplates);
        const currentYear = new Date().getFullYear();

        if (!template) {
            console.error("generateDynamicSearch: Failed to get a valid template.");
            return "[Template Error]";
        }

        try {
            let replacementsMade = { /* ... (for debugging, can be removed if stable) ... */ };

            if (template.includes('%SAGA% %PART% vs %SAGA% %PART%')) {
                replacementsMade.comparison = true;
                const saga = getRandomElement(sagas);
                let part1 = getRandomElement(parts);
                let part2 = getRandomElement(parts);
                if (!saga || part1 === undefined || part2 === undefined) throw new Error("Missing data for comparison template");
                // ... (logic to ensure part1 !== part2) ...
                let attempts = 0;
                while (part1 === part2 && parts && parts.length > 1 && attempts < 5) {
                    part2 = getRandomElement(parts); attempts++;
                }
                if (part2 === undefined) throw new Error("Failed to get second part for comparison");
                // ... (careful replacement logic) ...
                let replacedSaga1 = false, replacedPart1 = false, replacedSaga2 = false, replacedPart2 = false;
                template = template.replace('%SAGA%', () => { replacedSaga1 = true; return saga; });
                template = template.replace('%PART%', () => { replacedPart1 = true; return part1; });
                template = template.replace('%SAGA%', () => { replacedSaga2 = true; return saga; });
                template = template.replace('%PART%', () => { replacedPart2 = true; return part2; });
                if (!replacedSaga1 || !replacedPart1 || !replacedSaga2 || !replacedPart2)
                    console.warn("Comparison replacement incomplete.");

            } else {
                const replacer = (match, list, key) => {
                    const element = getRandomElement(list);
                    if (element === undefined) {
                        console.warn(`generateDynamicSearch: Could not find random element for ${match}`);
                        return match;
                    }
                    replacementsMade[key] = true;
                    return element;
                };
                if (template.includes('%YEAR%')) { template = template.replace(/%YEAR%/g, currentYear); replacementsMade.year = true; }
                if (template.includes('%SYSTEM%')) template = template.replace(/%SYSTEM%/g, (match) => replacer(match, systems, 'system'));
                if (template.includes('%DEVELOPER%')) template = template.replace(/%DEVELOPER%/g, (match) => replacer(match, developers, 'developer'));
                if (template.includes('%SAGA%')) template = template.replace(/%SAGA%/g, (match) => replacer(match, sagas, 'saga'));
                if (template.includes('%GENRE%')) template = template.replace(/%GENRE%/g, (match) => replacer(match, genres, 'genre'));
                if (template.includes('%PART%')) template = template.replace(/%PART%/g, (match) => replacer(match, parts, 'part'));
                if (template.includes('%NUMBER%')) template = template.replace(/%NUMBER%/g, (match) => replacer(match, numbers, 'number'));
                if (template.includes('%AESTHETIC%')) template = template.replace(/%AESTHETIC%/g, (match) => replacer(match, aesthetics, 'aesthetic'));
            }

            if (!template || /%[A-Z]+%/.test(template)) {
                console.warn("generateDynamicSearch: Result is empty or still contains placeholders:", template);
                return template || "[Replacement Error]";
            }
            return template;

        } catch (error) {
            console.error("Error during placeholder replacement:", error);
            return "[Generation Error]";
        }
    }

    /**
     * Generates a search suggestion, ensuring it hasn't been used today.
     * Updates the local storage list of used searches.
     * @param {number} [maxAttempts=30] - Maximum tries to find a unique search.
     * @returns {Promise<string>} A unique search suggestion or a fallback string.
     */
    async function getUniqueSuggestedSearch(maxAttempts = 30) {
        let attempts = 0;
        while (attempts < maxAttempts) {
            const candidate = generateDynamicSearch();

            if (candidate && !candidate.startsWith('[') && !usedSearchesToday.includes(candidate)) {
                usedSearchesToday.push(candidate);

                try {
                    const today = new Date().toISOString().split('T')[0];
                    // Save updated list and potentially update date if it changed (though handled in initialize)
                    await browser.storage.local.set({
                        lastUsedDate: today,
                        usedSearchesToday: usedSearchesToday
                    });
                } catch (err) {
                    console.error("Failed to save updated used search list:", err);
                }
                return candidate;
            } else if (!(candidate && usedSearchesToday.includes(candidate))) {
                if (candidate && candidate.startsWith('['))
                    break; // Avoid infinite loops on generation errors
            }
            attempts++;
        }
        console.warn(`Could not find a unique search after ${maxAttempts} attempts.`);
        return "[No unique searches left?]";
    }

    // =============================
    // === Core Action Functions ===
    // =============================

    /**
     * Updates the search suggestion input field with a new unique search.
     */
    async function updateSearchDisplay() {
        if (searchInput) {
            const suggested = await getUniqueSuggestedSearch();
            searchInput.value = suggested ?? "[Search Gen Failed]";
        } else {
            console.warn("updateSearchDisplay: searchInput element not found");
        }
    }

    /**
     * Copies the text from the search suggestion input field to the clipboard.
     */
    async function copyToClipboard() {
        if (searchInput && searchInput.value) {
            try {
                await navigator.clipboard.writeText(searchInput.value);
                if (copyButton) copyButton.textContent = 'Copied!'; // Use textContent for icons/text
                setTimeout(() => {
                    if (copyButton) copyButton.textContent = '📋'; // Restore original icon/text
                }, 1500);
            } catch (err) {
                console.error('Failed to copy text: ', err);
                if (copyButton) copyButton.textContent = 'Error';
                setTimeout(() => {
                    if (copyButton) copyButton.textContent = '📋'; // Restore original icon/text
                }, 1500);
            }
        } else {
            console.warn("copyToClipboard: No search input or value found");
        }
    }

    /**
     * Sends a message to the background script to display a browser notification.
     */
    function sendNotification() {
        browser.runtime.sendMessage({
            type: "showNotification",
            title: "Time's Up!",
            message: `You've reached your goal of ${TARGET_MINUTES} minutes on Bing search.`
        }).catch(err => {
            console.error("Error sending notification message:", err);
            // Fallback alert if messaging fails
            alert(`Time's Up! You've reached your goal of ${TARGET_MINUTES} minutes.`);
        });
    }

    /**
     * Updates the timer display and applies color coding. Called every second by setInterval.
     */
    function updateTimer() {
        if (typeof secondsRemaining !== 'number' || isNaN(secondsRemaining)) {
            console.error("updateTimer: secondsRemaining is invalid:", secondsRemaining);
            stopTimer(); return;
        }

        secondsRemaining--;

        if (timerDisplay) {
            timerDisplay.textContent = formatTime(secondsRemaining);

            // Apply color logic
            if (secondsRemaining <= 0) {
                timerDisplay.style.color = 'red'; // Goal reached
            } else if (secondsRemaining >= TARGET_SECONDS - TIMER_INITIAL_RED_DURATION) {
                timerDisplay.style.color = 'red'; // Initial red period
            } else {
                timerDisplay.style.color = '#28a745'; // Normal green running state
            }
        } else {
            console.warn("updateTimer: timerDisplay element not found, stopping timer.");
            stopTimer(); return;
        }

        if (secondsRemaining <= 0) {
            stopTimer(true); // Pass true for goalReached
            sendNotification();
        }
    }

    /**
     * Prompts the user to enter a new timer duration, saves it, and resets the timer.
     */
    async function configureTimerDuration() {
        const wasTimerActive = timerActive;
        if (wasTimerActive) stopTimer(); // Pause timer during prompt

        const currentMinutes = TARGET_MINUTES;
        const newMinutesStr = prompt(`Enter new timer duration in minutes (current: ${currentMinutes}):`, currentMinutes);

        if (newMinutesStr !== null) {
            const newMinutes = parseInt(newMinutesStr, 10);
            if (!isNaN(newMinutes) && newMinutes > 0) {
                TARGET_MINUTES = newMinutes;
                TARGET_SECONDS = newMinutes * 60;
                try {
                    await browser.storage.local.set({ timerTargetMinutes: TARGET_MINUTES });
                    resetTimer(); // Reset will use new TARGET_SECONDS and start if needed
                } catch (err) {
                    console.error("Failed to save timer duration:", err);
                    alert("Error: Could not save the new timer duration.");
                    if (wasTimerActive)
                        startTimer(); // Restart with old value if save failed
                }
            } else {
                console.warn(`Invalid timer duration input: "${newMinutesStr}"`);
                alert("Invalid input. Please enter a positive whole number for the minutes.");
                if (wasTimerActive)
                    startTimer(); // Resume if input was invalid
            }
        } else if (wasTimerActive)
            startTimer(); // Resume if cancelled
    }

    /**
     * Starts the timer interval if not already active and time > 0.
     * Sets the initial display text and color.
     */
    function startTimer() {
        if (typeof secondsRemaining === 'undefined' || isNaN(secondsRemaining)) {
            console.warn("startTimer: Cannot start, secondsRemaining invalid:", secondsRemaining);
            return;
        }

        // Clear any existing interval to prevent duplicates
        if (timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        if (!timerActive && secondsRemaining > 0) {
            timerActive = true;
            if (timerDisplay) {
                timerDisplay.textContent = formatTime(secondsRemaining);
                timerDisplay.title = `Click to change duration (${TARGET_MINUTES} min)`;

                // Set initial color based on remaining time
                if (secondsRemaining >= TARGET_SECONDS - TIMER_INITIAL_RED_DURATION) {
                    timerDisplay.style.color = 'red';
                } else {
                    timerDisplay.style.color = '#28a745';
                }

                timerInterval = setInterval(updateTimer, 1000);
            } else {
                console.warn("startTimer: timerDisplay not found, cannot start.");
                timerActive = false;
            }
        } else if (secondsRemaining <= 0) {
            if (timerDisplay) { // Ensure goal state is shown
                timerDisplay.textContent = "Goal!";
                timerDisplay.style.color = 'red';
                timerDisplay.title = `Goal reached! (${TARGET_MINUTES} min). Click to change duration.`;
            }
            timerActive = false;
        } else {
            if (timerDisplay) { // Update title in case config changed while active
                timerDisplay.title = `Click to change duration (${TARGET_MINUTES} min)`;
            }
        }
    }

    /**
     * Stops the timer interval.
     * @param {boolean} [goalReached=false] - If true, sets display to "Goal!" state.
     */
    function stopTimer(goalReached = false) {
        if (timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null; // Clear the interval ID
        }
        timerActive = false; // Set state to inactive
        if (goalReached && timerDisplay) {
            timerDisplay.textContent = "Goal!";
            timerDisplay.style.color = 'red';
            timerDisplay.title = `Goal reached! (${TARGET_MINUTES} min). Click to change duration.`;
        }
        // If not goal reached, the display just stops updating
    }

    /**
     * Resets the timer countdown to the target duration and starts it.
     */
    function resetTimer() {
        // Stop is implicitly handled by startTimer clearing the old interval
        secondsRemaining = TARGET_SECONDS; // Reset countdown
        if (container && timerDisplay) {
            startTimer(); // Start timer (will handle clearing old interval)
        } else {
            console.warn("Attempted to reset timer before interface was created.");
        }
    }

    // ===============================
    // === Drag and Drop Functions ===
    // ===============================

    /**
     * Sets the CSS transform property to move the element.
     * @param {number} xPos - The X translation offset.
     * @param {number} yPos - The Y translation offset.
     * @param {HTMLElement} el - The element to move.
     */
    function setTranslate(xPos, yPos, el) {
        if (el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        } else {
            console.warn("setTranslate: Element not found.");
        }
    }

    /**
     * Checks if the widget is outside the viewport boundaries and adjusts its position if needed.
     * Also saves the corrected position.
     */
    function ensureWidgetInBounds() {
        if (!container) return;

        const widgetRect = container.getBoundingClientRect();
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        const margin = 5;
        const minX = margin;
        const minY = margin;
        // Calculate max based on *top-left* corner of widget
        const maxX = winWidth - widgetRect.width - margin;
        const maxY = winHeight - widgetRect.height - margin;

        let needsUpdate = false;
        let clampedX, clampedY;

        // Get current transform values accurately
        const style = window.getComputedStyle(container);
        const matrix = new DOMMatrixReadOnly(style.transform);
        const currentTranslateX = matrix.m41;
        const currentTranslateY = matrix.m42;

        clampedX = currentTranslateX;
        clampedY = currentTranslateY;

        // Clamp X (prevent going too far off-screen)
        if (currentTranslateX < minX) { clampedX = minX; needsUpdate = true; }
        if (currentTranslateX > maxX) { clampedX = maxX; needsUpdate = true; }

        // Clamp Y
        if (currentTranslateY < minY) { clampedY = minY; needsUpdate = true; }
        if (currentTranslateY > maxY) { clampedY = maxY; needsUpdate = true; }


        if (needsUpdate) {
            xOffset = clampedX;
            yOffset = clampedY;
            setTranslate(xOffset, yOffset, container);

            // Save corrected position asynchronously
            browser.storage.local.set({ widgetPosX: xOffset, widgetPosY: yOffset })
                .catch(err => console.error("Failed to save corrected widget position:", err));
        }
    }


    /**
     * Initiates the drag operation on mousedown/touchstart.
     * @param {MouseEvent|TouchEvent} e - The event object.
     */
    async function dragStart(e) {
        if (e.target !== dragHandle) { return; } // Only drag by the handle

        // Use current transform as the starting point for offsets
        const style = window.getComputedStyle(container);
        const matrix = new DOMMatrixReadOnly(style.transform);
        xOffset = matrix.m41;
        yOffset = matrix.m42;

        if (e.type === "touchstart") {
            e.preventDefault(); // Prevent page scroll/zoom on touch
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else { // mousedown
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            // Add listeners to the document to capture mouse movements outside the widget
            document.addEventListener('mousemove', drag, false);
            document.addEventListener('mouseup', dragEnd, false);
        }
        isDragging = true;
        if (container) container.style.cursor = 'grabbing'; // Visual feedback
    }

    /**
     * Handles the dragging movement (mousemove/touchmove).
     * @param {MouseEvent|TouchEvent} e - The event object.
     */
    function drag(e) {
        if (!isDragging) return;

        if (e.type === "touchmove") {
            e.preventDefault(); // Prevent scroll during touch drag
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else { // mousemove
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }

        // Update the offset variables IN REAL TIME based on current drag position
        xOffset = currentX;
        yOffset = currentY;

        // Apply the visual translation
        setTranslate(xOffset, yOffset, container);
    }

    /**
     * Ends the drag operation (mouseup/touchend). Saves the final position.
     * @param {MouseEvent|TouchEvent} e - The event object.
     */
    async function dragEnd(e) {
        if (!isDragging) return;
        isDragging = false;

        // xOffset and yOffset hold the final position from the 'drag' function

        // Ensure the final position is within bounds before saving
        ensureWidgetInBounds(); // This will potentially update xOffset/yOffset again

        try {
            // Save the potentially clamped final position
            await browser.storage.local.set({ widgetPosX: xOffset, widgetPosY: yOffset });
        } catch (err) {
            console.error("dragEnd: Failed to save widget position:", err);
        }

        // Reset cursors
        if (container) container.style.cursor = 'default';
        if (dragHandle) dragHandle.style.cursor = 'move';

        // Remove document listeners added for mouse dragging
        if (e.type === "mouseup") {
            document.removeEventListener('mousemove', drag, false);
            document.removeEventListener('mouseup', dragEnd, false);
        }
        // Touch listeners remain on the container element
    }


    // ================================
    // === Interface and DOM Manipulation ===
    // ================================

    /**
     * Displays the list of used searches for the day in a modal dialog.
     */
    function showHistoryModal() {
        const existingOverlay = document.getElementById('bing-history-modal-overlay');
        if (existingOverlay)
            existingOverlay.remove(); // Remove previous if exists

        const overlay = document.createElement('div');
        overlay.id = 'bing-history-modal-overlay';
        const modalContent = document.createElement('div');
        modalContent.id = 'bing-history-modal-content';
        const title = document.createElement('h2');
        title.textContent = 'Searches Suggested Today';
        const list = document.createElement('ul');
        list.id = 'bing-history-list';

        if (usedSearchesToday.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.textContent = "No searches suggested yet.";
            emptyItem.style.fontStyle = 'italic';
            list.appendChild(emptyItem);
        } else {
            usedSearchesToday.forEach(search => {
                const listItem = document.createElement('li');
                listItem.textContent = search;
                list.appendChild(listItem);
            });
        }

        const closeButton = document.createElement('button');
        closeButton.id = 'bing-history-modal-close';
        closeButton.textContent = 'Close';
        closeButton.onclick = () => {
            overlay.style.display = 'none';
            overlay.remove();
        };

        modalContent.appendChild(title);
        modalContent.appendChild(list);
        modalContent.appendChild(closeButton);
        overlay.appendChild(modalContent);
        document.body.appendChild(overlay);
        overlay.style.display = 'flex'; // Show modal

        // Close modal on overlay click
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeButton.click();
        });
    }


    /**
     * Creates the entire widget interface and adds it to the page.
     */
    function createInterface() {
        if (document.getElementById('bing-timer-helper'))
            return;

        // --- Main Container ---
        container = document.createElement('div');
        container.id = 'bing-timer-helper';
        setTranslate(xOffset, yOffset, container); // Apply loaded/default position

        // --- Drag Handle ---
        dragHandle = document.createElement('div');
        dragHandle.id = 'bing-timer-drag-handle';
        dragHandle.textContent = 'Drag';

        // --- Content Wrapper ---
        const contentWrapper = document.createElement('div');
        contentWrapper.id = 'bing-timer-content-wrapper';

        // --- Elements inside Content Wrapper ---
        timerTitle = document.createElement('div');
        timerTitle.textContent = 'Timer:';
        timerTitle.style.fontWeight = 'bold';
        timerTitle.style.marginBottom = '5px';

        timerDisplay = document.createElement('div');
        timerDisplay.id = 'bing-timer-display';
        timerDisplay.textContent = formatTime(secondsRemaining); // Use initial value
        timerDisplay.style.cursor = 'pointer';
        timerDisplay.title = `Click to change duration (${TARGET_MINUTES} min)`;

        searchTitle = document.createElement('div');
        searchTitle.textContent = 'Suggested Search:';
        searchTitle.style.fontWeight = 'bold';
        searchTitle.style.marginTop = '15px';
        searchTitle.style.marginBottom = '5px';

        searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.id = 'bing-random-search';
        searchInput.readOnly = true;
        searchInput.style.width = 'calc(100% - 12px)'; // Input width within padding
        searchInput.style.marginBottom = '5px';
        searchInput.title = 'Randomly suggested search';

        // --- Buttons ---
        copyButton = document.createElement('button');
        copyButton.textContent = '📋'; // Icon
        copyButton.id = 'bing-copy-button';
        copyButton.title = 'Copy the suggested search';
        // Styles applied via CSS

        newSearchButton = document.createElement('button');
        newSearchButton.textContent = '🔄'; // Icon
        newSearchButton.id = 'bing-new-search-button';
        newSearchButton.title = 'Generate a new random search';
        // Styles applied via CSS

        showUsedButton = document.createElement('button');
        showUsedButton.textContent = '📜'; // Icon
        showUsedButton.id = 'bing-show-used-button';
        showUsedButton.title = 'Show searches suggested today';
        // Styles applied via CSS

        optionsButton = document.createElement('button');
        optionsButton.textContent = '⚙️'; // Icon
        optionsButton.id = 'bing-options-button';
        optionsButton.title = 'Open Extension Options';
        // Styles applied via CSS

        pasteSearchButton = document.createElement('button');
        pasteSearchButton.textContent = '⬅️'; // Or an arrow/paste icon <svg>...</svg>
        pasteSearchButton.id = 'bing-paste-search-button';
        pasteSearchButton.title = 'Paste suggestion into Bing search box';

        // --- Checkbox Options ---
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'widget-options'; // Class for potential styling
        optionsDiv.style.marginTop = '10px';
        optionsDiv.style.fontSize = '12px'; // Smaller

        // Auto Search Checkbox
        autoSearchCheckbox = document.createElement('input');
        autoSearchCheckbox.type = 'checkbox';
        autoSearchCheckbox.id = 'bing-auto-search-check';
        autoSearchCheckbox.checked = autoSearchEnabled; // Set initial state
        autoSearchCheckbox.style.marginRight = '5px';
        autoSearchCheckbox.style.verticalAlign = 'middle';

        autoSearchLabel = document.createElement('label');
        autoSearchLabel.htmlFor = 'bing-auto-search-check';
        autoSearchLabel.textContent = 'Auto Search?';
        autoSearchLabel.title = 'If checked, automatically performs the search after pasting.';
        autoSearchLabel.style.cursor = 'pointer';
        autoSearchLabel.style.marginRight = '15px'; // Space between options
        autoSearchLabel.style.verticalAlign = 'middle';

        // Simulate Typing Checkbox
        simulateTypingCheckbox = document.createElement('input');
        simulateTypingCheckbox.type = 'checkbox';
        simulateTypingCheckbox.id = 'bing-simulate-typing-check';
        simulateTypingCheckbox.checked = simulateTypingEnabled; // Set initial state
        simulateTypingCheckbox.style.marginRight = '5px';
        simulateTypingCheckbox.style.verticalAlign = 'middle';

        simulateTypingLabel = document.createElement('label');
        simulateTypingLabel.htmlFor = 'bing-simulate-typing-check';
        simulateTypingLabel.textContent = 'Simulate Typing?';
        simulateTypingLabel.title = 'If checked, types the suggestion character by character instead of pasting instantly.';
        simulateTypingLabel.style.cursor = 'pointer';
        simulateTypingLabel.style.verticalAlign = 'middle';

        optionsDiv.appendChild(autoSearchCheckbox);
        optionsDiv.appendChild(autoSearchLabel);
        optionsDiv.appendChild(simulateTypingCheckbox);
        optionsDiv.appendChild(simulateTypingLabel);


        // --- Button Group Container ---
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group'; // Optional class for styling group
        buttonGroup.style.marginTop = '5px';
        // Order of buttons matters for the :first-child CSS rule
        buttonGroup.appendChild(copyButton);
        buttonGroup.appendChild(pasteSearchButton);
        buttonGroup.appendChild(newSearchButton);
        buttonGroup.appendChild(showUsedButton)
        buttonGroup.appendChild(optionsButton);

        // --- Assemble Content Wrapper ---
        contentWrapper.appendChild(timerTitle);
        contentWrapper.appendChild(timerDisplay);
        contentWrapper.appendChild(searchTitle);
        contentWrapper.appendChild(searchInput);
        contentWrapper.appendChild(optionsDiv);
        contentWrapper.appendChild(buttonGroup);

        // --- Assemble Main Container ---
        container.appendChild(dragHandle);
        container.appendChild(contentWrapper);

        // --- Add Event Listeners ---
        if (timerDisplay)
            timerDisplay.addEventListener('click', configureTimerDuration);

        if (copyButton)
            copyButton.addEventListener('click', copyToClipboard);

        if (newSearchButton)
            newSearchButton.addEventListener('click', updateSearchDisplay);

        if (showUsedButton)
            showUsedButton.addEventListener('click', showHistoryModal);

        if (optionsButton) {
            optionsButton.addEventListener('click', () => {
                browser.runtime.sendMessage({ type: "openOptionsPage" })
                    .catch(err => console.error("Error sending openOptionsPage message:", err));
            });
        }

        if (pasteSearchButton) {
            pasteSearchButton.addEventListener('click', pasteSuggestionToSearchBox);
            console.log("Added click listener to pasteSearchButton.");
        } else console.error("Failed to add click listener: pasteSearchButton is null");

        if (autoSearchCheckbox) {
            autoSearchCheckbox.addEventListener('change', handleCheckboxChange);
        }
        if (simulateTypingCheckbox) {
            simulateTypingCheckbox.addEventListener('change', handleCheckboxChange);
        }

        // Drag listeners
        if (dragHandle) {
            dragHandle.addEventListener('mousedown', dragStart, false);
            dragHandle.addEventListener('touchstart', dragStart, { passive: false });
        }
        if (container) {
            container.addEventListener('touchmove', drag, { passive: false });
            container.addEventListener('touchend', dragEnd, false);
            container.addEventListener('touchcancel', dragEnd, false);
        }

        // --- Append to Page ---
        document.body.appendChild(container);

        // --- Load Initial Search ---
        updateSearchDisplay();
    }

    /**
     * Handles changes to the configuration checkboxes.
     * Updates the corresponding global state variable and saves it to storage.
     * @param {Event} event - The change event object from the checkbox.
     */
    async function handleCheckboxChange(event) {
        if (!event.target) return;

        const checkboxId = event.target.id;
        const isChecked = event.target.checked;
        let settingToSave = {};

        if (checkboxId === 'bing-auto-search-check') {
            autoSearchEnabled = isChecked;
            settingToSave = { autoSearchEnabled: isChecked };
            console.log(`Checkbox: Auto Search set to ${isChecked}`);
        } else if (checkboxId === 'bing-simulate-typing-check') {
            simulateTypingEnabled = isChecked;
            settingToSave = { simulateTypingEnabled: isChecked };
            console.log(`Checkbox: Simulate Typing set to ${isChecked}`);
        } else {
            return; // Unknown checkbox
        }

        // Save the new setting to storage
        try {
            await browser.storage.local.set(settingToSave);
            // console.log("Checkbox setting saved.");
        } catch (err) {
            console.error("Error saving checkbox setting:", err);
            // Optional: Inform user or revert checkbox state
            // event.target.checked = !isChecked; // Revert visual state
            // if (checkboxId === 'bing-auto-search-check') autoSearchEnabled = !isChecked; // Revert global state
            // else if (checkboxId === 'bing-simulate-typing-check') simulateTypingEnabled = !isChecked;
        }
    }

    /**
     * Simulates typing text into an input field character by character.
     * @param {HTMLInputElement} inputElement - The input field element.
     * @param {string} textToType - The text to simulate typing.
     * @param {number} [minDelay=50] - Minimum delay between characters (ms).
     * @param {number} [maxDelay=150] - Maximum delay between characters (ms).
     */
    async function simulateTyping(inputElement, textToType, minDelay = 50, maxDelay = 150) {
        console.log(`Simulating typing for: "${textToType}"`);
        inputElement.value = ''; // Clear the input first
        inputElement.focus();    // Focus on the input

        for (let i = 0; i < textToType.length; i++) {
            const char = textToType[i];
            inputElement.value += char; // Append character

            // Dispatch 'input' event after each character to mimic real typing
            inputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

            // Wait for a random delay
            const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Dispatch 'change' event after typing is complete (optional but good practice)
        inputElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        console.log("Simulated typing complete.");
    }

    /**
     * Pastes or simulates typing the suggestion into the Bing search box,
     * and optionally performs the search based on checkbox settings.
     */
    async function pasteSuggestionToSearchBox() {
        console.log("pasteSuggestionToSearchBox called");

        const suggestionText = searchInput?.value;
        if (!suggestionText || suggestionText.startsWith('[')) {
            console.warn("Paste Search: No valid suggestion text.");
            alert("No valid search suggestion to use.");
            return;
        }

        const bingSearchBox = document.getElementById('sb_form_q');
        if (!bingSearchBox) {
            console.error("Paste Search: Could not find Bing search input #sb_form_q.");
            alert("Error: Could not find the Bing search box.");
            return;
        }

        // --- Disable buttons during operation ---
        const buttonsToDisable = [copyButton, newSearchButton, showUsedButton, optionsButton, pasteSearchButton];
        buttonsToDisable.forEach(btn => { if (btn) btn.disabled = true; });
        const originalPasteIcon = pasteSearchButton ? pasteSearchButton.textContent : '⬅️';
        if (pasteSearchButton) pasteSearchButton.textContent = '...'; // Indicate working

        try {
            // --- Step 1: Place text in search box (Simulate or Instant) ---
            if (simulateTypingEnabled) {
                await simulateTyping(bingSearchBox, suggestionText); // Await simulation
            } else {
                console.log("Pasting instantly...");
                bingSearchBox.value = suggestionText;
                // Dispatch events after instant paste
                bingSearchBox.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                bingSearchBox.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                console.log("Instant paste complete.");
            }

            // Add a small delay after typing/pasting before potential search, feels more natural
            await new Promise(resolve => setTimeout(resolve, 150));

            // --- Step 2: Perform search if Auto Search is enabled ---
            if (autoSearchEnabled) {
                console.log("Auto Search enabled, attempting to click search button...");
                const bingSearchButton = document.getElementById('sb_form_go');
                if (bingSearchButton) {
                    bingSearchButton.click();
                    console.log("Search button clicked.");
                } else {
                    console.warn("Auto Search: Could not find search button #sb_form_go.");
                    // Maybe try submitting the form? Less reliable.
                    // bingSearchBox.form?.submit();
                }
            } else {
                console.log("Auto Search disabled.");
                // Optional: Focus the search box if not auto-searching
                bingSearchBox.focus();
            }

            // Update paste button state only if search wasn't triggered (or delay it)
            if (pasteSearchButton && !autoSearchEnabled) { // Only show success if NOT navigating away
                pasteSearchButton.textContent = 'Done!';
                setTimeout(() => {
                    if (pasteSearchButton) pasteSearchButton.textContent = originalPasteIcon;
                }, 1200);
            }

        } catch (error) {
            console.error("Error during paste/simulation/search:", error);
            alert("An error occurred while interacting with the search box.");
            if (pasteSearchButton) pasteSearchButton.textContent = 'Error'; // Indicate error
            setTimeout(() => { if (pasteSearchButton) pasteSearchButton.textContent = originalPasteIcon; }, 1500);

        } finally {
            // --- Re-enable buttons (unless auto-search is likely navigating away) ---
            // Add a longer delay if auto-search was on, otherwise re-enable sooner
            const reEnableDelay = autoSearchEnabled ? 1500 : 200;
            setTimeout(() => {
                buttonsToDisable.forEach(btn => { if (btn) btn.disabled = false; });
                // Restore icon in case it was left as '...' or 'Done!' if auto search was on
                if (pasteSearchButton && pasteSearchButton.textContent !== originalPasteIcon) {
                    pasteSearchButton.textContent = originalPasteIcon;
                }
                console.log("Buttons re-enabled.");
            }, reEnableDelay);
        }
    }

    /**
     * Observes DOM changes to detect SPA navigation within Bing search.
     */
    function observeChanges() {
        if (window.bingTimerObserver) { return; } // Prevent multiple observers

        const observer = new MutationObserver(mutations => {
            // Use rAF for checking URL after potential DOM updates/rendering
            requestAnimationFrame(() => {
                if (document.location.href !== lastHref) {
                    lastHref = document.location.href;
                    // Reset timer only if we are still on a Bing search page and widget exists
                    if (location.hostname.includes('bing.com') && location.pathname.startsWith('/search') && document.getElementById('bing-timer-helper')) {
                        resetTimer();
                    } else if (!location.hostname.includes('bing.com')) {
                        stopTimer(); // Stop if navigated away from Bing
                    } else if (!document.getElementById('bing-timer-helper') && location.hostname.includes('bing.com') && location.pathname.startsWith('/search')) {
                        console.warn("Bing Search Timer: Navigation detected, but widget not found.");
                    }
                }
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window.bingTimerObserver = observer; // Store reference
    }

    // ==================================
    // === Utility Helper Functions ===
    // ==================================

    /**
     * Debounce function to limit the rate at which a function can fire.
     * @param {Function} func - The function to debounce.
     * @param {number} wait - The debounce duration in milliseconds.
     * @param {boolean} [immediate] - Trigger the function on the leading edge instead of the trailing.
     * @returns {Function} The debounced function.
     */
    function debounce(func, wait, immediate) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    /**
     * Clamps a value between a minimum and maximum.
     * @param {number} value - The value to clamp.
     * @param {number} min - The minimum allowed value.
     * @param {number} max - The maximum allowed value.
     * @returns {number} The clamped value.
     */
    function clamp(value, min, max) {
        return Math.max(min, Math.min(value, max));
    }

    /**
     * Sets the CSS transform property to move the element.
     * @param {number} xPos - The X translation offset.
     * @param {number} yPos - The Y translation offset.
     * @param {HTMLElement} el - The element to move.
     */
    function setTranslate(xPos, yPos, el) {
        if (el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        } // Do not add console.warn here to avoid noise if the element does not exist yet
    }

    /**
     * Calculates the valid boundaries and clamps the position.
     * @param {number} targetX - The desired X position (translation value).
     * @param {number} targetY - The desired Y position (translation value).
     * @param {HTMLElement} element - The element being positioned.
     * @returns {{x: number, y: number, clamped: boolean}} Clamped position and flag.
     */
    function getClampedPosition(targetX, targetY, element) {
        // (Full definition of getClampedPosition provided previously, with logs if desired)
        if (!element) return { x: targetX, y: targetY, clamped: false };
        const widgetRect = element.getBoundingClientRect();
        const winWidth = document.documentElement.clientWidth || window.innerWidth;
        const winHeight = document.documentElement.clientHeight || window.innerHeight;
        const margin = 5;
        if (!widgetRect.width || !widgetRect.height || widgetRect.width <= 0 || widgetRect.height <= 0) { return { x: targetX, y: targetY, clamped: false }; }
        const minX = margin; const minY = margin;
        const maxX = winWidth - widgetRect.width - margin; const maxY = winHeight - widgetRect.height - margin;
        const safeMinX = minX; const safeMinY = minY;
        const safeMaxX = Math.max(safeMinX, maxX); const safeMaxY = Math.max(safeMinY, maxY);
        const clampedX = clamp(targetX, safeMinX, safeMaxX); const clampedY = clamp(targetY, safeMinY, safeMaxY);
        const wasClamped = clampedX !== targetX || clampedY !== targetY;
        // Optional logging here if needed
        return { x: clampedX, y: clampedY, clamped: wasClamped };
    }


    /**
     * Checks bounds on window resize and applies correction if needed.
     * This function is debounced when added as a listener.
     */
    function handleResize() {
        if (!container) return; // Exit if the widget container doesn't exist

        // Get the current position directly from the applied transform style
        const style = window.getComputedStyle(container);
        const matrix = new DOMMatrixReadOnly(style.transform);
        const currentTranslateX = matrix.m41;
        const currentTranslateY = matrix.m42;

        // Calculate where this position should be clamped according to the NEW window size
        const clampedPos = getClampedPosition(currentTranslateX, currentTranslateY, container);

        // If the current position is now out of bounds (clamping occurred)
        if (clampedPos.clamped) {
            // Update the global offset variables to the new clamped position
            xOffset = clampedPos.x;
            yOffset = clampedPos.y;
            // Move the widget visually
            setTranslate(xOffset, yOffset, container);

            // Save the newly corrected position to storage
            browser.storage.local.set({ widgetPosX: xOffset, widgetPosY: yOffset })
                .catch(err => console.error("Failed to save resize-adjusted widget position:", err));
        }
    }


    // ====================================
    // === Initialization and Execution ===
    // ====================================

    /**
     * Loads default data lists from packaged JSON files.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async function loadDataFromFiles() {
        try {
            const urls = {
                templates: browser.runtime.getURL('data/searchTemplates.json'),
                systems: browser.runtime.getURL('data/systems.json'),
                developers: browser.runtime.getURL('data/developers.json'),
                parts: browser.runtime.getURL('data/parts.json'),
                aesthetics: browser.runtime.getURL('data/aesthetics.json'),
                genres: browser.runtime.getURL('data/genres.json'),
                sagas: browser.runtime.getURL('data/sagas.json'),
                numbers: browser.runtime.getURL('data/numbers.json'),
            };

            const responses = await Promise.all(Object.values(urls).map(url => fetch(url)));

            for (const res of responses) {
                if (!res.ok) throw new Error(`Failed to fetch ${res.url} (Status: ${res.status})`);
            }

            const jsonData = await Promise.all(responses.map(res => res.json()));

            if (jsonData.length !== 8)
                throw new Error(`Expected 8 data arrays, got ${jsonData.length}`);

            // Assign to the specific default variables
            [
                defaultSearchTemplates, defaultSystems, defaultDevelopers,
                defaultParts, defaultAesthetics, defaultGenres,
                defaultSagas, defaultNumbers
            ] = jsonData;

            return true; // Success

        } catch (error) {
            console.error("loadDataFromFiles: ERROR caught:", error);
            return false; // Failure
        }
    }

    /**
     * Main initialization function for the content script.
     * Loads defaults, loads user settings, calculates initial position,
     * sets up the interface, and starts timers/listeners.
     */
    async function initialize() {

        // 1. Load Default Data from Files first
        const dataLoaded = await loadDataFromFiles();
        if (!dataLoaded) {
            console.error("Bing Search Timer: Failed to load default data from files. Aborting initialization.");
            return; // Stop if essential defaults failed to load
        }

        // --- Try/Catch for Storage access and subsequent setup ---
        try {
            // 2. Load User Settings / Widget State from Storage
            const userData = await browser.storage.local.get({
                timerTargetMinutes: DEFAULT_TARGET_MINUTES,
                widgetPosX: null, // Use null to check if position was saved
                widgetPosY: null,
                lastUsedDate: '',
                usedSearchesToday: [],
                userSearchTemplates: null, userSystems: null, userDevelopers: null,
                userSagas: null, userGenres: null, userParts: null,
                userNumbers: null, userAesthetics: null,
                autoSearchEnabled: false,      // Defaults to false
                simulateTypingEnabled: false   // Defaults to false
            });

            // 3. Assign Settings (Timer, Date, Used Searches)
            TARGET_MINUTES = userData.timerTargetMinutes ?? DEFAULT_TARGET_MINUTES;
            TARGET_SECONDS = TARGET_MINUTES * 60;
            secondsRemaining = TARGET_SECONDS; // Set initial countdown value
            lastUsedDate = userData.lastUsedDate ?? '';
            const loadedUsedSearches = userData.usedSearchesToday ?? [];
            autoSearchEnabled = userData.autoSearchEnabled ?? false;
            simulateTypingEnabled = userData.simulateTypingEnabled ?? false;
            console.log(`BST: Loaded Checkbox States: AutoSearch=${autoSearchEnabled}, SimulateTyping=${simulateTypingEnabled}`);

            // 4. Assign Template Lists (Use saved user data or fallback to loaded defaults)
            searchTemplates = Array.isArray(userData.userSearchTemplates) ? userData.userSearchTemplates : defaultSearchTemplates;
            systems = Array.isArray(userData.userSystems) ? userData.userSystems : defaultSystems;
            developers = Array.isArray(userData.userDevelopers) ? userData.userDevelopers : defaultDevelopers;
            sagas = Array.isArray(userData.userSagas) ? userData.userSagas : defaultSagas;
            genres = Array.isArray(userData.userGenres) ? userData.userGenres : defaultGenres;
            parts = Array.isArray(userData.userParts) ? userData.userParts : defaultParts;
            numbers = Array.isArray(userData.userNumbers) ? userData.userNumbers : defaultNumbers;
            aesthetics = Array.isArray(userData.userAesthetics) ? userData.userAesthetics : defaultAesthetics;

            // 5. Determine and Assign Initial Position Offsets (xOffset, yOffset)
            let needsAdjustToRightDefault = false; // Flag specific for default right calculation

            if (userData.widgetPosX !== null && userData.widgetPosY !== null) {
                // Use the position saved by the user
                xOffset = userData.widgetPosX;
                yOffset = userData.widgetPosY;
            } else {
                // No position saved - Set flag to calculate default top-right LATER
                // For the *initial* render before calculation, place it at CSS default (15,15)
                // The transform offset variables start at 0,0 relative to the CSS position
                xOffset = 0; // Start with zero transform offset initially
                yOffset = 0;
                needsAdjustToRightDefault = true; // Set flag to adjust after creation
            }

            // 6. Handle Daily Reset for Used Searches
            const today = new Date().toISOString().split('T')[0];
            if (lastUsedDate !== today) {
                usedSearchesToday = [];
                lastUsedDate = today;
                try { await browser.storage.local.set({ lastUsedDate: today, usedSearchesToday: [] }); }
                catch (saveErr) { console.error("Error saving reset search data:", saveErr); }
            } else
                usedSearchesToday = Array.isArray(loadedUsedSearches) ? loadedUsedSearches : [];

            // 7. Validate Essential Data
            if (!Array.isArray(searchTemplates) || searchTemplates.length === 0) {
                console.error("BST: CRITICAL - No search templates available.");
                // Consider stopping or disabling features
            }

            // 8. Create the UI
            createInterface(); // Applies initial transform based on xOffset/yOffset

            // 9. Adjust Position if Necessary (Initial Default OR Out-of-Bounds Saved)
            // Use setTimeout to ensure the element is rendered and has dimensions
            setTimeout(() => {
                if (!container) {
                    console.error("BST: [Timeout] Container not found!");
                    return;
                }

                if (needsAdjustToRightDefault) {
                    // Calculate default top-right position
                    const widgetRect = container.getBoundingClientRect();

                    // *** DIMENSION VALIDATION ***
                    if (!widgetRect || !widgetRect.width || widgetRect.width <= 0) {
                        console.warn(`BST: [Timeout] Cannot calculate default right pos, widget has no valid width yet. Width: ${widgetRect?.width}`);
                        // You could try again with another setTimeout or simply leave it at 15,15
                        // For now, we'll leave it where it is (relative 15,15) if there's no width.
                        // Optionally, save (0,0) as an indication of unknown position?
                        // browser.storage.local.set({ widgetPosX: 0, widgetPosY: 0 }).catch(err => console.error("Failed to save zero position:", err));
                        return; // Exit if there's no width
                    }
                    // *** END VALIDATION ***

                    const winWidth = document.documentElement.clientWidth || window.innerWidth;
                    const margin = 15;
                    const targetX = winWidth - widgetRect.width - margin;
                    const targetY = 15;

                    const clampedPos = getClampedPosition(targetX, targetY, container); // getClampedPosition already logs internally

                    xOffset = clampedPos.x; // Update global
                    yOffset = clampedPos.y;
                    setTranslate(xOffset, yOffset, container); // Apply visual update

                    // Save this calculated default position
                    browser.storage.local.set({ widgetPosX: xOffset, widgetPosY: yOffset })
                        .catch(err => console.error("Failed to save initial default right position:", err));

                } else {
                    // Check if the SAVED position is within current bounds
                    const initialClampedPos = getClampedPosition(xOffset, yOffset, container);
                    if (initialClampedPos.clamped) {
                        xOffset = initialClampedPos.x; // Update global offset
                        yOffset = initialClampedPos.y;
                        setTranslate(xOffset, yOffset, container); // Apply visual correction
                        // Save the corrected position
                        browser.storage.local.set({ widgetPosX: xOffset, widgetPosY: yOffset })
                            .catch(err => console.error("Failed to save initially clamped position:", err));
                    }
                }
            }, 100); // Delay ensures element is rendered and has dimensions

            // 10. Start Timer and Observers
            startTimer();
            observeChanges();

            // Add resize listener
            window.addEventListener('resize', debounce(handleResize, 250));
        } catch (err) {
            console.error("Bing Search Timer: Error during main initialization block:", err);
            console.warn("Bing Search Timer: Extension failed to initialize properly.");
        }
    }

    // --- Start Execution ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})(); // End of IIFE
