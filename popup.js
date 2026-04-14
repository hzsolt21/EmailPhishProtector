// Cross-browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Unified storage helpers — normalise Promise vs callback API across browsers
function storageGet(keys) {
  return new Promise(resolve => {
    if (browserAPI.storage.sync.get.length === 1) {
      browserAPI.storage.sync.get(keys).then(resolve);
    } else {
      browserAPI.storage.sync.get(keys, resolve);
    }
  });
}

function storageSet(data) {
  return new Promise(resolve => {
    if (browserAPI.storage.sync.set.length === 1) {
      browserAPI.storage.sync.set(data).then(resolve);
    } else {
      browserAPI.storage.sync.set(data, resolve);
    }
  });
}

// Load saved settings
storageGet(['protectionMode', 'trustedList', 'showWarnings']).then(result => {
  const mode = result.protectionMode || 'popup';
  document.getElementById(mode + '-mode').checked = true;

  const showWarnings = result.showWarnings !== undefined ? result.showWarnings : false;
  document.getElementById('showWarnings').checked = showWarnings;

  const trustedList = result.trustedList || [];
  displayTrustedList(trustedList);
});

// Save protection mode when changed
document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', function() {
    storageSet({protectionMode: this.value}).then(reloadEmailTabs);
  });
});

// Save warning banner setting
document.getElementById('showWarnings').addEventListener('change', function() {
  storageSet({showWarnings: this.checked}).then(reloadEmailTabs);
});

// Add trusted domain/email
document.getElementById('addTrustedBtn').addEventListener('click', function() {
  const input = document.getElementById('trustedInput');
  const value = input.value.trim().toLowerCase();

  if (!value) {
    alert('Please enter a domain or email address');
    return;
  }

  if (!isValidDomainOrEmail(value)) {
    alert('Please enter a valid domain (e.g., example.com) or email address (e.g., user@domain.com)');
    return;
  }

  storageGet(['trustedList']).then(result => {
    const trustedList = result.trustedList || [];

    if (trustedList.includes(value)) {
      alert('This domain or email is already in your trusted list');
      return;
    }

    trustedList.push(value);

    storageSet({trustedList}).then(() => {
      displayTrustedList(trustedList);
      input.value = '';
      reloadEmailTabs();
    });
  });
});

// Handle Enter key in input
document.getElementById('trustedInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('addTrustedBtn').click();
  }
});

// Export list
document.getElementById('exportBtn').addEventListener('click', function() {
  storageGet(['trustedList']).then(result => {
    const trustedList = result.trustedList || [];

    if (trustedList.length === 0) {
      alert('No trusted domains or emails to export');
      return;
    }

    const dataStr = JSON.stringify({
      exportDate: new Date().toISOString(),
      version: "1.3",
      trustedList: trustedList
    }, null, 2);

    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-phish-protection-trusted-list-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

// Import list
document.getElementById('importBtn').addEventListener('click', function() {
  document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = JSON.parse(event.target.result);

      if (!data.trustedList || !Array.isArray(data.trustedList)) {
        alert('Invalid file format. Please select a valid export file.');
        return;
      }

      // Validate and sanitize each imported entry — reject non-strings, oversized
      // values, and entries that fail domain/email format validation
      const validItems = data.trustedList
        .filter(item => typeof item === 'string' && item.length <= 255)
        .map(item => item.trim().toLowerCase())
        .filter(item => item.length > 0 && isValidDomainOrEmail(item));

      if (validItems.length === 0) {
        alert('No valid entries found in the import file.');
        return;
      }

      storageGet(['trustedList']).then(result => {
        const existingList = result.trustedList || [];
        const mergedList = [...new Set([...existingList, ...validItems])];

        storageSet({trustedList: mergedList}).then(() => {
          displayTrustedList(mergedList);
          const skipped = data.trustedList.length - validItems.length;
          const msg = skipped > 0
            ? `Imported ${validItems.length} items (${skipped} invalid entries skipped). Total: ${mergedList.length}`
            : `Successfully imported ${validItems.length} items. Total trusted entries: ${mergedList.length}`;
          alert(msg);
          reloadEmailTabs();
        });
      });
    } catch (error) {
      alert('Error reading file. Please make sure it is a valid JSON file.');
    }
  };
  reader.readAsText(file);

  e.target.value = '';
});

// Display trusted list - SECURE: Using DOM methods instead of innerHTML
function displayTrustedList(trustedList) {
  const container = document.getElementById('trustedList');

  // Clear existing content safely
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  if (trustedList.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No trusted domains or emails yet';
    container.appendChild(emptyState);
    return;
  }

  // Create items using secure DOM methods
  trustedList.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'trusted-item';

    const itemText = document.createElement('span');
    itemText.textContent = item;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'danger';
    removeBtn.textContent = 'Remove';
    removeBtn.setAttribute('data-item', item);
    removeBtn.addEventListener('click', function() {
      removeTrustedItem(this.getAttribute('data-item'));
    });

    itemDiv.appendChild(itemText);
    itemDiv.appendChild(removeBtn);
    container.appendChild(itemDiv);
  });
}

// Remove trusted item
function removeTrustedItem(item) {
  storageGet(['trustedList']).then(result => {
    const trustedList = result.trustedList || [];
    const updatedList = trustedList.filter(i => i !== item);

    storageSet({trustedList: updatedList}).then(() => {
      displayTrustedList(updatedList);
      reloadEmailTabs();
    });
  });
}

// Validate domain or email
function isValidDomainOrEmail(value) {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (emailRegex.test(value)) return true;

  const domainRegex = /^[a-z0-9]+([.\-][a-z0-9]+)*\.[a-z]{2,}$/i;
  if (domainRegex.test(value)) return true;

  return false;
}

// Reload Gmail tabs
function reloadEmailTabs() {
  const handleTabs = function(tabs) {
    tabs.forEach(tab => {
      browserAPI.tabs.reload(tab.id);
    });
  };

  if (browserAPI.tabs.query.length === 1) {
    browserAPI.tabs.query({url: "https://mail.google.com/*"}).then(handleTabs);
  } else {
    browserAPI.tabs.query({url: "https://mail.google.com/*"}, handleTabs);
  }
}
