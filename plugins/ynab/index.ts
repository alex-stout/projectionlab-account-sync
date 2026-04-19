import type { Account } from "~/types";
import type { SourcePlugin } from "../index";
import icon from "./icon.svg";

const YNAB_API = "https://api.ynab.com/v1";

type YnabAccount = {
  id: string;
  name: string;
  balance: number;
  closed: boolean;
  deleted: boolean;
};

export async function refresh(
  creds: Record<string, string>,
): Promise<Account[]> {
  const token = creds.accessToken?.trim();
  if (!token) throw new Error("YNAB access token is not set.");

  const res = await fetch(`${YNAB_API}/budgets/last-used/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    throw new Error("YNAB rejected the access token. Check that it's valid.");
  }
  if (!res.ok) {
    throw new Error(`YNAB API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { data?: { accounts?: YnabAccount[] } };
  const accounts = data?.data?.accounts ?? [];

  return accounts
    .filter((a) => !a.closed && !a.deleted)
    .map((a) => ({
      name: a.name,
      balance: a.balance / 1000,
      rateOfReturn: null,
      accountId: a.id,
    }));
}

const plugin: SourcePlugin = {
  id: "ynab",
  name: "YNAB",
  icon,
  kind: "api",
  hint: "Add your YNAB Personal Access Token in Settings, then click ↻ YNAB.",
  credentials: [
    {
      key: "accessToken",
      label: "Personal Access Token",
      type: "password",
      help: "Generate one in YNAB → Account Settings → Developer Settings.",
    },
  ],
  refresh,
};

export default plugin;
