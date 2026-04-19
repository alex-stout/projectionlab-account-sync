import type { Account } from "~/types";

export function accountKey(acc: Account, i: number): string {
  return acc.accountId ?? acc.name;
}

export function fmt(balance: number): string {
  return "$" + balance.toLocaleString();
}

export function timeAgo(ts: number | null): string {
  if (!ts) return "never";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
