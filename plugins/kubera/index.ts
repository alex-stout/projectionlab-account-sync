import crypto from "node:crypto";
import type { Account } from "~/types";
import type { SourcePlugin } from "../index";

import icon from "./icon.svg";

const API_URL = "https://api.kubera.com";

type Portfolio = {
	id: string;
	name: string;
	currency: string;
};

type PortfolioAccount = {
	id: string;
	name: string;
	balance: number;
	closed: boolean;
	deleted: boolean;
};

type GeneratedBody = {
	timestamp: string;
	signature: string;
	body: string;
};

/**
 * Creates timestamp and signs payload as is required for Kubera API
 * https://docs.google.com/document/d/1G6YjL27eOrfBQZPS6H91ZFDGZ97YnS6Ra5Nnsth7CYg
 **/
export const generateBody = async (
	apiKey: string,
	apiSecret: string,
	requestPath: string,
	data: string,
): Promise<GeneratedBody> => {
	const timestamp = String(Math.floor(Date.now() / 1000));

	const body = JSON.stringify(data);

	const unsignedPayload = `${apiKey}${timestamp}GET(${requestPath})${body}`;

	const signature = crypto
		.createHmac("sha256", apiSecret)
		.update(unsignedPayload)
		.digest("hex");

	return { timestamp, signature, body };
};

export async function refresh(
	creds: Record<string, string>,
): Promise<Account[]> {
	const token = creds.accessToken?.trim();
	if (!token) throw new Error("Kubera API key is not set.");

	const secret = creds.secret?.trim();
	if (!secret) throw new Error("Kubera secret is not set.");

	const portfolioPath = "";

	const requestData = await generateBody(
		token,
		secret,
		"/api/v3/data/portfolio",
		"",
	);

	// first get the portfolios
	const res = await fetch(`${API_URL}`, {
		headers: {
			"x-api-key": token,
			"x-timestamp": requestData.timestamp,
			"x-signature": requestData.signature,
		},
		body: requestData.body,
	});

	if (res.status === 401) {
		throw new Error("Kubera rejected the access token. Check that it's valid.");
	}
	if (!res.ok) {
		throw new Error(`Kubera API error: ${res.status} ${res.statusText}`);
	}

	const data = (await res.json()) as {
		data?: { accounts?: PortfolioAccount[] };
	};
	const accounts = data?.data?.accounts ?? [];

	return accounts
		.filter((a) => !a.closed && !a.deleted)
		.map((a) => ({
			name: a.name,
			balance: a.balance / 1000,
			accountId: a.id,
		}));
}

const plugin: SourcePlugin = {
	id: "kubera",
	name: "Kubera",
	icon,
	kind: "api",
	hint: "Add your Kubera API key and secret in Settings, then click ↻ Kubera.",
	credentials: [
		{
			key: "apiKey",
			label: "API Key",
			type: "password",
			help: "Generate in Kubera Settings > API",
		},
		{
			key: "apiSecret",
			label: "API Secret",
			type: "password",
			help: "Generate in Kubera Settings > API",
		},
	],
	refresh,
};

export default plugin;
