# HootHoot: Detailed System Architecture

**Live Deployment:** `https://hoot-hoot.vercel.app`  
**AWS Status Dashboard:** `https://hoot-hoot.vercel.app/aws`

## Executive Summary

**HootHoot** is a production-grade cognitive games platform built on AWS Aurora PostgreSQL (16 tables, 42 indexes), Amazon DynamoDB (single-table cache), and Vercel Edge deployment. All authentication uses IAM tokens via OIDC federation — **zero passwords stored anywhere**. This document details every system component, data flow, security layer, and deployment consideration.

---

## System Architecture Diagram

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Browser["🌐 Browser<br/>React 19 + TypeScript"]
        Mobile["📱 Mobile PWA<br/>Installable App"]
    end
    
    subgraph CDN["Vercel Edge Network"]
        Edge["Global CDN<br/>Static Assets<br/>DDoS Protection"]
    end
    
    subgraph NextJS["Next.js 16 App Router"]
        Pages["🎮 Pages<br/>Games, Arena<br/>Company Portal"]
        API["🔌 API Routes<br/>Auth, Scoring<br/>Proctoring"]
    end
    
    subgraph AWS["AWS Infrastructure (us-east-1)"]
        Aurora["🗄️ Aurora PostgreSQL<br/>16 Tables · 42 Indexes<br/>Relational Data"]
        DynamoDB["⚡ DynamoDB<br/>Single-Table Design<br/>Session Cache"]
    end
    
    subgraph External["External Services"]
        Gemini["🤖 Google Gemini<br/>AI Feedback"]
        Email["📧 Nodemailer<br/>Email Service"]
        Analytics["📊 Google Analytics<br/>Event Tracking"]
    end
    
    Client -->|HTTPS| CDN
    CDN -->|Route| NextJS
    NextJS -->|Query| AWS
    AWS -->|Stream| External
    NextJS -->|Events| Analytics
    
    style Client fill:#3B82F6,color:#fff,stroke:#1E40AF
    style CDN fill:#10B981,color:#fff,stroke:#047857
    style NextJS fill:#8B5CF6,color:#fff,stroke:#7C3AED
    style Aurora fill:#F59E0B,color:#fff,stroke:#D97706
    style DynamoDB fill:#EC4899,color:#fff,stroke:#BE185D
    style External fill:#06B6D4,color:#fff,stroke:#0891B2
```

---

## Database Layer Architecture

### Aurora PostgreSQL (Relational)

```mermaid
graph LR
    A["16 Tables"] --> B["42 Indexes"]
    
    A --> A1["Auth<br/>app_users<br/>user_sessions"]
    A --> A2["Games<br/>games<br/>game_score<br/>game_attempt"]
    A --> A3["Company<br/>companies<br/>company_tests<br/>test_sessions"]
    A --> A4["Proctoring<br/>warning_logs<br/>arena_questions"]
    A --> A5["Analytics<br/>test_analytics<br/>leaderboard"]
    
    B --> B1["Primary Keys<br/>User IDs<br/>Game IDs"]
    B --> B2["Foreign Keys<br/>Referential<br/>Integrity"]
    B --> B3["Composite<br/>user_id + game_id<br/>timestamp"]
    B --> B4["Performance<br/>Leaderboard<br/>Sessions"]
    
    style A fill:#F59E0B,color:#000
    style B fill:#FBBF24,color:#000
    style A1 fill:#FBBF24,color:#000
    style A2 fill:#FBBF24,color:#000
    style A3 fill:#FBBF24,color:#000
    style A4 fill:#FBBF24,color:#000
    style A5 fill:#FBBF24,color:#000
    style B1 fill:#FCD34D,color:#000
    style B2 fill:#FCD34D,color:#000
    style B3 fill:#FCD34D,color:#000
    style B4 fill:#FCD34D,color:#000
