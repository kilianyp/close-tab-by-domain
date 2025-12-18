const input = document.getElementById("domain");
const button = document.getElementById("close");
const result = document.getElementById("result");
const suggestions = document.getElementById("suggestions");

let domainCounts = {};
let sortedDomains = [];
let filtered = [];
let selectedIndex = -1;
const TOP_N = 10;

// Focus input + load data
window.addEventListener("DOMContentLoaded", () => {
  input.focus();
  refreshDomainList();
});

// --- MAIN FUNCTIONS ---

function refreshDomainList() {
  chrome.tabs.query({}, (tabs) => {
    domainCounts = {};

    for (const tab of tabs) {
      let hostname = "(new tab)";
      try {
        const u = new URL(tab.url);
        if (u.protocol === "http:" || u.protocol === "https:") {
          hostname = u.hostname.toLowerCase();
        } else if (u.protocol.startsWith("chrome")) {
          hostname = "(chrome internal)";
        }
      } catch {
        // leave as "(new tab)"
      }

      domainCounts[hostname] = (domainCounts[hostname] || 0) + 1;
    }

    sortedDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([domain, count]) => ({ domain, count }));

    if (sortedDomains.length === 0) {
      showSuggestions([]);
      result.textContent = "No tabs open.";
      return;
    }

    showSuggestions(sortedDomains.slice(0, TOP_N));
  });
}

// Filter as you type
input.addEventListener("input", () => {
  const query = input.value.toLowerCase();
  filtered = query
    ? sortedDomains.filter(d => d.domain.toLowerCase().includes(query))
    : sortedDomains.slice(0, TOP_N);
  showSuggestions(filtered);
  selectedIndex = -1;
});

function showSuggestions(list) {
  suggestions.innerHTML = "";
  if (list.length === 0) {
    suggestions.style.display = "none";
    return;
  }

  list.forEach(({ domain, count }) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    const num = document.createElement("span");
    name.textContent = domain;
    num.textContent = `(${count})`;
    num.className = "count";
    li.append(name, num);

    li.addEventListener("click", () => {
      input.value = domain;
      suggestions.style.display = "none";
      closeTabs(domain);
    });

    suggestions.appendChild(li);
  });
  suggestions.style.display = "block";
}

// Keyboard navigation
input.addEventListener("keydown", (e) => {
  const items = suggestions.querySelectorAll("li");
  if (e.key === "ArrowDown" && items.length) {
    selectedIndex = (selectedIndex + 1) % items.length;
    highlight(items);
    e.preventDefault();
  } else if (e.key === "ArrowUp" && items.length) {
    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    highlight(items);
    e.preventDefault();
  } else if (e.key === "Enter") {
    if (selectedIndex >= 0 && items[selectedIndex]) {
      input.value = items[selectedIndex].querySelector("span").textContent;
    }
    suggestions.style.display = "none";
    closeTabs(input.value.trim());
  }
});

function highlight(items) {
  items.forEach((el, i) => {
    el.style.background = i === selectedIndex ? "#0073e6" : "";
    el.style.color = i === selectedIndex ? "#fff" : "";
  });
}

// --- CLOSE TABS & REFRESH ---

function closeTabs(domain) {
  domain = domain.trim().toLowerCase();
  if (!domain) {
    result.textContent = "Please enter/select a domain.";
    return;
  }

  chrome.runtime.sendMessage({ action: "closeTabs", domain }, (response) => {
    const closed = (response && typeof response.closed === "number") ? response.closed : 0;
    result.textContent = `Closed ${closed} tab(s) from ${domain}`;
    setTimeout(refreshDomainList, 300);
  });
}

button.addEventListener("click", () => closeTabs(input.value));
