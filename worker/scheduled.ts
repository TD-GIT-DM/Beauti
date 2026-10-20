import { scanDeals } from "../src/services/deals";
import { scheduledJob } from "../src/services/deals/fetch-budget";
import { scanReviews } from "../src/services/reviews/scan";

export async function handleScheduled(env: Env, ctx: ExecutionContext, cron?: string): Promise<void> {
  const job = scheduledJob(cron);
  if (job === "reviews") {
    const run = scanReviews(env).then((summary) => {
      console.log(JSON.stringify({ event: "review_scan", cron: cron ?? null, ...summary }));
    });
    ctx.waitUntil(run);
    await run;
    return;
  }
  const run = scanDeals(env, { job }).then((summary) => {
    console.log(JSON.stringify({ event: "deal_scan", job, cron: cron ?? null, ...summary }));
  });
  ctx.waitUntil(run);
  await run;
}
