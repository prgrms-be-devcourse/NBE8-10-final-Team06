# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build
./gradlew build

# Run
./gradlew bootRun

# Test all
./gradlew test

# Run a single test class
./gradlew test --tests "com.devstagram.domain.feed.service.FeedServiceTest"

# Apply code formatting (Spotless + Palantir)
./gradlew spotlessApply

# Check formatting without applying
./gradlew spotlessCheck

# Run checkstyle (Naver convention)
./gradlew checkstyleMain
```

Spotless runs automatically on build and enforces: Palantir Java format, unused import removal, import ordering (`java` → `javax` → `org` → `com` → others), trailing whitespace removal, final newline.

## Architecture

### Domain structure

Each domain under `com.devstagram.domain.*` follows a consistent layered layout:

```
domain/{name}/
  entity/       - JPA entities (soft-delete via isDeleted flag)
  dto/          - Request/Response DTOs with Bean Validation
  controller/   - REST endpoints, use @AuthenticationPrincipal for auth user
  service/      - Business logic
  repository/   - Spring Data JPA interfaces
```

Global cross-cutting concerns live in `com.devstagram.global.*`:
- `security/` — JWT filter chain, STOMP auth interceptor
- `config/` — Async executor, WebSocket, CORS, storage
- `rsdata/RsData` — Universal response wrapper (resultCode, msg, data)
- `exception/ServiceException` — Domain exceptions caught by global handler
- `storage/` — `StorageService` interface with Local/S3 implementations

### Feed system

Feed ranking uses Redis sorted sets:
- Per-user feed: `feed:user:{userId}` (max 500 entries)
- Global feed: `posts:global:scores`
- `FeedScoringStrategy` scores posts by follow relationship + tech-tag match
- `FeedService.deliverPostToFeeds()` runs `@Async("feedTaskExecutor")` — 4–8 threads, queue=100
- `getHybridFeedWithScores()` uses `ZUNIONSTORE` with `Aggregate` and `Weights` from `org.springframework.data.redis.connection.zset`

### Authentication

JWT-based, stateless:
- `CustomAuthenticationFilter` validates Bearer tokens on every request
- `StompAuthChannelInterceptor` validates JWT on every STOMP frame (WebSocket DM)
- Token types: `"access"` (contains id, email, nickname) and `"refresh"` (contains id only)
- `AuthRateLimitFilter` applies sliding-window rate limiting (Redis) on `/api/auth/**`, returns 429 with `Retry-After`

### Spring profiles

| Profile | DB | Storage | Notes |
|---------|-----|---------|-------|
| `dev` (default) | H2 in-memory | Local filesystem | H2 console at `/h2-console` |
| `local` | H2 | Local filesystem | Similar to dev |
| `prod` | PostgreSQL | AWS S3 | HTTPS, CORS to devstagram.site |
| `test` | H2 | — | Used by `@ActiveProfiles("test")` |

Key env vars for prod: `JWT_SECRET_KEY`, `JWT_ACCESS_TOKEN_EXPIRE_SECONDS`, `JWT_REFRESH_TOKEN_EXPIRE_SECONDS`, `SPRING_DATA_REDIS_HOST`, `SPRING_DATA_REDIS_PORT`.

### Event-driven patterns

- `StoryCreatedEvent` → `StoryEventListener.notifyTaggedUsers()` — sends DM to tagged users in a new transaction (`REQUIRES_NEW`), runs `@Async`
- `StoryScheduler` — soft-deletes expired stories every minute (`cron: "0 * * * * *"`)

### Vector embeddings

Users have a `techVector` (float[142]) stored as PostgreSQL `vector` type via `pgvector` + Hibernate Vector. `TechScoreService` uses this for technology-interest similarity scoring during feed delivery.

### Testing patterns

- Service tests: `@ExtendWith(MockitoExtension.class)` with `@Mock` / `@InjectMocks`
- Integration tests: `@SpringBootTest` + `@ActiveProfiles("test")` + H2
- Controller tests: `@WebMvcTest` or `@SpringBootTest` with `@WithMockUser` / `SecurityMockMvcRequestPostProcessors`
- `src/test/resources/schema.sql` sets up the test schema
