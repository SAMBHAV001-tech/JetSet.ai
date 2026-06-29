import TripWizard from "@/components/trip-wizard/TripWizard";

export default function Home() {
  return (
    <div className="w-full relative overflow-hidden flex flex-col items-center pt-24 md:pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Background Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-deep/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="text-center z-10 mb-8 max-w-xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold text-white mb-3 tracking-tight drop-shadow-lg">
          JetSet<span className="text-sky-vivid">.AI</span>
        </h1>
        <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto font-sans leading-relaxed">
          The ultimate intelligent travel planner. Tell us your dream, and we handle the rest.
        </p>
      </div>

      {/* Main Wizard */}
      <div className="w-full max-w-4xl z-10">
        <TripWizard />
      </div>


    </div>
  );
}
