Algorank v2 Rebuild Plan

1. Project Summary

Algorank v2 is a backend-first contest hosting platform rebuilt from the existing Node/Express implementation into a FastAPI + PostgreSQL + Redis + Judge0 + Nginx architecture. The frontend is temporarily removed from the core rebuild so the entire effort can focus on backend correctness, concurrency, cache design, queue processing, real-time leaderboard behavior, and deployment realism.

The current application already has a strong contest-programming domain, but the backend needs a deeper systems-oriented implementation. In particular, the submission path should be made transactional and concurrency-safe, leaderboard updates should become realtime and cache-backed, and code execution should move to a local Judge0 deployment instead of relying on the online API.

This rebuild should be treated as a version 2 rather than a simple refactor. The domain remains competitive programming contests, but the implementation should be rethought so the project meaningfully demonstrates backend engineering skills.

⸻

2. Rebuild Goals

The rebuild should accomplish the following:

1. Replace Express/Node with FastAPI.
2. Preserve PostgreSQL as the system of record, but strengthen the backend with transactions, locking, and functions.
3. Run Judge0 locally in Docker to avoid API limits and gain full control over the execution pipeline.
4. Introduce a manually implemented Redis queue and worker layer in front of Judge0.
5. Use Redis sorted sets for active contest leaderboards.
6. Add Redis caching for hot reads such as contest metadata, problem details, and leaderboard snapshots.
7. Add rate limiting for sensitive endpoints, especially submissions.
8. Place Nginx between the frontend and backend.
9. Keep the project backend-major while allowing a future frontend to be connected later.
10. Make the submission and ranking flows robust enough to withstand concurrent usage and repeated retries.

⸻

3. Project Scope

The platform should be narrowed to a pure contest hosting system. That means the rebuild should emphasize:

* contest creation and lifecycle management
* problem assignment to contests
* contest registration and participation
* code submission and execution
* submission status tracking
* leaderboard computation and updates
* admin and organizer controls

Non-essential or distracting product features should be deprioritized for now.

Features to defer or remove from scope

* any unrelated general-purpose content feed
* any broad social or profile-heavy product expansion
* any frontend-heavy redesign work before the backend is stable
* any feature that does not support contest hosting, submission execution, or ranking

⸻

4. Proposed System Architecture

Runtime flow

Client / future frontend
→ Nginx
→ FastAPI
→ PostgreSQL for durable state
→ Redis for queueing, caching, rate limiting, and leaderboard state
→ Worker processes
→ Local Judge0 Docker instance
→ PostgreSQL + Redis updates

Responsibilities by layer

Nginx

* reverse proxy to the FastAPI backend
* route requests cleanly for eventual frontend and API separation
* optionally add edge rate limiting
* make the deployment feel production-like
* later support TLS termination if the project is deployed publicly

FastAPI

* expose the contest-hosting API
* validate request payloads
* enforce auth and permission rules
* coordinate transaction boundaries
* write durable submission and contest state
* enqueue jobs into Redis
* serve cached reads where appropriate

PostgreSQL

* store the source of truth for users, contests, problems, submissions, test results, and leaderboard history
* provide transactional consistency for the submission lifecycle
* support stored functions, constraints, and row-level locking where needed
* hold audit data and history records

Redis

* act as a submission queue
* support worker coordination
* maintain active leaderboard sorted sets
* cache hot data
* enforce rate limits
* optionally store short-lived job state or retry metadata

Worker processes

* consume submission jobs from Redis
* invoke Judge0 locally
* normalize and persist execution results
* update leaderboard structures
* handle retries and failures cleanly

Judge0 local Docker instance

* execute code submissions securely in a contained environment
* return test case results, runtime statuses, and execution metrics
* eliminate dependency on an external API quota

⸻

5. Functional Areas

5.1 Authentication and Authorization

The old Firebase-based auth should be replaced by an application-owned auth system.

Required auth capabilities

* user registration
* login
* logout
* JWT access tokens
* refresh tokens
* optional cookie-based auth for browser usage
* password hashing with bcrypt
* role-based authorization

Suggested roles

* admin: platform management, contest oversight, moderation, and configuration
* organizer: contest creation and editing
* user: contest participation and submission

Auth implementation expectations

* authentication should be FastAPI-native
* passwords should never be stored in plaintext
* access tokens should be short-lived
* refresh tokens should support revocation or rotation
* protected routes should be separated by role

