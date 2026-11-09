import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: false,
  // Private bucket for the CV PDF; the API hands out short-lived download links.
  buckets: {
    documents: {},
  },
  functions: {
    api: {
      name: "portfolio api",
      source: "api/index.ts",
      env: {
        // Protects every /admin route used by the /data-project page.
        ADMIN_KEY: { value: process.env.ADMIN_KEY, required: true },
      },
    },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