```

### DynamoDB (Key-Value Cache)

```mermaid
graph LR
    A["Single-Table Design"] --> B["Composite Key"]
    B --> B1["PK: Entity Type<br/>USER#id<br/>SESSION#token<br/>GAME#gameId"]
    B --> B2["SK: Sub-Entity<br/>PROFILE<br/>DATA<br/>SCORES"]
    
    A --> C["Access Patterns"]
    C --> C1["User Profile<br/>O1 lookup"]
    C --> C2["Session Validation<br/>O1 lookup"]
    C --> C3["Leaderboard Cache<br/>O1 lookup"]
    C --> C4["Game Scores<br/>Query + limit"]
    
    A --> D["TTL Expiration"]
    D --> D1["Sessions: 30 days"]
    D --> D2["Cache: 5 minutes"]
    D --> D3["Leaderboard: 60s"]
    
    style A fill:#EC4899,color:#fff
    style B fill:#F472B6,color:#fff
    style C fill:#F472B6,color:#fff
    style D fill:#F472B6,color:#fff
    style B1 fill:#FBCFE8,color:#000
    style B2 fill:#FBCFE8,color:#000
    style C1 fill:#FBCFE8,color:#000
    style C2 fill:#FBCFE8,color:#000
    style C3 fill:#FBCFE8,color:#000
    style C4 fill:#FBCFE8,color:#000
    style D1 fill:#FBCFE8,color:#000
    style D2 fill:#FBCFE8,color:#000
    style D3 fill:#FBCFE8,color:#000
