## Context

This is an experimental project I'm exploring with Aaron Levie and Tomas at KP. The idea is as ai generated code dominate, security becomes a key concern. We want to build an agent that could validate these code changes as well as their dependencies.

# Product Artifact: AI Security Agent PRD - v0.1 (MVP Focus)

## Document Overview
This artifact serves as the initial Product Requirements Document (PRD) for Fortify AI, refined into a structured, actionable deliverable. It incorporates the core PRD elements from v0 and expands with detailed workflows for the Minimum Viable Product (MVP). The MVP prioritizes essential features to validate the concept: basic scanning, detection, and fixing for JavaScript/Python repositories, targeting vibe-coders and developers. This artifact is designed for team alignment, engineering handoff, and investor review.


## 1. Product Overview

### Product Name
AI Security Agent (Working Title: "Fortify AI")

### Product Description
Fortify AI is an AI-powered agent that validates code changes and dependencies in real-time, identifying security vulnerabilities from AI-generated or "vibe-coded" practices. It integrates into developer workflows to scan codebases, detect risks, propose fixes, and support compliance. Built to address the surge in security threats from rapid AI-assisted coding.

### Version
v0.1 - MVP-focused iteration.

### Release Date:
Q3 2025.

### Team
- Product Lead: Tim Shi.
- Engineering Advisor: Tomas.
- Security Expert: Jeffrey.
- Investor/Advisor: Aaron Levie.

## 2. Problem Statement

### Background
AI tools enable faster coding but introduce vulnerabilities through unreviewed code and risky dependencies. Internal code risks include exposed endpoints; dependencies amplify threats (e.g., XZ Utils backdoor). Vibe-coders often deploy insecurely due to permissive defaults in tools like Supabase.

### Pain Points
- Developers: Manual reviews slow velocity.
- Security Teams: High false positives; can't keep pace.
- CISOs: Need ROI on prevented breaches.
- Founders: Lack security expertise.

### Opportunity
Specialized AI agent for scans and fixes, using PLG in the $200B security market.

## 3. Target Audience

### Primary Users
- Developers: Quick feedback in workflows.
- Security Teams: Accurate CI/CD scans.

### Secondary Users
- CISOs: Compliance reporting.
- Vibe-Coders: Simple audits.

### Market Segments
- Startups: Free PLG entry.
- Enterprises: Upsell integrations.

## 4. Goals and Objectives

### Business Goals
- Validate MVP with 100 beta users.
- Achieve PLG: 30% conversion from free to paid.
- Monetize via usage-based pricing (TBD).

### Product Objectives
- 70% vulnerability reduction in test codebases.
- 95% detection accuracy.
- Automate 30% of fixes.

### Success Metrics
- MAU, fix acceptance rate (>70%).
- False positive rate (<5%).
- NPS (>60 for MVP).

## 5. Key Features

### Core Features
1. **Scanning**: Internal code and dependencies.
2. **Detection**: Common vulnerabilities (e.g., auth issues, data leaks, secret exposure, basic dep risks).
3. **Fixes**: Auto-PR generation.
4. **Integration**: Git hooks, IDE plugins.
5. **Reporting**: Basic dashboards.

### MVP Scope (v0.1)
- Languages: JS/Python.
- Vulnerabilities: Consider owasp 10 most common vulnerabilities. Include other common vulnerabilities such as data leaks, secret exposure, basic dep risks.
- Fixes: PRs for 30% of issues.
- Free Tier: Public repo scans with email reports.
- Exclusions: Advanced compliance, multi-agent collab, self-hosting.

## 5.1 MVP Workflows
This section details key user and system workflows for the MVP, using simple sequence diagrams (text-based) and user journeys. Workflows focus on PLG adoption, ensuring frictionless value delivery.

### Workflow 1: Onboarding and Initial Free Scan (User Journey - PLG Entry)
**Target User**: Developer or Vibe-Coder.
**Goal**: Demonstrate value quickly to drive sign-ups.
**Steps**:
1. User visits Fortify AI website/GitHub app.
2. Authenticates via GitHub OAuth.
3. Selects a public repo for free scan (no code access needed initially).
4. System queues scan: AI agent analyzes repo for MVP vulnerabilities.
5. User receives email report: Summary of issues, sample fixes, upgrade prompt.
6. A dashboard UI to view the scan results with actions to fix the issues through automated coding agents.
7. If upgraded: Full access to private repos and integrations.

**System Sequence**:
```
User -> App: Sign up via GitHub
App -> GitHub: Request repo list
GitHub -> App: Return public repos
User -> App: Select repo
App -> AI Agent: Trigger scan (code + deps)
AI Agent -> Vulnerability DB: Check patterns
AI Agent -> App: Return detections
App -> User: Email report with issues/fix previews
```

