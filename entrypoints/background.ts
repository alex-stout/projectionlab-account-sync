export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.type === "SYNC_DATA") {
      // Save to extension storage
      await browser.storage.local.set({
        accounts: msg.payload,
        lastSynced: Date.now(),
      });
    }

    if (msg.type === "SYNC_TO_PL") {
      // sync values to Projection Lab
    }
  });
});
