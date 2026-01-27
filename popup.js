// Load saved settings
chrome.storage.sync.get(['protectionMode', 'trustedList', 'showWarnings'], function(result) {
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
    chrome.storage.sync.set({protectionMode: this.value}, function() {
      reloadEmailTabs();
    });
  });
});

// Save warning banner setting
document.getElementById('showWarnings').addEventListener('change', function() {
  chrome.storage.sync.set({showWarnings: this.checked}, function() {
    reloadEmailTabs();
  });
});

// Add trusted domain/email
document.getElementById('addTrustedBtn').addEventListener('click', function() {
  const input = document.getElementById('trustedInput');
  const value = input.value.trim().toLowerCase();
  
  if (!value) {
    alert('Please enter a domain or email address');
    return;
  }
  
  // Validate input
  if (!isValidDomainOrEmail(value)) {
    alert('Please enter a valid domain (e.g., example.com) or email address (e.g., user@domain.com)');
    return;
  }
  
  chrome.storage.sync.get(['trustedList'], function(result) {
    const trustedList = result.trustedList || [];
    
    if (trustedList.includes(value)) {
      alert('This domain or email is already in your trusted list');
      return;
    }
    
    trustedList.push(value);
    chrome.storage.sync.set({trustedList: trustedList}, function() {
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
  chrome.storage.sync.get(['trustedList'], function(result) {
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
    a.download = `email-protection-trusted-list-${new Date().toISOString().split('T')[0]}.json`;
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
      
      // Validate format
      if (!data.trustedList || !Array.isArray(data.trustedList)) {
        alert('Invalid file format. Please select a valid export file.');
        return;
      }
      
      // Merge with existing list
      chrome.storage.sync.get(['trustedList'], function(result) {
        const existingList = result.trustedList || [];
        const mergedList = [...new Set([...existingList, ...data.trustedList])];
        
        chrome.storage.sync.set({trustedList: mergedList}, function() {
          displayTrustedList(mergedList);
          alert(`Successfully imported ${data.trustedList.length} items. Total trusted entries: ${mergedList.length}`);
          reloadEmailTabs();
        });
      });
    } catch (error) {
      alert('Error reading file. Please make sure it is a valid JSON file.');
    }
  };
  reader.readAsText(file);
  
  // Reset file input
  e.target.value = '';
});

// Display trusted list
function displayTrustedList(trustedList) {
  const container = document.getElementById('trustedList');
  
  if (trustedList.length === 0) {
    container.innerHTML = '<div class="empty-state">No trusted domains or emails yet</div>';
    return;
  }
  
  container.innerHTML = trustedList.map(item => `
    <div class="trusted-item">
      <span>${item}</span>
      <button class="danger" data-item="${item}">Remove</button>
    </div>
  `).join('');
  
  // Add remove event listeners
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function() {
      const itemToRemove = this.getAttribute('data-item');
      removeTrustedItem(itemToRemove);
    });
  });
}

// Remove trusted item
function removeTrustedItem(item) {
  chrome.storage.sync.get(['trustedList'], function(result) {
    const trustedList = result.trustedList || [];
    const updatedList = trustedList.filter(i => i !== item);
    
    chrome.storage.sync.set({trustedList: updatedList}, function() {
      displayTrustedList(updatedList);
      reloadEmailTabs();
    });
  });
}

// Validate domain or email
function isValidDomainOrEmail(value) {
  // Check if it's an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(value)) return true;
  
  // Check if it's a domain
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
  if (domainRegex.test(value)) return true;
  
  return false;
}

// Reload Email tabs
function reloadEmailTabs() {
  chrome.tabs.query({url: "https://mail.google.com/*"}, function(tabs) {
    tabs.forEach(tab => {
      chrome.tabs.reload(tab.id);
    });
  });
}