**Success Criteria**: 80% of free scans lead to sign-up; <5 min completion.

### Workflow 2: Real-Time Pre-Commit Scan (Developer Workflow)
**Target User**: Developer using AI coding tools.
**Goal**: Provide inline feedback before code commit.
**Steps**:
1. Developer installs IDE plugin (e.g., VS Code extension).
2. While coding (e.g., adding Supabase endpoint), plugin triggers local lightweight scan.
3. AI agent checks for MVP issues (e.g., open PUT API).
4. Displays warnings in IDE with fix suggestions.
5. Developer applies fix or ignores (with reason logged for learning).
6. Commit proceeds if resolved.

**System Sequence**:
```
Developer -> IDE Plugin: Edit code
IDE Plugin -> Local Agent: Run quick scan (subset of MVP vulns)
Local Agent -> AI Model: Analyze snippet + deps
AI Model -> IDE Plugin: Return issues + fixes
IDE Plugin -> Developer: Show inline alerts
Developer -> IDE Plugin: Apply fix
IDE Plugin -> Git: Allow commit
```

**Success Criteria**: Scan time <10s; 60% fixes applied inline.

### Workflow 3: CI/CD Pipeline Integration and Auto-Fix (Security Team Workflow)
**Target User**: Security Engineer in CI/CD setup.
**Goal**: Automate comprehensive scans and fixes in pull requests.
**Steps**:
1. Team installs GitHub Action/Webhook.
2. Developer creates PR with code changes.
3. Pipeline triggers full scan: Internal code + all deps.
4. AI agent detects issues, generates fix PR (e.g., add Supabase RLS policy).
5. Security reviews/approves auto-PR.
6. Merged if accepted; report logged for compliance.

**System Sequence**:
```
Developer -> GitHub: Create PR
GitHub -> Webhook: Notify App
App -> AI Agent: Full scan (code, deps, MVP vulns)
AI Agent -> Fix Generator: Propose changes
AI Agent -> GitHub: Create auto-PR with fixes
Security User -> GitHub: Review/Approve
GitHub -> Pipeline: Merge if approved
App -> Dashboard: Log vulnerabilities prevented
```

**Success Criteria**: 75% issues auto-fixed; false positives <5%; integrates with GitHub Actions in <15 min.

### Workflow 4: Dependency Risk Monitoring (Ongoing Workflow)
**Target User**: All users (background process).
**Goal**: Alert on emerging dep vulnerabilities post-deployment.
**Steps**:
1. User enables monitoring on repo (paid feature).
2. System periodically scans deps for new risks (e.g., CVE in npm package).
3. If issue found, notifies via email/Slack with fix PR.
4. User reviews and applies.

**System Sequence**:
```
Cron Job -> App: Trigger dep scan
App -> AI Agent: Check deps against vuln DB
AI Agent -> Notification Service: Alert if new risk
Notification -> User: Email with details
User -> App: View fix PR
```

**Success Criteria**: Weekly scans; 90% alerts actionable.

### Edge Cases
- False Positive Handling: User flags issue; system learns via feedback loop.
- Rate Limiting: Free tier caps at 10 scans/month.
- Error Flow: If scan fails (e.g., large repo), fallback to partial report with upgrade prompt.

## 6. Technical Requirements

### Architecture
- AI Core: LLM-based (e.g., fine-tuned Claude/GPT for security).
- Integrations: GitHub API, IDE extensions, Supabase API.
- Scalability: Cloud-hosted (e.g., AWS) for MVP.

### Security & Compliance
- Data encrypted; MVP complies with basic GDPR.

## 7. User Experience

### Onboarding
GitHub-first; instant value via free scan.

### Design Principles
- Frictionless PLG.
- Transparent: Explain detections.
- Actionable: Always suggest fixes.

## 8. Go-to-Market Strategy

### Launch Plan
- Beta: Reddit/r/lovable users.
- Public: Free tier focus.

### Pricing
- Free: Basic scans.
- Pro: $10/user/month (unlimited + monitoring).

### Marketing
- Free scans as hooks.
- Content on AI security risks.
- Create a hub for popular repos and python/node packages and show their security issues.
- Conferences: AI Security Summit, AI Security Conference, etc.

### Partnerships
- Partner with popular repos and python/node packages and show their security issues.
- Partner with security tools and services to integrate with Fortify AI.
- Partner with AI coding agents to integrate with Fortify AI.
- Partner with lovable, base44 and other vibe coding agents to integrate with Fortify AI.

## 9. Risks and Mitigations

### Risks
- Execution: AI accuracy.
  - Mitigation: Beta testing with synthetic vulns.
- Competition: Fast movers.
  - Mitigation: MVP speed; differentiate on fixes.

## 10. Appendix

### Next Steps
- Prototype MVP workflows.
- User validation interviews.
- Engineering spec from this artifact.
