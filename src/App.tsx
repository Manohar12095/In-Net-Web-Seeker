import { useState, useEffect } from "react";
import { AppShell } from "./components/AppShell";
import { HomePage } from "./features/home/HomePage";
import { ProjectWorkspace } from "./features/workspace/ProjectWorkspace";
import { StandaloneToolsModal } from "./features/tools/StandaloneToolsModal";
import { CommandPalette } from "./components/CommandPalette";

interface ActiveProject {
  id: string;
  name: string;
  target: string;
  run_id?: string;
}

export function App() {
  const [activeProject, setActiveProject] = useState<ActiveProject | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleProjectSelected = (proj: { id: string; name: string; target: string; run_id?: string }) => {
    setActiveProject(proj);
  };

  const handleBackHome = () => setActiveProject(null);

  return (
    <>
      <AppShell
        activeProject={activeProject}
        onNavigateHome={handleBackHome}
        onOpenTools={() => setToolsOpen(true)}
        onOpenCommandPalette={() => setPaletteOpen(true)}
      >
        {activeProject ? (
          <ProjectWorkspace
            project={activeProject}
            onBack={handleBackHome}
          />
        ) : (
          <HomePage onProjectSelected={handleProjectSelected} />
        )}
      </AppShell>

      {/* Global Modals */}
      <StandaloneToolsModal
        isOpen={toolsOpen}
        onClose={() => setToolsOpen(false)}
      />

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigateHome={handleBackHome}
        onOpenTools={() => setToolsOpen(true)}
      />
    </>
  );
}

export default App;
