# Bing Search Timer & Helper (Firefox Extension)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Firefox browser extension that adds a configurable, movable timer with dynamic, unique random search suggestions to Bing search result pages.

## Features

*   **Configurable Timer:** Set a time goal (default 15 minutes) directly within the widget.
*   **Visible Countdown:** Clearly displays the remaining time.
*   **Color Indicator:** Timer starts red for the first 10 seconds, then turns green. Turns red again when the goal is reached.
*   **Goal Notification:** Sends a browser notification when the timer reaches zero.
*   **Dynamic Search Suggestions:** Generates random search ideas based on user-configurable templates and data lists (sagas, systems, genres, etc.).
*   **Unique Daily Suggestions:** Remembers suggestions shown today to avoid duplicates until the next day.
*   **Suggestion History:** View a list of searches suggested during the current day.
*   **Clipboard Integration:** Easily copy the suggested search term.
*   **Movable Widget:** Drag and drop the widget anywhere on the screen.
*   **Persistent Settings:** Remembers the timer goal and widget position across sessions.
*   **Configurable Data:** Edit the search templates and data lists via the extension's options page.
*   **Automatic Reset:** The timer automatically resets when a new Bing search is performed.

## Installation

**1. From Firefox Add-ons (AMO) - *Coming Soon!***

**2. Manual Installation / Development:**

*   Download the source code (or clone the repository).
*   Open Firefox and navigate to `about:debugging`.
*   Click on "This Firefox" on the left sidebar.
*   Click the "Load Temporary Add-on..." button.
*   Navigate to the extension's directory and select the `manifest.json` file.
*   The extension will be loaded for the current browser session.

## Usage

Once installed, simply navigate to a Bing search results page (e.g., `https://www.bing.com/search?q=example`). The timer widget should appear automatically.

*   **Timer Display:** Shows the countdown. Click on the time itself to change the goal duration (you'll be prompted for minutes).
*   **Drag Handle:** Click and drag the top bar ("Drag") to move the widget.
*   **Suggested Search:** Displays a randomly generated search suggestion.
*   **Copy Button:** Copies the current suggestion to your clipboard.
*   **New Button:** Generates and displays a new unique search suggestion.
*   **History Button:** Shows an alert listing all search suggestions generated today.

## Configuration

You can customize the data used for generating search suggestions:

1.  Navigate to `about:addons` in Firefox.
2.  Find "Bing Search Timer & Helper" in your list of extensions.
3.  Click the "..." menu or the wrench/gear icon next to the extension and select "Preferences" or "Options".
4.  This will open the Options page where you can edit:
    *   Search Templates (using placeholders like `%SAGA%`, `%SYSTEM%`, etc.)
    *   Lists for Systems, Developers, Sagas, Genres, Parts, Numbers, and Aesthetics.
    *   **Remember:** Use one entry per line in the text areas.
5.  Click "Save Changes" to apply your customizations.
6.  You can also "Restore Values by Default" to revert to the original lists included with the extension.

## Development

To make changes to the extension:

1.  Follow the "Manual Installation" steps above to load the extension temporarily.
2.  Edit the source code (`content.js`, `options.js`, `.json` data files, CSS, etc.).
3.  Go back to `about:debugging` and click the "Reload" button for the extension.
4.  Refresh the Bing search page to see your changes.

## Contributing

Contributions are welcome! If you have ideas for improvements or find bugs, please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.