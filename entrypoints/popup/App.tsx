import { useEffect, useState } from "react";

type Account = {
  name: string | null;
  balance: number | null;
  rateOfReturn: number | null;
  accountId: string | null;
};

type StorageData = {
  accounts?: Account[];
  lastSynced?: number;
};

function getAccounts(): Promise<Account[]> {
  return new Promise((resolve) => {
    browser.storage.local.get(["accounts", "lastSynced"], (result) => {
      resolve((result.accounts as Account[]) || []);
    });
  });
}

export default function Popup() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    getAccounts().then(setAccounts);
  }, []);

  const handleSync = async () => {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    await browser.tabs.sendMessage(tab.id!, { type: "SYNC_REQUEST" });

    // small delay to allow extraction → storage
    setTimeout(() => {
      browser.storage.local.get("accounts", (result) => {
        return setAccounts((result.accounts as Account[]) || []);
      });
    }, 500);
  };

  return (
    <div className="p-4 w-80">
      <button
        onClick={handleSync}
        className="w-full bg-blue-600 text-white py-2 rounded-lg mb-4"
      >
        Sync Vanguard
      </button>

      <div className="space-y-3">
        {accounts.length ? (
          accounts.map((acc, i) => (
            <div key={i} className="p-3 border rounded-lg bg-gray-50">
              <div className="font-medium">{acc.name}</div>
              <div className="text-sm text-gray-600">
                ${acc.balance?.toLocaleString()}
              </div>
              {acc.rateOfReturn !== null && (
                <div className="text-sm text-green-600">
                  {acc.rateOfReturn}%
                </div>
              )}
            </div>
          ))
        ) : (
          <h3>No data</h3>
        )}
      </div>
    </div>
  );
}
