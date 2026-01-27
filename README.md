Email Click Protection

A security-focused Google Chrome extension designed to safeguard users against malicious links and phishing attempts within Email. It intercepts interactions with links and buttons, providing two distinct modes of protection.

Features

    Popup Confirmation: When clicking any link or button, a system dialog appears showing the full destination URL and asking for explicit confirmation.

    Deny Mode: Completely disables all links and buttons. It extracts the destination URL and displays it in a secure, copy-pasteable text box below the element, preventing accidental navigation.

    Email Integration: Custom-built to handle Email's complex dynamic loading and table-based button structures (such as Amazon tracking buttons).

    Persistent Settings: Your preferred protection mode is saved across browser sessions using Chrome's sync storage.

Installation
For Developers (Manual Install)

    Clone this repository or download the source code as a ZIP.

    Open Google Chrome and navigate to chrome://extensions/.

    Enable Developer mode using the toggle in the top-right corner.

    Click Load unpacked and select the folder containing the extension files.

For Users

Note: This extension is currently in development. To use it, follow the developer installation steps above.
How to Use

    Click the extension icon in the Chrome toolbar to open the settings popup.

    Select your preferred mode:

        Popup confirmation: Intercepts clicks and asks "Do you want to navigate to this URL?".

        Deny links: Renders links unclickable and displays the URL as plain text.

    Refresh your Email tab for the settings to take effect immediately.

File Structure

    manifest.json: Extension configuration and permissions.

    content.js: The core logic that scans emails and protects links.

    popup.html/js: The user interface for toggling protection modes.

    icon.png: The extension's visual identifier.

Security & Privacy

This extension runs locally on your browser. It does not track your browsing history or send your email data to any external servers. It requires storage permissions only to save your mode preference.
