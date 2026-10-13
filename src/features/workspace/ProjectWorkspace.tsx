import { useState } from "react";
import {
  ArrowLeft, HardDrive, Shield, Activity, GitCompare,
  Download, Radio
} from "lucide-react";
import { CollectionScreen } from "../collection/CollectionScreen";
import { AssetExplorer } from "../assets/AssetExplorer";
import { NetworkLoadouts } from "../network/NetworkLoadouts";
import { IntelligenceDashboard } from "../intelligence/IntelligenceDashboard";
import { SnapshotsDiff } from "../snapshots/SnapshotsDiff";
import { ExportCenter } from "../export/ExportCenter";

interface ActiveProject {
  id: string;
  name: string;
  target: string;
  run_id?: string;
}

interface ProjectWorkspaceProps {
  project: ActiveProject;
  onBack: () => void;
}

export function ProjectWorkspace({ project, onBack }: ProjectWorkspaceProps) {
  // Default to live stream if run_id present, otherwise asset explorer
  const [activeTab, setActiveTab] = useState<"stream" | "assets" | "network" | "intel" | "snapshots" | "export">(
    project.run_id ? "stream" : "assets"
  );

  return (
    <div className="flex flex-col h-full bg-[#0E0E14] text-zinc-200">
      {/* Cockpit Workspace Header */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Project Brand & Target Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Return to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold text-zinc-100">
                {project.name}
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950/60 text-[#2DD4BF] border border-teal-800/40">
                WORKSPACE
              </span>
            </div>
            <p className="font-mono text-xs text-zinc-500 truncate max-w-lg">
              {project.target}
            </p>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs font-mono">
          {project.run_id && (
            <button
              onClick={() => setActiveTab("stream")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "stream"
                  ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Live Telemetry
            </button>
          )}

          <button
            onClick={() => setActiveTab("assets")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "assets"
                ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Asset Explorer
          </button>

          <button
            onClick={() => setActiveTab("network")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "network"
                ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Loadouts
          </button>

          <button
            onClick={() => setActiveTab("intel")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "intel"
                ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Intelligence
          </button>

          <button
            onClick={() => setActiveTab("snapshots")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "snapshots"
                ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Snapshots
          </button>

          <button
            onClick={() => setActiveTab("export")}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "export"
                ? "bg-[#2DD4BF]/15 text-[#2DD4BF] font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Export & Report
          </button>
        </div>
      </div>

      {/* Tab Panes */}
      <div className="flex-1 overflow-auto">
        {activeTab === "stream" && project.run_id && (
          <CollectionScreen
            project={project}
            runId={project.run_id}
            onBack={onBack}
          />
        )}

        {activeTab === "assets" && (
          <AssetExplorer
            projectId={project.id}
            runId={project.run_id}
          />
        )}

        {activeTab === "network" && (
          <NetworkLoadouts
            projectId={project.id}
            target={project.target}
            runId={project.run_id}
          />
        )}

        {activeTab === "intel" && (
          <IntelligenceDashboard
            host={new URL(project.target.startsWith("http") ? project.target : `https://${project.target}`).hostname}
            targetUrl={project.target}
          />
        )}

        {activeTab === "snapshots" && (
          <SnapshotsDiff
            projectId={project.id}
          />
        )}

        {activeTab === "export" && (
          <ExportCenter
            projectId={project.id}
            projectName={project.name}
            target={project.target}
          />
        )}
      </div>
    </div>
  );
}
