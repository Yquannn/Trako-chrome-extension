const button = document.getElementById("export");
const status = document.getElementById("status");
const platformLabel = document.getElementById("platform");
const pageLabel = document.getElementById("pageStatus");
let activeTabId;
let page;
button.disabled = true;

button.addEventListener("click", async () => {
  button.disabled = true;
  status.className = "";
  try {
    if (!page?.isOrderPage && page?.orderHistoryUrl) {
      await chrome.tabs.update(activeTabId, { url: page.orderHistoryUrl });
      window.close();
      return;
    }
    const started = await chrome.tabs.sendMessage(activeTabId, { type: "TRAKO_START_EXPORT", tabId: activeTabId });
    if (!started?.ok) throw new Error(started?.error || "Could not open the on-page exporter.");
    window.close();
  } catch (error) {
    status.className = "error";
    status.textContent = error.message || "Export failed.";
    if (/Could not establish connection|Receiving end does not exist/i.test(status.textContent)) {
      status.textContent = "Refresh the shopping page after updating Trako, then try again.";
    }
  } finally { button.disabled = !page?.verified; }
});

async function init() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTabId = tab?.id;
    if (!activeTabId) throw new Error("No active browser tab.");
    page = await chrome.tabs.sendMessage(activeTabId, { type: "TRAKO_STATUS" });
    platformLabel.textContent = page?.platform || "Unsupported page";
    pageLabel.textContent = page?.isOrderPage ? "Order history detected" : "Open My Orders";
    button.textContent = page?.isOrderPage ? "Export orders to CSV" : "Open My Orders";
    button.disabled = !page?.verified;
    status.textContent = page?.isOrderPage ? "Ready. Progress and controls appear on the shopping page." : "Sign in normally on the shopping website, then open your orders.";
  } catch {
    platformLabel.textContent = "Unsupported or inactive tab";
    pageLabel.textContent = "Shopee PH / Lazada PH";
    status.textContent = "Open Shopee Philippines or Lazada Philippines. Refresh the page if you just updated Trako.";
  }
}

init();
