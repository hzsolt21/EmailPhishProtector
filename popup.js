// Cross-browser API compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Load saved settings
browserAPI.storage.sync.get(['protectionMode', 'trustedList', 'showWarnings']).then(result => {
  const mode = result.protectionMode || 'popup';
  document.getElementById(mode + '-mode').checked = true;
  
  const showWarnings = result.showWarnings !== undefined ? result.showWarnings : false;
  document.getElementById('showWarnings').checked = showWarnings;
  
  const trustedList = result.trustedList || [];
  displayTrustedList(trustedList);
}).catch(() => {
  // Fallback for Chrome callback style
  chrome.storage.sync.get(['protectionMode', 'trustedList', 'showWarnings'], function(result) {
    const mode = result.protectionMode || 'popup';
    document.getElementById(mode + '-mode').checked = true;
    
    const showWarnings = result.showWarnings !== undefined ? result.showWarnings : false;
    document.getElementById('showWarnings').checked = showWarnings;
    
    const trustedList = result.trustedList || [];
    displayTrustedList(trustedList);
  });
});

// Save protection mode when changed
document.querySelectorAll('input[name="mode"]').forEach(radio => {
  radio.addEventListener('change', function() {
    if (browserAPI.storage.sync.set.length === 1) {
      // Promise-based (Firefox)
      browserAPI.storage.sync.set({protectionMode: this.value}).then(() => {
        reloadEmailTabs();
      });
    } else {
      // Callback-based (Chrome)
      browserAPI.storage.sync.set({protectionMode: this.value}, function() {
        reloadEmailTabs();
      });
    }
  });
});

// Save warning banner setting
document.getElementById('showWarnings').addEventListener('change', function() {
  if (browserAPI.storage.sync.set.length === 1) {
    browserAPI.storage.sync.set({showWarnings: this.checked}).then(() => {
      reloadEmailTabs();
    });
  } else {
    browserAPI.storage.sync.set({showWarnings: this.checked}, function() {
      reloadEmailTabs();
    });
  }
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
  
  const handleResult = function(result) {
    const trustedList = result.trustedList || [];
    
    if (trustedList.includes(value)) {
      alert('This domain or email is already in your trusted list');
      return;
    }
    
    trustedList.push(value);
    
    const saveAndUpdate = function() {
      displayTrustedList(trustedList);
      input.value = '';
      reloadEmailTabs();
    };
    
    if (browserAPI.storage.sync.set.length === 1) {
      browserAPI.storage.sync.set({trustedList: trustedList}).then(saveAndUpdate);
    } else {
      browserAPI.storage.sync.set({trustedList: trustedList}, saveAndUpdate);
    }
  };
  
  if (browserAPI.storage.sync.get.length === 1) {
    browserAPI.storage.sync.get(['trustedList']).then(handleResult);
  } else {
    browserAPI.storage.sync.get(['trustedList'], handleResult);
  }
});

// Handle Enter key in input
document.getElementById('trustedInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    document.getElementById('addTrustedBtn').click();
  }
});

// Export list
document.getElementById('exportBtn').addEventListener('click', function() {
  const handleResult = function(result) {
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
  };
  
  if (browserAPI.storage.sync.get.length === 1) {
    browserAPI.storage.sync.get(['trustedList']).then(handleResult);
  } else {
    browserAPI.storage.sync.get(['trustedList'], handleResult);
  }
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
      
      const handleResult = function(result) {
        const existingList = result.trustedList || [];
        const mergedList = [...new Set([...existingList, ...data.trustedList])];
        
        const afterSave = function() {
          displayTrustedList(mergedList);
          alert(`Successfully imported ${data.trustedList.length} items. Total trusted entries: ${mergedList.length}`);
          reloadEmailTabs();
        };
        
        if (browserAPI.storage.sync.set.length === 1) {
          browserAPI.storage.sync.set({trustedList: mergedList}).then(afterSave);
        } else {
          browserAPI.storage.sync.set({trustedList: mergedList}, afterSave);
        }
      };
      
      if (browserAPI.storage.sync.get.length === 1) {
        browserAPI.storage.sync.get(['trustedList']).then(handleResult);
      } else {
        browserAPI.storage.sync.get(['trustedList'], handleResult);
      }
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
  const handleResult = function(result) {
    const trustedList = result.trustedList || [];
    const updatedList = trustedList.filter(i => i !== item);
    
    const afterSave = function() {
      displayTrustedList(updatedList);
      reloadEmailTabs();
    };
    
    if (browserAPI.storage.sync.set.length === 1) {
      browserAPI.storage.sync.set({trustedList: updatedList}).then(afterSave);
    } else {
      browserAPI.storage.sync.set({trustedList: updatedList}, afterSave);
    }
  };
  
  if (browserAPI.storage.sync.get.length === 1) {
    browserAPI.storage.sync.get(['trustedList']).then(handleResult);
  } else {
    browserAPI.storage.sync.get(['trustedList'], handleResult);
  }
}

// Validate domain or email
function isValidDomainOrEmail(value) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(value)) return true;
  
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
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
