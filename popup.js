const button = document.getElementById("export");
const status = document.getElementById("status");
const platformLabel = document.getElementById("platform");
const pageLabel = document.getElementById("pageStatus");
let activeTabId;

button.addEventListener("click", async () => {
  button.disabled = true;
  status.className = "";
  status.textContent = "Starting export on the shopping page…";
  pageLabel.textContent = "Scanning…";
  try {
    const started = await chrome.tabs.sendMessage(activeTabId, { type: "TRAKO_START_EXPORT", tabId: activeTabId });
    if (!started?.ok) throw new Error(started?.error || "Could not start the on-page export.");
    status.textContent = "Export is running on the page. Its progress panel stays there until you close it.";
  } catch (error) {
    status.className = "error";
    status.textContent = error.message || "Export failed.";
    if (/Could not establish connection|Receiving end does not exist/i.test(status.textContent)) {
      status.textContent = "Trako is not active on this tab. Reload the extension and refresh the shopping page.";
    }
  } finally { button.disabled = false; }
});

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTabId = tab?.id;
    if (!activeTabId) throw new Error("No active browser tab.");
    const response = await chrome.tabs.sendMessage(activeTabId, { type: "TRAKO_STATUS" });
    platformLabel.textContent = response?.platform || "Unsupported page";
    pageLabel.textContent = response?.isOrderPage ? "Order history detected" : "Open purchase history";
    if (response?.capturedTooltipDates) status.textContent = `${response.capturedTooltipDates} delivery tooltip date(s) captured on this page.`;
  } catch {
    platformLabel.textContent = "Unsupported or inactive tab";
    pageLabel.textContent = "Refresh the shopping page";
  }
}

init();
