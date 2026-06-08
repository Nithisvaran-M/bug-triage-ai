
<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:2d0a31,50:1a0b2e,100:0d0221&height=200&section=header&text=Bug%20Triage%20AI&fontSize=50&fontColor=ff003c&animation=fadeIn&fontAlignY=35&desc=Intelligent%20Bug%20Routing%20%7C%20Zero-Database%20Architecture&descSize=18&descAlignY=55&descAlign=50"/>
</p>

<div align="center">
  
  [![Typing SVG](https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=800&size=22&duration=3000&pause=1000&color=FF003C&center=true&vCenter=true&width=600&lines=AI-Powered+Bug+Intelligence;Zero-Database+Architecture;Multi-Role+Workspaces;Real-Time+Classification+%26+Routing)](https://git.io/typing-svg)

</div>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white&labelColor=1a0b2e" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=1a0b2e" />
  <img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white&labelColor=1a0b2e" />
  <img src="https://img.shields.io/badge/AI-FF003C?style=for-the-badge&logo=openai&logoColor=white&labelColor=1a0b2e" />
  <img src="https://img.shields.io/badge/Session_Storage-7928CA?style=for-the-badge&logo=redis&logoColor=white&labelColor=1a0b2e" />
</p>

---

## 🌑 The Dark Architecture

<div align="center">

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#ff003c', 'primaryTextColor': '#fff', 'primaryBorderColor': '#ff003c', 'lineColor': '#7928ca', 'secondaryColor': '#1a0b2e', 'tertiaryColor': '#2d0a31'}}}%%
graph TD
    A[🐛 Bug Report Ingested] -->|CSV Upload / Raw Text| B{AI Analysis Engine}
    B --> C[Severity Classification]
    B --> D[Area Detection]
    B --> E[Priority Scoring]
    B --> F[Confidence Rating]
    B --> G[Duplicate Detection]
    
    C --> H[⚡ Auto-Route Decision]
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I[DevOps Team]
    H --> J[Security Team]
    H --> K[Developer Team]
    H --> L[QA Team]
    H --> M[Product Team]
    
    style A fill:#ff003c,stroke:#fff,stroke-width:2px,color:#fff
    style B fill:#1a0b2e,stroke:#ff003c,stroke-width:2px,color:#fff
    style H fill:#7928ca,stroke:#ff003c,stroke-width:3px,color:#fff
    style I fill:#2d0a31,stroke:#ff003c,stroke-width:2px,color:#fff
    style J fill:#2d0a31,stroke:#ff003c,stroke-width:2px,color:#fff
    style K fill:#2d0a31,stroke:#ff003c,stroke-width:2px,color:#fff
    style L fill:#2d0a31,stroke:#ff003c,stroke-width:2px,color:#fff
    style M fill:#2d0a31,stroke:#ff003c,stroke-width:2px,color:#fff
```

</div>

---

## ⚡ Core Capabilities

| Capability | Description | Status |
|---|---|---|
| 📁 **Smart Upload** | CSV upload or raw text paste for instant analysis | `ACTIVE` |
| 🎯 **AI Classification** | Severity, area, priority & confidence scoring | `ACTIVE` |
| 👥 **Auto-Assignment** | Recommends optimal team automatically | `ACTIVE` |
| 💬 **Chat Assistant** | Ask questions about current analysis | `ACTIVE` |
| 📊 **Export** | JSON/CSV workspace export | `ACTIVE` |
| 🎭 **Role Views** | Dedicated dashboards per stakeholder | `ACTIVE` |

---

## 🎭 Role-Based Command Centers

<div align="center">

| Role | Path | Purpose |
|:---:|:---|:---|
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
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#ff003c', 'primaryTextColor': '#fff', 'primaryBorderColor': '#ff003c', 'lineColor': '#7928ca', 'secondaryColor': '#1a0b2e', 'tertiaryColor': '#2d0a31'}}}%%
flowchart LR
    A[Bug Report] --> B[Browser Session]
    B --> C[AI Analysis]
    C --> D[Session Storage]
    D --> E[Role Dashboard]
    E --> F[Export JSON/CSV]
    
    style A fill:#ff003c,stroke:#fff,stroke-width:2px,color:#fff
    style B fill:#1a0b2e,stroke:#ff003c,stroke-width:2px,color:#fff
    style C fill:#7928ca,stroke:#ff003c,stroke-width:2px,color:#fff
    style D fill:#1a0b2e,stroke:#ff003c,stroke-width:2px,color:#fff
    style E fill:#2d0a31,stroke:#ff003c,stroke-width:2px,color:#fff
    style F fill:#ff003c,stroke:#fff,stroke-width:2px,color:#fff
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

> 💡 **Leave blank to use the built-in heuristic analyzer** — no API keys required!

---

## 🎬 Demo Highlights

Perfect for presentations & portfolio showcases:

| Feature | Description |
|---|---|
| 🏠 **Main Workspace** | Upload & analyze bugs in seconds |
| 🧑‍💼 **Manager View** | High-level metrics & team workload |
| 💻 **Developer View** | Technical deep-dives & stack traces |
| 🧪 **QA View** | Reproduction steps & test coverage |
| 🤖 **Chat Assistant** | Conversational analysis queries |
| 📥 **Export Data** | JSON/CSV workspace snapshots |

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:2d0a31,50:1a0b2e,100:0d0221&height=100&section=footer&animation=fadeIn"/>
</p>
```

---

