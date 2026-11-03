// Toolbar toggle, plus fetching stylesheets for the content script: ESPN serves
// its CSS from a CDN without CORS headers, so only this worker can read it.

async function syncBadge() {
  const { enabled = true } = await chrome.storage.local.get('enabled');
  await chrome.action.setBadgeBackgroundColor({ color: '#3772df' });
  await chrome.action.setBadgeText({ text: enabled ? 'ON' : '' });
}

chrome.runtime.onInstalled.addListener(syncBadge);
chrome.runtime.onStartup.addListener(syncBadge);

chrome.action.onClicked.addListener(async () => {
  const { enabled = true } = await chrome.storage.local.get('enabled');
  await chrome.storage.local.set({ enabled: !enabled });
  await syncBadge();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'fetch-css') return false;
  fetch(message.url)
    .then((response) => (response.ok ? response.text() : ''))
    .catch(() => '')
    .then(sendResponse);
  return true;
});
