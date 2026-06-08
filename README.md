<div align="center">
<!-- Animated Header -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:667eea,100:764ba2&height=240&section=header&text=🐛%20BugTriage%20AI&fontSize=50&fontColor=ffffff&animation=fadeIn&fontAlignY=35&desc=Intelligent%20Bug%20Triage%20Powered%20by%20AI&descAlignY=55&descSize=18" width="100%" />
<!-- Animated Typing Badge -->
<a href="https://bug-triage-ai-alpha.vercel.app/">
  <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=22&duration=3000&pause=1000&color=667EEA&center=true&vCenter=true&width=500&lines=Multi-Role+Triage+Workspace;AI-Powered+Bug+Analysis;Zero-Database+Architecture;Real-Time+Team+Assignment" alt="Typing SVG" />
</a>
<br/><br/>
<!-- Status Badges with Hover Effects -->
<p>
  <a href="https://bug-triage-ai-alpha.vercel.app/">
    <img src="https://img.shields.io/badge/🔗%20Live%20Demo-bug--triage--ai--alpha.vercel.app-667eea?style=for-the-badge&logo=vercel&logoColor=white&labelColor=1a1a2e" alt="Live Demo" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/⚡%20Status-Online%20%7C%20Production-00c853?style=for-the-badge&labelColor=1a1a2e" alt="Status" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/📜%20License-MIT-f59e0b?style=for-the-badge&labelColor=1a1a2e" alt="License" />
  </a>
</p>
<!-- Tech Stack Badges -->
<p>
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white&style=flat-square" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black&style=flat-square" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white&style=flat-square" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square" />
  <img src="https://img.shields.io/badge/AI-OpenAI%20%7C%20Claude%20%7C%20Groq-412991?logo=openai&logoColor=white&style=flat-square" />
</p>
</div>
✨ What It Does
<table>
<tr>
<td width="60%">
BugTriage AI is a database-free, multi-role bug triage workspace that leverages AI to intelligently analyze, classify, and route software bugs to the right teams — all in real-time.
Table
Capability	Description
📁 Smart Upload	CSV upload or raw text paste for instant analysis
🎯 AI Classification	Severity, area, priority & confidence scoring
👥 Auto-Assignment	Recommends optimal team automatically
💬 Chat Assistant	Ask questions about current analysis
📊 Export	JSON/CSV workspace export
🎭 Role Views	Dedicated dashboards per stakeholder
</td>
<td width="40%">
plain
┌─────────────────────────────────┐
│  🐛 Bug Report Ingested         │
├─────────────────────────────────┤
│  AI Analysis Engine             │
│  ├── Severity: Critical         │
│  ├── Area: Backend API          │
│  ├── Priority: P0               │
│  ├── Confidence: 94%            │
│  └── Duplicate: 12% match       │
├─────────────────────────────────┤
│  ⚡ Auto-Route → DevOps Team    │
└─────────────────────────────────┘
</td>
</tr>
</table>
🎭 Role-Based Workspaces
<div align="center">
Table
Role	Path	Purpose
🧑‍💼 Manager	/roles/manager	Overview dashboards & team metrics
💻 Developer	/roles/developer	Code-level bug details & fixes
🧪 QA	/roles/qa	Test cases & reproduction steps
🔒 Security	/roles/security	Vulnerability assessment
🚀 DevOps	/roles/devops	Infrastructure & deployment issues
📋 Product	/roles/product	User impact & prioritization
</div>
🏗️ Zero-Database Architecture
No PostgreSQL. No MongoDB. No backend storage.
Everything lives in your browser session. Zero config, zero cost, zero persistence concerns.
Mermaid
Code
Preview
Bug Report
Browser Session
AI Analysis
Session Storage
Role Dashboard
Export JSON/CSV
🚀 Quick Start
bash
# Clone the repository
git clone https://github.com/Nithisvaran-M/bug-triage-ai.git
cd bug-triage-ai

# Install dependencies
npm install

# Start development server
npm run dev
Then open http://localhost:3000 🚀
🔑 Environment Variables
Create .env.local for optional AI provider keys:
env
# AI Provider Keys (Optional - falls back to heuristic analyzer)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
💡 Leave blank to use the built-in heuristic analyzer — no API keys required!
📦 Deploy to Production
<div align="center">
Table
Step	Action
1️⃣	Create a public GitHub repository
2️⃣	Push this code to GitHub
3️⃣	Import repo into Vercel
4️⃣	Deploy — no database variables needed
5️⃣	(Optional) Set AI keys in Vercel env vars
<br/>
https://vercel.com/new/clone?repository-url=https://github.com/Nithisvaran-M/bug-triage-ai.git
</div>
🎬 Demo Highlights
Perfect for presentations & portfolio showcases:
🏠 Main Workspace — Upload & analyze bugs in seconds
🧑‍💼 Manager View — High-level metrics & team workload
💻 Developer View — Technical deep-dives & stack traces
🧪 QA View — Reproduction steps & test coverage
🤖 Chat Assistant — Conversational analysis queries
📥 Export Data — JSON/CSV workspace snapshots
📜 License
This project is licensed under the MIT License — see the LICENSE file for details.
<div align="center">
<!-- Animated Footer -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:764ba2,100:667eea&height=120&section=footer" width="100%" />
<p>
  <b>Built with ❤️ by <a href="https://github.com/Nithisvaran-M">Nithisvaran M</a></b>
</p>
<p>
  <a href="https://bug-triage-ai-alpha.vercel.app/">
    <img src="https://img.shields.io/badge/🌐%20Try%20It%20Live-bug--triage--ai--alpha.vercel.app-667eea?style=for-the-badge" />
  </a>
</p>
</div>
