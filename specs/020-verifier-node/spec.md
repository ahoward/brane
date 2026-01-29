# Feature Specification: Verifier Node

**Feature Branch**: `020-verifier-node`
**Created**: 2026-01-29
**Status**: Draft
**Input**: User description: "Headless verification node for running Brane verification as a service"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start Verifier Node (Priority: P1)

A system administrator wants to start a headless Brane verifier node that listens for verification requests. The node should run as a long-lived process that can accept verification jobs via HTTP API.

**Why this priority**: Starting and running the node is the fundamental capability. Without this, no verification can happen.

**Independent Test**: Can be tested by starting the node and confirming it responds to health checks.

**Acceptance Scenarios**:

1. **Given** a valid configuration, **When** the verifier node is started, **Then** it binds to the configured port and accepts connections
2. **Given** the node is running, **When** a health check request is sent, **Then** it returns status "healthy" with node info
3. **Given** the node is running, **When** it receives SIGTERM, **Then** it shuts down gracefully after completing in-flight requests

---

### User Story 2 - Submit Verification Request (Priority: P1)

A client (CI system, agent, or protocol) wants to submit a verification request to the node. The request includes a repository URL and optional parameters. The node clones/fetches the repo, runs verification, and returns results.

**Why this priority**: Core functionality - the entire purpose of the node is to verify remote repositories.

**Independent Test**: Can be tested by submitting a verification request with a test repository and confirming results are returned.

**Acceptance Scenarios**:

1. **Given** a valid repo URL, **When** a verification request is submitted, **Then** the node clones the repo and runs verification
2. **Given** a verification request, **When** verification completes, **Then** results include passed/failed status and violation details
3. **Given** multiple concurrent requests, **When** submitted simultaneously, **Then** the node processes them in parallel (up to configured limit)
4. **Given** an invalid repo URL, **When** submitted, **Then** the node returns an error with explanation

---

### User Story 3 - Check Verification Status (Priority: P2)

A client wants to check the status of a submitted verification request. Since verification can take time (clone + scan + verify), the API should support async job tracking.

**Why this priority**: For larger repos, verification is not instant. Clients need to poll for completion or receive callbacks.

**Independent Test**: Can be tested by submitting a verification, immediately querying status, and confirming it shows "in_progress" then "completed".

**Acceptance Scenarios**:

1. **Given** a submitted verification, **When** status is queried immediately, **Then** status shows "in_progress"
2. **Given** a completed verification, **When** status is queried, **Then** status shows "completed" with full results
3. **Given** a job ID that doesn't exist, **When** status is queried, **Then** an error indicates job not found

---

### User Story 4 - Webhook Callback (Priority: P3)

A client wants to receive a webhook callback when verification completes rather than polling. This enables event-driven architectures.

**Why this priority**: Webhook is a convenience feature for integration. Polling works for MVP.

**Independent Test**: Can be tested by submitting verification with a webhook URL and confirming the callback is received.

**Acceptance Scenarios**:

1. **Given** a verification request with webhook_url, **When** verification completes, **Then** results are POSTed to the webhook URL
2. **Given** a webhook that returns error, **When** callback fails, **Then** the node retries up to 3 times
3. **Given** no webhook_url provided, **When** verification completes, **Then** no callback is attempted

---

### Edge Cases

- What happens when the repo doesn't have a .brane directory? (Initialize and run verification against built-in rules)
- What happens when the node runs out of disk space? (Return error, clean up partial clone)
- How does the node handle very large repositories? (Configurable timeout, shallow clone option)
- What happens when verification is interrupted? (Job marked as failed, workspace cleaned up)
- How are concurrent jobs isolated? (Each job gets its own workspace directory)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose an HTTP API for receiving verification requests
- **FR-002**: System MUST clone/fetch repositories from provided URLs (git)
- **FR-003**: System MUST run Brane verification against cloned repositories
- **FR-004**: System MUST return structured verification results (same format as /calabi/pr-verify)
- **FR-005**: System MUST support async job processing with status polling
- **FR-006**: System MUST isolate concurrent jobs in separate workspace directories
- **FR-007**: System MUST clean up workspaces after job completion (configurable retention)
- **FR-008**: System MUST expose a health check endpoint
- **FR-009**: System MUST handle graceful shutdown on SIGTERM
- **FR-010**: System MUST log verification activities for auditing
- **FR-011**: System SHOULD support webhook callbacks for completed jobs

### Key Entities

- **Verification Job**: A queued or in-progress verification request with ID, status, repo URL, parameters, and results.
- **Node Configuration**: Settings for port, max concurrent jobs, workspace path, timeouts, and webhook retry policy.
- **Verification Result**: The outcome of running verification - same structure as /calabi/pr-verify output.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Node can start and respond to health checks within 5 seconds
- **SC-002**: Verification of a small repository (< 100 files) completes in under 60 seconds
- **SC-003**: Node can handle 10 concurrent verification jobs without degradation
- **SC-004**: Failed jobs are properly cleaned up with no orphaned workspace directories
- **SC-005**: Webhook callbacks are delivered within 5 seconds of job completion

## Assumptions

- The node trusts provided repository URLs (authentication/authorization is handled externally)
- Git is available on the host system for cloning repositories
- The node has sufficient disk space and network access
- Initial version does not include cryptographic verification or token economics (that's 021-protocol-spec)
- The node runs Brane verification commands internally (not via subprocess)
