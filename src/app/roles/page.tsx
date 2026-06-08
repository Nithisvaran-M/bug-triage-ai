import Link from "next/link";
import { Icons } from "@/components/icons";

const ROLE_CARDS = [
  { slug: "manager", title: "Manager", desc: "Assignments, routing, workflow control, and executive reporting.", bg: "from-indigo-700 via-violet-700 to-fuchsia-700" },
  { slug: "developer", title: "Developer", desc: "Technical bug details, root-cause views, and fix-oriented reports.", bg: "from-slate-900 via-slate-800 to-emerald-700" },
  { slug: "qa", title: "QA", desc: "Reproduction gaps, duplicate clusters, and testing quality signals.", bg: "from-amber-600 via-orange-600 to-rose-600" },
  { slug: "security", title: "Security", desc: "Critical risks, exploit-style bugs, and containment-focused reports.", bg: "from-violet-700 via-fuchsia-700 to-rose-700" },
  { slug: "devops", title: "DevOps", desc: "Build, deploy, pipeline, and infrastructure issue visibility.", bg: "from-cyan-700 via-sky-700 to-slate-900" },
  { slug: "product", title: "Product", desc: "User-impact, prioritization, and UX-focused reporting.", bg: "from-pink-700 via-rose-600 to-orange-500" },
];

export default function RolesIndexPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur-xl p-6 sm:p-8 card-shadow">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs font-semibold">
            <Icons.Bug className="w-4 h-4" /> Multi-role report pages
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold leading-tight">Choose a role page</h1>
          <p className="mt-3 max-w-3xl text-white/80 text-sm sm:text-base leading-relaxed">
            Each role has its own page, visual theme, and report focus. The pages read the current workspace from session storage so nothing is saved as long-term history.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/" className="rounded-2xl bg-white text-slate-900 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Open workspace</Link>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {ROLE_CARDS.map((role) => (
            <Link key={role.slug} href={`/roles/${role.slug}`} className={`group rounded-[1.8rem] overflow-hidden border border-white/10 bg-gradient-to-br ${role.bg} p-5 sm:p-6 min-h-[210px] flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30`}>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider">
                  <Icons.ChevronRight className="w-3.5 h-3.5" /> Open page
                </div>
                <h2 className="mt-4 text-2xl font-extrabold">{role.title}</h2>
                <p className="mt-2 text-sm text-white/80 leading-relaxed">{role.desc}</p>
              </div>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white/90 group-hover:translate-x-1 transition">
                View role report <Icons.ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
