import { ConvexHttpClient } from "convex/browser";
import { api } from "./convexGenerated";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!url) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL must be configured to contact Convex.");
}

// After the check above, url is guaranteed to be a string
const convexUrl: string = url;

export function createConvexServerClient(authToken?: string) {
  const client = new ConvexHttpClient(convexUrl);
  if (authToken) {
    client.setAuth(authToken);
  }
  return client;
}

export { api };