⸻

5.2 Contest Management

The platform should center on contests.

Contest features

* create contest
* edit contest metadata
* set registration window
* set contest start and end times
* publish or unpublish contests
* attach problems to a contest
* optionally freeze results or standings near the end if desired

Contest data should support

* title
* description
* start time
* end time
* registration deadline
* visibility status
* allowed languages or rules
* organizer ownership
* participant counts

⸻

5.3 Problem Management

Problems should remain a first-class part of the system, but only in service of contests.

Problem features

* create problem statements
* update problem metadata
* assign problems to contests
* store sample input and output
* store judge test cases or references to test sets
* attach difficulty and tags if desired

Caching opportunities

* problem statement cache
* contest problem list cache
* sample test metadata cache

⸻

5.4 Registration and Participation

Users should be able to join contests during the valid registration window.

Participation features

* register for a contest
* detect duplicate registrations
* prevent late registration
* view contest eligibility
* list contests a user is registered for

Transactional expectations

Contest registration should be a transaction so that participant state, contest membership, and any derived records are consistent.

⸻

5.5 Submission Processing

This is the most important part of the rebuild.

Desired submission flow

1. user submits code for a problem in a contest
2. FastAPI validates contest access and timing rules
3. FastAPI creates a submission record in PostgreSQL inside a transaction
4. FastAPI enqueues a job in Redis
5. worker consumes the job
6. worker forwards the code to local Judge0
7. worker receives evaluation results
8. worker persists verdicts and execution metadata in PostgreSQL inside a transaction
9. worker updates leaderboard state in Redis
10. submission status becomes visible to the user

Submission invariants

* duplicate submission records should not appear due to retries
* submission creation should be idempotent where practical
* a failed execution should still produce a durable submission record
* result persistence should not partially update related contest data
* repeated worker retries should not corrupt standings

Concurrency concerns to solve

* multiple submissions from the same user at once
* simultaneous updates to the same contest leaderboard
* repeated queue delivery
* worker crash during result persistence
* result reprocessing after partial failure

⸻

5.6 Real-Time Leaderboard

The leaderboard should be one of the core showcase features.

Leaderboard design

* use Redis sorted sets for active contest standings
* update scores as submissions are processed
* store ranking-related metrics such as solved count, penalty, and timestamp tie-breakers
* optionally persist periodic snapshots to PostgreSQL for history and recovery

Leaderboard behavior

* should update quickly after accepted or rejected submissions
* should support contest-scoped ranking
* should handle tie-breaking consistently
* should be reconstructable from PostgreSQL if Redis state is lost

Recommended Redis pattern

* one sorted set per contest for live ranking
* auxiliary keys for tie-breaking, per-user contest state, and recent updates
* optional hash keys for contest participant score summaries

⸻

5.7 Caching

Redis caching should be added where it meaningfully reduces load.

Good cache targets

* contest metadata
* contest listing pages
* problem details
* leaderboard snapshots
* public leaderboard reads
* user contest dashboard summaries

Cache rules

* set explicit expiration times
* invalidate or refresh cache on updates
* never let cache become the only source of truth for critical state
* prefer cache-aside patterns for most reads

⸻

5.8 Rate Limiting

Rate limiting should protect the system from abuse and accidental overload.

Suggested limits

* submission endpoint per user
* login attempts per IP or per account
* contest registration attempts per user
* optionally problem read or leaderboard polling limits during contests

Implementation notes

* Redis is a good fit for shared rate-limit state
* rate limiting should be enforced close to the request entrypoint
* Nginx may also contribute an outer layer of protection

⸻

5.9 Admin and Organizer Operations

A contest platform needs administrative controls.

Organizer operations

* create contests
* edit contest details
* assign problems
* view contest submissions
* inspect participant lists
* monitor contest health

Admin operations

* manage users and roles
* moderate contests if necessary
* review platform metrics
* inspect worker and queue health
* view failed or stuck submissions

⸻

6. Data Model

The exact schema can be refined later, but the rebuild should likely include the following durable entities.

Core tables

* users
* roles
* refresh_tokens or sessions
* contests
* contest_participants
* problems
* contest_problems
* submissions
* submission_test_results
* leaderboard_snapshots
* audit_logs
* worker_jobs or submission_jobs if you want a persistent job ledger

Optional tables

