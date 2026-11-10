import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  preview: {
    functions: {
      storefront: { name: "storefront", source: "./api/storefront.ts" },
    },
  },
});