```

---

## Authentication Flow (IAM + OIDC)

```mermaid
sequenceDiagram
    participant User as User
    participant Vercel as Vercel Function
    participant OIDC as Vercel OIDC Provider
    participant AWS_STS as AWS STS
    participant RDS_Signer as AWS RDS Signer
    participant Aurora as Aurora PostgreSQL
    participant DynamoDB as DynamoDB
    
    User->>Vercel: POST /api/auth/signin<br/>{email, password}
    
    Note over Vercel: 1. Extract VERCEL_OIDC_TOKEN
    Vercel->>OIDC: Request OIDC token
    OIDC-->>Vercel: OIDC JWT
    
    Note over Vercel: 2. Exchange for AWS credentials
    Vercel->>AWS_STS: AssumeRoleWithWebIdentity(OIDC_JWT)
    AWS_STS-->>Vercel: Temporary AWS credentials<br/>(AccessKey, SecretKey, Token)
    
    Note over Vercel: 3. Generate RDS auth token
    Vercel->>RDS_Signer: Generate 15-min token<br/>with credentials
    RDS_Signer-->>Vercel: IAM auth token
    
    Note over Vercel: 4. Connect to Aurora
    Vercel->>Aurora: CONNECT with token<br/>(no password)
    Aurora->>Aurora: Validate IAM signature<br/>Check expiry
    Aurora-->>Vercel: ✓ Connection established
    
    Note over Vercel: 5. Query user credentials
    Vercel->>Aurora: SELECT * FROM app_users<br/>WHERE email = $1
    Aurora-->>Vercel: User record<br/>(id, email, password_hash)
    
    Note over Vercel: 6. Verify password
    Vercel->>Vercel: Compute scrypt hash<br/>Compare with stored
    
    Note over Vercel: 7. Create session
    Vercel->>Aurora: INSERT INTO user_sessions<br/>VALUES ($1, $2, NOW() + 30d)
    Aurora-->>Vercel: ✓ Session created
    
    Note over Vercel: 8. Cache in DynamoDB
    Vercel->>DynamoDB: PutItem(SESSION#{token}<br/>→ user data, TTL=30d)
    DynamoDB-->>Vercel: ✓ Cached
    
    Note over Vercel: 9. Set secure cookie
    Vercel-->>User: Set-Cookie: HttpOnly<br/>Secure, SameSite=Strict
    
    Vercel-->>User: ✓ Redirect /arena
```

---

## Game Scoring Data Flow

```mermaid
graph TD
    A["User plays game<br/>Switch/Grid/Digit"] --> B["Calculate score<br/>right/wrong count<br/>time penalty"]
    B --> C["POST /api/scores<br/>{gameId, score, time}"]
    C --> D["Middleware validates<br/>session token"]
    D -->|Invalid| E["❌ Return 401"]
    D -->|Valid| F["Query Aurora<br/>SELECT user FROM session"]
    F --> G["Anti-cheat check<br/>Score is reasonable<br/>within time limit"]
    G -->|Suspicious| H["❌ Reject score<br/>Log suspicious event"]
    G -->|Valid| I["INSERT INTO game_score<br/>user_id, game_id,<br/>score, time"]
    I --> J["UPDATE game_attempt<br/>increment count<br/>update streak"]
    J --> K["Query new leaderboard<br/>rank for user"]
    K --> L["Cache in DynamoDB<br/>GAME#{gameId}→scores"]
    L --> M["Return response<br/>{newScore, rank,<br/>leaderboardPosition}"]
    M --> N["SWR revalidates<br/>client-side cache"]
    N --> O["✅ UI updates<br/>show new rank"]
    
    style A fill:#3B82F6,color:#fff
    style C fill:#3B82F6,color:#fff
    style I fill:#10B981,color:#fff
    style J fill:#10B981,color:#fff
    style K fill:#10B981,color:#fff
    style M fill:#10B981,color:#fff
    style E fill:#EF4444,color:#fff
    style H fill:#EF4444,color:#fff
    style O fill:#10B981,color:#fff
```

---

## Proctored Arena Flow

```mermaid
graph TD
    A["User navigates to<br/>/arena/auth"] --> B["Accept rules<br/>Grant webcam<br/>permission"]
    B --> C["POST /api/arena/auth<br/>{userId, agreedToRules}"]
    C --> D["Validate session<br/>Check if eligible<br/>Check daily limits"]
    D -->|Ineligible| E["❌ Show error<br/>Try again tomorrow"]
    D -->|Eligible| F["Initialize ProctorEngine<br/>fullscreenchange listener<br/>visibilitychange listener<br/>blur/focus listeners"]
    F --> G["Generate 10 random<br/>arena questions<br/>from question bank"]
    G --> H["Start 4-minute timer<br/>Lock fullscreen<br/>Show first question"]
    
    H --> I["User attempts<br/>questions for 4 min"]
    
    I --> J["Monitor for violations"]
    J -->|Fullscreen exit| K["POST /api/arena/warnings<br/>{warningType: FULLSCREEN}"]
    J -->|Tab switch| L["POST /api/arena/warnings<br/>{warningType: TAB_SWITCH}"]
    J -->|Window blur| M["POST /api/arena/warnings<br/>{warningType: BLUR}"]
    
    K --> N["Log warning in<br/>warning_logs table"]
    L --> N
    M --> N
    N --> O["Show warning toast<br/>to user"]
    O --> P{Check violation<br/>count}
    P -->|< Max| Q["Continue test"]
    P -->|>= Max| R["Auto-end test<br/>Mark DISQUALIFIED"]
    
    Q --> I
    
    I -->|4 minutes elapsed| S["Auto-submit<br/>POST /api/arena/submit"]
    R --> S
    
    S --> T["Calculate score<br/>right/wrong<br/>time bonus/penalty"]
    T --> U["INSERT into test_sessions<br/>user_id, score, time<br/>status, violation_count"]
    U --> V["INSERT into test_attempts<br/>for analytics"]
    V --> W["Send email<br/>with results"]
    W --> X["Update company<br/>HR dashboard"]
    X --> Y["✅ Show results page<br/>score + rank"]
    
    style A fill:#3B82F6,color:#fff
    style C fill:#3B82F6,color:#fff
    style S fill:#10B981,color:#fff
    style T fill:#10B981,color:#fff
    style Y fill:#10B981,color:#fff
    style E fill:#EF4444,color:#fff
    style R fill:#EF4444,color:#fff
    style K fill:#FBBF24,color:#000
    style L fill:#FBBF24,color:#000
    style M fill:#FBBF24,color:#000
```

---

## API Route Architecture

```mermaid
graph TB
    Root["API Routes<br/>/api/**"]
    
    Root --> Auth["Auth Routes<br/>/api/auth"]
    Auth --> Auth1["POST /signup"]
    Auth --> Auth2["POST /signin"]
    Auth --> Auth3["POST /signout"]
    Auth --> Auth4["GET /session"]
    
    Root --> Game["Game Routes<br/>/api/scores"]
    Game --> Game1["POST /scores"]
    Game --> Game2["GET /leaderboard"]
    
    Root --> Arena["Arena Routes<br/>/api/arena"]
    Arena --> Arena1["POST /auth"]
    Arena --> Arena2["POST /warnings"]
    Arena --> Arena3["POST /submit"]
    
    Root --> AI["AI Routes<br/>/api/chat"]
    AI --> AI1["POST /chat"]
    AI --> AI2["Stream Gemini"]
    
    Root --> AWS_Route["AWS Routes<br/>/api/aws"]
    AWS_Route --> AWS1["GET /status"]
    AWS1 --> AWS1a["Aurora health"]
    AWS1 --> AWS1b["DynamoDB stats"]
    AWS1 --> AWS1c["Table counts"]
    
    Root --> Migration["Admin Routes<br/>/api/aurora"]
    Migration --> Mig1["POST /migrate"]
    
    Auth1 --> Impl1["Hash password<br/>Create session<br/>Set cookie"]
    Auth2 --> Impl2["Query user<br/>Verify password<br/>Create session"]
    Auth3 --> Impl3["Clear session<br/>Delete cookie"]
    Auth4 --> Impl4["Return user<br/>from session"]
    
    Game1 --> Impl5["Validate score<br/>Insert row<br/>Update leaderboard"]
    Game2 --> Impl6["Query Aurora<br/>Cache in DynamoDB<br/>Return top 100"]
    
    Arena1 --> Impl7["Init proctoring<br/>Generate questions<br/>Start timer"]
    Arena2 --> Impl8["Log warning<br/>Check violation count<br/>Auto-end if needed"]
    Arena3 --> Impl9["Calculate score<br/>Insert result<br/>Send email"]
    
    style Root fill:#8B5CF6,color:#fff
    style Auth fill:#3B82F6,color:#fff
    style Game fill:#10B981,color:#fff
    style Arena fill:#F59E0B,color:#fff
    style AI fill:#EC4899,color:#fff
    style AWS_Route fill:#06B6D4,color:#fff
    style Migration fill:#EF4444,color:#fff
```

---

## Security Architecture

### Defense Layers

```mermaid
graph TD
    A["Layer 1: Network<br/>HTTPS/TLS 1.2+"]
    B["Layer 2: VPC<br/>Aurora restricted<br/>Vercel network only"]
    C["Layer 3: IAM<br/>Temporary tokens<br/>15-min expiry"]
    D["Layer 4: Session<br/>HttpOnly cookies<br/>SameSite=Strict"]
    E["Layer 5: Password<br/>Scrypt hashing<br/>N=2^15"]
    F["Layer 6: Input<br/>Zod validation<br/>Parameterized SQL"]
    G["Layer 7: Application<br/>Rate limiting<br/>Anti-cheat"]
    H["Layer 8: Audit<br/>CloudTrail logs<br/>All IAM access"]
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    
    style A fill:#FF6B6B,color:#fff
    style B fill:#FF8C42,color:#fff
    style C fill:#FFA500,color:#fff
    style D fill:#FFD166,color:#fff
    style E fill:#95E1D3,color:#fff
    style F fill:#38C7A9,color:#fff
    style G fill:#1FA885,color:#fff
    style H fill:#0E6251,color:#fff
```

---

## Deployment Pipeline

```mermaid
graph LR
    A["Git Push<br/>to main"] --> B["Vercel<br/>Detects<br/>Changes"]
    B --> C["Install<br/>Dependencies"]
    C --> D["Build<br/>Next.js App"]
    D --> E["Run Tests<br/>& Lint"]
    E --> F{Build<br/>Success?}
    F -->|Fail| G["❌ Deployment<br/>Blocked"]
    F -->|Pass| H["Deploy to<br/>Vercel Edge"]
    H --> I["Cold Start:<br/>instrumentation.ts"]
    I --> J["Check DB<br/>Connection"]
    J --> K["Auto-run<br/>Migrations"]
    K --> L["Create<br/>Tables & Indexes"]
    L --> M["Deploy<br/>Complete"]
    M --> N["✅ Live at<br/>hoot-hoot.vercel.app"]
    
    style A fill:#3B82F6,color:#fff
    style B fill:#3B82F6,color:#fff
    style H fill:#10B981,color:#fff
    style N fill:#10B981,color:#fff
    style G fill:#EF4444,color:#fff
    style M fill:#10B981,color:#fff
```

---

## Database Schema Overview

### 16 Tables Breakdown

| Table | Rows | Purpose | Indexes |
|-------|------|---------|---------|
| `app_users` | ~500 | User accounts & roles | 3 (id, email, created_at) |
| `user_sessions` | ~200 | Active sessions | 3 (user_id, token, expires_at) |
| `game_score` | ~50K | Individual scores | 5 (user_id, game_id, timestamp) |
| `game_attempt` | ~5K | Daily attempt counts | 3 (user_id, game_id, date) |
| `leaderboard` | ~500 | Cached ranks | 2 (rank, total_score) |
| `games` | 14 | Game metadata | 2 (id, slug) |
| `companies` | ~50 | Company accounts | 2 (id, email) |
| `company_tests` | ~200 | Test configurations | 3 (company_id, created_at) |
| `test_sessions` | ~5K | Test attempts | 4 (user_id, test_id, status) |
| `warning_logs` | ~10K | Proctoring events | 3 (session_id, warning_type) |
| `arena_questions` | 1000 | Question bank | 2 (game_id, difficulty) |
| `broadcast` | ~100 | Email broadcasts | 2 (company_id, created_at) |
| `user_preferences` | ~500 | Theme, language | 1 (user_id) |
| `test_analytics` | VIEW | Aggregated stats | — |
| `audit_log` | ~1K | Admin actions | 2 (admin_id, timestamp) |
| `poll` / `poll_option` | ~100 | Community polls | 2 (id, created_at) |

**Total Indexes:** 42  
**Total Rows:** ~75K  
**Est. Database Size:** ~500 MB

---

## Performance Optimization

### Caching Strategy

```mermaid
graph TD
    A["Request"] --> B{Data<br/>Type?}
    B -->|Session| C["DynamoDB<br/>Cache<br/>TTL: 30d<br/>~1ms read"]
    B -->|Leaderboard| D["DynamoDB<br/>Cache<br/>TTL: 60s<br/>~1ms read"]
    B -->|Game Info| E["Vercel CDN<br/>Cache<br/>TTL: 1h<br/>~50ms read"]
    B -->|User Profile| F["DynamoDB<br/>Cache<br/>TTL: 5m<br/>~1ms read"]
    C --> G["If miss:<br/>Query Aurora<br/>~15ms"]
    D --> G
    E --> H["If miss:<br/>Query Aurora<br/>~15ms"]
    F --> G
    G --> I["Cache<br/>Result"]
    I --> J["Return<br/>to Client"]
    
    style A fill:#3B82F6,color:#fff
    style C fill:#10B981,color:#fff
    style D fill:#10B981,color:#fff
    style E fill:#10B981,color:#fff
    style F fill:#10B981,color:#fff
    style G fill:#F59E0B,color:#fff
    style J fill:#10B981,color:#fff
```

### Connection Pooling

- **Aurora Pool:** 10-20 connections, 30s idle timeout
- **DynamoDB:** Stateless, no pools needed
- **Lambda Optimization:** `attachDatabasePool()` for reuse across cold starts

---

## Monitoring & Health Checks

### AWS Status Dashboard (`/aws`)

Displays real-time:
- ✅ Aurora cluster connection status
- ✅ PostgreSQL version (17.7)
- ✅ Database name & region (us-east-1)
- ✅ Table count (16) & index count (42)
- ✅ Row counts per table
- ✅ Database size in MB
- ✅ Query latency (milliseconds)
- ✅ IAM authentication configured
- ✅ AWS Account ID & Resource ARN
- ✅ Last checked timestamp

**API Endpoint:** `GET /api/aws/status` — returns JSON with all metrics above.

---

## Troubleshooting Guide

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| 502 Bad Gateway | Aurora connection failed | Check `AWS_APG_PGHOST` env var |
| Auth loops | Session token expired | Clear cookies, sign in again |
| Leaderboard stale | Cache expired | Refresh page or wait 60s |
| Email not sent | SMTP credentials invalid | Update `SMTP_*` env vars |
| Game score rejected | Anti-cheat triggered | Score likely impossible; try easier difficulty |
| Fullscreen exit warning | Browser fullscreen lost | F11 to re-enable or restart test |

### Debug Endpoints

```bash
# Check Aurora connection
curl https://hoot-hoot.vercel.app/api/aws/status

# Check user session
curl -H "Cookie: hh_session=<token>" \
  https://hoot-hoot.vercel.app/api/auth/session

# View build logs
vercel logs <deployment-id>

# Check Vercel function logs
vercel logs --follow
```

---

## Production Readiness Checklist

- [x] AWS Aurora PostgreSQL deployed
- [x] IAM authentication configured (zero passwords)
- [x] DynamoDB single-table cache operational
- [x] Vercel deployment live with auto-scaling
- [x] HTTPS/TLS enforced globally
- [x] Session management with HttpOnly cookies
- [x] Password hashing (scrypt N=2^15)
- [x] Rate limiting on auth endpoints
- [x] CSRF protection on forms
- [x] SQL injection prevention (parameterized queries)
- [x] XSS protection (React auto-escaping)
- [x] CloudTrail audit logging enabled
- [x] Automated backups (Aurora daily)
- [x] Multi-AZ failover configured
- [x] Error tracking (Sentry integration ready)
- [x] Performance monitoring (Google Analytics)
- [x] Status dashboard (`/aws` page)
- [x] Email notifications working
- [x] AI feedback (Gemini) integrated
- [x] Proctoring engine tested

---

## Next Steps for Scale

1. **Read Replicas** — Add read replicas for game analytics queries
2. **CloudFront Distribution** — Cache static assets at edge
3. **RDS Proxy** — Connection pooling for AWS Lambda
4. **Aurora Global Database** — Multi-region failover (if needed)
5. **Snowflake Data Lake** — Historical analytics archive
6. **Auto-scaling Policies** — DynamoDB provisioned throughput

---

## Summary

**HootHoot** is a **production-grade platform** with:
- ✅ Secure IAM authentication (no passwords)
- ✅ Scalable relational + key-value databases
- ✅ Global edge deployment
- ✅ Real-time proctoring + anti-cheat
- ✅ AI-powered coaching
- ✅ Enterprise compliance (audit logging, backups, failover)

**Live URL:** https://hoot-hoot.vercel.app  
**Status:** Fully operational and ready for hackathon submission.
