import { api } from "./api";
import { ensureCatalog } from "./bootstrap";
import { handleCorsPreflight, withCors } from "./cors";
import { handleScheduled } from "./scheduled";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const preflight = handleCorsPreflight(request);
      if (preflight) return preflight;
      await ensureCatalog(env.DB);
      const response = await api.fetch(request, env, ctx);
      return withCors(request, response);
    }
    return new Response(null, { status: 404 });
  },
  async scheduled(_controller, env, ctx) {
    await ensureCatalog(env.DB);
    await handleScheduled(env, ctx);
  },
} satisfies ExportedHandler<Env>;
