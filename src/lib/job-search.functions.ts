import { createServerFn } from "@tanstack/react-start";
import { jobSearchSchema, runJobSearch, type JobSearchResult } from "./job-search.server";

export type { JobSearchResult };

export const searchJobs = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => jobSearchSchema.parse(data))
  .handler(async ({ data }): Promise<JobSearchResult> => runJobSearch(data));
