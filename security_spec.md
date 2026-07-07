# KITS Guntur Academic Registry - Security Specification

This document details the security design, data invariants, and adversarial test suite for the KKR & KSR Institute of Technology and Sciences (KITS Guntur) Academic Registry system.

## 1. Core Data Invariants

1. **RBAC Profile Sanity**: User roles must strictly reside in `['student', 'lecturer', 'admin']`. Users are forbidden from self-assigning arbitrary roles or elevating privileges.
2. **Grade Integrity**: Numerical grades and marks must reside within bounds (`marks <= maxMarks`), and the results must only be generated or updated by authorized lecturers/admins.
3. **Attendance Validation**: Daily classroom attendance status must be binary (`'present'` or `'absent'`) and marked exclusively by subjects' specialized lecturers.
4. **Immutable Timestamps**: Record registration metadata such as `createdAt` must remain unmodified after the initial write operation.
5. **Path Hardening**: Document path IDs must be bounded in length (<=128 characters) and conform to alphanumeric-hyphen regex rules to prevent path injection and Denial of Wallet database exhaustion.

---

## 2. The "Dirty Dozen" Threat Payloads

These 12 test payloads represent malicious attempts to bypass security rules, inject ghost fields, poison states, or escalate credentials.

### Payload 1: Role Escalation Attack (Users)
*   **Target Collection**: `/users`
*   **Attack Vector**: An unauthorized user tries to register with `role: "god_mode"`.
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by role enum validation).

### Payload 2: Ghost Field Injection (Users)
*   **Target Collection**: `/users`
*   **Attack Vector**: Registering with a valid schema but injecting a "Ghost Field" `isVerified: true` to bypass verification steps.
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by strict map key size and exact key check).

### Payload 3: Value Poisoning - Extreme Name (Users)
*   **Target Collection**: `/users`
*   **Attack Vector**: Registering a profile with a 2MB string for the `name` field to exhaust storage.
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by length constraint checks).

### Payload 4: Invalid Assignment Structure (Assignments)
*   **Target Collection**: `/assignments`
*   **Attack Vector**: Uploading an assignment payload lacking mandatory fields like `dueDate` or `subject`.
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by required schema fields check).

### Payload 5: Marks Out Of Bounds (Results)
*   **Target Collection**: `/results`
*   **Attack Vector**: Posting midterm exam results where a student is awarded `marks: 120` out of `maxMarks: 50` or using a non-numeric type.
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by value bounds checks).

### Payload 6: Invalid Attendance Status (Attendance)
*   **Target Collection**: `/attendance`
*   **Attack Vector**: Setting student attendance status to `"skipped"` or `"suspended"` instead of `'present'` or `'absent'`.
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by attendance status enum constraints).

### Payload 7: Event Category Poisoning (Events)
*   **Target Collection**: `/events`
*   **Attack Vector**: Injecting an unapproved event category `"raves"` instead of academic/cultural/sports.
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by event category enum check).

### Payload 8: Study Group Members Type Poisoning (Groups)
*   **Target Collection**: `/groups`
*   **Attack Vector**: Writing a study group where the `members` field is a 1MB string instead of a valid List/Array.
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by type validation).

### Payload 9: Library Book Status Manipulation (Library)
*   **Target Collection**: `/library`
*   **Attack Vector**: Setting a book status to `"lost"` or `"damaged"` via client SDK to bypass late returns.
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by status enum check).

### Payload 10: Path ID Poisoning (Any)
*   **Target Collection**: `/users` (or any subcollection)
*   **Attack Vector**: Specifying a document ID of 1000 characters filled with junk regex escape symbols (e.g. `stud_../../../abc`).
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by alphanumeric ID path validation helper).

### Payload 11: Immutability Violation (Results)
*   **Target Collection**: `/results`
*   **Attack Vector**: Updating an existing exam result to change the `recordedBy` or `createdAt` timestamp.
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by immutable field updates guard).

### Payload 12: Denial of Wallet Message Bloat (Chat)
*   **Target Collection**: `/groups/{groupId}/messages`
*   **Attack Vector**: Injecting a chat message content exceeding 2000 characters.
*   **Expected Result**: `PERMISSION_DENIED` (Rejected by text size constraints).

---

## 3. Red Team Evaluation Matrix

| ID  | Vulnerability Tested       | Test Target         | Mitigation Logic              | Status |
| --- | -------------------------- | ------------------- | ----------------------------- | ------ |
| P1  | Privilege Escalation       | `/users`            | Role enum check               | PASS   |
| P2  | Ghost Field Injection      | `/users`            | Strict key count checking     | PASS   |
| P3  | Storage Exhaustion         | `/users`            | `.size() <= 100` constraints  | PASS   |
| P4  | Schema Bypass              | `/assignments`      | Mandatory keys validation     | PASS   |
| P5  | Grade Spoofing             | `/results`          | Numeric boundaries validation | PASS   |
| P6  | Invalid Attendance States  | `/attendance`       | Status enum check             | PASS   |
| P7  | Event Schema Invariant     | `/events`           | Category enum validation      | PASS   |
| P8  | List Type Poisoning        | `/groups`           | `members is list` constraint  | PASS   |
| P9  | Status Enum Manipulation   | `/library`          | Book status validation        | PASS   |
| P10 | Path Traversal / Poisoning | All matching paths  | `isValidId()` regex check     | PASS   |
| P11 | Metadata Spoofing          | `/results`          | Immutability check            | PASS   |
| P12 | Resource Bloating          | `/groups/*/messages`| Message text size limit       | PASS   |
