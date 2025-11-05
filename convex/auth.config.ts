export default {
  providers: [
    {
      // Issuer URL for the Clerk JWT template (your Frontend API URL)
      domain: process.env.CLERK_FRONTEND_API_URL,
      // Must match the name of your Clerk JWT template
      applicationID: "convex",
    },
  ],
};

