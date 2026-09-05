import { createServerFn } from "@tanstack/react-start";
import {
  findLinkedInCourses,
  linkedInCourseSchema,
  type LinkedInCourse,
} from "./linkedin-learning.server";

export type { LinkedInCourse };

export const getLinkedInCourses = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => linkedInCourseSchema.parse(data))
  .handler(async ({ data }): Promise<Record<string, LinkedInCourse[]>> =>
    findLinkedInCourses(data.skills),
  );
