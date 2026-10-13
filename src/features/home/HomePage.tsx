import { useState } from "react";
import { WaveBackground } from "./WaveBackground";
import { TargetInput } from "./TargetInput";
import { RecentProjects } from "./RecentProjects";
import { FeatureCards } from "./FeatureCards";
import { AuthorizedUseDialog } from "./AuthorizedUseDialog";
import { NewCollectionDialog } from "./NewCollectionDialog";
import { Parsed } from "./useTargetValidation";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import logoImg from "@/assets/T_logo.png";

interface HomePageProps {
  onProjectSelected: (project: { id: string; name: string; target: string; run_id?: string }) => void;
}

export function HomePage({ onProjectSelected }: HomePageProps) {
  const [selectedTarget, setSelectedTarget] = useState<Parsed | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [refreshRecent, setRefreshRecent] = useState(0);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const handleStartCollection = (parsed: Parsed) => {
    setSelectedTarget(parsed);
    const hasConsented = localStorage.getItem("webseeker_authorized_consent") === "true";
    if (!hasConsented) {
      setShowConsent(true);
    } else {
      setShowNewCollection(true);
    }
  };

  const handleConsentAccepted = () => {
    localStorage.setItem("webseeker_authorized_consent", "true");
    setShowConsent(false);
    setShowNewCollection(true);
  };

  const handleProjectCreated = (proj: { id: string; name: string; target: string }) => {
    setRefreshRecent((prev) => prev + 1);
    setBannerNotice(`Project "${proj.name}" initiated! Collection run queued.`);
    setTimeout(() => setBannerNotice(null), 6000);
    onProjectSelected(proj);
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col justify-between px-6 py-10 overflow-hidden">
      {/* Animated Wave Canvas Background */}
      <WaveBackground />

      {bannerNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-950/90 border border-teal-800 text-teal-200 text-xs font-mono shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#2DD4BF]" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative z-10 w-full max-w-4xl mx-auto space-y-8 my-auto">
        {/* Brand Title and Tagline */}
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-black/50 border border-[#2DD4BF]/40 p-1.5 shadow-[0_0_25px_rgba(45,212,191,0.2)] flex items-center justify-center">
              <img src={logoImg} alt="IN Net Web Seeker" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/4 border border-white/8 text-[11px] font-mono text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>Digital Asset Collection & Intelligence Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display tracking-tight text-zinc-100">
            Collect. Analyze. <span className="text-[#2DD4BF]">Explore.</span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Target a public domain, URL, or IP. Crawl scoped assets, analyze passive infrastructure, and export verifiable offline intelligence packages.
          </p>
        </div>

        {/* Live Target Validation Input */}
        <TargetInput onStartCollection={handleStartCollection} />

        {/* Recent Projects Tray */}
        <RecentProjects
          onSelectProject={onProjectSelected}
          refreshTrigger={refreshRecent}
        />

        {/* Feature Highlights Grid */}
        <FeatureCards />
      </div>

      {/* One-time Authorized Use Consent Dialog */}
      <AuthorizedUseDialog
        isOpen={showConsent}
        onAccept={handleConsentAccepted}
        onCancel={() => setShowConsent(false)}
      />

      {/* New Collection Launch Dialog */}
      <NewCollectionDialog
        isOpen={showNewCollection}
        target={selectedTarget}
        onClose={() => setShowNewCollection(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
