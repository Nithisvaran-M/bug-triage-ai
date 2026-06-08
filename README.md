
---

```markdown
<div align="center">

<!-- Dark Cyber Header -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a0a2e,50:4a148c,100:7c43bd&height=260&section=header&text=BugTriage%20AI&fontSize=55&fontColor=e0e0e0&animation=fadeIn&fontAlignY=30&desc=Intelligent%20Bug%20Triage%20Powered%20by%20AI&descAlignY=55&descSize=16&descColor=b39ddb" width="100%" />

<!-- Villainess Cyber Girl Mascot (Emoji Style) -->
<img src="https://kimi-web-img.moonshot.cn/img/thumbs.dreamstime.com/1a98fdbd11bd3ae2fdd7e6664a1be2e5828da9e8.jpg" width="200" height="200" style="border-radius: 50%; border: 4px solid #7c43bd; box-shadow: 0 0 40px #7c43bd, 0 0 80px rgba(124,67,189,0.4); margin-top: -80px; position: relative; z-index: 10; object-fit: cover;" alt="BugTriage AI Mascot" />

<br/>

<!-- Animated Typing Badge -->
<a href="https://bug-triage-ai-alpha.vercel.app/">
  <img src="https://readme-typing-svg.demolab.com?font=Inter&weight=700&size=22&duration=3000&pause=1000&color=B39DDB&center=true&vCenter=true&width=500&lines=Multi-Role+Triage+Workspace;AI-Powered+Bug+Analysis;Zero-Database+Architecture;Real-Time+Team+Assignment" alt="Typing SVG" />
</a>

<br/><br/>

<!-- Status Badges -->
<p>
  <a href="https://bug-triage-ai-alpha.vercel.app/">
    <img src="https://img.shields.io/badge/🔗%20Live%20Demo-bug--triage--ai--alpha.vercel.app-7c43bd?style=for-the-badge&logo=vercel&logoColor=white&labelColor=1a0a2e" alt="Live Demo" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/⚡%20Status-Online%20%7C%20Production-00e676?style=for-the-badge&labelColor=1a0a2e" alt="Status" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/📜%20License-MIT-ffd700?style=for-the-badge&labelColor=1a0a2e" alt="License" />
  </a>
</p>

<!-- Tech Stack Badges -->
<p>
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white&style=flat-square" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black&style=flat-square" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white&style=flat-square" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square" />
  <img src="https://img.shields.io/badge/AI-OpenAI%20%7C%20Claude%20%7C%20Groq-7c43bd?logo=openai&logoColor=white&style=flat-square" />
</p>

</div>

---

## ✨ What It Does

<table>
<tr>
<td width="60%">

**BugTriage AI** is a **database-free**, multi-role bug triage workspace that leverages AI to intelligently analyze, classify, and route software bugs to the right teams — all in real-time.

| Capability | Description |
|:-----------|:------------|
| 📁 **Smart Upload** | CSV upload or raw text paste for instant analysis |
| 🎯 **AI Classification** | Severity, area, priority & confidence scoring |
| 👥 **Auto-Assignment** | Recommends optimal team automatically |
| 💬 **Chat Assistant** | Ask questions about current analysis |
| 📊 **Export** | JSON/CSV workspace export |
| 🎭 **Role Views** | Dedicated dashboards per stakeholder |

</td>
<td width="40%">

```
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
```

</td>
</tr>
</table>

---

## 🎭 Role-Based Workspaces

<div align="center">

| Role | Path | Purpose |
|:----:|:----:|:--------|
| 🧑‍💼 **Manager** | `/roles/manager` | Overview dashboards & team metrics |
| 💻 **Developer** | `/roles/developer` | Code-level bug details & fixes |
| 🧪 **QA** | `/roles/qa` | Test cases & reproduction steps |
| 🔒 **Security** | `/roles/security` | Vulnerability assessment |
| 🚀 **DevOps** | `/roles/devops` | Infrastructure & deployment issues |
| 📋 **Product** | `/roles/product` | User impact & prioritization |

</div>

---

## 🏗️ Zero-Database Architecture

> **No PostgreSQL. No MongoDB. No backend storage.**
> 
> Everything lives in your browser session. Zero config, zero cost, zero persistence concerns.

```mermaid
graph LR
    A[Bug Report] --> B[Browser Session]
    B --> C[AI Analysis]
    C --> D[Session Storage]
    D --> E[Role Dashboard]
    E --> F[Export JSON/CSV]
    
    style B fill:#7c43bd,stroke:#4a148c,stroke-width:2px,color:#fff
    style C fill:#4a148c,stroke:#7c43bd,stroke-width:2px,color:#fff
```

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/Nithisvaran-M/bug-triage-ai.git
cd bug-triage-ai

# Install dependencies
npm install

# Start development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) 🚀

---

## 🔑 Environment Variables

Create `.env.local` for optional AI provider keys:

```env
# AI Provider Keys (Optional - falls back to heuristic analyzer)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
```

> 💡 **Leave blank** to use the built-in heuristic analyzer — no API keys required!

---

## 📦 Deploy to Production

<div align="center">

| Step | Action |
|:----:|:-------|
| 1️⃣ | Create a **public GitHub repository** |
| 2️⃣ | Push this code to GitHub |
| 3️⃣ | Import repo into **Vercel** |
| 4️⃣ | Deploy — **no database variables needed** |
| 5️⃣ | *(Optional)* Set AI keys in Vercel env vars |

<br/>

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Nithisvaran-M/bug-triage-ai.git)

</div>

---

## 🎬 Demo Highlights

> Perfect for presentations & portfolio showcases:

1. 🏠 **Main Workspace** — Upload & analyze bugs in seconds
2. 🧑‍💼 **Manager View** — High-level metrics & team workload
3. 💻 **Developer View** — Technical deep-dives & stack traces
4. 🧪 **QA View** — Reproduction steps & test coverage
5. 🤖 **Chat Assistant** — Conversational analysis queries
6. 📥 **Export Data** — JSON/CSV workspace snapshots

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

<!-- Dark Cyber Footer -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:7c43bd,50:4a148c,100:1a0a2e&height=120&section=footer" width="100%" />

<p>
  <b>Built with ❤️ by <a href="https://github.com/Nithisvaran-M" style="color:#b39ddb;">Nithisvaran M</a></b>
</p>

<p>
  <a href="https://bug-triage-ai-alpha.vercel.app/">
    <img src="https://img.shields.io/badge/🌐%20Try%20It%20Live-bug--triage--ai--alpha.vercel.app-7c43bd?style=for-the-badge&labelColor=1a0a2e" />
  </a>
</p>

</div>
```

---

