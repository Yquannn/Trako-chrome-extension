importScripts("export-core.js");

const exportJobs = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = message?.tabId ?? sender.tab?.id;
  if (message?.type === "TRAKO_DOWNLOAD_ROWS") {
    downloadCsv(message.rows || [], message.platform || "Orders")
      .then(() => sendProgress(tabId, { phase: "complete", status: "Export complete.", total: 1, completed: 1,
        rowsExported: message.rows?.length || 0, skippedOrders: message.skippedOrders || 0,
        excludedOrders: message.excludedOrders || 0,
        skippedProducts: message.skippedProducts || [] }))
      .catch(error => sendProgress(tabId, { phase: "error", status: error.message || "CSV download failed." }));
    sendResponse({ ok: true, started: true });
    return;
  }
  if (message?.type === "TRAKO_CANCEL_EXPORT") {
    const job = exportJobs.get(tabId);
    if (job) {
      job.cancelled = true;
      if (job.currentTabId != null) chrome.tabs.remove(job.currentTabId).catch(() => {});
    }
    return;
  }
  if (message?.type !== "TRAKO_EXPORT_SHOPEE_HISTORY") return;
  if (exportJobs.has(tabId)) {
    sendResponse({ ok: false, error: "An export is already running for this page." });
    return;
  }
  const job = { cancelled: false, currentTabId: null };
  exportJobs.set(tabId, job);
  exportShopeeHistory(tabId, job)
    .catch(error => sendProgress(tabId, { phase: "error", status: error.message || "Export failed." }))
    .finally(() => exportJobs.delete(tabId));
  sendResponse({ ok: true, started: true });
});

async function exportShopeeHistory(listTabId, job) {
  sendProgress(listTabId, { phase: "loading", status: "Loading purchase history and order links…" });
  const history = await chrome.tabs.sendMessage(listTabId, { type: "TRAKO_GET_ORDER_LINKS" });
  if (!history?.ok || !history.isOrderPage) throw new Error(history?.error || "Open your Shopee purchase history first.");
  if (!history.links?.length) {
    const fallback = await chrome.tabs.sendMessage(listTabId, { type: "TRAKO_EXPORT" });
    if (!fallback?.ok) throw new Error(fallback?.error || "No order links or order cards were found.");
    await downloadCsv(fallback.rows, "Shopee Philippines");
    sendProgress(listTabId, { phase: "complete", status: "Export complete.", total: fallback.summary.ordersFound,
      completed: fallback.summary.ordersFound, rowsExported: fallback.summary.rowsExported,
      skippedOrders: Math.max(0, fallback.summary.ordersSkipped - (fallback.excludedOrders || 0)),
      excludedOrders: fallback.excludedOrders || 0,
      skippedProducts: [...new Set([...(history.skippedProducts || []), ...(fallback.skippedProducts || [])])] });
    return;
  }

  const rows = [...(history.rows || [])];
  const detailRows = [];
  const skippedProducts = [...(history.skippedProducts || [])];
  let skippedOrders = 0;
  let excludedOrders = 0;
  let completed = 0;
  const startedAt = Date.now();
  const total = history.links.length;
  sendProgress(listTabId, { phase: "progress", status: `Found ${total} loaded order links. Checking status; only completed orders will be exported…`, total, completed: 0, remainingMs: total * 3500 });

  for (const url of history.links) {
    if (job.cancelled) break;
    let detailTab;
    try {
      detailTab = await chrome.tabs.create({ url, active: false });
      job.currentTabId = detailTab.id;
      if (job.cancelled) break;
      await waitUntilComplete(detailTab.id, 20000, job);
      if (job.cancelled) break;
      await new Promise(resolve => setTimeout(resolve, 350));
      if (job.cancelled) break;
      const result = await chrome.tabs.sendMessage(detailTab.id, { type: "TRAKO_EXPORT_DETAIL" });
      skippedProducts.push(...(result?.skippedProducts || []));
      if (result?.ok && result.rows?.length) detailRows.push(...result.rows);
      else if (result?.excludedOrders) excludedOrders += result.excludedOrders;
      else skippedOrders += Math.max(1, result?.skippedOrders || 0);
    } catch (error) {
      if (job.cancelled) break;
      skippedOrders++;
      skippedProducts.push({ name: "Product name unavailable", reason: "The order details page could not be loaded or read." });
    } finally {
      if (detailTab?.id != null) await chrome.tabs.remove(detailTab.id).catch(() => {});
      job.currentTabId = null;
    }
    completed++;
    const elapsed = Date.now() - startedAt;
    const averageMs = completed ? Math.max(2500, elapsed / completed) : 3500;
    const remainingMs = Math.max(0, (total - completed) * averageMs);
    sendProgress(listTabId, { phase: "progress", status: `Read order ${completed} of ${total}.`, total, completed, remainingMs });
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  if (job.cancelled) {
    sendProgress(listTabId, { phase: "cancelled", status: "Export cancelled.", total, completed });
    return;
  }
  const uniqueRows = mergeShopeeRows(rows, detailRows);
  if (uniqueRows.length) await downloadCsv(uniqueRows, "Shopee Philippines");
  const summary = TrakoCore.summarize(uniqueRows, total, skippedOrders);
  sendProgress(listTabId, { phase: "complete", status: "Export complete.", total, completed: total,
    rowsExported: summary.rowsExported, skippedOrders, excludedOrders, skippedProducts: [...new Set(skippedProducts)] });
}

function mergeShopeeRows(historyRows, detailRows) {
  const merged = new Map();
  for (const row of [...historyRows, ...detailRows]) {
    const orderKey = row._orderKey || row.orderId || "";
    const productKey = [orderKey, row.productName, row.productVariation, row.quantity].join("|");
    const previous = merged.get(productKey);
    if (!previous) {
      merged.set(productKey, { ...row });
      continue;
    }
    for (const [key, value] of Object.entries(row)) {
      if (value !== "" && value != null) previous[key] = value;
    }
  }
  return TrakoCore.dedupeRows([...merged.values()]);
}

async function waitUntilComplete(tabId, timeoutMs, job) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (job.cancelled) throw new Error("Export cancelled.");
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === "complete") return;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error("The Shopee order detail page took too long to load.");
}

async function downloadCsv(rows, platform) {
  const csv = `\uFEFF${TrakoCore.toCsv(rows)}`;
  const bytes = new TextEncoder().encode(csv);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  const base64 = btoa(binary);
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const slug = platform === "Shopee Philippines" ? "shopee" : "orders";
  await chrome.downloads.download({
    url: `data:text/csv;charset=utf-8;base64,${base64}`,
    filename: `trako-${slug}-orders-${date}.csv`,
    saveAs: true
  });
}

function sendProgress(tabId, progress) {
  chrome.tabs.sendMessage(tabId, { type: "TRAKO_EXPORT_PROGRESS", progress: { ...progress, tabId } }).catch(() => {});
}
