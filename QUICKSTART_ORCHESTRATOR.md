# ⚡ Quick Start - Claude Orchestrator

## 60 Second Setup

### 1. Copy the Script
```bash
cp claude-orchestrator.sh /path/to/your/project/
cd /path/to/your/project/
```

### 2. Create PROJECT.md
```bash
cat > PROJECT.md <<'EOF'
# Project: Your Project Name

## Description
Describe what you want to build in 2-3 sentences.

## Requirements
- Requirement 1
- Requirement 2
- Requirement 3

## Tech Stack
List the technologies you want to use.
EOF
```

### 3. Run
```bash
./claude-orchestrator.sh
```

### 4. Wait
The script will:
- Analyze your project (~30 seconds)
- Launch Claude terminals (~2 minutes)
- Arrange windows (~5 seconds)

### 5. Monitor
All windows appear in a grid. Watch them work!

### 6. Keep Alive
```bash
./keep-alive-auto.sh
```

---

## Example: Quick Todo App

```bash
# Create project
cat > PROJECT.md <<'EOF'
# Project: Modern Todo App

## Description
Build a full-stack todo application with user authentication,
real-time sync, and mobile-responsive design.

## Requirements
- User registration and login
- Create, read, update, delete todos
- Mark todos as complete
- Filter by status (all, active, completed)
- Real-time sync across devices
- Responsive design

## Tech Stack
- Frontend: React, Tailwind CSS
- Backend: Node.js, Express
- Database: PostgreSQL
- Real-time: Socket.io
- Auth: JWT
EOF

# Run orchestrator
./claude-orchestrator.sh

# Start keep-alive in another terminal
./keep-alive-auto.sh
```

**Result**: 6-8 parallel tasks complete in ~15 minutes!

---

## What You Get

```
Your Project/
├── PROJECT.md                    # Your project description
├── claude-orchestrator.sh        # The orchestrator
├── keep-alive-auto.sh           # Auto-generated keep-alive
├── .claude-orchestrator/        # Generated files
│   ├── breakdown.json           # Task breakdown
│   ├── task_list.txt           # Task list
│   └── prompts/                # Individual task prompts
│       ├── TASK_01.md
│       ├── TASK_02.md
│       └── ...
└── [Your completed project files]
```

---

## Copy-Paste Examples

### Web API
```markdown
# Project: RESTful API

## Description
Build a production-ready RESTful API with authentication,
CRUD operations, and documentation.

## Requirements
- User authentication (JWT)
- CRUD endpoints for main resource
- Input validation
- Error handling
- Rate limiting
- API documentation (OpenAPI)
- Docker deployment

## Tech Stack
Backend: Node.js/Express, PostgreSQL, Prisma
```

### Landing Page
```markdown
# Project: SaaS Landing Page

## Description
Modern, conversion-optimized landing page with pricing,
testimonials, and email signup.

## Requirements
- Hero section with CTA
- Features showcase
- Pricing tiers
- Customer testimonials
- FAQ section
- Email newsletter signup
- Mobile responsive
- SEO optimized

## Tech Stack
Next.js, Tailwind CSS, Framer Motion
```

### Discord Bot
```markdown
# Project: Discord Moderation Bot

## Description
Discord bot for server moderation with custom commands,
auto-moderation, and logging.

## Requirements
- Slash commands
- Auto-moderation (spam, links, profanity)
- Warning system
- Mute/kick/ban commands
- Logging to channel
- Custom role management
- Database for settings

## Tech Stack
Discord.js, Node.js, PostgreSQL
```

---

## Tips for Best Results

### ✅ DO:
- Be specific about what you want
- List clear requirements
- Mention tech stack preferences
- Include any constraints

### ❌ DON'T:
- Be vague or too general
- Forget to mention key requirements
- Skip the tech stack section
- Make it too small (< 3 requirements)

---

## Troubleshooting

**"No PROJECT.md found"**
```bash
# Create one first
cat > PROJECT.md <<'EOF'
# Project: My Project
## Description
...
EOF
```

**"Failed to break down project"**
- Add more detail to PROJECT.md
- Check `.claude-orchestrator/breakdown.json` for errors

**Windows stuck**
```bash
# Run keep-alive
./keep-alive-auto.sh
```

---

## Next Steps

After completion:
1. Review generated code in all terminals
2. Consolidate files into your project structure
3. Test everything
4. Make any necessary adjustments
5. Deploy!

---

**Ready to 10x your development speed? Run the orchestrator now!** 🚀
