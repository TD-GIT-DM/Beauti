import { scanDeals } from "../src/services/deals";

export async function handleScheduled(env: Env, ctx: ExecutionContext): Promise<void> {
  const run = scanDeals(env).then((summary) => {
    console.log(JSON.stringify({ event: "deal_scan", ...summary }));
  });
  ctx.waitUntil(run);
  await run;
}
