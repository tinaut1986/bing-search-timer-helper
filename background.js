// background.js

// Escucha mensajes del content script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "showNotification") {
    // Crea la notificación usando la API de WebExtensions
    browser.notifications.create({ // Devuelve una Promise, pero no necesitamos esperar aquí
      "type": "basic",
      "iconUrl": browser.runtime.getURL("icons/icon-48.png"), // Usa un icono de la extensión
      "title": request.title,
      "message": request.message
    }).catch(error => {
        console.error("Error creating notification:", error);
    });
    // No necesitamos devolver nada asíncronamente aquí
    // Si necesitaras devolver algo, retornarías true y llamarías a sendResponse más tarde
    return false;
  }
  else if (request.type === "openOptionsPage") {
    console.log("Background received request to open options page.");
    browser.runtime.openOptionsPage();
    // No necesitamos devolver nada aquí
    return false;
  }
});

console.log("Background script loaded.");