# Scan Target

A Scan Target is a precise slice of code you scan—defined by a repo + branch + optional subpath.

Some related concepts:

* Mode: diff_only (PR fast checks) vs full_scan (deep/nightly)
* Hints: language/runtime (speed & tool selection), build cmd, package manager
* Risk/labels: tags like PCI, HIPAA, public, used for policy overlays & reporting

# Ownership

Precise ownership & blast radius. You want different teams owning different folders in a monorepo (e.g., /apps/web vs /services/payments).

One repo can have multiple scan targets (e.g., /apps/web vs /services/payments) with very different policies, ownerships and integrations.




You usually want multiple Projects per repo when you need different ownership, policies, integrations, or scan scopes to coexist on the same codebase.

### Reasons

1. **Ownership & blast radius**. Different teams own different folders in a monorepo (e.g., /apps/web vs /services/payments).
2. **Independent policies / gates**. 
  - Payments code: block PRs on any High/Critical.
  - Docs or marketing site: warn-only.


## Data Model Extensions

### New Database Entities

#### ScanTarget Model
```prisma
model ScanTarget {
  id          String   @id @default(cuid())
  userId      String   // Owner
  teamId      String?  // Optional team assignment
  
  // Repository information
  name        String   // User-friendly name
  description String?
  repoUrl     String
  branch      String   @default("main")
  subPath     String?  // Optional path filter
  
  // Configuration
  scanMode    ScanMode @default(FULL_SCAN)
  language    String?  // Primary language
  buildCmd    String?  // Build command
  packageMgr  String?  // Package manager
  
  // Risk & Compliance
  riskLevel   RiskLevel @default(MEDIUM)
  tags        Json     // Compliance tags, custom labels
  
  // Policy & Scheduling
  policy      Json     // Policy configuration
  schedule    String?  // Cron expression
  isActive    Boolean  @default(true)
  
  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastScanAt  DateTime?
  
  // Relations
  user        User     @relation(fields: [userId], references: [id])
  team        Team?    @relation(fields: [teamId], references: [id])
  scanJobs    ScanJob[]
  
  @@unique([userId, repoUrl, branch, subPath])
  @@index([userId, isActive])
  @@index([teamId, isActive])
}

enum ScanMode {
  FULL_SCAN
  DIFF_ONLY
  HYBRID
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

#### Team Model (New)
```prisma
model Team {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  avatarUrl   String?
  
  // Relations
  members     TeamMember[]
  scanTargets ScanTarget[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model TeamMember {
  id       String     @id @default(cuid())
  teamId   String
  userId   String
  role     TeamRole   @default(MEMBER)
  
  team     Team @relation(fields: [teamId], references: [id])
  user     User @relation(fields: [userId], references: [id])
  
  @@unique([teamId, userId])
}

enum TeamRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}
```

## API Endpoints

### Scan Target Management
- `POST /api/scan-targets` - Create new scan target
- `GET /api/scan-targets` - List user's scan targets
- `GET /api/scan-targets/[id]` - Get scan target details
- `PUT /api/scan-targets/[id]` - Update scan target
- `DELETE /api/scan-targets/[id]` - Delete scan target
- `POST /api/scan-targets/[id]/scan` - Trigger manual scan

### Repository Integration
- `GET /api/repositories/branches/[owner]/[repo]` - Get repository branches
- `GET /api/repositories/tree/[owner]/[repo]` - Get repository file tree
- `POST /api/repositories/validate` - Validate repository access

### Team Management
- `GET /api/teams` - List user's teams
- `POST /api/teams` - Create new team
- `GET /api/teams/[id]/members` - List team members
