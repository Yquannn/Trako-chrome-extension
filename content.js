(() => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "TRAKO_START_EXPORT") {
      if (!window.TrakoAdapters?.platform) {
        sendResponse({ ok: false, error: "This website is not supported." });
        return;
      }
      if (!window.TrakoAdapters.isOrderPage()) {
        sendResponse({ ok: false, error: `Open your ${window.TrakoAdapters.platform} purchase or order history first.` });
        return;
      }
      showExportPanel();
      sendResponse({ ok: true });
      const tabId = message.tabId ?? _sender.tab?.id;
      startExport(tabId);
      return;
    }
    if (message?.type === "TRAKO_EXPORT_PROGRESS") {
      updateExportPanel(message.progress || {});
      return;
    }
    if (message?.type === "TRAKO_STATUS") {
      sendResponse({ platform: window.TrakoAdapters?.platform || "", isOrderPage: !!window.TrakoAdapters?.isOrderPage(),
        verified: !!window.TrakoAdapters?.verified, orderHistoryUrl: window.TrakoAdapters?.orderHistoryUrl || "",
        capturedTooltipDates: window.TrakoAdapters?.getCapturedTooltipDateCount?.() || 0 });
      return;
    }
    if (message?.type?.startsWith("TRAKO_LAZADA_")) {
      try {
        if (window.TrakoAdapters?.platform !== "Lazada Philippines") throw new Error("Open Lazada My Orders first.");
        if (message.type === "TRAKO_LAZADA_PREPARE") sendResponse({ ok: true, ...window.TrakoLazada.prepare() });
        else if (message.type === "TRAKO_LAZADA_OPEN") {
          const url = window.TrakoLazada.open(message.key);
          sendResponse({ ok: true, url });
        } else if (message.type === "TRAKO_LAZADA_DETAIL") sendResponse({ ok: true, ...window.TrakoLazada.detail() });
      } catch (error) { sendResponse({ ok: false, error: error.message }); }
      return;
    }
    if (message?.type === "TRAKO_GET_ORDER_LINKS") {
      (async () => {
        if (!window.TrakoAdapters?.isOrderPage()) throw new Error("Open your Shopee purchase history first.");
        const extraction = window.TrakoAdapters.extract();
        sendResponse({ ok: true, platform: window.TrakoAdapters?.platform || "", isOrderPage: true,
          links: window.TrakoAdapters?.getOrderLinks?.() || [], rows: extraction.rows || [],
          skippedProducts: extraction.skippedProducts || [], excludedOrders: extraction.excludedOrders || 0 });
      })().catch(error => sendResponse({ ok: false, error: error.message }));
      return true;
    }
    if (message?.type === "TRAKO_EXPORT_DETAIL") {
      try {
        if (window.TrakoAdapters?.platform !== "Shopee Philippines" || !/\/user\/purchase\/order\//i.test(location.pathname)) {
          throw new Error("The Shopee order detail page did not open.");
        }
        const extraction = window.TrakoAdapters.extract();
        sendResponse({ ok: extraction.rows.length > 0, rows: extraction.rows, skippedProducts: extraction.skippedProducts || [],
          skippedOrders: extraction.skippedOrders || 0, excludedOrders: extraction.excludedOrders || 0,
          error: extraction.rows.length ? "" : "No readable products on this order detail page." });
      } catch (error) { sendResponse({ ok: false, rows: [], error: error.message }); }
      return;
    }
    if (message?.type !== "TRAKO_EXPORT") return;
    (async () => {
      if (!window.TrakoAdapters?.platform) throw new Error("This website is not supported.");
      if (!window.TrakoAdapters.isOrderPage()) throw new Error(`Open your ${window.TrakoAdapters.platform} purchase or order history first.`);
      const extraction = window.TrakoAdapters.extract();
      if (!extraction.scannedOrders) throw new Error("No order cards were detected. Confirm the purchase history has finished loading, then try again.");
      const summary = window.TrakoCore.summarize(extraction.rows, extraction.scannedOrders, extraction.skippedOrders);
      sendResponse({ ok: true, platform: window.TrakoAdapters.platform, pageStatus: "Order history detected", rows: extraction.rows, summary,
        skippedProducts: extraction.skippedProducts || [], excludedOrders: extraction.excludedOrders || 0,
        capturedTooltipDates: window.TrakoAdapters.getCapturedTooltipDateCount?.() || 0 });
    })().catch(error => sendResponse({ ok: false, error: error.message }));
    return true;
  });

  let exportPanel;
  let exportPanelRoot;
  let panelClosedByUser = false;
  let exportRunning = false;
  let activeRunId = null;
  let latestProgress = null;
  let panelPageContext = null;
  function showExportPanel() {
    if (exportPanel?.isConnected) { updateIdlePanel(); return; }
    exportPanel = document.createElement("div");
    exportPanel.id = "trako-export-progress-host";
    Object.assign(exportPanel.style, { position: "fixed", right: "18px", bottom: "18px", zIndex: "2147483647", pointerEvents: "auto" });
    exportPanelRoot = exportPanel.attachShadow({ mode: "closed" });
    exportPanelRoot.innerHTML = `
      <style>
        *{box-sizing:border-box}.card{width:380px;max-width:calc(100vw - 32px);padding:16px;background:#fffaf4;color:#39231e;border:1px solid #f0c8b9;border-radius:16px;box-shadow:0 14px 42px #3c160c40;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px}.brand-wrap{display:flex;align-items:center;gap:10px}.mascot{width:46px;height:42px;object-fit:contain;flex:none}.brand{font-size:14px;font-weight:800;letter-spacing:-.2px}.subtitle{color:#8b5b4d;font-size:11px;margin-top:1px}.close{border:0;background:transparent;color:#7b5349;font-size:20px;line-height:1;cursor:pointer;padding:0 3px}
        .status{min-height:20px;color:#60443b;margin:8px 0}.meter{height:8px;border-radius:9px;background:#f5e2d9;overflow:hidden}.fill{height:100%;width:0;background:linear-gradient(90deg,#ed3027,#ff7648);transition:width .2s ease}.meta{display:flex;justify-content:space-between;color:#8b7067;font-size:11px;margin-top:7px}.actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.cancel,.pause,.start{border-radius:8px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer}.cancel,.pause{border:1px solid #e8cec4;background:#fff;color:#60443b}.start{border:0;background:#ed3027;color:white}button:disabled{opacity:.55;cursor:wait}.start:hover{background:#d8231c}.result{margin-top:10px;color:#60443b;font-weight:600;max-height:230px;overflow:auto}.result:empty{display:none}.summary-line{color:#60443b;font-size:12px}.skip-heading{margin:9px 0 5px;color:#39231e;font-size:12px;font-weight:750}.skip-list{display:grid;gap:6px}.skip-entry{padding:8px 9px;border:1px solid #f0ddd4;border-radius:9px;background:#fff}.skip-name{color:#39231e;font-size:12px;font-weight:700;overflow-wrap:anywhere}.skip-reason{margin-top:3px;color:#765e55;font-size:11px;line-height:1.4;overflow-wrap:anywhere}.skip-more{color:#765e55;font-size:11px}.foot{margin-top:12px;padding-top:10px;border-top:1px solid #f1ddd4;color:#9a7c72;font-size:10px}
      </style>
      <section class="card" role="status" aria-live="polite">
        <div class="top"><div class="brand-wrap"><img class="mascot" alt="Trako mascot"><div><div class="brand">Trako – Order Exporter</div><div class="subtitle">Local order history export</div></div></div><button class="close" aria-label="Close exporter" title="Close">×</button></div>
        <div class="status">${window.TrakoAdapters?.platform || "Shopping site"} detected. ${window.TrakoAdapters?.verified ? `Ready to export ${window.TrakoAdapters?.platform === "Lazada Philippines" ? "received or completed" : "completed"} orders.` : "Order extraction for this store still needs validation."}</div>
        <div class="meter"><div class="fill"></div></div>
        <div class="meta"><span class="count">Ready</span><span class="eta">Usually takes a few seconds</span></div>
        <div class="result"></div>
        <div class="actions"><button class="cancel" hidden>Cancel export</button><button class="pause" hidden>Pause</button><button class="start">Export orders to CSV</button></div>
        <div class="foot"><strong>Only orders currently loaded on this page are included.</strong> Load more orders on the shopping website and export again to include them. This panel stays open until you close it.</div>
      </section>`;
    exportPanelRoot.querySelector(".mascot").src = chrome.runtime.getURL("assets/mascot-head.svg");
    document.documentElement.append(exportPanel);
    exportPanelRoot.querySelector(".close").addEventListener("click", () => { panelClosedByUser = true; exportPanel.remove(); });
    exportPanelRoot.querySelector(".start").addEventListener("click", () => {
      if (!window.TrakoAdapters?.isOrderPage()) {
        const url = window.TrakoAdapters?.orderHistoryUrl;
        if (url) location.assign(url);
        return;
      }
      startExport(exportPanel.dataset.tabId ? Number(exportPanel.dataset.tabId) : undefined);
    });
    exportPanelRoot.querySelector(".cancel").addEventListener("click", () => {
      const tabId = exportPanel.dataset.tabId;
      chrome.runtime.sendMessage({ type: "TRAKO_CANCEL_EXPORT", tabId: tabId ? Number(tabId) : undefined, runId: activeRunId })
        .then(response => {
          if (!response?.ok) throw new Error(response?.error || "Could not cancel the scan. Please retry.");
        })
        .catch(error => updateExportPanel({ phase: "error", status: error.message }));
      updateExportPanel({ phase: "cancelling", status: "Cancelling and closing the current order tab…" });
    });
    exportPanelRoot.querySelector(".pause").addEventListener("click", async () => {
      const type = latestProgress?.phase === "paused" ? "TRAKO_CONTINUE_EXPORT" : "TRAKO_PAUSE_EXPORT";
      exportPanelRoot.querySelector(".pause").disabled = true;
      try {
        const response = await chrome.runtime.sendMessage({ type, runId: activeRunId });
        if (!response?.ok) throw new Error(response?.error || "Could not change the scan state. Please retry.");
      } catch (error) { updateExportPanel({ phase: "error", status: error.message }); }
    });
    panelPageContext = null;
    if (latestProgress) updateExportPanel(latestProgress);
    updateIdlePanel();
  }

  function updateIdlePanel() {
    if (!exportPanel?.isConnected || exportRunning) return;
    const adapter = window.TrakoAdapters;
    const onOrders = !!adapter?.isOrderPage();
    const context = `${location.pathname}|${onOrders}`;
    if (panelPageContext === context) return;
    const previousContext = panelPageContext;
    panelPageContext = context;
    // Preserve the finished scan while still on its order page.
    if (onOrders && latestProgress && (previousContext === null || previousContext === context)) return;
    latestProgress = null;
    const start = exportPanelRoot.querySelector(".start");
    start.hidden = false;
    start.disabled = onOrders ? !adapter?.verified : !adapter?.orderHistoryUrl;
    start.textContent = onOrders ? "Export orders to CSV" : "Open My Orders";
    exportPanelRoot.querySelector(".cancel").hidden = true;
    exportPanelRoot.querySelector(".pause").hidden = true;
    exportPanelRoot.querySelector(".result").replaceChildren();
    exportPanelRoot.querySelector(".fill").style.width = "0%";
    exportPanelRoot.querySelector(".count").textContent = onOrders ? "Ready" : "Open your order history";
    exportPanelRoot.querySelector(".eta").textContent = "";
    exportPanelRoot.querySelector(".foot").textContent = onOrders
      ? "Only orders currently loaded on this page are included. Load more orders on the shopping website and export again to include them. This panel stays open until you close it."
      : "Export is available from your order history. This panel stays open until you close it.";
    exportPanelRoot.querySelector(".status").textContent = !adapter?.verified
      ? `${adapter?.platform} detected. Export for this store is not available yet.`
      : onOrders
        ? `${adapter.platform} detected. Ready to export completed orders.`
        : `${adapter.platform} detected. Open My Orders and sign in normally to export your completed purchases.`;
  }

  function startExport(tabId) {
    if (exportRunning) return;
    if (!window.TrakoAdapters?.isOrderPage() || !window.TrakoAdapters?.verified) {
      showExportPanel();
      updateIdlePanel();
      return;
    }
    exportRunning = true;
    activeRunId = crypto.randomUUID();
    latestProgress = null;
    showExportPanel();
    if (tabId != null) exportPanel.dataset.tabId = String(tabId);
    exportPanelRoot.querySelector(".start").hidden = true;
    exportPanelRoot.querySelector(".cancel").hidden = false;
    exportPanelRoot.querySelector(".start").textContent = "Export orders to CSV";
    exportPanelRoot.querySelector(".result").replaceChildren();
    exportPanelRoot.querySelector(".fill").style.width = "0%";
    exportPanelRoot.querySelector(".count").textContent = "Starting…";
    exportPanelRoot.querySelector(".eta").textContent = "Estimating time…";
    updateExportPanel({ phase: "loading", status: "Scanning completed orders…" });
    if (["Shopee Philippines", "Lazada Philippines"].includes(window.TrakoAdapters.platform)) {
      const type = window.TrakoAdapters.platform === "Lazada Philippines" ? "TRAKO_EXPORT_LAZADA_HISTORY" : "TRAKO_EXPORT_SHOPEE_HISTORY";
      chrome.runtime.sendMessage({ type, tabId, runId: activeRunId }).then(response => {
        if (response?.busy) {
          activeRunId = response.runId;
          exportRunning = true;
          updateExportPanel(response.progress);
          return;
        }
        if (!response?.ok) throw new Error(response?.error || "Could not start export. Please retry.");
      }).catch(error => {
        exportRunning = false;
        exportPanelRoot.querySelector(".cancel").hidden = true;
        exportPanelRoot.querySelector(".start").hidden = false;
        exportPanelRoot.querySelector(".start").textContent = "Retry scan";
        updateExportPanel({ phase: "error", status: error.message || "Could not start export." });
      });
    } else {
      runSinglePageExport(tabId).catch(error => {
        exportRunning = false;
        updateExportPanel({ phase: "error", status: error.message || "Export failed." });
      });
    }
  }

  function updateExportPanel(progress) {
    if (progress.runId && activeRunId && progress.runId !== activeRunId) return;
    latestProgress = progress;
    const terminal = ["complete", "cancelled", "error"].includes(progress.phase);
    if (terminal) exportRunning = false;
    if (!exportPanel?.isConnected || !exportPanelRoot) return;
    const pause = exportPanelRoot.querySelector(".pause");
    pause.hidden = !exportRunning || !["Shopee Philippines", "Lazada Philippines"].includes(window.TrakoAdapters?.platform);
    pause.textContent = progress.phase === "paused" ? "Continue" : "Pause";
    pause.disabled = ["pausing", "cancelling"].includes(progress.phase);
    exportPanelRoot.querySelector(".cancel").disabled = progress.phase === "cancelling";
    if (exportRunning) {
      exportPanelRoot.querySelector(".cancel").hidden = false;
      exportPanelRoot.querySelector(".start").hidden = true;
    }
    if (progress.tabId != null) exportPanel.dataset.tabId = String(progress.tabId);
    const status = exportPanelRoot.querySelector(".status");
    const count = exportPanelRoot.querySelector(".count");
    const eta = exportPanelRoot.querySelector(".eta");
    const fill = exportPanelRoot.querySelector(".fill");
    const result = exportPanelRoot.querySelector(".result");
    if (progress.status) status.textContent = progress.status;
    if (progress.total != null && progress.total > 0) {
      const complete = Math.min(progress.completed || 0, progress.total);
      const orderLabel = window.TrakoAdapters?.platform === "Shopee Philippines" ? "orders checked" : "orders";
      count.textContent = `${complete} of ${progress.total} ${orderLabel}`;
      fill.style.width = `${Math.round(complete / progress.total * 100)}%`;
      eta.textContent = progress.remainingMs > 0 ? `About ${formatEta(progress.remainingMs)} left` : (complete >= progress.total ? "Finishing…" : "Estimating time…");
    }
    if (["paused", "pausing"].includes(progress.phase)) eta.textContent = progress.phase === "paused" ? "Paused" : "Pausing…";
    if (progress.phase === "complete") {
      exportRunning = false;
      fill.style.width = "100%";
      eta.textContent = "Done";
      result.replaceChildren();
      const summary = document.createElement("div");
      summary.className = "summary-line";
      if (window.TrakoAdapters?.platform === "Lazada Philippines") {
        const plural = (number, word) => `${number} ${word}${number === 1 ? "" : "s"}`;
        const products = progress.rowsExported || 0;
        const orders = progress.exportedOrders;
        const lines = [orders != null
          ? `Exported ${plural(products, "product")} from ${plural(orders, "order")}.`
          : `Exported ${plural(products, "product")}.`];
        if (products) {
          if (orders > 0 && progress.purchaseDates === orders && progress.deliveryDates === orders) {
            lines.push("Purchase and delivery dates included for all exported orders.");
          } else {
            lines.push(`Purchase dates found for ${plural(progress.purchaseDates || 0, "order")}.`);
            lines.push(`Delivery dates found for ${plural(progress.deliveryDates || 0, "order")}.`);
          }
        }
        if (progress.excludedOrders) lines.push(`Skipped ${plural(progress.excludedOrders, "order")}: ${progress.excludedOrders === 1 ? "it was" : "they were"} not completed.`);
        if (progress.skippedOrders) lines.push(`Could not export ${plural(progress.skippedOrders, "completed order")}. See the reasons below.`);
        if (progress.detailsUnavailable) lines.push(`Some details were unavailable for ${plural(progress.detailsUnavailable, "order")}. Available information was exported.`);
        summary.style.whiteSpace = "pre-line";
        summary.textContent = lines.join("\n\n");
      } else {
        summary.textContent = `${progress.rowsExported || 0} product rows exported. ${progress.skippedOrders || 0} order detail pages unreadable; loaded history data used where available. ${progress.excludedOrders || 0} non-completed orders excluded.`;
      }
      result.append(summary);
      const skippedProducts = [...new Map((progress.skippedProducts || []).map(entry => {
        const item = typeof entry === "string" ? { name: entry, reason: "Product details were incomplete." } : entry;
        return [`${item.name}|${item.reason}`, item];
      })).values()];
      if (skippedProducts.length) {
        const heading = document.createElement("div");
        heading.className = "skip-heading";
        heading.textContent = "Skipped products and reasons";
        const list = document.createElement("div");
        list.className = "skip-list";
        skippedProducts.slice(0, 20).forEach(item => {
          const entry = document.createElement("div");
          entry.className = "skip-entry";
          const name = document.createElement("div");
          name.className = "skip-name";
          name.textContent = item.name || "Product name unavailable";
          const reason = document.createElement("div");
          reason.className = "skip-reason";
          reason.textContent = item.reason || "The product details were incomplete.";
          entry.append(name, reason);
          list.append(entry);
        });
        result.append(heading, list);
        if (skippedProducts.length > 20) {
          const more = document.createElement("div");
          more.className = "skip-more";
          more.textContent = `Plus ${skippedProducts.length - 20} more skipped products.`;
          result.append(more);
        }
      }
      exportPanelRoot.querySelector(".cancel").hidden = true;
      exportPanelRoot.querySelector(".start").hidden = false;
      exportPanelRoot.querySelector(".start").textContent = "Scan again";
    } else if (progress.phase === "cancelled") {
      exportRunning = false;
      eta.textContent = "Cancelled";
      result.textContent = "Export cancelled. No more order tabs will open. Retry scan starts a fresh scan of the orders currently loaded.";
      exportPanelRoot.querySelector(".cancel").hidden = true;
      exportPanelRoot.querySelector(".start").hidden = false;
      exportPanelRoot.querySelector(".start").textContent = "Retry scan";
    } else if (progress.phase === "error") {
      exportRunning = false;
      eta.textContent = "Stopped";
      result.textContent = progress.status || "Export failed.";
      exportPanelRoot.querySelector(".cancel").hidden = true;
      exportPanelRoot.querySelector(".start").hidden = false;
      exportPanelRoot.querySelector(".start").textContent = "Retry scan";
    }
  }

  function formatEta(milliseconds) {
    const seconds = Math.max(1, Math.ceil(milliseconds / 1000));
    return seconds < 60 ? `${seconds}s` : `${Math.ceil(seconds / 60)}m`;
  }

  async function runSinglePageExport(tabId) {
    updateExportPanel({ phase: "loading", status: "Scanning the orders currently loaded on this page…" });
    const extraction = window.TrakoAdapters.extract();
    if (!extraction.scannedOrders) throw new Error("No order cards were detected. Open My Orders, wait for the orders to load, then retry the scan.");
    if (!extraction.rows.length) {
      updateExportPanel({ phase: "complete", status: "No eligible product rows found. No CSV was downloaded.",
        total: extraction.scannedOrders, completed: extraction.scannedOrders, rowsExported: 0,
        skippedOrders: extraction.skippedOrders, excludedOrders: extraction.excludedOrders,
        skippedProducts: extraction.skippedProducts });
      return;
    }
    updateExportPanel({ phase: "progress", status: "Preparing your CSV…", total: 1, completed: 0, remainingMs: 1500 });
    await chrome.runtime.sendMessage({ type: "TRAKO_DOWNLOAD_ROWS", tabId, platform: window.TrakoAdapters.platform,
      runId: activeRunId, rows: extraction.rows, scannedOrders: extraction.scannedOrders, skippedOrders: extraction.skippedOrders,
      excludedOrders: extraction.excludedOrders || 0, skippedProducts: extraction.skippedProducts || [] });
  }

  if (window.TrakoAdapters?.platform === "Shopee Philippines") {
    document.addEventListener("pointerover", event => captureHoveredShopeeTooltip(event), true);
    document.addEventListener("mouseover", event => captureHoveredShopeeTooltip(event), true);
  }

  // Show Trako throughout recognized shopping sites, with an order-history
  // shortcut outside the order page. Observe SPA content/navigation changes.
  function maybeShowDetectedPanel() {
    if (!panelClosedByUser && window.TrakoAdapters?.platform) showExportPanel();
  }
  maybeShowDetectedPanel();
  window.addEventListener("popstate", maybeShowDetectedPanel);
  let detectTimer;
  new MutationObserver(() => {
    clearTimeout(detectTimer);
    detectTimer = setTimeout(maybeShowDetectedPanel, 350);
  }).observe(document.documentElement, { childList: true, subtree: true });

  let lastHoveredTarget = null;
  async function captureHoveredShopeeTooltip(event) {
    if (!event.isTrusted || !event.target?.closest || event.target === lastHoveredTarget) return;
    lastHoveredTarget = event.target;
    const target = event.target;
    const text = element => String(element?.innerText || element?.textContent || "").replace(/\s+/g, " ").trim();
    let card = target;
    while (card && card !== document.body) {
      if (text(card).length > 12000) return;
      if (/order\s*total\s*[:：]?\s*(?:₱|PHP)\s*[\d,]+/i.test(text(card))) {
        let larger = card;
        while (larger.parentElement && larger.parentElement !== document.body) {
          const parent = larger.parentElement;
          if (text(parent).length >= 12000 || [...text(parent).matchAll(/order\s*total\s*[:：]?\s*(?:₱|PHP)\s*[\d,]+/ig)].length !== 1) break;
          larger = parent;
        }
        card = larger;
        break;
      }
      card = card.parentElement;
    }
    if (!card || card === document.body) return;
    await new Promise(resolve => setTimeout(resolve, 250));
    const visible = element => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden" && getComputedStyle(element).display !== "none";
    const candidates = [...document.querySelectorAll("[title], [aria-label], [role=tooltip], body *")]
      .filter(el => visible(el) && text(el).length < 240)
      .map(el => `${text(el)} ${el.getAttribute("title") || ""} ${el.getAttribute("aria-label") || ""}`);
    const tooltipText = candidates.find(value => /last\s+update\s+time/i.test(value) && window.TrakoCore.extractDateToken(value));
    if (tooltipText) {
      const date = window.TrakoCore.normalizeDate(window.TrakoCore.extractDateToken(tooltipText));
      window.TrakoAdapters.setDeliveryTooltipDate(card, date);
      window.dispatchEvent(new CustomEvent("trako-tooltip-date-captured", { detail: { count: window.TrakoAdapters.getCapturedTooltipDateCount() } }));
    }
  }
})();
