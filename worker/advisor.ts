import {
  ADVISOR_MESSAGE_MAX,
  ADVISOR_MODEL,
  advisorSystemPrompt,
  advisorUserPrompt,
  catalogShortlist,
  clampAdvisorMessage,
  clientAdvisorProducts,
  effectiveQuestion,
  expandAdvisorQuery,
  groundAdvisorPick,
  parseAdvisorJson,
  type AdvisorCatalogProduct,
} from "../src/lib/advisor";
import type { AdvisorMessage, AdvisorResponse } from "../src/types";
import { mapProduct, withDiscount, type ProductRow } from "./db";

const JSON_SCHEMA = {
  type: "json_schema",
  json_schema: {
    type: "object",
    properties: {
      reply: { type: "string" },
      productIds: { type: "array", items: { type: "string" } },
    },
    required: ["reply", "productIds"],
  },
} as const;

export function toAdvisorProduct(row: ProductRow): AdvisorCatalogProduct {
  const product = withDiscount(mapProduct(row));
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    description: product.description,
    imageUrl: product.imageUrl,
    price: product.price,
    currency: product.currency,
    tags: product.tags,
    availability: product.availability,
    restockEstimate: product.restockEstimate,
  };
}

export function parseAdvisorRequest(body: unknown): { question: string; messages: AdvisorMessage[] } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid JSON" };
  const record = body as { message?: unknown; messages?: unknown };
  const messages: AdvisorMessage[] = [];
  if (Array.isArray(record.messages)) {
    for (const item of record.messages.slice(-8)) {
      if (!item || typeof item !== "object") continue;
      const row = item as { role?: unknown; content?: unknown };
      if ((row.role === "user" || row.role === "assistant") && typeof row.content === "string") {
        const content = clampAdvisorMessage(row.content);
        if (content) messages.push({ role: row.role, content });
      }
    }
  }
  if (typeof record.message === "string") {
    const content = clampAdvisorMessage(record.message);
    if (content) messages.push({ role: "user", content });
  }
  const question = effectiveQuestion(messages);
  if (!question) return { error: "message required" };
  if (question.length > ADVISOR_MESSAGE_MAX) return { error: "message too long" };
  return { question, messages };
}

export async function adviseFromCatalog(env: Env, question: string, messages: AdvisorMessage[]): Promise<AdvisorResponse> {
  const { results } = await env.DB.prepare(
    `SELECT id, name, brand, description, image_url, price, list_price, currency, product_url, tags, promo_codes, deal_score, availability, restock_estimate, created_at, updated_at FROM products`,
  ).all<ProductRow>();
  const catalog = (results ?? []).map(toAdvisorProduct);
  const query = expandAdvisorQuery(question);
  const shortlist = catalogShortlist(catalog, question);
  if (!shortlist.length) {
    const grounded = groundAdvisorPick(null, shortlist, query);
    return {
      reply: grounded.reply,
      products: clientAdvisorProducts(grounded.products),
      searchHint: grounded.searchHint,
      grounded: true,
      model: null,
    };
  }

  const aiPick = await rankWithWorkersAi(env, question, shortlist, messages);
  const grounded = groundAdvisorPick(aiPick.pick, shortlist, query);
  return {
    reply: grounded.reply,
    products: clientAdvisorProducts(grounded.products),
    searchHint: grounded.searchHint,
    grounded: true,
    model: aiPick.model,
  };
}

async function rankWithWorkersAi(
  env: Env,
  question: string,
  shortlist: AdvisorCatalogProduct[],
  messages: AdvisorMessage[],
): Promise<{ pick: ReturnType<typeof parseAdvisorJson>; model: string | null }> {
  if (!env.AI) return { pick: null, model: null };
  const promptMessages = [
    { role: "system", content: advisorSystemPrompt() },
    { role: "user", content: advisorUserPrompt(question, shortlist, messages) },
  ];
  try {
    const result = await env.AI.run(ADVISOR_MODEL, {
      messages: promptMessages,
      max_tokens: 400,
      response_format: JSON_SCHEMA,
    });
    return { pick: parseAdvisorJson(result), model: ADVISOR_MODEL };
  } catch (error) {
    console.log(JSON.stringify({ event: "advisor_ai_failed", error: String(error) }));
    try {
      const result = await env.AI.run(ADVISOR_MODEL, {
        messages: promptMessages,
        max_tokens: 400,
      });
      return { pick: parseAdvisorJson(result), model: ADVISOR_MODEL };
    } catch (retryError) {
      console.log(JSON.stringify({ event: "advisor_ai_retry_failed", error: String(retryError) }));
      return { pick: null, model: null };
    }
  }
}
