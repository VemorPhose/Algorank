## User vs Admin — Data Flow Through the System

### 👤 Regular User Journey (e.g., a contestant)

```
1. REGISTER
   POST /auth/register  →  app/auth/router.py → register_user() in service.py
   - bcrypt hashes password → stored in users table
   - JWT access + refresh tokens returned
   - Role defaults to "user"

2. BROWSE CONTESTS
   GET /contests  →  app/contests/router.py → list_contests() in service.py
   - First request: queries PostgreSQL, caches result in Redis
   - Subsequent requests: served from Redis cache (60s TTL)

3. VIEW A CONTEST
   GET /contests/{id}  →  get_contest_read()
   - Joins contests + participants + problems to show counts
   - Also cached in Redis

4. REGISTER FOR CONTEST
   POST /contests/{id}/register  →  register_for_contest()
   - Checks: contest is PUBLISHED, deadline not passed, contest not ended
   - Uses SELECT ... FOR UPDATE to lock the contest row (prevents race conditions)
   - Inserts into contest_participants table
   - Invalidates Redis cache for that contest

5. SUBMIT CODE
   POST /submissions  →  app/submissions/router.py → create_submission()
   - Rate limited (5 per 60s per user)
   - Checks: contest is active, user is registered, problem exists in contest
   - Creates Submission row (status=QUEUED) + SubmissionJob row
   - Pushes job envelope to Redis queue
   - Worker picks it up → sends to Judge0 → writes results → updates leaderboard
   - Returns 202 Accepted immediately (async processing)

6. CHECK SUBMISSION STATUS
   GET /submissions/{id}  →  get_submission_for_read()
   - Returns current status: queued → processing → accepted/wrong_answer/...
   - Includes per-test-case results (time, memory, passed/failed)

7. VIEW LEADERBOARD
   GET /contests/{id}/leaderboard  →  app/leaderboard/router.py
   - Served from Redis sorted set if available (5s cache)
   - Fallback: rebuilt from PostgreSQL
   - Shows rank, username, score, solved count, penalty time
```

---

### 🛡️ Admin Journey

```
1. LOGIN (auto-bootstrapped)
   - On first startup, bootstrap_admin() in main.py creates admin@algorank.dev
   - Login via POST /auth/login → role returned as "admin"

2. CREATE PROBLEMS
   POST /problems  →  app/problems/router.py → create_problem()
   - Requires ADMIN or ORGANIZER role (enforced by require_roles dependency)
   - Creates problem with test cases (stdin + expected_output pairs)
   - Test cases are what Judge0 runs user code against

3. CREATE CONTEST
   POST /contests  →  app/contests/router.py → create_contest()
   - Sets title, start/end times, registration deadline, allowed languages
   - Starts as DRAFT

4. ATTACH PROBLEMS TO CONTEST
   POST /contests/{id}/problems  →  attach_problem_to_contest()
   - Links a problem to a contest with points and ordering

5. PUBLISH CONTEST
   POST /contests/{id}/publish  →  set_contest_status()
   - Changes status from DRAFT → PUBLISHED
   - Users can now see and register for it

6. MONITOR SYSTEM
   GET /admin/queue-status  →  app/api/admin.py
   - Shows Redis queue depths (pending, processing, dead_letter)
   - Shows database job counts by status

   GET /admin/workers
   - Lists active worker processes and their heartbeats
```

---

### 🔄 The Async Submission Pipeline (when user submits code)

```
User submits code
  │
  ▼
POST /submissions → create_submission()
  │  • Validates contest/user/problem
  │  • INSERTs Submission + SubmissionJob in one transaction
  │  • RPUSH job envelope into Redis queue "algorank:queue:submissions:pending"
  │  • Returns 202 Accepted immediately
  │
  ▼
Worker (app/workers/runner.py) — infinite loop:
  │  while not stopped:
  │    BRPOPLPUSH pending → processing (atomic dequeue)
  │    mark_job_processing() — updates DB status to PROCESSING
  │    load_submission_for_worker() — fetches submission + problem + test cases
  │    judge0.run_submission() — sends code to Judge0, polls for results
  │    persist_judge_results() — writes test results, updates submission status
  │    recompute_participant_score() — recalculates score + penalty
  │    LeaderboardService.update_participant() — updates Redis sorted set
  │    ACK the job (removes from processing queue)
  │
  ▼
User polls GET /submissions/{id} → sees status change to ACCEPTED/WRONG_ANSWER/...
Leaderboard reflects the new score in near-real-time
```

---

## Frontend Workflow Map

The new React frontend lives in `frontend/` and targets the v2 API contract directly. It does not use Firebase or the legacy Express routes.

### Public visitor

```text
1. Opens /
   - Frontend requests GET /api/contests and GET /api/problems.
   - Vite/nginx strips /api before FastAPI receives the request.

2. Browses contests
   - GET /api/contests
   - Contest cards derive live/upcoming/ended phases from start_time and end_time.

3. Opens a contest
   - GET /api/contests/{id}
   - GET /api/contests/{id}/problems
   - GET /api/contests/{id}/leaderboard/live with fallback to /leaderboard.

4. Opens a problem
   - GET /api/problems/{slug}
   - Submission controls are visible but require sign-in and a contest context.
```

### Authenticated contestant

```text
1. Registers or logs in
   - POST /api/auth/register or POST /api/auth/login
   - Frontend stores access + refresh token session.
   - On a 401, the API client calls POST /api/auth/refresh once and retries.

2. Registers for a contest
   - POST /api/contests/{id}/register
   - Frontend refreshes GET /api/me/contests for registered-state badges.

3. Solves a contest problem
   - Contest problem link includes contestId and problemId query params.
   - POST /api/submissions with an Idempotency-Key header.
   - Frontend polls GET /api/submissions/{id} until the submission reaches a terminal status.

4. Reviews history
   - GET /api/me/submissions
   - GET /api/submissions/{id}
```

### Organizer/admin

```text
1. Opens /admin
   - Route guard requires admin or organizer role.

2. Creates contest
   - POST /api/contests
   - Contest starts as draft.

3. Creates problem
   - POST /api/problems
   - Test cases are submitted as stdin/expected_output pairs.

4. Attaches problem
   - POST /api/contests/{id}/problems

5. Publishes or closes contest
   - POST /api/contests/{id}/publish
   - POST /api/contests/{id}/close

6. Admin-only system status
   - GET /api/admin/queue-status
   - GET /api/admin/workers
```

### Production routing

```text
Browser
  │
  ▼
Nginx
  ├─ /, /contests, /problems, ... → static React build with index.html fallback
  ├─ /api/*                       → FastAPI with /api stripped
  ├─ /docs, /redoc, /openapi.json  → FastAPI docs
  └─ /health                       → FastAPI health
```
