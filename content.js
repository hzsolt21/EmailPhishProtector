/**
 * Email Click Protection - Content Script
 * With Trusted Domains/Emails Whitelist and Warning Banners
 */

let protectionMode = 'popup';
let trustedList = [];
let showWarnings = false;
let currentMessageId = null;

// Initialize settings from Chrome storage
chrome.storage.sync.get(['protectionMode', 'trustedList', 'showWarnings'], function(result) {
  protectionMode = result.protectionMode || 'popup';
  trustedList = result.trustedList || [];
  showWarnings = result.showWarnings !== undefined ? result.showWarnings : false;
  initializeProtection();
});

// Listen for settings changes from the popup
chrome.storage.onChanged.addListener(function(changes) {
  if (changes.protectionMode || changes.trustedList || changes.showWarnings) {
    location.reload();
  }
});

function initializeProtection() {
  const observer = new MutationObserver(() => {
    processLinks();
    processForms();
    if (showWarnings) {
      updateWarningBanner();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-message-id']
  });
  
  processLinks();
  processForms();
  if (showWarnings) {
    updateWarningBanner();
  }
}

function updateWarningBanner() {
  // Get current message ID to detect when email changes
  const currentEmail = document.querySelector('[data-message-id]');
  if (!currentEmail) return;
  
  const messageId = currentEmail.getAttribute('data-message-id');
  
  // Only update if message changed or banner doesn't exist
  if (messageId === currentMessageId && document.querySelector('.email-protection-warning')) {
    return;
  }
  
  currentMessageId = messageId;
  
  // Remove old banner
  const oldBanner = document.querySelector('.email-protection-warning');
  if (oldBanner) {
    oldBanner.remove();
  }
  
  // Show new banner
  showWarningBanner();
}

function showWarningBanner() {
  // Find the email container
  const emailContainer = document.querySelector('[role="main"]');
  if (!emailContainer) return;
  
  // Get sender email for THIS specific email
  const senderEmail = getSenderEmail();
  
  // Check if sender is trusted
  if (senderEmail && isTrustedEmail(senderEmail)) {
    return; // Don't show warning for trusted senders
  }
  
  // Also check if sender domain is trusted
  if (senderEmail && isSenderDomainTrusted(senderEmail)) {
    return;
  }
  
  // Create warning banner
  const banner = document.createElement('div');
  banner.className = 'email-protection-warning';
  banner.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
      border: 3px solid #d93025;
      border-radius: 8px;
      padding: 20px;
      margin: 15px;
      box-shadow: 0 4px 12px rgba(217, 48, 37, 0.3);
      position: relative;
      z-index: 1000;
      animation: slideDown 0.5s ease-out;
    ">
      <div style="display: flex; align-items: center; gap: 15px;">
        <div style="font-size: 48px;">⚠️</div>
        <div style="flex: 1;">
          <div style="font-size: 18px; font-weight: bold; color: white; margin-bottom: 8px;">
            ⚠️ CAUTION: NON-TRUSTED SENDER
          </div>
          <div style="font-size: 14px; color: #fff; line-height: 1.5;">
            This email is from <strong>${senderEmail || 'an unknown sender'}</strong>, which is not in your trusted list.
            <br>
            <strong>Exercise extreme caution</strong> before clicking any links or downloading attachments.
          </div>
          <div style="font-size: 12px; color: #ffe6e6; margin-top: 10px; font-style: italic;">
            💡 Tip: If you trust this sender, add them to your trusted list in the extension settings.
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add animation style if not already present
  if (!document.getElementById('email-protection-styles')) {
    const style = document.createElement('style');
    style.id = 'email-protection-styles';
    style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Insert banner at the top of the email body
  const emailBody = emailContainer.querySelector('[data-message-id]');
  if (emailBody) {
    // Insert as first child of email body
    const insertPoint = emailBody.querySelector('.a3s, .ii') || emailBody.firstChild;
    if (insertPoint) {
      insertPoint.parentNode.insertBefore(banner, insertPoint);
    } else {
      emailBody.insertBefore(banner, emailBody.firstChild);
    }
  }
}

function processLinks() {
  const emailBody = document.querySelector('[role="main"]');
  if (!emailBody) return;
  
  const links = emailBody.querySelectorAll('a[href]:not([data-protected])');
  links.forEach(link => {
    try {
      processLink(link);
    } catch (error) {
      console.error("Email Click Protection failed to process a link:", error);
      link.setAttribute('data-protected', 'error');
    }
  });
  
  try {
    processShadowDOM(emailBody);
  } catch (error) {
    console.error("Email Click Protection failed to process Shadow DOM:", error);
  }
}

function processShadowDOM(root) {
  const allElements = root.querySelectorAll('*');
  
  allElements.forEach(element => {
    if (element.shadowRoot) {
      const shadowLinks = element.shadowRoot.querySelectorAll('a[href]:not([data-protected])');
      shadowLinks.forEach(link => {
        try {
          processLink(link);
        } catch (error) {
          console.error("Email Click Protection shadow link error:", error);
          link.setAttribute('data-protected', 'error');
        }
      });
      
      processShadowDOM(element.shadowRoot);
    }
  });
}

function processForms() {
  const emailBody = document.querySelector('[role="main"]');
  if (!emailBody) return;
  
  const forms = emailBody.querySelectorAll('form:not([data-protected])');
  forms.forEach(form => {
    try {
      processForm(form);
    } catch (error) {
      console.error("Email Click Protection failed to process form:", error);
      form.setAttribute('data-protected', 'error');
    }
  });
  
  const allElements = emailBody.querySelectorAll('*');
  allElements.forEach(element => {
    if (element.shadowRoot) {
      const shadowForms = element.shadowRoot.querySelectorAll('form:not([data-protected])');
      shadowForms.forEach(form => {
        try {
          processForm(form);
        } catch (error) {
          console.error("Email Click Protection shadow form error:", error);
          form.setAttribute('data-protected', 'error');
        }
      });
    }
  });
}

function isTrusted(url, senderEmail) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Check if domain or any parent domain is trusted
    for (const trusted of trustedList) {
      // Check if it's an email address
      if (trusted.includes('@')) {
        if (senderEmail && senderEmail.toLowerCase() === trusted) {
          return true;
        }
      } else {
        // Check if domain matches
        if (domain === trusted || domain.endsWith('.' + trusted)) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

function isTrustedEmail(email) {
  if (!email) return false;
  
  const emailLower = email.toLowerCase();
  
  for (const trusted of trustedList) {
    if (trusted.includes('@')) {
      // Exact email match
      if (emailLower === trusted) {
        return true;
      }
    }
  }
  return false;
}

function isSenderDomainTrusted(email) {
  if (!email) return false;
  
  const emailLower = email.toLowerCase();
  const domain = emailLower.split('@')[1];
  
  if (!domain) return false;
  
  for (const trusted of trustedList) {
    if (!trusted.includes('@')) {
      // Domain match - check if email domain matches trusted domain
      if (domain === trusted || domain.endsWith('.' + trusted)) {
        return true;
      }
    }
  }
  return false;
}

function getSenderEmail() {
  // Try multiple methods to extract sender email from the CURRENT email view
  
  // Method 1: Look in the currently visible email header
  const visibleEmail = document.querySelector('[data-message-id]');
  if (visibleEmail) {
    // Look for email in the header area
    const headerEmail = visibleEmail.querySelector('.gD[email]');
    if (headerEmail) {
      return headerEmail.getAttribute('email');
    }
    
    // Look for email in go areas
    const goElement = visibleEmail.querySelector('.go[email]');
    if (goElement) {
      return goElement.getAttribute('email');
    }
  }
  
  // Method 2: Look for the currently expanded email header
  const expandedHeader = document.querySelector('.gE.iv.gt [email]');
  if (expandedHeader) {
    return expandedHeader.getAttribute('email');
  }
  
  // Method 3: Try to find sender in the visible header
  const senderSpan = document.querySelector('span[email]');
  if (senderSpan && senderSpan.offsetParent !== null) { // Check if visible
    return senderSpan.getAttribute('email');
  }
  
  return null;
}

function processLink(link) {
  const originalHref = link.href;
  
  // Skip non-web links and internal Email navigation
  if (!originalHref || 
      originalHref.startsWith('mailto:') || 
      originalHref.startsWith('tel:') ||
      originalHref.startsWith('javascript:') ||
      originalHref.includes('mail.google.com')) {
    link.setAttribute('data-protected', 'skip');
    return;
  }
  
  // Check if URL is from trusted domain or sender
  const senderEmail = getSenderEmail();
  if (isTrusted(originalHref, senderEmail)) {
    link.setAttribute('data-protected', 'trusted');
    // Add visual indicator for trusted links
    link.style.borderBottom = '2px solid #34a853';
    link.title = '✓ Trusted link - protection bypassed';
    return;
  }

  link.setAttribute('data-protected', 'true');

  if (protectionMode === 'deny') {
    applyDenyMode(link, originalHref);
  } else if (protectionMode === 'popup') {
    applyPopupMode(link, originalHref);
  }
}

function processForm(form) {
  const formAction = form.action || form.getAttribute('action');
  
  if (!formAction || 
      formAction.startsWith('javascript:') ||
      formAction.includes('mail.google.com') ||
      formAction.startsWith('#') ||
      formAction === '') {
    form.setAttribute('data-protected', 'skip');
    return;
  }
  
  // Check if form action is trusted
  const senderEmail = getSenderEmail();
  if (isTrusted(formAction, senderEmail)) {
    form.setAttribute('data-protected', 'trusted');
    return;
  }
  
  form.setAttribute('data-protected', 'true');
  
  if (protectionMode === 'deny') {
    applyDenyModeForm(form, formAction);
  } else if (protectionMode === 'popup') {
    applyPopupModeForm(form, formAction);
  }
}

function applyDenyMode(link, url) {
  link.style.pointerEvents = 'none';
  link.style.cursor = 'not-allowed';
  link.style.opacity = '0.7';
  link.removeAttribute('href');

  const urlBox = document.createElement('div');
  urlBox.textContent = `Destination URL: ${url}`;
  urlBox.style.cssText = `
    font-size: 11px;
    color: #444;
    margin: 8px 0;
    padding: 8px;
    background-color: #f8f9fa;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    word-break: break-all;
    user-select: text;
    cursor: text;
    display: block;
    max-width: 90%;
  `;

  const parentTable = link.closest('table[role="presentation"]');
  const parentRow = link.closest('tr');

  if (parentTable && parentRow) {
    const newRow = document.createElement('tr');
    const newCell = document.createElement('td');
    newCell.setAttribute('colspan', '100');
    newCell.appendChild(urlBox);
    newRow.appendChild(newCell);
    parentRow.parentNode.insertBefore(newRow, parentRow.nextSibling);
  } else {
    urlBox.style.display = 'inline-block';
    urlBox.style.margin = '0 0 0 10px';
    link.parentNode.insertBefore(urlBox, link.nextSibling);
  }
}

function applyDenyModeForm(form, action) {
  const inputs = form.querySelectorAll('input, button, textarea, select');
  inputs.forEach(input => {
    input.disabled = true;
    input.style.opacity = '0.5';
    input.style.cursor = 'not-allowed';
  });
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation();
  }, true);
  
  const urlBox = document.createElement('div');
  urlBox.textContent = `Form submits to: ${action}`;
  urlBox.style.cssText = `
    font-size: 11px;
    color: #d93025;
    margin: 8px 0;
    padding: 8px;
    background-color: #fce8e6;
    border: 1px solid #f5c6cb;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    word-break: break-all;
    user-select: text;
    cursor: text;
    font-weight: bold;
  `;
  
  form.parentNode.insertBefore(urlBox, form);
}

function applyPopupMode(link, url) {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    let warningText = '';
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      if (/[^\x00-\x7F]/.test(domain)) {
        warningText = '\n⚠️ WARNING: This URL contains non-ASCII characters!\n';
      }
    } catch (e) {
      warningText = '\n⚠️ WARNING: Invalid URL format!\n';
    }
    
    const confirmed = confirm(
      `Email Click Protection:\n\n` +
      `You are about to leave Email to visit:\n\n${url}` +
      warningText +
      `\n\nDo you want to continue?`
    );
    
    if (confirmed) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, {capture: true, passive: false});
}

function applyPopupModeForm(form, action) {
  const originalSubmit = form.onsubmit;
  
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    const confirmed = confirm(
      `Email Click Protection:\n\n` +
      `This form will submit data to:\n\n${action}\n\n` +
      `⚠️ WARNING: This will send form data to an external site!\n\n` +
      `Do you want to continue?`
    );
    
    if (confirmed) {
      form.removeEventListener('submit', arguments.callee, true);
      
      if (originalSubmit) {
        originalSubmit.call(form, e);
      }
      
      form.submit();
    }
  }, {capture: true, passive: false});
}