* language_catalog
* problem_tags
* contest_rules
* contest_penalty_history
* submission_attempts

Key relationships

* one user can register for many contests
* one contest has many participants
* one contest has many problems
* one contest has many submissions
* one submission belongs to one user and one problem within one contest
* one submission can have many test case results

Data integrity expectations

* foreign keys should be used consistently
* uniqueness should prevent duplicate participation records
* submissions should be indexed for contest/user/time lookups
* leaderboard history should be queryable by contest and timestamp

⸻

7. PostgreSQL Design Expectations

This rebuild should explicitly demonstrate more than simple CRUD.

Transaction usage

Transactions should be used for:

* contest registration
* submission creation
* submission result persistence
* contest finalization steps
* leaderboard snapshot persistence

Locking and concurrency control

Use one or more of:

* SELECT ... FOR UPDATE
* row-level locking on contest or participant records
* optimistic version checks
* unique or exclusion constraints where appropriate

Functions and procedures

Use PostgreSQL functions for things like:

* computing contest standings from durable records
* producing daily or contest summary metrics
* deriving participant statistics
* validating state transitions or aggregation logic

Important database habits

* use migrations rather than ad hoc schema edits
* index time-sensitive and contest-scoped lookup paths
* keep the submission path durable and idempotent
* treat Redis as performance infrastructure, not source of truth

⸻

8. Redis Design Expectations

Redis should not just be used as a generic cache. It should play multiple meaningful roles.

8.1 Queue storage

Use Redis to hold pending submission jobs.

Possible structure:

* list-based queue
* stream-based queue
* custom job envelope plus retry metadata

8.2 Leaderboard storage

Use Redis sorted sets for active contest rankings.

Possible score model:

* solved count
* penalty time
* submission time tie-breaker

8.3 Cache storage

Use Redis for hot reads where response speed matters.

8.4 Rate-limit state

Store counters, windows, or token bucket state for sensitive endpoints.

8.5 Job safety and resilience

Include:

* retry counts
* dead-letter handling or failed-job tracking
* idempotent processing keys
* worker heartbeat or lock expiration if needed

⸻

9. Worker and Judge0 Pipeline

The worker layer is a major learning objective and should be intentionally designed.

Worker responsibilities

* fetch pending submission jobs
* validate job shape
* call Judge0 local container
* handle timeouts and error states
* write execution outcomes back to PostgreSQL
* update Redis leaderboard and cache entries
* mark jobs complete, failed, or retryable

Judge0 integration expectations

* use the local Docker deployment
* avoid dependence on paid or limited external execution APIs
* support the languages you need for the project
* normalize Judge0 verdicts into internal submission statuses

Failure handling

* requeue transient failures
* mark terminal failures clearly
* avoid duplicate processing where possible
* ensure result persistence is safe even if the worker crashes midway

⸻

10. API Design

The API should remain Swagger-friendly and be understandable without a custom frontend.

Suggested endpoint groups

Auth

* POST /auth/register
* POST /auth/login
* POST /auth/refresh
* POST /auth/logout
* GET /auth/me

Contests

* GET /contests
* GET /contests/{id}
* POST /contests
* PATCH /contests/{id}
* POST /contests/{id}/publish
* POST /contests/{id}/close

Problems

* GET /problems
* GET /problems/{id}
* POST /problems
* PATCH /problems/{id}
* POST /contests/{id}/problems

Registration

* POST /contests/{id}/register
* GET /contests/{id}/participants
* GET /me/contests

Submissions

* POST /submissions
* GET /submissions/{id}
* GET /me/submissions
* GET /contests/{id}/submissions

Leaderboard

* GET /contests/{id}/leaderboard
* GET /contests/{id}/leaderboard/live
* GET /contests/{id}/leaderboard/snapshot

Admin and health

* GET /health
* GET /metrics if desired
* GET /admin/queue-status
* GET /admin/workers

API expectations

* responses should be well documented
* request models should be validated with Pydantic
* endpoints should be easy to test in Swagger
* errors should be explicit and consistent

⸻

11. Security and Reliability

Security improvements

* hash passwords with bcrypt
* sign JWTs securely
* protect sensitive endpoints with auth and roles
* rate limit login and submission traffic
* keep Judge0 behind internal networking where possible
* use environment variables for secrets
* avoid leaking internal stack traces in production responses

Reliability improvements

