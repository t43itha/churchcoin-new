import { ConvexHttpClient } from "convex/browser";
import { api } from "./convexGenerated";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!url) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_URL must be configured to contact Convex."
  );
}

export const convexServerClient = new ConvexHttpClient(url);

export { api };
