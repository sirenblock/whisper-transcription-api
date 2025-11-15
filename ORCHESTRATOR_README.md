# 🎯 Claude Orchestrator - Universal Multi-Agent System

## The Ultimate AI-Powered Project Automation Tool

Break down ANY project into parallel tasks and execute them simultaneously with multiple Claude instances.

---

## 🚀 Quick Start

### 1. Create Your Project File

Create a `PROJECT.md` in your project directory:

```markdown
# Project: E-commerce Platform

## Description
Build a modern e-commerce platform with user authentication, product catalog,
shopping cart, payment processing, and admin dashboard.

## Requirements
- User registration and login with JWT
- Product browsing with search and filters
- Shopping cart with persistent storage
- Stripe payment integration
- Admin panel for product management
- Responsive React frontend
- Node.js/Express backend
- PostgreSQL database

## Tech Stack
- Frontend: React, Tailwind CSS
- Backend: Node.js, Express, Prisma
- Database: PostgreSQL
- Payment: Stripe
- Deployment: Docker, AWS
```

### 2. Run the Orchestrator

```bash
./claude-orchestrator.sh
```

That's it! The system will:
1. ✅ Analyze your project with Claude
2. ✅ Break it down into optimal parallel tasks (4-12 tasks)
3. ✅ Generate complete prompts for each task
4. ✅ Launch N Claude terminal sessions
5. ✅ Arrange windows in a grid
6. ✅ Start all tasks simultaneously
7. ✅ Create a keep-alive monitor

---

## 🎨 How It Works

### Phase 1: Intelligent Analysis
```
PROJECT.md → Claude → Task Breakdown (JSON)
```

Claude analyzes your project and creates:
- Independent, parallelizable tasks
- Complete standalone prompts for each task
- Optimal task count (balances speed vs complexity)

### Phase 2: Orchestration
```
Tasks → Terminal Windows → Grid Layout → Keep-Alive
```

The orchestrator:
- Launches exactly the right number of terminals
- Handles all trust prompts automatically
- Submits task prompts to each Claude instance
- Arranges windows for easy monitoring
- Creates a custom keep-alive script

### Phase 3: Execution
```
All tasks run in parallel → 15-20 minutes → Complete project
```

---

## 📋 Advanced Usage

### Custom Project File

```bash
./claude-orchestrator.sh /path/to/project CUSTOM_PROJECT.md
```

### Example Projects

#### **Web Scraper**
```markdown
# Project: Multi-Site Web Scraper

## Description
Build a configurable web scraper that extracts data from multiple sites,
stores it in a database, and provides an API to query the data.

## Requirements
- Scrape 5 different e-commerce sites
- Extract product data (name, price, images, reviews)
- Store in PostgreSQL with proper schema
- Rate limiting and error handling
- REST API for querying scraped data
- Scheduled scraping with cron
```

#### **Mobile App Backend**
```markdown
# Project: Fitness Tracking API

## Description
RESTful API for a fitness tracking mobile app with user profiles,
workout logging, progress tracking, and social features.

## Requirements
- User authentication (JWT)
- Workout logging and tracking
- Progress analytics and charts
- Social feed and friend connections
- Achievement system
- Push notifications
- AWS deployment with CI/CD
```

#### **Data Pipeline**
```markdown
# Project: Real-time Analytics Pipeline

## Description
Build a data pipeline that ingests streaming data, processes it,
and provides real-time analytics dashboards.

## Requirements
- Kafka for streaming data ingestion
- Apache Spark for data processing
- PostgreSQL for storage
- Redis for caching
- Grafana dashboards
- Docker Compose setup
- Monitoring and alerting
```

---

## 🧠 Task Breakdown Examples

### Small Project (4 tasks)
```
├── TASK_01: Database Schema & Models
├── TASK_02: API Endpoints & Business Logic
├── TASK_03: Frontend Components & UI
└── TASK_04: Testing & Deployment Config
```

### Medium Project (8 tasks)
```
├── TASK_01: Database Schema
├── TASK_02: Authentication System
├── TASK_03: Core API Routes
├── TASK_04: File Upload/Storage
├── TASK_05: Frontend Components
├── TASK_06: State Management
├── TASK_07: Testing Suite
└── TASK_08: Docker & Deployment
```

### Large Project (12 tasks)
```
├── TASK_01: Database Schema           ├── TASK_07: Admin Dashboard
├── TASK_02: Auth Middleware          ├── TASK_08: Payment Integration
├── TASK_03: User Management API      ├── TASK_09: Email Service
├── TASK_04: Product Catalog API      ├── TASK_10: Search & Filters
├── TASK_05: Order Processing         ├── TASK_11: Testing
└── TASK_06: Frontend UI Components   └── TASK_12: CI/CD Pipeline
```

