# Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants

1. **Authentication & Email Verification Invariant**: Every read (`get`, `list`) and write (`create`, `update`, `delete`) operation requires a valid authenticated user (`request.auth != null`) with a verified email (`request.auth.token.email_verified == true`).
2. **Strict Ownership Invariant**: Every document in `/semesters`, `/courses`, `/courseDates`, `/tasks`, and `/topics` is strictly private to its creator (`ownerId == request.auth.uid`). No user can read, list, create, update, or delete another user's records.
3. **Relational Hierarchy & Master Gate Invariant**:
   - A `Course` cannot be created unless its referenced `semesterId` exists in `/semesters/{semesterId}` and is owned by `request.auth.uid`.
   - A `CourseDate`, `CourseTask`, or `CourseTopic` cannot be created unless its referenced `courseId` exists in `/courses/{courseId}`, is owned by `request.auth.uid`, and its `semesterId` matches the parent course's `semesterId`.
4. **Immortal Fields Invariant**: Once created, `ownerId`, `createdAt`, `semesterId` (on courses and child entities), and `courseId` (on child entities) are strictly immutable during updates.
5. **Temporal Integrity Invariant**: `createdAt` and `updatedAt` must equal `request.time` on `create`, and `updatedAt` must equal `request.time` on `update`.
6. **Strict Schema & Volumetric Bounds Invariant**: All payloads must pass `isValid[Entity](incoming())` on both `create` and `update`, enforcing exact key allowlists (`hasAll` + `hasOnly`), string length bounds, regex ID guards (`^[a-zA-Z0-9_\-]+$`), and enum constraints.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Identity Spoofing on Create)**: Creating a semester where `ownerId` is set to `"victim_user_123"` instead of `request.auth.uid`.
2. **Payload 2 (Unverified Email Write)**: Creating a semester with `request.auth.token.email_verified == false`.
3. **Payload 3 (Shadow Field / Ghost Key Injection)**: Creating a course with an undeclared field `"isAdminOverride": true`.
4. **Payload 4 (Orphaned Course Creation)**: Creating a course referencing a `semesterId` (`"non_existent_sem"`) that does not exist or belongs to another user.
5. **Payload 5 (Orphaned Task Creation / Relational Mismatch)**: Creating a task referencing a valid `courseId` owned by another user or with a mismatched `semesterId`.
6. **Payload 6 (Immortal Field Mutation on Update)**: Updating a course to change `ownerId` or `semesterId` or `createdAt`.
7. **Payload 7 (Client Timestamp Forgery)**: Creating or updating a topic where `updatedAt` is a forged past/future timestamp instead of `request.time`.
8. **Payload 8 (Denial of Wallet / Oversized String Poisoning)**: Updating a topic's `title` with a 500-character string (exceeding `maxLength: 250`).
9. **Payload 9 (ID Poisoning Attack)**: Creating a document with an invalid ID containing spaces or special characters (`"bad id!@#"`).
10. **Payload 10 (Invalid Enum State Injection)**: Creating or updating a task with `"priority": "Kritická"` (not in `['Nízká', 'Střední', 'Vysoká']`).
11. **Payload 11 (Cross-Tenant List Scraping)**: Executing a collection `list` query on `/courses` without filtering by `ownerId == request.auth.uid`.
12. **Payload 12 (Value Type Poisoning on Update)**: Updating a whitelisted key (`isCompleted`) on `/tasks/{taskId}` with a string `"yes"` instead of a boolean.
