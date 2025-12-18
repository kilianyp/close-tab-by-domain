chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "closeTabs") {
    const domain = message.domain.toLowerCase();

    chrome.tabs.query({}, (tabs) => {
      const toClose = tabs.filter(tab => {
        try {
          const u = new URL(tab.url);
          if (domain === "(new tab)" && tab.url === "chrome://newtab/") return true;
          if (domain === "(chrome internal)" && u.protocol.startsWith("chrome")) return true;
          return u.hostname.toLowerCase().includes(domain);
        } catch {
          return domain === "(new tab)";
        }
      });

      if (toClose.length > 0) chrome.tabs.remove(toClose.map(t => t.id));
      sendResponse({ closed: toClose.length });
    });

    return true; // keep async channel open
  }
});