---

## 📐 Dynamic Grid Layouts

The orchestrator automatically calculates optimal grid layouts:

| Tasks | Grid Layout |
|-------|-------------|
| 1-4   | 2×2         |
| 5-6   | 3×2         |
| 7-9   | 3×3         |
| 10-12 | 3×4         |

Each window is sized to fit perfectly on your screen.

---

## 🔧 Generated Files

After running, you'll find:

```
.claude-orchestrator/
├── breakdown.json           # Full task breakdown
├── task_list.txt           # Task IDs and titles
├── prompts/
│   ├── TASK_01.md         # Individual prompts
│   ├── TASK_02.md
│   └── ...
└── tasks/                  # Task execution logs

keep-alive-auto.sh          # Custom keep-alive monitor
```

---

## 💡 Pro Tips

### 1. **Write Clear Project Descriptions**
- Be specific about requirements
- List technologies you want to use
- Mention any constraints or preferences

### 2. **Optimal Task Count**
- 4-6 tasks: Simple projects
- 7-9 tasks: Medium complexity
- 10-12 tasks: Large projects
- Claude will decide based on your description

### 3. **Use the Keep-Alive**
```bash
./keep-alive-auto.sh
```
Always run this after orchestration to handle permission prompts.

### 4. **Monitor Progress**
The grid layout lets you see all tasks at once. Each window shows:
- Task name and ID
- Claude's progress
- Any prompts or questions

### 5. **Iterate and Refine**
If the breakdown isn't perfect:
- Edit `PROJECT.md` with more details
- Run the orchestrator again
- Previous windows will be closed automatically

---

## 🎯 Use Cases

### ✅ Perfect For:
- **Full-stack applications**: Break into frontend, backend, database, deployment
- **Microservices**: Each service as a separate task
- **Data pipelines**: Ingestion, processing, storage, visualization
- **API development**: Auth, endpoints, integrations, docs
- **Refactoring projects**: Split by module or feature area
- **Documentation**: Different sections in parallel
- **Testing suites**: Unit, integration, e2e tests separately

### ❌ Not Ideal For:
- Single, non-divisible tasks
- Tasks that must be done sequentially
- Projects requiring constant back-and-forth iteration

---

## 🛠 Customization

### Modify Grid Layout

Edit the `calc_grid_dimensions()` function in `claude-orchestrator.sh`:

```bash
calc_grid_dimensions() {
    local count=$1
    local cols=4  # More columns
    local rows=3  # Fewer rows
    echo "$cols $rows"
}
```

### Change Keep-Alive Interval

In the generated `keep-alive-auto.sh`:

```bash
sleep 3  # Change to sleep 5 for slower interval
```

### Custom Claude Parameters

Modify the claude launch command:

```bash
set newWindow to do script "claude --model opus"  # Use Opus instead
```

---

## 🚨 Troubleshooting

### "Failed to break down project"
- Check that `PROJECT.md` has enough detail
- View `.claude-orchestrator/breakdown.json` for errors
- Add more specific requirements

### Windows not processing
- Run `./keep-alive-auto.sh`
- Manually press Enter in stuck windows
- Check if Claude is waiting for input

### Wrong number of tasks
- Edit `PROJECT.md` to be more/less detailed
- Claude optimizes for 4-12 tasks automatically

### Grid layout issues
- Modify `calc_grid_dimensions()` function
- Manually resize windows after launch

---

## 🎉 Real-World Example

```bash
# Create project file
cat > PROJECT.md <<EOF
# Project: AI-Powered Code Review Tool

## Description
CLI tool that uses AI to review code, suggest improvements,
detect bugs, and enforce style guidelines.

## Requirements
- Git integration to analyze commits
- Multiple language support (JS, Python, Go)
- AI-powered analysis using Claude API
- Customizable rule sets
- HTML report generation
- CI/CD integration (GitHub Actions)
EOF

# Run orchestrator
./claude-orchestrator.sh

# Wait 2 minutes for setup...
# Start keep-alive
./keep-alive-auto.sh

# Wait 15-20 minutes...
# Complete project ready!
```

---

## 🌟 The Magic

This orchestrator:
- **Thinks**: Uses Claude to intelligently break down projects
- **Adapts**: Works with any project size or type
- **Scales**: 4-12 parallel Claude instances
- **Automates**: Zero manual intervention needed
- **Monitors**: Visual grid shows all progress
- **Completes**: Full project in ~20 minutes

**One command. Any project. Fully automated.**

---

## 📚 More Examples

See the `examples/` directory for:
- E-commerce platform
- SaaS dashboard
- Mobile app backend
- Data analytics pipeline
- ML model training pipeline
- Chrome extension
- Discord bot
- And more...

---

Made with ❤️ and AI orchestration
