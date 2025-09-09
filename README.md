# Fortify

AI-powered security scanning platform that validates AI-generated code, dependencies, and vulnerabilities in real-time. Designed for low false positives (<1%), auto-fixes, and seamless integration into developer workflows.

## 🚀 Overview

Fortify addresses the surge in security vulnerabilities from AI-assisted coding by providing specialized scanning, detection, and automated fixing capabilities. As AI tools enable faster coding, they also introduce risks through unreviewed code and risky dependencies. Fortify helps developers and security teams maintain security without slowing down velocity.

### Key Features

- **AI-Powered Analysis**: Uses Claude Code SDK for intelligent vulnerability detection
- **Real-Time Scanning**: Integrates into developer workflows with minimal friction  
- **Auto-Fix Generation**: Automatically generates pull requests with security fixes
- **Low False Positives**: Specialized AI models focused on accuracy (<1% false positive rate)
- **Multi-Language Support**: JavaScript and Python (MVP), expandable to other languages
- **GitHub Integration**: Seamless OAuth integration and repository access

## 🏗️ Architecture

Fortify follows a modern microservices architecture with clear separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Scan Agent     │    │   Database      │
│   (Next.js)     │◄──►│   (FastAPI)      │◄──►│  (PostgreSQL)   │
│                 │    │                  │    │                 │
│ • Dashboard     │    │ • Job Queue      │    │ • Scan Results  │
│ • Scan Reports  │    │ • Claude SDK     │    │ • Vulnerabilities│
│ • User Auth     │    │ • Git Cloning    │    │ • User Data     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │    Redis     │
                       │  (Job Queue) │
                       └──────────────┘
```

## 📁 Project Structure

```
fortify/
├── frontend/           # Next.js web application
│   ├── src/app/       # App Router pages and API routes
│   ├── src/components/# React components and UI
│   └── src/lib/       # Utilities and database client
├── scan-agent/        # Python FastAPI scanning service
│   ├── scan_agent/    # Core scanning logic
│   │   ├── server.py  # FastAPI server
│   │   ├── workers/   # Background job processing
│   │   ├── models/    # Data models and types
│   │   └── utils/     # Database, queue, and Redis utilities
│   └── tests/         # Unit and integration tests
├── db/                # Database schema and migrations
│   ├── schema.prisma  # Prisma schema definition
│   └── migrations/    # Database migration files
└── specs/             # Architecture and product documentation
    ├── architecture/  # Technical specifications
    └── product/       # Product requirements and user flows
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- PostgreSQL database
- Redis server
- Anthropic API key (for Claude Code SDK)

### 1. Clone and Setup

```bash
git clone https://github.com/your-org/fortify.git
cd fortify
```

### 2. Database Setup

```bash
cd db
npm install
npx prisma generate
npx prisma db push
cd ..
```

### 3. Start the Scan Agent

```bash
cd scan-agent
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database URL, Redis URL, and Anthropic API key

# Start the service
python -m scan_agent.server
```

### 4. Start the Frontend

```bash
cd frontend
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your database URL and GitHub OAuth credentials

# Start development server
npm run dev
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Scan Agent API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🔧 Development

### Running Tests

```bash
# Backend tests
cd scan-agent
python -m pytest tests/

# Frontend tests  
cd frontend
npm test
```

### Database Operations

```bash
cd db

# Apply migrations
npx prisma db push

# View database
npx prisma studio

# Reset database
npx prisma db reset
```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## 📚 Documentation

All architecture and product documentation is stored in the `specs/` directory:

### Architecture Documentation (`specs/architecture/`)
- **`mvp.md`** - Complete MVP architecture and implementation roadmap
- **`scanner.md`** - Scan system architecture and current implementation  
- **`schema.md`** - Database schema and data models
- **`frontend.md`** - Frontend architecture and UI specifications
- **`integrations/github.md`** - GitHub integration specifications

### Product Documentation (`specs/product/`)
- **`mvp.md`** - Product requirements and MVP specifications
- **`landing.md`** - Landing page requirements and conversion optimization
- **`login-flow.md`** - Authentication flows and user onboarding
- **`u/[username]/`** - User experience flows and wireframes

## 🔐 Security

### Current Security Measures
- Environment variable-based secrets management
- Prisma ORM for SQL injection protection
- Temporary workspace isolation for repository scanning
- GitHub OAuth for secure authentication

### Security Considerations
- Repository code is cloned to temporary directories and cleaned up
- No code execution - analysis only
- Database operations use parameterized queries
- API endpoints will include authentication in production

## 🚢 Deployment

### Production Environment
- **Frontend**: Deployed on Vercel/Netlify with Next.js
- **Scan Agent**: Containerized FastAPI service on AWS/GCP
- **Database**: Managed PostgreSQL (AWS RDS/Google Cloud SQL)
- **Queue**: Managed Redis (AWS ElastiCache/Google Memorystore)

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fortify

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
GITHUB_ID=your-github-oauth-app-id
GITHUB_SECRET=your-github-oauth-app-secret

# AI Integration
ANTHROPIC_API_KEY=your-claude-api-key
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the coding standards defined in `.cursorrules`
- Update documentation in `specs/` for architectural changes
- Add tests for new functionality
- Use TypeScript for frontend code
- Use Python type hints for backend code

## 📄 License

This project is proprietary. All rights reserved.

## 🙋‍♂️ Support

- **Documentation**: Check the `specs/` directory for detailed architecture and product docs
- **Issues**: Create GitHub issues for bugs and feature requests
- **Development**: See individual component READMEs for detailed setup instructions

---

**Fortify** - Securing AI-generated code, one scan at a time. 🛡️