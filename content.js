(async function() {
    'use strict';
    console.log("!!! CONTENT SCRIPT INJECTED !!!");
    // --- Configuration ---
    const DEFAULT_TARGET_MINUTES = 15;
    let TARGET_MINUTES;
    let TARGET_SECONDS;
    const TIMER_INITIAL_RED_DURATION = 10; // Seconds the timer stays red initially
    
    let defaultSearchTemplates;
    let defaultSystems;
    let defaultDevelopers;
    let defaultSagas;
    let defaultGenres;
    let defaultParts;
    let defaultNumbers;
    let defaultAesthetics;

    let searchTemplates, systems, developers, sagas, genres, parts, numbers, aesthetics;

    // --- Timer Variables ---
    let secondsRemaining;
    let timerInterval = null;
    let timerActive = false;

    // --- Drag Variables ---
    let isDragging = false;
    let currentX, currentY, initialX, initialY;
    let xOffset = 0;
    let yOffset = 0;

    // --- Unique Search Variables ---
    let usedSearchesToday = []; // Lista de búsquedas usadas hoy
    let lastUsedDate = '';      // Fecha (YYYY-MM-DD) de la última vez que se usó la lista

    // --- Interface Elements ---
    let container, dragHandle, timerTitle, timerDisplay, searchTitle, searchInput, copyButton, newSearchButton, showUsedButton, optionsButton;

    // --- URL Tracking ---
    let lastHref = document.location.href;

    // --- Funciones Helper (formatTime, getRandomElement - sin cambios desde v2.1) ---
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // --- Dynamic Search Generation ---
    function getRandomElement(arr) {
        if (!arr || arr.length === 0) return "";
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // --- Generate Dynamic Search (Con más logging y retorno claro en error) ---
    function generateDynamicSearch() {
        let template = getRandomElement(searchTemplates);
        const currentYear = new Date().getFullYear();
        console.log('generateDynamicSearch: Initial template:', template);

         if (!template) {
            console.error("generateDynamicSearch: Failed to get a valid template (searchTemplates empty or issue?).");
            return "[Template Error]"; // Mensaje claro
        }

        try {
            // Variable para rastrear si hubo reemplazos (ayuda a depurar)
            let replacementsMade = { year: false, system: false, developer: false, saga: false, genre: false, part: false, number: false, aesthetic: false, comparison: false };

            if (template.includes('%SAGA% %PART% vs %SAGA% %PART%')) {
                replacementsMade.comparison = true;
                const saga = getRandomElement(sagas);
                let part1 = getRandomElement(parts);
                let part2 = getRandomElement(parts);
                if (!saga || part1 === undefined || part2 === undefined)
                    throw new Error("Missing data for comparison template");
                
                let attempts = 0;
                while (part1 === part2 && parts && parts.length > 1 && attempts < 5) {
                    part2 = getRandomElement(parts);
                    attempts++;
                }
                if (part2 === undefined) throw new Error("Failed to get second part for comparison");

                // Replace placeholders carefully
                let replacedSaga1 = false, replacedPart1 = false, replacedSaga2 = false, replacedPart2 = false;
                template = template.replace('%SAGA%', () => { replacedSaga1 = true; return saga; });
                template = template.replace('%PART%', () => { replacedPart1 = true; return part1; });
                template = template.replace('%SAGA%', () => { replacedSaga2 = true; return saga; });
                template = template.replace('%PART%', () => { replacedPart2 = true; return part2; });
                if (!replacedSaga1 || !replacedPart1 || !replacedSaga2 || !replacedPart2) {
                    console.warn("Comparison replacement incomplete:", { replacedSaga1, replacedPart1, replacedSaga2, replacedPart2 });
                }

            } else {
                const replacer = (match, list, key) => {
                    const element = getRandomElement(list);
                    if (element === undefined) {
                        console.warn(`generateDynamicSearch: Could not find random element for ${match} (list: ${key})`);
                        return match; // Keep placeholder if replacement fails
                    }
                    replacementsMade[key] = true; // Mark that this type was replaced
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

            console.log('generateDynamicSearch: Replacements attempted:', replacementsMade);
            console.log('generateDynamicSearch: Final result:', template);

            if (!template || /%[A-Z]+%/.test(template)) {
                console.warn("generateDynamicSearch: Result is empty or still contains placeholders:", template);
                return template || "[Replacement Error]"; // Devolver template (con placeholders) o error
            }
            return template;

        } catch (error) {
            console.error("Error during placeholder replacement:", error);
            return "[Generation Error]"; // Mensaje claro
        }
    }

    // --- Nueva función para obtener búsquedas únicas ---
    async function getUniqueSuggestedSearch(maxAttempts = 30) { // Aumentar intentos por si acaso
        console.log("getUniqueSuggestedSearch called. Used today:", usedSearchesToday.length);
        let attempts = 0;
        while (attempts < maxAttempts) {
            const candidate = generateDynamicSearch(); // Get a raw candidate

            // Validar candidato (no vacío, no error, no usado hoy)
            if (candidate && !candidate.startsWith('[') && !usedSearchesToday.includes(candidate)) {
            console.log(`Unique search found (Attempt ${attempts + 1}): ${candidate}`);
            usedSearchesToday.push(candidate); // Add to list IN MEMORY

            // Guardar la lista actualizada y la fecha actual en storage
             try {
                    const today = new Date().toISOString().split('T')[0];
                    await browser.storage.local.set({
                        lastUsedDate: today, // Guardar fecha actual
                        usedSearchesToday: usedSearchesToday // Guardar lista actualizada
                    });
                    console.log("Saved updated used search list.");
                } catch (err) {
                    console.error("Failed to save updated used search list:", err);
                    // Considerar si revertir el push a usedSearchesToday si el guardado falla? Por ahora no.
                }
                return candidate; // Return the unique search
            } else if (candidate && usedSearchesToday.includes(candidate)) {
                console.log(`Attempt ${attempts + 1}: Candidate "${candidate}" already used today.`);
            } else if (!candidate || candidate.startsWith('[')) {
                console.log(`Attempt ${attempts + 1}: Invalid candidate generated: "${candidate}"`);
                // Si la generación base falla consistentemente, no seguir intentando indefinidamente
                if (candidate && candidate.startsWith('[')) break; // Salir si es un error de generación explícito
            }

            attempts++;
        }
        console.warn(`Could not find a unique search after ${maxAttempts} attempts.`);
        return "[No unique searches left?]"; // Fallback
    }

    // --- Funciones Principales (Modificadas/Nuevas) ---

    async function updateSearchDisplay() { // Hacerla async por getUniqueSuggestedSearch
        console.log("updateSearchDisplay called");
        if (searchInput) {
            const suggested = await getUniqueSuggestedSearch(); // Usar la nueva función async
            console.log("Setting search input to:", suggested);
            searchInput.value = suggested ?? "[Search Gen Failed]";
        } else {
             console.warn("updateSearchDisplay: searchInput element not found");
        }
    }

    async function copyToClipboard() {
        console.log("copyToClipboard called"); // Log
        if (searchInput && searchInput.value) {
            try {
                await navigator.clipboard.writeText(searchInput.value);
                if (copyButton) copyButton.textContent = 'Copied!'; // Check exists
                setTimeout(() => {
                    if (copyButton) copyButton.textContent = 'Copy'; // Check exists
                }, 1500);
            } catch (err) {
                console.error('Failed to copy text: ', err);
                if (copyButton) copyButton.textContent = 'Error'; // Check exists
                setTimeout(() => {
                    if (copyButton) copyButton.textContent = 'Copy'; // Check exists
                }, 1500);
            }
        } else {
            console.warn("copyToClipboard: No search input or value found");
        }
    }

    function sendNotification() {
        console.log("sendNotification called"); // Log
        browser.runtime.sendMessage({ /* ... (igual) ... */ }).catch(/* ... (igual) ... */);
    }

    // --- Timer Update con Colores ---
    function updateTimer() {
        if (typeof secondsRemaining !== 'number' || isNaN(secondsRemaining)) {
            console.error("updateTimer: secondsRemaining is invalid:", secondsRemaining);
            stopTimer(); return;
        }

        secondsRemaining--;

        if (timerDisplay) {
            timerDisplay.textContent = formatTime(secondsRemaining);

            // Lógica de color: Rojo los primeros 10s, Verde después, Rojo en Meta
            if (secondsRemaining <= 0) {
                // La meta la maneja stopTimer, pero por si acaso
                timerDisplay.style.color = 'red';
            } else if (secondsRemaining >= TARGET_SECONDS - TIMER_INITIAL_RED_DURATION) {
                timerDisplay.style.color = 'red'; // Primeros segundos
            } else {
                timerDisplay.style.color = '#28a745'; // Verde (Bootstrap success green)
            }

        } else {
             console.warn("updateTimer: timerDisplay element not found, stopping timer.");
             stopTimer(); return;
        }

        if (secondsRemaining <= 0) {
            console.log("Timer reached zero.");
            stopTimer(true); // goalReached = true
            sendNotification();
        }
    }

        // --- Configura la Duración del Temporizador (Llamada al hacer click en el display) ---
     async function configureTimerDuration() {
        console.log("configureTimerDuration called");

        // --- Opcional pero recomendado: Pausar el timer mientras el prompt está abierto ---
        const wasTimerActive = timerActive; // Recordar si estaba activo
        if (wasTimerActive) {
            stopTimer(); // Pausarlo
            console.log("configureTimerDuration: Timer paused for configuration.");
        }
        // --- Fin pausa opcional ---

        const currentMinutes = TARGET_MINUTES; // Obtener el objetivo actual
        const newMinutesStr = prompt(`Enter new timer duration in minutes (current: ${currentMinutes}):`, currentMinutes);

        if (newMinutesStr !== null) { // Comprobar si el usuario canceló (prompt devuelve null)
            const newMinutes = parseInt(newMinutesStr, 10); // Convertir a número entero (base 10)

            // Validar la entrada: ¿Es un número válido y es mayor que 0?
            if (!isNaN(newMinutes) && newMinutes > 0) {
                console.log(`New timer duration input validated: ${newMinutes} minutes.`);
                TARGET_MINUTES = newMinutes;        // Actualizar variable global
                TARGET_SECONDS = newMinutes * 60;   // Actualizar variable global derivada

                try {
                    // Guardar el nuevo valor en el almacenamiento local (asíncrono)
                    await browser.storage.local.set({ timerTargetMinutes: TARGET_MINUTES });
                    console.log(`Timer duration saved successfully to storage: ${TARGET_MINUTES} minutes.`);

                    // Aplicar el nuevo valor reiniciando el temporizador
                    // resetTimer() usará el nuevo TARGET_SECONDS automáticamente
                    resetTimer();

                    // Nota: Si el timer estaba pausado, resetTimer lo reiniciará si TARGET_SECONDS > 0

                } catch (err) {
                    // Error al guardar en storage
                    console.error("Failed to save timer duration to storage:", err);
                    alert("Error: Could not save the new timer duration. Please try again.");
                    // Si falló el guardado, y el timer estaba activo, reiniciarlo con el valor *anterior*
                    if (wasTimerActive) {
                         console.log("configureTimerDuration: Restarting timer with previous value after failed save.");
                         // Podríamos revertir TARGET_MINUTES/SECONDS aquí, pero startTimer usa secondsRemaining que no ha cambiado
                         startTimer();
                    }
                }

            } else {
                // Entrada inválida (no es un número positivo)
                console.warn(`Invalid timer duration input: "${newMinutesStr}"`);
                alert("Invalid input. Please enter a positive whole number for the minutes.");
                // Si el timer estaba activo y la entrada fue inválida, reanudarlo
                if (wasTimerActive) {
                     console.log("configureTimerDuration: Restarting timer after invalid input.");
                    startTimer();
                }
            }
        } else {
             // El usuario hizo clic en "Cancelar" en el prompt
             console.log("Timer duration configuration cancelled by user.");
             // Si el timer estaba activo y el usuario canceló, reanudarlo
            if (wasTimerActive) {
                 console.log("configureTimerDuration: Restarting timer after cancellation.");
                startTimer();
            }
        }
    }

    // --- startTimer con color inicial ---
    function startTimer() {
         console.log(`startTimer called. Active: ${timerActive}, Remaining: ${secondsRemaining}`);
         if (typeof secondsRemaining === 'undefined' || isNaN(secondsRemaining)) {
             console.warn("startTimer: Cannot start, secondsRemaining invalid:", secondsRemaining);
             return;
         }

        if (timerInterval !== null) {
            console.log("startTimer: Clearing existing interval first.");
            clearInterval(timerInterval);
            timerInterval = null;
        }

        if (!timerActive && secondsRemaining > 0) {
            timerActive = true;
            if (timerDisplay) {
                timerDisplay.textContent = formatTime(secondsRemaining);
                timerDisplay.title = `Click to change duration (${TARGET_MINUTES} min)`;

                 // Establecer color inicial
                 if (secondsRemaining >= TARGET_SECONDS - TIMER_INITIAL_RED_DURATION) {
                    timerDisplay.style.color = 'red';
                 } else {
                    timerDisplay.style.color = '#28a745'; // Verde
                 }
                 console.log(`startTimer: Initial color set to ${timerDisplay.style.color}`);

                console.log("startTimer: Setting timer interval...");
                timerInterval = setInterval(updateTimer, 1000);
                 console.log("startTimer: Interval ID:", timerInterval);
            } else {
                console.warn("startTimer: timerDisplay not found, cannot start.");
                timerActive = false;
            }
        } else if (secondsRemaining <= 0) {
             console.log("startTimer: Timer already at or below zero.");
             if (timerDisplay) { // Asegurar estado de meta
                 timerDisplay.textContent = "Goal!";
                 timerDisplay.style.color = 'red';
                 timerDisplay.title = `Goal reached! (${TARGET_MINUTES} min). Click to change duration.`;
             }
             timerActive = false;
        } else {
             console.log("startTimer: Timer is already active or conditions not met.");
              if (timerDisplay) {
                 timerDisplay.title = `Click to change duration (${TARGET_MINUTES} min)`;
             }
        }
    }

    // --- stopTimer con color de meta ---
    function stopTimer(goalReached = false) {
        console.log(`stopTimer called. Goal reached: ${goalReached}, Interval ID: ${timerInterval}`);
        if (timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        timerActive = false;
        if (goalReached && timerDisplay) {
            timerDisplay.textContent = "Goal!";
            timerDisplay.style.color = 'red'; // Asegurar rojo en meta
            timerDisplay.title = `Goal reached! (${TARGET_MINUTES} min). Click to change duration.`;
        }
        // Si no es goalReached, el color se queda como estaba en el último tick de updateTimer
    }

    // resetTimer ahora solo reinicia los segundos y llama a startTimer
    function resetTimer(applyNewDuration = false) {
        console.log("resetTimer called.");
        // No llamar a stopTimer aquí, startTimer limpiará el intervalo viejo
        secondsRemaining = TARGET_SECONDS; // Usar el valor actual (puede haber cambiado)
        console.log("resetTimer: secondsRemaining reset to", secondsRemaining);
        if (container && timerDisplay) {
             startTimer(); // startTimer se encargará de limpiar el viejo y empezar el nuevo
        } else {
            console.warn("Attempted to reset timer before interface was created.");
        }
    }

    // --- Drag Functions (Con Logging Inicial) ---
    async function dragStart(e) {
        console.log("dragStart triggered by:", e.type, "Target:", e.target); // Log
        if (e.target !== dragHandle) {
             console.log("dragStart: Event target is not the drag handle.");
             return; // Salir si no es el handle
        }
        // xOffset y yOffset deberían estar cargados por initialize

        if (e.type === "touchstart") {
            e.preventDefault(); // Importante para táctil
            initialX = e.touches[0].clientX - xOffset;
            initialY = e.touches[0].clientY - yOffset;
        } else { // mousedown
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            document.addEventListener('mousemove', drag, false);
            document.addEventListener('mouseup', dragEnd, false);
        }
        isDragging = true;
        if (container) container.style.cursor = 'grabbing';
        console.log("dragStart: Dragging initiated. Initial coords:", {initialX, initialY}, "Current Offset:", {xOffset, yOffset});
    }

    function drag(e) {
        if (!isDragging) return;
        // console.log("drag move event:", e.type); // Log (muy ruidoso)

        if (e.type === "touchmove") {
            e.preventDefault(); // Importante para táctil
            currentX = e.touches[0].clientX - initialX;
            currentY = e.touches[0].clientY - initialY;
        } else { // mousemove
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
        }
        xOffset = currentX; // Actualizar el offset mientras se arrastra
        yOffset = currentY;
        setTranslate(xOffset, yOffset, container);
    }

    async function dragEnd(e) {
        console.log("dragEnd triggered by:", e.type); // Log
        if (!isDragging) return; // Evitar doble ejecución
        isDragging = false;

        try {
            await browser.storage.local.set({ widgetPosX: xOffset, widgetPosY: yOffset });
            console.log(`dragEnd: Position saved: X=${xOffset}, Y=${yOffset}`);
        } catch (err) {
            console.error("dragEnd: Failed to save widget position:", err);
        }

        if (container) container.style.cursor = 'default';
        if (dragHandle) dragHandle.style.cursor = 'move'; // Restaurar cursor del handle
        if (e.type === "mouseup") {
            document.removeEventListener('mousemove', drag, false);
            document.removeEventListener('mouseup', dragEnd, false);
        }
    }

    function setTranslate(xPos, yPos, el) {
        if (el) {
            // console.log(`setTranslate: Applying transform: translate3d(${xPos}px, ${yPos}px, 0)`); // Log (ruidoso)
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        } else {
            console.warn("setTranslate: Element not found.");
        }
    }

    // --- Nueva función para mostrar el Historial en un Modal ---
    function showHistoryModal() {
        console.log("showHistoryModal called");

        // Eliminar modal anterior si existe
        const existingOverlay = document.getElementById('bing-history-modal-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Crear el overlay (fondo oscuro)
        const overlay = document.createElement('div');
        overlay.id = 'bing-history-modal-overlay';

        // Crear el contenido del modal
        const modalContent = document.createElement('div');
        modalContent.id = 'bing-history-modal-content';

        // Título
        const title = document.createElement('h2');
        title.textContent = 'Searches Suggested Today';

        // Lista
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

        // Botón de cerrar
        const closeButton = document.createElement('button');
        closeButton.id = 'bing-history-modal-close';
        closeButton.textContent = 'Close';
        closeButton.onclick = () => { // O addEventListener
            overlay.style.display = 'none';
            overlay.remove(); // Limpiar del DOM al cerrar
        };

        // Construir el modal
        modalContent.appendChild(title);
        modalContent.appendChild(list);
        modalContent.appendChild(closeButton);
        overlay.appendChild(modalContent);

        // Añadir overlay al body y mostrarlo
        document.body.appendChild(overlay);
        overlay.style.display = 'flex'; // Mostrar usando flex para centrar

        // Cerrar el modal si se hace clic en el fondo oscuro (overlay)
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) { // Solo si se hace clic directamente en el overlay
                closeButton.click(); // Simular clic en el botón de cerrar
            }
        });
    }

    // --- Interface Creation (Añadir botón para mostrar usadas) ---
    function createInterface() {
        if (document.getElementById('bing-timer-helper')) {
             console.log("Widget already exists."); return;
        }
        console.log("Creating interface...");

        container = document.createElement('div');
        container.id = 'bing-timer-helper';
        setTranslate(xOffset, yOffset, container);        

        // Creación de dragHandle, timerTitle, timerDisplay, searchTitle, searchInput, copyButton, newSearchButton
        // Estilos básicos (los detalles están en style.css)
        dragHandle = document.createElement('div');
        dragHandle.id = 'bing-timer-drag-handle';
        dragHandle.textContent = 'Drag';
        dragHandle.style.cursor = 'move';

        timerTitle = document.createElement('div');
        timerTitle.textContent = 'Timer:';
        timerTitle.style.fontWeight = 'bold';
        timerTitle.style.marginBottom = '5px';
        timerTitle.style.marginTop = '5px';

        timerDisplay = document.createElement('div');
        timerDisplay.id = 'bing-timer-display';
        timerDisplay.textContent = formatTime(secondsRemaining);
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
        searchInput.style.width = 'calc(100% - 12px)';
        searchInput.style.marginBottom = '5px';
        searchInput.title = 'Randomly suggested search';

        copyButton = document.createElement('button');
        copyButton.innerHTML = '📋'; // O usa un SVG: <svg>...</svg> Clipboard icon
        copyButton.id = 'bing-copy-button';
        copyButton.title = 'Copy the suggested search to the clipboard';
        copyButton.style.backgroundColor = '#007bff'; // Azul primario
        copyButton.style.color = 'white';
        copyButton.style.borderColor = '#0056b3';
        copyButton.style.padding = '6px 10px'; // Ajustar padding si usas icono
        copyButton.style.lineHeight = '1'; // Para alinear mejor iconos simples

        newSearchButton = document.createElement('button');
        newSearchButton.innerHTML = '🔄'; // O usa un SVG: Refresh/Repeat icon
        newSearchButton.id = 'bing-new-search-button';
        newSearchButton.title = 'Generate a new random search';
        newSearchButton.style.marginLeft = '5px';
        newSearchButton.style.backgroundColor = '#ffc107'; // Amarillo advertencia
        newSearchButton.style.color = '#333'; // Texto oscuro para contraste
        newSearchButton.style.borderColor = '#d39e00';
        newSearchButton.style.padding = '6px 10px';
        newSearchButton.style.lineHeight = '1';

        // Crear botón para mostrar búsquedas usadas
        showUsedButton = document.createElement('button');
        showUsedButton.innerHTML = '📜'; // O usa un SVG: Scroll/List icon
        showUsedButton.id = 'bing-show-used-button';
        showUsedButton.title = 'Show searches suggested today';
        showUsedButton.style.marginLeft = '5px';
        showUsedButton.style.backgroundColor = '#6c757d'; // Gris secundario
        showUsedButton.style.color = 'white';
        showUsedButton.style.borderColor = '#5a6268';
        showUsedButton.style.padding = '6px 10px';
        showUsedButton.style.lineHeight = '1';

        optionsButton = document.createElement('button');
        optionsButton.innerHTML = '⚙️'; // O usa un SVG: Gear icon
        optionsButton.id = 'bing-options-button';
        optionsButton.title = 'Open Extension Options';
        optionsButton.style.marginLeft = '5px';
        optionsButton.style.backgroundColor = '#17a2b8'; // Azul info
        optionsButton.style.color = 'white';
        optionsButton.style.borderColor = '#138496';
        optionsButton.style.padding = '6px 10px'; // Ajustar padding
        optionsButton.style.lineHeight = '1';


        // --- Append elements ---
        container.appendChild(dragHandle);
        container.appendChild(timerTitle);
        container.appendChild(timerDisplay);
        container.appendChild(searchTitle);
        container.appendChild(searchInput);
        // Agrupar botones en una línea si se quiere

        const buttonGroup = document.createElement('div');
        buttonGroup.style.marginTop = '5px'; // Espacio sobre los botones
        buttonGroup.appendChild(copyButton);
        buttonGroup.appendChild(newSearchButton);
        buttonGroup.appendChild(showUsedButton);
        buttonGroup.appendChild(optionsButton);
        container.appendChild(buttonGroup);

        // --- Add Listeners ---
        console.log("Adding event listeners...");
        // ... (listeners para timerDisplay, copyButton, newSearchButton igual que antes) ...
        timerDisplay.addEventListener('click', configureTimerDuration);
        copyButton.addEventListener('click', copyToClipboard);
        newSearchButton.addEventListener('click', updateSearchDisplay); // Llama a la versión async ahora

        // Listener para el nuevo botón
        if (showUsedButton) {
            showUsedButton.addEventListener('click', showHistoryModal);
            console.log("Added click listener to showUsedButton.");
        } else console.error("Failed to add click listener: showUsedButton is null");

        if (optionsButton) {
            optionsButton.addEventListener('click', () => {
                console.log("Options button clicked");
                browser.runtime.sendMessage({ type: "openOptionsPage" })
                    .catch(err => console.error("Error sending openOptionsPage message:", err));
            });
            console.log("Added click listener to optionsButton.");
        } else console.error("Failed to add click listener: optionsButton is null");

        // ... (listeners de drag para dragHandle y container igual que antes) ...
        dragHandle.addEventListener('mousedown', dragStart, false);
        dragHandle.addEventListener('touchstart', dragStart, { passive: false });
        container.addEventListener('touchmove', drag, { passive: false });
        container.addEventListener('touchend', dragEnd, false);
        container.addEventListener('touchcancel', dragEnd, false);

        // --- Append container to body ---
        document.body.appendChild(container);
        console.log("Appended container to body.");

        // --- Initial search display ---
        updateSearchDisplay(); // Cargar la primera búsqueda única

        console.log("Interface created successfully.");
    }

    async function loadDataFromFiles() {
        console.log(">>> loadDataFromFiles: Function CALLED <<<"); // Log A
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

            console.log(">>> loadDataFromFiles: Fetching URLs:", urls); // Log B

            // Parsear cada respuesta como JSON
            const responses = await Promise.all([
                fetch(urls.templates), fetch(urls.systems), fetch(urls.developers),
                fetch(urls.parts), fetch(urls.aesthetics), fetch(urls.genres),
                fetch(urls.sagas), fetch(urls.numbers)
            ]);

            console.log(">>> loadDataFromFiles: All fetch responses received."); // Log C

            // Verificar respuestas antes de parsear
            for(const res of responses) {
                if (!res.ok) {
                    console.error(`>>> loadDataFromFiles: HTTP error! Status: ${res.status} for URL: ${res.url}`);
                    throw new Error(`Failed to fetch ${res.url} (Status: ${res.status})`);
                }
            }

            const jsonData = await Promise.all(responses.map(res => res.json()));

            console.log(">>> loadDataFromFiles: All JSON parsed."); // Log D

            // Asignar a variables globales (o variables locales si prefieres)
            // ¡Asegúrate de que los nombres coinciden con los usados en el resto del script!
            [
                defaultSearchTemplates, defaultSystems, defaultDevelopers,
                defaultParts, defaultAesthetics, defaultGenres,
                defaultSagas, defaultNumbers
            ] = jsonData;


            // Validación básica de los datos cargados (opcional pero útil)
            if (!Array.isArray(defaultSearchTemplates) || defaultSearchTemplates.length === 0) {
                 console.warn(">>> loadDataFromFiles: Loaded defaultSearchTemplates is not a valid/non-empty array.");
                 // Podrías lanzar un error aquí si es crítico
            }

            // ... (validaciones similares para otras listas si lo deseas) ...

            console.log(">>> loadDataFromFiles: Data assigned successfully."); // Log E
            return true; // Indicar éxito

        } catch (error) {
            // Mostrar el error específico que ocurrió
            console.error(">>> loadDataFromFiles: ERROR caught <<<", error); // Log F
            return false; // Indicar fallo
        }
    }

        // --- Initialization Function (Estrategia de Carga Revisada) ---
    async function initialize() {
        console.log(">>> initialize: Function CALLED <<<");

        // 1. Cargar los datos por defecto desde los archivos JSON ---
        console.log(">>> initialize: Calling loadDataFromFiles...");
        const dataLoaded = await loadDataFromFiles();
        console.log(`>>> initialize: loadDataFromFiles returned: ${dataLoaded}`);
        if (!dataLoaded) {
            console.error(">>> initialize: Failed to load default data from files. Aborting.");
            // Podrías intentar mostrar un error en la interfaz si ya estuviera creada
            return;
        }
        console.log(">>> initialize: Default data loaded successfully.");

        // --- Bloque Try/Catch Principal ---
        try {
            console.log(">>> initialize: Entering main try block.");

            // 2. Cargar SOLO los datos guardados por el usuario desde storage ---
            //    Pedimos las claves sin pasar defaults para las listas grandes.
            //    Para las otras, sí podemos pasar defaults simples.
            console.log(">>> initialize: Attempting storage.get for user settings...");
            const userData = await browser.storage.local.get({
                timerTargetMinutes: DEFAULT_TARGET_MINUTES, // Default simple
                widgetPosX: 0,                        // Default simple
                widgetPosY: 0,                        // Default simple
                lastUsedDate: '',                     // Default simple
                usedSearchesToday: [],                 // Default simple
                // NO pedimos defaults para las listas aquí, solo las claves
                userSearchTemplates: null, // Pedir la clave, default a null si no existe
                userSystems: null,
                userDevelopers: null,
                userSagas: null,
                userGenres: null,
                userParts: null,
                userNumbers: null,
                userAesthetics: null
            });

            console.log(">>> initialize: storage.get successful. User data:", userData);

            // 3. Asignar valores a variables globales, usando defaults si userData es null ---
            console.log(">>> initialize: Assigning final values to global variables...");

            TARGET_MINUTES = userData.timerTargetMinutes ?? DEFAULT_TARGET_MINUTES; // Usar nullish coalescing
            TARGET_SECONDS = TARGET_MINUTES * 60;
            secondsRemaining = TARGET_SECONDS;
            xOffset = userData.widgetPosX ?? 0;
            yOffset = userData.widgetPosY ?? 0;
            lastUsedDate = userData.lastUsedDate ?? '';
            const loadedUsedSearches = userData.usedSearchesToday ?? [];

            // Para las listas, si userData.user... es null (o no es un array), usa el default cargado del archivo
            searchTemplates = Array.isArray(userData.userSearchTemplates) ? userData.userSearchTemplates : defaultSearchTemplates;
            systems         = Array.isArray(userData.userSystems)        ? userData.userSystems        : defaultSystems;
            developers      = Array.isArray(userData.userDevelopers)     ? userData.userDevelopers     : defaultDevelopers;
            sagas           = Array.isArray(userData.userSagas)          ? userData.userSagas          : defaultSagas;
            genres          = Array.isArray(userData.userGenres)         ? userData.userGenres         : defaultGenres;
            parts           = Array.isArray(userData.userParts)          ? userData.userParts          : defaultParts;
            numbers         = Array.isArray(userData.userNumbers)        ? userData.userNumbers        : defaultNumbers;
            aesthetics      = Array.isArray(userData.userAesthetics)     ? userData.userAesthetics     : defaultAesthetics;

            console.log(`Assigned settings: Duration=${TARGET_MINUTES}m, PosX=${xOffset}, PosY=${yOffset}. Initial seconds: ${secondsRemaining}`);
            console.log(`Assigned search data: Last Used Date='${lastUsedDate}', Used Today Count=${loadedUsedSearches?.length}`); // Optional chaining
            console.log(`Using ${searchTemplates?.length ?? 0} search templates, ${systems?.length ?? 0} systems, etc.`);

            // 4. Comprobar si la fecha ha cambiado (misma lógica) ---
            const today = new Date().toISOString().split('T')[0];
            if (lastUsedDate !== today) {
                console.log(`Date changed (${lastUsedDate} -> ${today}). Resetting used searches list.`);
                usedSearchesToday = [];
                lastUsedDate = today;
                try {
                    await browser.storage.local.set({ lastUsedDate: today, usedSearchesToday: [] });
                } catch (saveErr) {
                     console.error("Error saving reset search data:", saveErr);
                }
            } else {
                usedSearchesToday = Array.isArray(loadedUsedSearches) ? loadedUsedSearches : [];
                console.log("Date is the same. Using loaded used searches list.");
            }

            // 5. Validar listas finales (opcional pero bueno) ---
             if (!Array.isArray(searchTemplates) || searchTemplates.length === 0) {
                 console.error("CRITICAL: No search templates available after loading/defaults. Search generation WILL FAIL.");
                 // Considera detener o mostrar error
             }

            // 6. Crear interfaz ---
            console.log(">>> initialize: Proceeding to create interface...");
            createInterface();

            // 7. Iniciar temporizador y observador ---
            console.log(">>> initialize: Proceeding to start timer and observer...");
            startTimer();
            observeChanges();

            console.log("Bing Timer Helper Extension Loaded Successfully.");

        } catch (err) {
            // Este catch ahora captura errores de storage.get o de la lógica posterior
            console.error("Error during main initialization block:", err);
            console.warn("Extension failed to initialize properly.");
        }
    }

    // --- Ejecutar Inicialización (Añadir logs) ---
    console.log(">>> Script End: Checking document.readyState:", document.readyState); // Log X
     if (document.readyState === 'loading') {
        console.log(">>> Script End: Adding DOMContentLoaded listener."); // Log Y
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        console.log(">>> Script End: Document already loaded. Calling initialize directly."); // Log Z
        initialize();
    }

})(); // Fin IIFE

// --- Helper Functions (Copiar/Pegar de nuevo o asegurar que existen fuera del IIFE si se necesitan globalmente, aunque aquí no parece necesario) ---
function formatTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) { return "--:--"; }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
function getRandomElement(arr) {
    // Devolver undefined si el array es inválido para que la lógica de generación pueda manejarlo
    if (!arr || arr.length === 0) { console.warn("getRandomElement: Received empty array."); return undefined;}
    return arr[Math.floor(Math.random() * arr.length)];
}
// Las otras funciones como generateDynamicSearch, resetTimer, etc., ya están dentro del IIFE y no necesitan estar fuera.
function observeChanges() {
    if (window.bingTimerObserver) { return; }
    const observer = new MutationObserver(mutations => {
        requestAnimationFrame(() => {
             if (document.location.href !== lastHref) {
                console.log(`Navigation detected: ${lastHref} -> ${document.location.href}`);
                lastHref = document.location.href;
                if (location.hostname.includes('bing.com') && location.pathname.startsWith('/search') && document.getElementById('bing-timer-helper')) {
                    resetTimer(); // Resetear timer en navegación interna
                } else if (!location.hostname.includes('bing.com')) {
                    stopTimer(); // Detener si salimos de Bing
                } else if (!document.getElementById('bing-timer-helper') && location.hostname.includes('bing.com') && location.pathname.startsWith('/search')) {
                     console.warn("Navigation detected, but widget not found.");
                     // Podríamos intentar re-inicializar aquí si fuera necesario, pero es complejo
                }
             }
         });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.bingTimerObserver = observer;
    console.log("Mutation observer started.");
}
function resetTimer(applyNewDuration = false) {
    console.log("resetTimer called.");
    secondsRemaining = TARGET_SECONDS;
    console.log("resetTimer: secondsRemaining reset to", secondsRemaining);
    if (container && timerDisplay) {
         startTimer(); // Llama a startTimer que limpia el intervalo viejo
    } else {
        console.warn("Attempted to reset timer before interface was created.");
    }
}