/**
 * followup module
 *
 * Follow-up Engine. Auto-generates the 90-day Consumer Follow-Up task list
 * (3 x 30-day cycles of calls / home visits / reminders) per coach per member.
 *
 * See src/modules/README.md for the full module map.
 */

export { generateForMember, regenerateForMember } from "./generate";
export { markTaskDone, clearOverdueTasks } from "./actions";
export {
  generateFollowupTasks,
  ACTIVITY_LABEL,
  type FollowupActivity,
  type GeneratedTask,
} from "@/lib/followup-planner";
