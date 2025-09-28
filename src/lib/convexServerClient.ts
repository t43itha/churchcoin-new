import { ConvexHttpClient } from "convex/browser";
import { api } from "./convexGenerated";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!url) {
  console.warn(
    "NEXT_PUBLIC_CONVEX_URL is not set. Convex HTTP client calls will fail unless configured."
  );
}

export const convexServerClient = new ConvexHttpClient(
  url ?? "https://placeholder-url.convex.cloud"
);

export { api };
