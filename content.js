(async function () {
    'use strict';
    // Compatibility shim for Chrome/Firefox/Android
    globalThis.browser = globalThis.browser || globalThis.chrome;

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
    let timerStartTime = null; // Timestamp when the timer was started
    let timerInterval = null;  // Holds the interval ID for the timer
    let timerActive = false;   // Is the timer currently running?

    // --- Drag State Variables ---
    let isDragging = false;    // Is the user currently dragging the widget?
    let currentX, currentY, initialX, initialY; // Coordinates used during drag
    let xOffset = 0;           // Saved X offset for widget position
    let yOffset = 0;           // Saved Y offset for widget position
    const UI_MARGIN = 10;      // Consistent margin from page edges

    // --- Unique Search State Variables ---
    let usedSearchesToday = []; // Holds searches suggested today to avoid repeats
    let lastUsedDate = '';      // YYYY-MM-DD date for resetting usedSearchesToday

    // --- Interface Element Variables ---
    let container, dragHandle, handleText, timerTitle, timerDisplay, searchTitle, searchInput, copyButton, newSearchButton, showUsedButton;
    let optionsButton, pasteSearchButton, autoSearchCheckbox, simulateTypingCheckbox, autoSearchLabel, simulateTypingLabel;
    let minimizeButton, minimizedSearchButton;

    let autoSearchEnabled = false;      // Loaded/saved state
    let simulateTypingEnabled = false;  // Loaded/saved state
    let isMinimized = false;            // Current minimized state
    let savedPosBeforeMinimize = { x: 0, y: 0 }; // Position to restore to

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
     * Does NOT update the used searches list; that is now handled when the search is executed.
     * @param {number} [maxAttempts=30] - Maximum tries to find a unique search.
     * @returns {Promise<string>} A unique search suggestion or a fallback string.
     */
    async function getUniqueSuggestedSearch(maxAttempts = 30) {
        let attempts = 0;
        while (attempts < maxAttempts) {
            const candidate = generateDynamicSearch();

            // We just need a candidate that's not an error and not already used today.
            if (candidate && !candidate.startsWith('[') && !usedSearchesToday.includes(candidate)) {
                return candidate;
            }

            // If we get a generation error, break to avoid infinite loops.
            if (candidate && candidate.startsWith('[')) {
                break;
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
                if (copyButton) copyButton.textContent = t('copiedFeedback'); // Use textContent for icons/text
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
            title: t('notifTimeUpTitle'),
            message: t('notifTimeUpBody', [TARGET_MINUTES])
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
        if (!timerStartTime) {
            console.error("updateTimer: timerStartTime is not set");
            stopTimer();
            return;
        }

        const now = Date.now();
        const elapsedSeconds = Math.floor((now - timerStartTime) / 1000);
        const secondsRemaining = Math.max(0, TARGET_SECONDS - elapsedSeconds);

        if (timerDisplay) {
            const timeStr = formatTime(secondsRemaining);
            timerDisplay.textContent = timeStr;
            if (isMinimized && handleText) {
                handleText.textContent = timeStr;
            }

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
            stopTimer();
            return;
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
     * Resets the timer countdown to the target duration and starts it.
     */
    function resetTimer() {
        stopTimer();
        if (timerDisplay) {
            timerDisplay.textContent = formatTime(TARGET_SECONDS);
            timerDisplay.style.color = '#28a745'; // Reset to green
        }
    }

    /**
     * Starts the timer interval if not already active and time > 0.
     * Sets the initial display text and color.
     */
    function startTimer() {
        if (timerActive || TARGET_SECONDS <= 0) return;

        // Set the start time to now
        timerStartTime = Date.now();

        if (timerInterval) clearInterval(timerInterval);

        timerActive = true;
        timerInterval = setInterval(updateTimer, 200); // More frequent updates for smoother display
        updateTimer(); // Initial update
    }

    /**
     * Stops the timer interval.
     * @param {boolean} [goalReached=false] - If true, sets display to "Goal!" state.
     */
    function stopTimer(goalReached = false) {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timerActive = false;
        timerStartTime = null;

        if (goalReached && timerDisplay) {
            timerDisplay.textContent = "¡Objetivo!";
            timerDisplay.style.color = 'red';
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
        const margin = UI_MARGIN;
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
     * Toggles the minimized state of the widget.
     */
    async function toggleMinimize() {
        if (!container) return;

        isMinimized = !isMinimized;
        console.log(`Widget toggled to minimized: ${isMinimized}`);

        if (isMinimized) {
            // --- Minimizing ---
            // Save current position to restore it later
            savedPosBeforeMinimize = { x: xOffset, y: yOffset };

            // Add class for CSS changes
            container.classList.add('minimized-widget');

            // Move to bottom. We'll set a special Y that sticks to bottom.
            // Using a very large Y and rely on ensureWidgetInBounds to clamp it to the bottom.
            yOffset = window.innerHeight + 1000;

            // Update button icon/text
            if (minimizeButton) {
                minimizeButton.textContent = '🔼';
                minimizeButton.title = t('btnMaximize');
            }
            if (handleText) {
                const now = Date.now();
                const elapsedSeconds = timerStartTime ? Math.floor((now - timerStartTime) / 1000) : 0;
                const secondsRemaining = Math.max(0, TARGET_SECONDS - elapsedSeconds);
                handleText.textContent = formatTime(secondsRemaining);
            }
        } else {
            // --- Maximizing ---
            container.classList.remove('minimized-widget');

            // Restore saved position
            xOffset = savedPosBeforeMinimize.x;
            yOffset = savedPosBeforeMinimize.y;

            // Update button icon/text
            if (minimizeButton) {
                minimizeButton.textContent = '🔽';
                minimizeButton.title = t('btnMinimize');
            }
            if (handleText) {
                handleText.textContent = t('dragHandle');
            }
        }

        // Apply visual change
        setTranslate(xOffset, yOffset, container);
        ensureWidgetInBounds(); // This will clamp the position correctly

        // Save state to storage
        try {
            await browser.storage.local.set({
                isMinimized: isMinimized,
                savedPosX: savedPosBeforeMinimize.x,
                savedPosY: savedPosBeforeMinimize.y,
                widgetPosX: xOffset,
                widgetPosY: yOffset
            });
        } catch (err) {
            console.error("Failed to save minimized state:", err);
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
        title.textContent = t('modalTitle');
        const list = document.createElement('ul');
        list.id = 'bing-history-list';

        if (usedSearchesToday.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.textContent = t('modalEmpty');
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
        closeButton.textContent = t('modalClose');
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

        handleText = document.createElement('span');
        handleText.className = 'handle-text';

        minimizedSearchButton = document.createElement('button');
        minimizedSearchButton.id = 'bing-minimized-search-button';
        minimizedSearchButton.textContent = '🔍';
        minimizedSearchButton.title = t('btnPaste');
        minimizedSearchButton.onclick = (e) => {
            e.stopPropagation();
            pasteSuggestionToSearchBox();
        };

        minimizeButton = document.createElement('button');
        minimizeButton.id = 'bing-minimize-button';
        minimizeButton.textContent = isMinimized ? '🔼' : '🔽';
        minimizeButton.title = isMinimized ? t('btnMaximize') : t('btnMinimize');
        minimizeButton.onclick = (e) => {
            e.stopPropagation(); // Avoid triggering drag
            toggleMinimize();
        };

        if (isMinimized) {
            container.classList.add('minimized-widget');
            // Show timer if minimized initially
            const now = Date.now();
            const elapsedSeconds = timerStartTime ? Math.floor((now - timerStartTime) / 1000) : 0;
            const secondsRemaining = Math.max(0, TARGET_SECONDS - elapsedSeconds);
            handleText.textContent = formatTime(secondsRemaining);
        } else {
            handleText.textContent = t('dragHandle');
        }

        dragHandle.appendChild(minimizedSearchButton);
        dragHandle.appendChild(handleText);
        dragHandle.appendChild(minimizeButton);

        // --- Content Wrapper ---
        const contentWrapper = document.createElement('div');
        contentWrapper.id = 'bing-timer-content-wrapper';

        // --- Elements inside Content Wrapper ---
        timerTitle = document.createElement('div');
        timerTitle.textContent = t('timerTitle');
        timerTitle.style.fontWeight = 'bold';
        timerTitle.style.marginBottom = '5px';

        timerDisplay = document.createElement('div');
        timerDisplay.id = 'bing-timer-display';
        // Mostrar tiempo inicial basado en TARGET_SECONDS
        timerDisplay.textContent = formatTime(TARGET_SECONDS);
        timerDisplay.style.cursor = 'pointer';
        timerDisplay.title = `Click to change duration (${TARGET_MINUTES} min)`;

        searchTitle = document.createElement('div');
        searchTitle.textContent = t('suggestedSearchTitle');
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
        copyButton.title = t('btnCopy');
        // Styles applied via CSS

        newSearchButton = document.createElement('button');
        newSearchButton.textContent = '🔄'; // Icon
        newSearchButton.id = 'bing-new-search-button';
        newSearchButton.title = t('btnNew');
        // Styles applied via CSS

        showUsedButton = document.createElement('button');
        showUsedButton.textContent = '📜'; // Icon
        showUsedButton.id = 'bing-show-used-button';
        showUsedButton.title = t('btnHistory');
        // Styles applied via CSS

        optionsButton = document.createElement('button');
        optionsButton.textContent = '⚙️'; // Icon
        optionsButton.id = 'bing-options-button';
        optionsButton.title = t('btnOptions');
        // Styles applied via CSS

        pasteSearchButton = document.createElement('button');
        pasteSearchButton.textContent = t('btnMainAction');
        pasteSearchButton.id = 'bing-paste-search-button';
        pasteSearchButton.title = t('btnPaste');

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
        autoSearchLabel.textContent = t('chkAutoSearch');
        autoSearchLabel.title = 'If checked, automatically performs the search after pasting.';
        autoSearchLabel.style.cursor = 'pointer';

        // Simulate Typing Checkbox
        simulateTypingCheckbox = document.createElement('input');
        simulateTypingCheckbox.type = 'checkbox';
        simulateTypingCheckbox.id = 'bing-simulate-typing-check';
        simulateTypingCheckbox.checked = simulateTypingEnabled; // Set initial state

        simulateTypingLabel = document.createElement('label');
        simulateTypingLabel.htmlFor = 'bing-simulate-typing-check';
        simulateTypingLabel.textContent = t('chkSimulateTyping');
        simulateTypingLabel.title = 'If checked, types the suggestion character by character instead of pasting instantly.';
        simulateTypingLabel.style.cursor = 'pointer';

        const row1 = document.createElement('div');
        row1.className = 'option-row';
        row1.appendChild(autoSearchCheckbox);
        row1.appendChild(autoSearchLabel);

        const row2 = document.createElement('div');
        row2.className = 'option-row';
        row2.appendChild(simulateTypingCheckbox);
        row2.appendChild(simulateTypingLabel);

        optionsDiv.appendChild(row1);
        optionsDiv.appendChild(row2);


        // --- Button Group Container ---
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group'; // Optional class for styling group
        buttonGroup.style.marginTop = '5px';
        // Order of buttons matters for the :first-child CSS rule
        buttonGroup.appendChild(pasteSearchButton);
        buttonGroup.appendChild(copyButton);
        buttonGroup.appendChild(newSearchButton);
        buttonGroup.appendChild(showUsedButton);
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
                const locale = (browser.i18n.getUILanguage() || 'en').split('-')[0];
                browser.runtime.sendMessage({
                    type: "openOptionsPage",
                    locale  // «es», «en», «ca», «pt»…
                }).catch(err => console.error("Error sending openOptionsPage message:", err));
            });
        }

        if (pasteSearchButton) {
            pasteSearchButton.addEventListener('click', pasteSuggestionToSearchBox);
        }

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
 * Simulates typing text into an input field character by character with realistic mistakes and corrections.
 * @param {HTMLInputElement} inputElement - The input field element.
 * @param {string} textToType - The text to simulate typing.
 * @param {number} [minDelay=40] - Minimum delay between characters (ms).
 * @param {number} [maxDelay=120] - Maximum delay between characters (ms).
 */
    async function simulateTyping(inputElement, textToType, minDelay = 40, maxDelay = 120) {
        console.log(`Simulating realistic typing for: "${textToType}"`);
        inputElement.value = '';
        inputElement.focus();

        const TYPO_CHANCE = 0.04;          // 4% chance per char to make a mistake
        const CORRECTION_CHANCE = 0.85;   // 85% of mistakes are corrected
        const nearbyKeys = {
            'a': 'sqwz', 'b': 'vghn', 'c': 'xdfv', 'd': 'erfcxs', 'e': 'rdws', 'f': 'rtgvcd',
            'g': 'tyhbfv', 'h': 'yujngt', 'i': 'ujko', 'j': 'uikmnh', 'k': 'iolmj', 'l': 'okp',
            'm': 'njk', 'n': 'bhjm', 'o': 'iklp', 'p': 'ol', 'q': 'wa', 'r': 'edtf',
            's': 'axwdz', 't': 'rfgy', 'u': 'yhji', 'v': 'cfgb', 'w': 'qeas', 'x': 'zsdc',
            'y': 'tghu', 'z': 'asx', ' ': 'cvbnm',
            '1': '2q', '2': '13wq', '3': '24ew', '4': '35re', '5': '46tr',
            '6': '57yt', '7': '68uy', '8': '79iu', '9': '80oi', '0': '9po'
        };

        let i = 0;
        while (i < textToType.length) {
            // --- Natural Pause occasionally ---
            if (i > 0 && Math.random() < 0.1) {
                await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
            }

            const targetChar = textToType[i].toLowerCase();

            // --- TYPO LOGIC ---
            if (Math.random() < TYPO_CHANCE && nearbyKeys[targetChar]) {
                const neighbors = nearbyKeys[targetChar];
                const typoChar = neighbors[Math.floor(Math.random() * neighbors.length)];
                const shouldCorrect = Math.random() < CORRECTION_CHANCE;

                // Type the typo
                inputElement.value += typoChar;
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                await new Promise(r => setTimeout(r, minDelay + Math.random() * (maxDelay - minDelay)));

                if (shouldCorrect) {
                    // How many more chars do we type before noticing?
                    const peekAhead = Math.min(Math.floor(Math.random() * 4), textToType.length - i - 1);

                    // Type a few more (correct/incorrect) chars before realizing the mistake
                    for (let j = 1; j <= peekAhead; j++) {
                        inputElement.value += textToType[i + j];
                        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                        await new Promise(r => setTimeout(r, minDelay + Math.random() * (maxDelay - minDelay)));
                    }

                    // Pause: realize mistake
                    await new Promise(r => setTimeout(r, 300 + Math.random() * 300));

                    // Backspace (peekAhead + 1 typo)
                    for (let k = 0; k <= peekAhead; k++) {
                        inputElement.value = inputElement.value.slice(0, -1);
                        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                        await new Promise(r => setTimeout(r, 40 + Math.random() * 60)); // Rapid backspacing
                    }

                    // Note: i remains same, so we retry typing the correct char in next iteration
                    continue;
                } else {
                    // User didn't notice/care about this typo, move on to next char
                    i++;
                    continue;
                }
            }

            // --- NORMAL TYPING ---
            inputElement.value += textToType[i];
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            i++;

            // Random delay
            const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        console.log("Realistic typing complete.");
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

        // --- Add to history now that the user has committed to using the search ---
        if (!usedSearchesToday.includes(suggestionText)) {
            usedSearchesToday.push(suggestionText);
            try {
                const today = new Date().toISOString().split('T')[0];
                await browser.storage.local.set({
                    lastUsedDate: today,
                    usedSearchesToday: usedSearchesToday
                });
            } catch (err) {
                console.error("Failed to save updated used search list:", err);
            }
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
        const originalPasteIcon = pasteSearchButton ? pasteSearchButton.textContent : t('btnMainAction');
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
                // Try different selectors for the search button (Desktop and Mobile)
                const searchButtonSelectors = ['#sb_form_go', '.b_searchboxSubmit', 'input[type="submit"]', 'button[type="submit"]', '.search.icon'];
                let bingSearchButton = null;

                for (const selector of searchButtonSelectors) {
                    bingSearchButton = document.querySelector(selector);
                    if (bingSearchButton) {
                        console.log(`Found search button using selector: ${selector}`);
                        break;
                    }
                }

                if (bingSearchButton) {
                    bingSearchButton.click();
                    console.log("Search button clicked.");
                } else {
                    console.warn("Auto Search: Could not find search button. Attempting form submit.");
                    // Fallback: Submit the form directly
                    if (bingSearchBox.form) {
                        bingSearchBox.form.submit();
                        console.log("Form submitted directly.");
                    } else {
                        console.error("Auto Search: No form found to submit.");
                    }
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
     * Observes DOM changes to detect SPA navigation and dynamic content reloads.
     */
    function observeChanges() {
        if (window.bingTimerObserver) { return; } // Prevent multiple observers

        // Debounced function to re-initialize if the widget is removed from the DOM.
        const reinitializeIfNeeded = debounce(() => {
            // Check if we are on a Bing search page and the widget is gone.
            if (location.hostname.includes('bing.com') &&
                location.pathname.startsWith('/search') &&
                !document.getElementById('bing-timer-helper')) {
                console.log("Bing Search Timer: Widget not found. Attempting to re-initialize.");
                initialize(); // Re-run the main setup function.
            }
        }, 300); // A 300ms debounce should be enough to prevent rapid-fire re-initialization.

        const observer = new MutationObserver(mutations => {
            // We use requestAnimationFrame to ensure we check the DOM after it has settled from the mutation.
            requestAnimationFrame(() => {
                // 1. Handle re-initialization if the widget was removed.
                reinitializeIfNeeded();

                // 2. Handle URL changes for simple timer resets on SPA navigation.
                if (document.location.href !== lastHref) {
                    lastHref = document.location.href;
                    // If the widget still exists on a valid page, just reset the timer and update the suggestion.
                    if (location.hostname.includes('bing.com') && location.pathname.startsWith('/search') && document.getElementById('bing-timer-helper')) {
                        console.log("SPA Navigation detected. Resetting timer and getting new suggestion.");
                        resetTimer();
                        updateSearchDisplay();
                    } else if (!location.hostname.includes('bing.com')) {
                        stopTimer(); // Stop the timer if we've navigated away from Bing.
                    }
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
        window.bingTimerObserver = observer; // Store a reference to avoid creating multiple observers.
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
        const margin = UI_MARGIN;
        if (!widgetRect.width || !widgetRect.height || widgetRect.width <= 0 || widgetRect.height <= 0) { return { x: targetX, y: targetY, clamped: false }; }
        const minX = margin; const minY = margin;
        const maxX = winWidth - widgetRect.width - margin; const maxY = winHeight - widgetRect.height - margin;
        const safeMinX = minX; const safeMinY = minY;
        const safeMaxX = Math.max(safeMinX, maxX); const safeMaxY = Math.max(safeMinY, maxY);
        const clampedX = clamp(targetX, safeMinX, safeMaxX); const clampedY = clamp(targetY, safeMinY, safeMaxY);
        const wasClamped = clampedX !== targetX || clampedY !== targetY;
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
     * Gets the localized data path for a given file.
     * @param {string} file - The name of the file to get the path for.
     * @returns {string} The full URL to the localized data file.
     */
    function getDataPath(file) {
        const locale = (browser.i18n.getUILanguage() || 'en').split('-')[0]; // 'es', 'en'
        return browser.runtime.getURL(`data/${locale}/${file}`);
    }

    async function smartFetchJson(localeFile, fallbackFile) {
        try {
            const res = await fetch(browser.runtime.getURL(localeFile));
            if (res.ok) {
                return await res.json();
            } else {
                console.warn(`⚠️ Locale file not found: ${localeFile}. Trying fallback...`);
            }
        } catch (err) {
            console.warn(`⚠️ Fetch failed for locale ${localeFile}. Trying fallback...`, err);
        }

        try {
            const fallbackRes = await fetch(browser.runtime.getURL(fallbackFile));
            if (fallbackRes.ok) {
                console.info(`✅ Fallback loaded: ${fallbackFile}`);
                return await fallbackRes.json();
            } else {
                console.error(`❌ Fallback also failed: ${fallbackFile}`);
                return [];
            }
        } catch (err) {
            console.error(`❌ Fetch failed for fallback ${fallbackFile}`, err);
            return [];
        }
    }

    /**
     * Loads default data lists from packaged JSON files.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async function loadDataFromFiles() {
        try {
            const locale = (browser.i18n.getUILanguage() || 'en').split('-')[0];

            const files = [
                'searchTemplates.json',
                'systems.json',
                'developers.json',
                'parts.json',
                'aesthetics.json',
                'genres.json',
                'sagas.json',
                'numbers.json'
            ];

            const datasets = await Promise.all(
                files.map(file =>
                    smartFetchJson(`data/${locale}/${file}`, `data/en/${file}`)
                )
            );

            [
                defaultSearchTemplates,
                defaultSystems,
                defaultDevelopers,
                defaultParts,
                defaultAesthetics,
                defaultGenres,
                defaultSagas,
                defaultNumbers
            ] = datasets;

            return true;
        } catch (error) {
            console.error("loadDataFromFiles: Unexpected error:", error);
            return false;
        }
    }

    /**
     * Main initialization function for the content script.
     * Loads defaults, loads user settings, calculates initial position,
     * sets up the interface, and starts timers/listeners.
     */
    async function initialize() {
        // 0. Check for search box presence.
        // We only want to show the widget on pages where a search can actually be performed.
        if (!document.getElementById('sb_form_q')) {
            console.log("Bing Search Timer: Search box #sb_form_q not found. Skipping initialization for this page.");
            return;
        }

        // 1. Load Default Data from Files first
        const dataLoaded = await loadDataFromFiles();

        if (!dataLoaded) {
            console.error("Bing Search Timer: Failed to load data. Aborting initialization.");
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
                simulateTypingEnabled: false,  // Defaults to false
                isMinimized: false,
                savedPosX: null,
                savedPosY: null
            });

            // 3. Assign Settings (Timer, Date, Used Searches)
            TARGET_MINUTES = userData.timerTargetMinutes ?? DEFAULT_TARGET_MINUTES;
            TARGET_SECONDS = TARGET_MINUTES * 60;
            lastUsedDate = userData.lastUsedDate ?? '';
            const loadedUsedSearches = userData.usedSearchesToday ?? [];
            autoSearchEnabled = userData.autoSearchEnabled ?? false;
            simulateTypingEnabled = userData.simulateTypingEnabled ?? false;
            isMinimized = userData.isMinimized ?? false;
            savedPosBeforeMinimize = {
                x: userData.savedPosX ?? 0,
                y: userData.savedPosY ?? 0
            };

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
                // No position saved - Start at a reasonable default (15, 15)
                xOffset = 15;
                yOffset = 15;
                needsAdjustToRightDefault = true; // Set flag to adjust to right after creation
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
                throw new Error("CRITICAL - No search templates available.");
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
                    const margin = UI_MARGIN;
                    const targetX = winWidth - widgetRect.width - margin;
                    const targetY = margin;

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
