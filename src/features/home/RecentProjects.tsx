import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Folder, Clock, ArrowUpRight, Database } from "lucide-react";

export interface ProjectItem {
  id: string;
  name: string;
  target: string;
  created_at?: string;
}

interface RecentProjectsProps {
  onSelectProject: (project: ProjectItem) => void;
  refreshTrigger?: number;
}

export function RecentProjects({ onSelectProject, refreshTrigger }: RecentProjectsProps) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api<ProjectItem[]>("/api/projects")
      .then((data) => {
        if (alive) {
          setProjects(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="w-full max-w-3xl mx-auto py-2">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Database className="w-3.5 h-3.5 animate-spin" />
          <span>Scanning local project catalog...</span>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return null; // Quiet when clean
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-2.5">
      <div className="flex items-center justify-between text-xs font-mono text-zinc-500 px-1">
        <span className="uppercase tracking-wider">Recent Investigations</span>
        <span>{projects.length} saved</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {projects.slice(0, 6).map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectProject(p)}
            className="group flex flex-col items-start p-3 rounded-xl border border-white/6 bg-[#181824]/60 hover:bg-[#181824] hover:border-[#2DD4BF]/30 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center justify-between w-full mb-1.5">
              <div className="flex items-center gap-1.5 text-zinc-300 group-hover:text-[#2DD4BF] transition-colors">
                <Folder className="w-3.5 h-3.5" />
                <span className="text-xs font-medium truncate max-w-[170px]">{p.name}</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-[#2DD4BF] transition-colors" />
            </div>

            <div className="text-[11px] font-mono text-zinc-500 truncate w-full">
              {p.target}
            </div>

            {p.created_at && (
              <div className="flex items-center gap-1 text-[10px] text-zinc-600 mt-2 font-mono">
                <Clock className="w-2.5 h-2.5" />
                <span>{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
