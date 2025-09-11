# GitHub Integration: OAuth vs GitHub Apps

## Overview
Our system integrates with GitHub to access repositories, authenticate users, and enable security scanning workflows. There are two primary integration models supported by GitHub: **OAuth Apps** and **GitHub Apps**. Both approaches can access repository data, but they differ significantly in how access is scoped, managed, and secured.  

This document describes the tradeoffs and explains why we are currently implementing **OAuth** for our integration.

---

## OAuth Apps

### Characteristics
- Authenticate **as the user** who authorized the app.  
- Inherit all permissions that the user has on GitHub.  
- Can request **repo access** (including private repos).  
- Access is broad and tied to the user’s account.  
- If the user leaves the org or loses access to a repo, the app also loses access.  

### Pros
- Simple to implement (straightforward OAuth2 flow).  
- Immediate identity and repo access via user consent.  
- Works well for **user-centric SaaS products**.  

### Cons
- **Coarse-grained permissions**: can’t easily restrict to a single repo.  
- **Not stable** in enterprise settings (breaks if user leaves org).  
- Access is harder to audit or scope for security/compliance teams.  

---

## GitHub Apps

### Characteristics
- Authenticate **as the app itself** (not tied to a user).  
- Installed at the **repo or organization level**.  
- Provide **fine-grained permissions** (e.g., read-only pull requests, write checks).  
- Continue to function independently of individual users.  

### Pros
- **Least-privilege access**: admins choose which repos and which permissions.  
- **Enterprise-friendly**: stable, auditable, and compliant.  
- Better suited for integrations that need to run across teams/orgs.  

### Cons
- More complex implementation (App registration, JWT-based auth, installation tokens).  
- Requires installation by repo/org admins, which can introduce onboarding friction.  

---

## Tradeoff Summary

| Aspect                 | OAuth Apps                  | GitHub Apps                        |
| ---------------------- | --------------------------- | ---------------------------------- |
| Identity model         | Acts as the user            | Acts as the app itself             |
| Repo access            | Inherits user’s permissions | Explicitly installed on repos/orgs |
| Permission granularity | Broad (all-or-nothing)      | Fine-grained (scoped per resource) |
| Stability              | Breaks if user leaves       | Independent of users               |
| Enterprise adoption    | Less preferred              | Strongly preferred                 |
| Implementation effort  | Simpler                     | More complex                       |

---

## Current Implementation

We are **currently implementing OAuth** for GitHub integration. This decision is driven by:  
- **Speed to market**: OAuth is faster to set up and integrate.  
- **Simplicity**: We can authenticate users and fetch repo data with minimal friction.  
- **Early-stage use case**: Current workflows are primarily user-driven rather than enterprise-wide installations.  

---

## Next Steps

As we scale and begin working with enterprise customers, we expect to migrate to a **GitHub App** model. This will enable:  
- **Granular repo scoping** for compliance-conscious organizations.  
- **Stable integrations** that survive user churn.  
- **Enhanced security posture** aligned with GitHub’s best practices.  
