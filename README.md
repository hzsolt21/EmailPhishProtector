# Email Phish Protection

A security-focused browser extension designed to safeguard users against malicious links and phishing attempts within Gmail. It intercepts interactions with links and buttons, providing two distinct modes of protection.

[image:23]

## Features

- **Popup Confirmation**: When clicking any link or button, a system dialog appears showing the full destination URL and asking for explicit confirmation.
- **Deny Mode**: Completely disables all links and buttons. It extracts the destination URL and displays it in a secure, copy-pasteable text box below the element, preventing accidental navigation.
- **Gmail Integration**: Custom-built to handle Gmail's complex dynamic loading and table-based button structures (such as Amazon tracking buttons).
- **Persistent Settings**: Your preferred protection mode is saved across browser sessions using Chrome's sync storage.
- **Warning Banners**: Display prominent warning banners on emails from non-trusted senders.
- **Trusted Domains & Emails**: Whitelist trusted senders and domains to bypass protection for legitimate emails.

## Installation

### For Developers (Manual Install)

#### Chrome
1. Clone this repository or download the source code as a ZIP.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Click **Load unpacked** and select the folder containing the extension files.

#### Firefox
1. Clone this repository or download the source code as a ZIP.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click **"Load Temporary Add-on"**.
4. Select the `manifest.json` file from your extension folder.

### For Users
*Note: This extension is currently in development. To use it, follow the developer installation steps above.*

## How to Use
1. Click the extension icon in the browser toolbar to open the settings popup.
2. Select your preferred mode:
   - **Popup confirmation**: Intercepts clicks and asks "Do you want to navigate to this URL?".
   - **Deny links**: Renders links unclickable and displays the URL as plain text.
3. **Optional**: Enable warning banners to display caution messages on non-trusted emails.
4. **Optional**: Add trusted domains (e.g., `amazon.com`) or email addresses (e.g., `user@company.com`) to your whitelist.
5. Refresh your Gmail tab for the settings to take effect immediately.

## File Structure
- `manifest.json`: Extension configuration and permissions.
- `content.js`: The core logic that scans emails and protects links.
- `popup.html/js`: The user interface for toggling protection modes and managing trusted lists.
- `icon.png`: The extension's visual identifier.

## Security & Privacy
This extension runs locally on your browser. It does not track your browsing history or send your email data to any external servers. It requires `storage` permissions only to save your mode preference and trusted list.

## License

This project is licensed under the **MIT License**.

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

## Disclaimer

This tool is an additional layer of security and should not be your only defense against phishing. Always exercise caution when interacting with emails. The developers are not responsible for any security breaches or display issues occurring while using this extension.
