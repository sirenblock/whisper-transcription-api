# 🚀 Claude Multi-Agent Orchestrator

> Break down any project into parallel tasks and execute them simultaneously with multiple Claude AI instances.

**One command. Any project. 12x faster.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-macOS-lightgrey.svg)
![Claude](https://img.shields.io/badge/AI-Claude-orange.svg)

---

## 🎯 What Is This?

A revolutionary system that uses **Claude AI** to intelligently break down any software project into independent, parallelizable tasks and executes them simultaneously across multiple Claude instances.

### Before (Sequential Development):
```
Task 1 → 20 min
Task 2 → 20 min
Task 3 → 20 min
...
Total: 240 minutes for 12 tasks
```

### After (Parallel Orchestration):
```
All 12 tasks running in parallel → 20 minutes
Total: 20 minutes ⚡
```

**Result: 12x faster development with zero manual intervention.**

---

## ✨ Features

- 🤖 **AI-Powered Planning** - Claude analyzes your project and creates optimal task breakdown
- ⚡ **Parallel Execution** - Run 4-12 Claude instances simultaneously
- 📐 **Smart Grid Layout** - Automatic window arrangement for visual monitoring
- 🔄 **Auto Keep-Alive** - Handles permission prompts and keeps sessions active
- 🎯 **Universal** - Works with any project type or tech stack
- 📊 **Real-Time Monitoring** - Watch all tasks progress in a visual grid
- 🛠️ **Zero Config** - Just describe your project and run

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/claude-orchestrator.git
cd claude-orchestrator
```

### 2. Create Your Project Description

```bash
cat > PROJECT.md <<'EOF'
# Project: Todo App

## Description
Build a full-stack todo application with user authentication
and real-time sync.

## Requirements
- User registration and login
- Create, update, delete todos
- Mark todos as complete
- Real-time sync across devices
- Responsive design

## Tech Stack
- Frontend: React, Tailwind CSS
- Backend: Node.js, Express
- Database: PostgreSQL
- Real-time: Socket.io
EOF
```

### 3. Run the Orchestrator

```bash
./claude-orchestrator.sh
```

### 4. Start Keep-Alive (Optional but Recommended)

```bash
./keep-alive-auto.sh
```

**That's it!** Watch your project come to life in 15-20 minutes.

---

## 📋 What You Get

The orchestrator automatically:

1. ✅ Analyzes your PROJECT.md using Claude
2. ✅ Breaks it into 4-12 optimal parallel tasks
3. ✅ Generates complete, standalone prompts for each task
4. ✅ Launches N Terminal windows with Claude
5. ✅ Handles all trust prompts automatically
6. ✅ Submits task prompts to each instance
7. ✅ Arranges windows in a beautiful grid layout
8. ✅ Creates a custom keep-alive monitor
9. ✅ Completes your entire project in ~20 minutes

---

## 🎨 Visual Experience

Your screen during execution:

```
┌──────────────┬──────────────┬──────────────┐
│ TASK_01      │ TASK_02      │ TASK_03      │
│ Database     │ Auth System  │ Frontend UI  │
│              │              │              │
│ [Claude      │ [Claude      │ [Claude      │
│  coding...]  │  coding...]  │  coding...]  │
├──────────────┼──────────────┼──────────────┤
│ TASK_04      │ TASK_05      │ TASK_06      │
│ API Routes   │ Testing      │ Deployment   │
│              │              │              │
│ [Claude      │ [Claude      │ [Claude      │
│  coding...]  │  coding...]  │  coding...]  │
└──────────────┴──────────────┴──────────────┘
```

Monitor all tasks in real-time!

---

## 📚 Example Projects

We've included ready-to-use examples in the `examples/` directory:

- **E-Commerce Platform** - Full-stack shop with payments
- **SaaS Dashboard** - Multi-tenant analytics platform
- **Mobile App Backend** - Social fitness API
- **Data Pipeline** - Real-time analytics system
- **Chrome Extension** - AI-powered research assistant

Try them:

```bash
cp examples/PROJECT_ECOMMERCE.md PROJECT.md
./claude-orchestrator.sh
```

---

## 🛠️ How It Works

### Phase 1: Intelligent Analysis
```
PROJECT.md → Claude AI → Task Breakdown → JSON Output
```

Claude analyzes your requirements and creates:
- Independent, parallelizable tasks
- Complete standalone prompts
- Optimal task count (4-12 based on project complexity)

### Phase 2: Orchestration
```
JSON Tasks → Launch Terminals → Grid Layout → Auto-start
```

The orchestrator:
- Launches exactly the right number of Claude instances
- Manages all Terminal window automation
- Arranges windows for easy monitoring
- Handles permission prompts

### Phase 3: Execution
```
All tasks run in parallel → 15-20 minutes → Complete project
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | This file - Quick start and overview |
| [ORCHESTRATOR_MASTER_README.md](ORCHESTRATOR_MASTER_README.md) | Complete system overview |
| [ORCHESTRATOR_README.md](ORCHESTRATOR_README.md) | Deep dive into the orchestrator |
| [QUICKSTART_ORCHESTRATOR.md](QUICKSTART_ORCHESTRATOR.md) | 60-second quick start |
| [examples/](examples/) | Ready-to-use PROJECT.md templates |

---

## 🎯 Use Cases

### Perfect For:

✅ **Full-Stack Applications**
- Break into frontend, backend, database, deployment
- All components built in parallel

✅ **Microservices**
- Each service as a separate task
- Independent development and testing

✅ **API Development**
- Auth, endpoints, integrations, docs
- Parallel implementation

✅ **Data Pipelines**
- Ingestion, processing, storage, visualization
- Complex workflows simplified

✅ **Large Refactors**
- Split by module or feature area
- Systematic transformation

### Not Ideal For:

❌ Single, non-divisible tasks
❌ Highly sequential workflows
❌ Projects requiring constant iteration
❌ Tasks with circular dependencies

---

## ⚙️ Requirements

- **macOS** (uses AppleScript for Terminal automation)
- **Claude CLI** installed (`brew install claude`)
- **Python 3** (for JSON parsing)
- **Git** (optional, for cloning)

---

## 🔧 Configuration

### Customize Grid Layout

Edit `calc_grid_dimensions()` in `claude-orchestrator.sh`:

```bash
calc_grid_dimensions() {
    local count=$1
    local cols=4  # Change number of columns
    local rows=3  # Change number of rows
    echo "$cols $rows"
}
```

### Adjust Keep-Alive Interval

Edit generated `keep-alive-auto.sh`:

```bash
sleep 3  # Change to 5 for slower updates
```

---

## 📊 Project Structure

```
claude-orchestrator/
├── claude-orchestrator.sh              # Main orchestrator script
├── launch-all-12-ultimate.sh           # Pre-configured 12-task launcher
├── keep-alive.sh                       # Keep-alive monitor template
├── README.md                           # This file
├── ORCHESTRATOR_MASTER_README.md       # Complete guide
├── ORCHESTRATOR_README.md              # Technical deep dive
├── QUICKSTART_ORCHESTRATOR.md          # Quick start guide
├── examples/                           # Example projects
│   ├── PROJECT_ECOMMERCE.md
│   ├── PROJECT_SAAS.md
│   ├── PROJECT_MOBILE_BACKEND.md
│   ├── PROJECT_DATA_PIPELINE.md
│   └── PROJECT_CHROME_EXTENSION.md
└── .claude-orchestrator/               # Generated during run
    ├── breakdown.json                  # Task breakdown
    ├── task_list.txt                   # Task IDs
    └── prompts/                        # Individual prompts
```

---

## 🚨 Troubleshooting

### "No PROJECT.md found"
Create a PROJECT.md file with your project description first.

### "Failed to break down project"
Add more detail to your PROJECT.md. Claude needs clear requirements to create good tasks.

### Windows not processing
Run `./keep-alive-auto.sh` to automatically handle permission prompts.

### Wrong number of tasks
Claude optimizes for 4-12 tasks. Adjust detail level in PROJECT.md to influence the breakdown.

---

## 💡 Pro Tips

1. **Be Specific** - Detailed PROJECT.md = better task breakdown
2. **Use Keep-Alive** - Always run it to handle prompts automatically
3. **Monitor Progress** - The grid shows real-time status
4. **Review Output** - Check each terminal for generated code
5. **Iterate** - Refine PROJECT.md and re-run if needed

---

## 🤝 Contributing

Contributions welcome! Ideas:

- Support for Linux/Windows
- Web UI for monitoring
- Task dependency management
- Resume failed tasks
- Cost tracking
- Multi-model support (GPT-4, Gemini, etc.)

---

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 🌟 Show Your Support

If this project helps you, please:
- ⭐ Star the repository
- 🐛 Report bugs or request features
- 🔀 Submit pull requests
- 📢 Share with others

---

## 🙏 Acknowledgments

- Built with [Claude](https://claude.ai) by Anthropic
- Inspired by multi-agent AI systems
- Terminal automation via AppleScript

---

## 📧 Contact

Questions? Issues? Ideas?

- Open an [issue](https://github.com/yourusername/claude-orchestrator/issues)
- Start a [discussion](https://github.com/yourusername/claude-orchestrator/discussions)

---

<div align="center">

**Made with ❤️ and parallel AI execution**

[Quick Start](#-quick-start) • [Examples](examples/) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>
