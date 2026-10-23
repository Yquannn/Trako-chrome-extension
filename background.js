importScripts("export-core.js");

const exportJobs = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id ?? message?.tabId;
  if (message?.type === "TRAKO_DOWNLOAD_ROWS") {
    downloadCsv(message.rows || [], message.platform || "Orders")
      .then(() => sendProgress(tabId, { phase: "complete", runId: message.runId, status: "Export complete.", total: message.scannedOrders || 1, completed: message.scannedOrders || 1,
        rowsExported: message.rows?.length || 0, skippedOrders: message.skippedOrders || 0,
        excludedOrders: message.excludedOrders || 0,
        skippedProducts: message.skippedProducts || [] }))
      .catch(error => sendProgress(tabId, { phase: "error", runId: message.runId, status: error.message || "CSV download failed." }));
    sendResponse({ ok: true, started: true });
    return;
  }
  if (["TRAKO_PAUSE_EXPORT", "TRAKO_CONTINUE_EXPORT"].includes(message?.type)) {
    const job = exportJobs.get(tabId);
    if (!job || (message.runId && message.runId !== job.runId)) {
      sendResponse({ ok: false, error: "This scan is no longer active. Click Retry scan to start again." });
      return;
    }
    job.paused = message.type === "TRAKO_PAUSE_EXPORT";
    if (job.paused) {
      sendProgress(tabId, { ...job.progress, phase: "pausing", status: "Pausing after the current order…" });
    } else {
      if (job.pauseStarted) job.pausedMs += Date.now() - job.pauseStarted;
      job.pauseStarted = null;
      sendProgress(tabId, { ...job.progress, phase: "progress", status: "Continuing export…" });
    }
    sendResponse({ ok: true });
    return;
  }
  if (message?.type === "TRAKO_CANCEL_EXPORT") {
    const job = exportJobs.get(tabId);
    if (job && (!message.runId || message.runId === job.runId)) {
      job.cancelled = true;
      if (job.currentTabId != null) chrome.tabs.remove(job.currentTabId).catch(() => {});
    }
    sendResponse(job ? { ok: true } : { ok: false, error: "This scan is no longer active. Click Retry scan to start again." });
    return;
  }
  if (!["TRAKO_EXPORT_SHOPEE_HISTORY", "TRAKO_EXPORT_LAZADA_HISTORY"].includes(message?.type)) return;
  if (exportJobs.has(tabId)) {
    const current = exportJobs.get(tabId);
    sendResponse({ ok: false, busy: true, runId: current.runId, progress: {
      ...current.progress,
      phase: current.paused ? "paused" : "progress",
      status: current.paused ? "Export paused. Click Continue to resume." : "An export is already running for this page."
    }});
    return;
  }
  const job = { cancelled: false, paused: false, pausedMs: 0, currentTabId: null, runId: message.runId, progress: {} };
  exportJobs.set(tabId, job);
  const run = message.type === "TRAKO_EXPORT_LAZADA_HISTORY" ? exportLazadaHistory : exportShopeeHistory;
  run(tabId, job)
    .catch(error => sendProgress(tabId, { phase: "error", status: error.message || "Export failed." }))
    .finally(() => { if (exportJobs.get(tabId) === job) exportJobs.delete(tabId); });
  sendResponse({ ok: true, started: true });
});

