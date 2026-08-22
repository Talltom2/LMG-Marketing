type WalmartTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

const baseUrl = process.env.WALMART_API_BASE_URL ?? "https://marketplace.walmartapis.com";

function getCredentials() {
  const clientId = process.env.WALMART_CLIENT_ID;
  const clientSecret = process.env.WALMART_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Walmart Marketplace credentials are not configured.");
  }

  return { clientId, clientSecret };
}

export function walmartConfigured() {
  return Boolean(process.env.WALMART_CLIENT_ID && process.env.WALMART_CLIENT_SECRET);
}

export async function getWalmartAccessToken(): Promise<WalmartTokenResponse> {
  const { clientId, clientSecret } = getCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${baseUrl}/v3/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Walmart token request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return response.json() as Promise<WalmartTokenResponse>;
}

export async function walmartRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getWalmartAccessToken();
  const correlationId = crypto.randomUUID();

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "WM_SEC.ACCESS_TOKEN": token.access_token,
      "WM_QOS.CORRELATION_ID": correlationId,
      "WM_SVC.NAME": "LMG Marketing Intelligence",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Walmart API request failed (${response.status}): ${body.slice(0, 500)}`);
  }

  return response.json() as Promise<T>;
}
