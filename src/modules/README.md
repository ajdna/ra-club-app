# Modules

Each folder is a backend/domain module from the **Technical Architecture v1.0**
(Section 3, "Module Breakdown"). The platform starts as a *modular monolith*:
modules live in one codebase but keep clear boundaries so they can be split out
later if scale demands it.

Convention per module:

- `index.ts` — public surface of the module (re-exports). Other modules import
  from here, not from internal files.
- `README.md` — what the module owns, the entities it touches, and which of the
  14 "killer features" it backs.
- (later) `queries.ts`, `actions.ts`, `types.ts`, `components/` as needed.

| Module          | Architecture name              | Backs (killer features)                          |
| --------------- | ------------------------------ | ------------------------------------------------ |
| `identity`      | Identity & Roles               | RBAC foundation for all                          |
| `hierarchy`     | Hierarchy & Tree               | Closure-table visibility (downline/sideline)     |
| `members`       | Member Lifecycle               | #1 Morning Command Center, member onboarding     |
| `health-score`  | Health Score AI                | #2 Health Score + Early Warning, Coach Wellness  |
| `dmo`           | DMO & Scoring                  | #3 Coach Dashboard (self-motivation, no shaming) |
| `followup`      | Follow-up Engine               | 90-day auto-task generation                      |
| `treasury`      | Treasury & Finance             | NCO/JCO multi-tenant ledger, cash profit         |
| `recognition`   | Gift & Recognition             | #6 Real-Time Recognition, #7 Gift Pipeline       |
| `marathon`      | Marathon Module                | 21-day cohorts, evidence, leaderboard            |
| `comms`         | Comms & Broadcast              | #5 Knowledge Hub, #11 Team Spaces, #13 Broadcast |
| `rules-engine`  | Rules Engine                   | Admin Console; config-driven pricing/criteria    |
| `notifications` | Notification & Scheduler       | In-app bell + FCM push, background jobs          |

> **Two principles that constrain every module** (Business Brief §10):
> *self-motivation, never enforcement* (no shaming/surveillance), and
> *configurable, not hard-coded* (read parameters from `rules-engine`).