async function exportShopeeHistory(listTabId, job) {
  sendProgress(listTabId, { phase: "loading", status: "Loading purchase history and order links…" });
  const history = await chrome.tabs.sendMessage(listTabId, { type: "TRAKO_GET_ORDER_LINKS" });
  if (!history?.ok || !history.isOrderPage) throw new Error(history?.error || "Open your Shopee purchase history first.");
  if (!history.links?.length) {
    const fallback = await chrome.tabs.sendMessage(listTabId, { type: "TRAKO_EXPORT" });
    if (!fallback?.ok) throw new Error(fallback?.error || "No order links or order cards were found.");
    if (!await waitForContinue(listTabId, job)) {
      sendProgress(listTabId, { phase: "cancelled", status: "Export cancelled." });
      return;
    }
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
    if (!await waitForContinue(listTabId, job)) break;
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
    const elapsed = Date.now() - startedAt - job.pausedMs;
    const averageMs = completed ? Math.max(2500, elapsed / completed) : 3500;
    const remainingMs = Math.max(0, (total - completed) * averageMs);
    sendProgress(listTabId, { phase: "progress", status: `Read order ${completed} of ${total}.`, total, completed, remainingMs });
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  await waitForContinue(listTabId, job);
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
  const slug = ({ "Shopee Philippines": "shopee", "Lazada Philippines": "lazada",
    "SHEIN": "shein", "TikTok Shop": "tiktok-shop", "Temu": "temu", "Pinduoduo (拼多多)": "pinduoduo" })[platform] || "orders";
  await chrome.downloads.download({
    url: `data:text/csv;charset=utf-8;base64,${base64}`,
    filename: `trako-${slug}-orders-${date}.csv`,
    saveAs: true
  });
}

function sendProgress(tabId, progress) {
  const job = exportJobs.get(tabId);
  if (job) {
    progress = { ...progress, runId: job.runId };
    if (["loading", "progress"].includes(progress.phase)) {
      job.progress = { ...progress };
      if (job.paused) progress = { ...progress, phase: "pausing", status: "Pausing after the current order…" };
    }
    // Release the finished job before exposing Retry scan. A new job must not
    // be rejected, or deleted by the previous job's asynchronous cleanup.
    if (["complete", "error", "cancelled"].includes(progress.phase)) exportJobs.delete(tabId);
  }
  chrome.tabs.sendMessage(tabId, { type: "TRAKO_EXPORT_PROGRESS", progress: { ...progress, tabId } }).catch(() => {});
}

async function waitForContinue(tabId, job) {
  if (job.paused && !job.cancelled) {
    job.pauseStarted = Date.now();
    sendProgress(tabId, { ...job.progress, phase: "paused", status: "Export paused. Click Continue to resume." });
  }
  while (job.paused && !job.cancelled) {
    // Also stop if the originating page has been closed while paused.
    try { await chrome.tabs.get(tabId); } catch (_) { job.cancelled = true; break; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return !job.cancelled;
}

// Resolve the normal rendered UI navigation, then let the extension open a
// single inactive detail tab. No popup allowance or private API is required.
async function openLazadaDetail(listTabId, key, job) {
  if (job.cancelled) throw new Error("Export cancelled.");
  const result = await chrome.tabs.sendMessage(listTabId, { type: "TRAKO_LAZADA_OPEN", key });
  if (!result?.ok) throw new Error(result?.error || "The loaded order could not be opened.");
  const url = new URL(result.url);
  if (url.origin !== "https://my.lazada.com.ph" || !/^\/customer\/order\/view\/?$/.test(url.pathname)) {
    throw new Error("Invalid Lazada order navigation.");
  }
  if (job.cancelled) throw new Error("Export cancelled.");
  const tab = await chrome.tabs.create({ url: url.href, active: false });
  job.currentTabId = tab.id;
  if (job.cancelled) await chrome.tabs.remove(tab.id).catch(() => {});
  return tab;
}

async function exportLazadaHistory(listTabId, job) {
  sendProgress(listTabId, { phase: "loading", status: "Reading loaded Lazada orders…" });
  const history = await chrome.tabs.sendMessage(listTabId, { type: "TRAKO_LAZADA_PREPARE" });
  if (!history?.ok || !history.scannedOrders) throw new Error(history?.error || "Load your Lazada My Orders page, then retry.");
  let rows = history.rows || [];
  let detailsUnavailable = 0, completed = 0;
  const total = history.targets.length;
  const started = Date.now();
  for (const key of history.targets) {
    if (!await waitForContinue(listTabId, job)) break;
    sendProgress(listTabId, { phase: "progress", status: `Reading dates for order ${completed + 1} of ${total}…`,
      total, completed, remainingMs: (total - completed) * (completed ? (Date.now() - started - job.pausedMs) / completed : 5000) });
    try {
      const tab = await openLazadaDetail(listTabId, key, job);
      if (job.cancelled) break;
      await waitUntilComplete(tab.id, 20000, job);
      let detail;
      const deadline = Date.now() + 12000;
      while (!job.cancelled && Date.now() < deadline) {
        try { detail = await chrome.tabs.sendMessage(tab.id, { type: "TRAKO_LAZADA_DETAIL" }); } catch (_) { /* content script not ready */ }
        if (detail?.ready || detail?.ok === false) break;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      if (job.cancelled) break;
      if (!detail?.ready) detailsUnavailable++;
      else if (!detail.eligible) {
        const removed = rows.filter(row => row._orderKey === key);
        rows = rows.filter(row => row._orderKey !== key);
        history.excludedOrders++;
        history.skippedProducts.push(...removed.map(row => ({ name: row.productName,
          reason: `Order status is ${detail.metadata.orderStatus}. Only received or completed orders are exported.` })));
      } else {
        rows = rows.map(row => row._orderKey === key ? { ...row, ...Object.fromEntries(
          Object.entries(detail.metadata).filter(([, value]) => value !== "")) } : row);
        if (!detail.metadata.purchaseDate || !detail.metadata.deliveryDate) detailsUnavailable++;
      }
    } catch (_) {
      if (job.cancelled) break;
      detailsUnavailable++;
    } finally {
      if (job.currentTabId != null) await chrome.tabs.remove(job.currentTabId).catch(() => {});
      job.currentTabId = null;
    }
    completed++;
  }
  await waitForContinue(listTabId, job);
  if (job.cancelled) {
    sendProgress(listTabId, { phase: "cancelled", status: "Export cancelled.", total, completed });
    return;
  }
  if (rows.length) await downloadCsv(rows, "Lazada Philippines");
  const countDates = field => new Set(rows.filter(row => row[field]).map(row => row._orderKey)).size;
  sendProgress(listTabId, { phase: "complete", status: "Export complete.", total: history.scannedOrders,
    completed: history.scannedOrders, rowsExported: rows.length, skippedOrders: history.skippedOrders,
    excludedOrders: history.excludedOrders, skippedProducts: history.skippedProducts, detailsUnavailable,
    exportedOrders: new Set(rows.map(row => row._orderKey)).size,
    purchaseDates: countDates('purchaseDate'), deliveryDates: countDates('deliveryDate') });
}
