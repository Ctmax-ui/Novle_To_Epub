// document.getElementById('redirect').addEventListener('onload', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('frontPage/newTabFetcher.html') });
    
//   });
  