import { scanDeals } from "../src/services/deals";
import { scheduledJob } from "../src/services/deals/fetch-budget";

export async function handleScheduled(env: Env, ctx: ExecutionContext, cron?: string): Promise<void> {
  const job = scheduledJob(cron);
  const run = scanDeals(env, { job }).then((summary) => {
    console.log(JSON.stringify({ event: "deal_scan", job, cron: cron ?? null, ...summary }));
  });
  ctx.waitUntil(run);
  await run;
}
