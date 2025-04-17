// options.js

// Define las claves de almacenamiento y los archivos JSON correspondientes
const configKeys = {
    userSearchTemplates: 'data/searchTemplates.json',
    userSystems:         'data/systems.json',
    userDevelopers:      'data/developers.json',
    userSagas:           'data/sagas.json',
    userGenres:          'data/genres.json',
    userParts:           'data/parts.json',
    userNumbers:         'data/numbers.json',
    userAesthetics:      'data/aesthetics.json'
};

const statusDiv = document.getElementById('status');

// Muestra mensajes de estado
function showStatus(message, type = 'info', duration = 3000) {
    statusDiv.textContent = message;
    statusDiv.className = type; // Aplica clase CSS (success, error, info)
    if (duration > 0) {
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, duration);
    }
}

// Carga los datos por defecto desde un archivo JSON
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
        showStatus(`Error loading default data: ${error.message}`, 'error', 0);
        return null; // Indica fallo
    }
}

// Guarda las opciones desde los textareas al almacenamiento
async function saveOptions(e) {
    e.preventDefault(); // Prevenir envío de formulario por defecto
    console.log("Attempting to save options...");

    const settingsToSave = {};
    let hasError = false;

    for (const key in configKeys) {
        const textarea = document.getElementById(key);
        if (textarea) {
            const textValue = textarea.value;
            // Convertir texto (una línea por elemento) a array, limpiando
            const arrayValue = textValue
                .split('\n')
                .map(line => line.trim())
                .filter(line => line); // Filtrar líneas vacías

             // Validar si el array resultante es vacío (podría ser intencional)
             // if (arrayValue.length === 0) {
             //    console.warn(`Saving empty list for ${key}`);
                 // Podrías añadir una advertencia al usuario aquí si quisieras
             //}

            settingsToSave[key] = arrayValue;
        } else {
            console.error(`Textarea with id "${key}" not found!`);
            hasError = true;
        }
    }

    if (hasError) {
         showStatus('Internal error: Could not find all textareas.', 'error', 0);
         return;
    }


    try {
        await browser.storage.local.set(settingsToSave);
        console.log("Options saved successfully:", settingsToSave);
        showStatus('Opciones guardadas correctamente.', 'success');
    } catch (error) {
        console.error("Error saving options:", error);
        showStatus(`Error al guardar: ${error.message}`, 'error', 0);
    }
}

// Restaura las opciones en los textareas desde el almacenamiento o los defaults
async function restoreOptions() {
    console.log("Restoring options...");
    const keysToLoad = Object.keys(configKeys);
    const defaultValues = {};
    // Preparar objeto para storage.get, usando null como default inicial
    keysToLoad.forEach(key => defaultValues[key] = null);

    try {
        const result = await browser.storage.local.get(defaultValues);
        console.log("Data loaded from storage:", result);

        // Usar Promise.all para cargar defaults necesarios en paralelo
        const defaultsPromises = [];
        const defaultsToLoad = {}; // Guardar defaults cargados para no recargar

        for (const key in result) {
            if (result[key] === null) { // Si es null, necesitamos cargar el default
                 if (!defaultsToLoad[key]) { // Evitar cargar el mismo default múltiples veces si hay error
                     const filePath = configKeys[key];
                     console.log(`No user setting for ${key}, queueing default load from ${filePath}`);
                     defaultsPromises.push(
                         loadDefaultFromFile(filePath).then(defaultData => {
                             if (defaultData !== null) {
                                 defaultsToLoad[key] = defaultData; // Guardar default cargado
                             }
                             // Si defaultData es null, el error ya se mostró en loadDefaultFromFile
                         })
                     );
                 }
            }
        }

        // Esperar a que todos los defaults necesarios se carguen
        await Promise.all(defaultsPromises);
        console.log("Defaults loaded:", defaultsToLoad);


        // Poblar los textareas
        for (const key in configKeys) {
            const textarea = document.getElementById(key);
            if (textarea) {
                let dataToShow = result[key]; // Usar dato del storage si existe
                if (dataToShow === null) { // Si no existe en storage, usar el default cargado
                    dataToShow = defaultsToLoad[key] || []; // Usar default o array vacío si la carga falló
                    console.log(`Using default data for ${key}`);
                } else {
                     console.log(`Using user saved data for ${key}`);
                }
                textarea.value = Array.isArray(dataToShow) ? dataToShow.join('\n') : ''; // Unir con saltos de línea
            } else {
                 console.error(`RestoreOptions: Textarea with id "${key}" not found!`);
            }
        }
        console.log("Options restored to view.");

    } catch (error) {
        console.error("Error restoring options:", error);
        showStatus(`Error al cargar la configuración: ${error.message}`, 'error', 0);
    }
}

// Restaura los valores por defecto eliminando los guardados y recargando
async function resetOptions() {
    if (!confirm("¿Estás seguro de que quieres restaurar todos los valores por defecto? Se perderán tus cambios guardados.")) {
        return;
    }
    console.log("Resetting options to defaults...");
    const keysToRemove = Object.keys(configKeys);

    try {
        await browser.storage.local.remove(keysToRemove);
        console.log("User settings removed from storage.");
        // Ahora, vuelve a cargar y mostrar los defaults en los textareas
        await restoreOptions(); // restoreOptions cargará los defaults porque storage estará vacío
        showStatus('Valores por defecto restaurados.', 'success');
    } catch (error) {
        console.error("Error resetting options:", error);
        showStatus(`Error al restaurar los valores por defecto: ${error.message}`, 'error', 0);
    }
}


// --- Añadir Event Listeners ---
document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('options-form').addEventListener('submit', saveOptions);
document.getElementById('reset').addEventListener('click', resetOptions);