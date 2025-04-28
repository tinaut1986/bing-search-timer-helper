/**
 * Listens for messages from content scripts or other parts of the extension.
 */
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle request to show a desktop notification
  if (request.type === "showNotification") {
    browser.notifications.create({ // Use browser.notifications API
      "type": "basic",
      "iconUrl": browser.runtime.getURL("icons/icon-48.png"), // Path to icon within extension
      "title": request.title || "Notification", // Use provided title or default
      "message": request.message || ""          // Use provided message
    }).catch(error => {
      console.error("Background: Error creating notification:", error);
    });
    // Indicate that we won't be sending an asynchronous response
    return false;
  }
  // Handle request to open the extension's options page
  else if (request.type === "openOptionsPage") {
    // console.log("Background: Received request to open options page.");
    const url = request.locale
      ? browser.runtime.getURL(`options.html?lang=${request.locale}`)
      : browser.runtime.getURL("options.html");

    browser.tabs.create({ url })
      .catch(err => console.error("BG: cannot open options tab", err));
    // Indicate that we won't be sending an asynchronous response
    return false;
  }

  // Optional: handle other message types here if needed in the future
  // else {
  //     console.log("Background: Received unknown message type:", request.type);
  // }

  // Return true if you intend to send a response asynchronously using sendResponse
  // return true;
});

console.log("Bing Search Timer: Background script loaded.");

// Optional: Add listeners for other browser events if needed (e.g., onInstalled)
// browser.runtime.onInstalled.addListener(details => {
//     console.log('Extension installed or updated:', details);
// });