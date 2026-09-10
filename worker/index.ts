import { api } from "./api";
import { ensureCatalog } from "./bootstrap";
import { handleScheduled } from "./scheduled";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      await ensureCatalog(env.DB);
      return api.fetch(request, env, ctx);
    }
    return new Response(null, { status: 404 });
  },
  async scheduled(_controller, env, ctx) {
    await ensureCatalog(env.DB);
    await handleScheduled(env, ctx);
  },
} satisfies ExportedHandler<Env>;