* make submission processing idempotent
* persist each important state transition
* design queue consumers to recover after crashes
* rehydrate leaderboard state from durable data if Redis is lost
* ensure stale cache entries do not cause incorrect contest results

⸻

12. Observability and Debugging

The rebuild should not be a black box.

Recommended visibility features

* structured logs for request flow and worker flow
* queue depth inspection
* failed submission inspection
* worker health endpoints
* contest state summaries
* optional debug-only admin endpoints

Useful operational metrics

* submissions per minute
* queue depth
* worker throughput
* Judge0 execution latency
* leaderboard update latency
* rate-limit hits
* error and retry counts

⸻

13. Frontend Status

The frontend is temporarily out of scope for the rebuild.

Current approach

* use Swagger UI as the main interaction surface
* keep the API clear enough that a future frontend can plug in easily
* expose polished request/response schemas so testing is straightforward

Future frontend integration

When the backend is stable, a new frontend can be connected behind Nginx without redesigning backend contracts.

⸻

14. Recommended Build Phases

Phase 1: Foundation and Cleanup

* review the current repository structure
* isolate reusable domain concepts from old Node code
* define the new backend architecture
* set up FastAPI project layout
* configure PostgreSQL migrations
* configure local Judge0 deployment
* configure Redis and Nginx containers

Phase 2: Domain Rewrite

* rewrite contest, problem, submission, and auth models
* design the new schema
* implement role-based access control
* seed initial admin data

Phase 3: Transactional Submission Pipeline

* implement submission creation transactionally
* queue submission jobs in Redis
* add worker consumers
* persist Judge0 results transactionally
* prevent duplicate or partial submission state

Phase 4: Leaderboard and Real-Time State

* add Redis sorted-set leaderboards
* update rankings from worker outcomes
* add snapshotting or reconciliation logic
* expose leaderboard APIs

Phase 5: Caching and Rate Limiting

* add Redis cache-aside for hot reads
* add endpoint-level rate limiting
* tune cache TTLs and invalidation rules
* test for stale-read safety

Phase 6: Hardening and Deployment

* add Nginx routing
* standardize environment configuration
* add structured logs and health checks
* write integration tests and worker tests
* verify concurrency behavior under load

⸻

15. Testing Strategy

Testing should focus on correctness under real backend conditions.

Unit tests

* auth helpers
* ranking math
* permission checks
* submission state transitions
* cache key helpers
* queue job encoding and decoding

Integration tests

* register/login flow
* contest creation and publishing
* contest registration
* submission creation and result processing
* leaderboard update correctness
* cache invalidation behavior
* rate limiting behavior

Concurrency tests

* two users submitting at the same time
* repeated submission retries
* worker crash or restart while processing
* concurrent leaderboard updates
* duplicate registration attempts

Manual smoke tests

* Swagger-based API walkthrough
* Judge0 submission flow
* queue and worker health checks
* Redis and PostgreSQL state inspection

⸻

16. Milestone Definition of Done

The rebuild can be considered complete when the following are true:

* FastAPI fully replaces Express for the backend
* PostgreSQL remains the authoritative store and submission flow uses real transactions
* local Judge0 is working in Docker
* Redis queue and workers successfully process submissions
* contest leaderboards are maintained in Redis sorted sets
* hot GET endpoints are cached appropriately
* rate limiting is active on sensitive endpoints
* Nginx proxies traffic cleanly to the backend
* the project can be exercised end-to-end using Swagger UI
* submission and leaderboard behavior remains correct under concurrent requests

⸻

17. Implementation Principles

Keep the rebuild grounded in these rules:

1. Durable state belongs in PostgreSQL.
2. Redis improves speed and coordination, not truth.
3. Submission handling must be idempotent and transactional.
4. Leaderboard state must be fast, but also recoverable.
5. Judge0 is the execution engine; the app owns orchestration.
6. Swagger should be enough to use the backend during rebuild.
7. The project should demonstrate backend systems thinking, not just framework conversion.

⸻

18. Suggested Final Resume Positioning

A strong final description might read like:

Rebuilt a competitive programming contest platform from Express/Firebase to FastAPI with PostgreSQL, Redis, Nginx, and local Judge0 execution. Implemented transactional submission processing, Redis-backed job queues, real-time leaderboards with sorted sets, rate limiting, and cache-backed contest APIs.

That framing emphasizes system design, backend engineering, and practical infrastructure skills.