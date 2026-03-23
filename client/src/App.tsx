import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { I18nProvider } from "./lib/i18n";
import NotFound from "./pages/not-found";
import AuthPage from "./pages/auth-page";
import Dashboard from "./pages/dashboard";
import UserDashboard from "./pages/user-dashboard";
import PublicProfile from "./pages/public-profile";
import Landing from "./pages/Landing";
import Leaderboard from "./pages/Leaderboard";
import Shop from "./pages/shop";
import TOS from "./pages/tos";
import Templates from "./pages/templates";
import SecretPage from "./pages/secret";
import TeamPage from "./pages/team";
import FoundersPage from "./pages/founders";
import ChangesPage from "./pages/changes";
import WheelSpinPage from "./pages/wheelspin";
import EasterPage from "./pages/easter";
import { Info } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, ReactNode } from "react";

const FUN_FACTS = [
  "Fun fact: Hexed was created by Byte & Mr Pain — before it was called Hexed, it was called Voidlink.",
  "Did you know? This whole platform took over 3 weeks to go from idea to live.",
  "Byte spent 2+ days straight getting the badge Databank to work. Pure stubbornness.",
  "The name 'Voidlink' didn't stick, so here we are. Hexed just felt right.",
  "Hexed started as a small side project between two friends. Now you're using it.",
];

function playDing() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
    ctx.close();
  } catch (_) {}
}

function FunFactToast() {
  const [location] = useLocation();
  const [visible, setVisible] = useState(false);
  const [factIdx, setFactIdx] = useState(0);

  const isHome = location === "/";

  useEffect(() => {
    if (!isHome) return;
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;
    let cycleTimer: ReturnType<typeof setTimeout>;

    const schedule = (delay: number) => {
      showTimer = setTimeout(() => {
        if (Math.random() > 0.35) {
          const next = 480000 + Math.random() * 360000;
          cycleTimer = setTimeout(() => schedule(0), next);
          return;
        }
        setFactIdx(Math.floor(Math.random() * FUN_FACTS.length));
        setVisible(true);
        playDing();
        hideTimer = setTimeout(() => {
          setVisible(false);
          const next = 480000 + Math.random() * 360000;
          cycleTimer = setTimeout(() => schedule(0), next);
        }, 7000);
      }, delay);
    };

    schedule(180000 + Math.random() * 120000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); clearTimeout(cycleTimer); };
  }, [isHome]);

  if (!isHome) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 right-6 z-[9999] max-w-[280px] w-[80vw] pointer-events-auto"
        >
          <div
            className="flex items-start gap-2.5 px-4 py-3 rounded-2xl border text-[11px] leading-relaxed shadow-2xl"
            style={{ background: "rgba(8,8,8,0.96)", borderColor: "rgba(249,115,22,0.28)", backdropFilter: "blur(20px)", color: "#d4d4d4" }}
          >
            <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
            <span>{FUN_FACTS[factIdx]}</span>
            <button onClick={() => setVisible(false)} className="ml-auto shrink-0 text-gray-600 hover:text-gray-400 transition-colors text-sm leading-none">✕</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DiscordRequiredWall() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md text-center space-y-6"
      >
        <div className="text-5xl">✋</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Hey, Stop!</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            To continue using Hexed, you need to connect your Discord account. This keeps your account safe and verified.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/20 text-left space-y-2">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#7289da]">Why Discord?</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            Connecting your Discord ensures your account is real and secure. We only request your username and avatar — no email, no private messages.
          </p>
        </div>
        <a
          href="/auth/discord/link"
          className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all border border-[#5865F2]/40 hover:border-[#5865F2] hover:bg-[#5865F2]/10"
          style={{ background: "rgba(88,101,242,0.12)" }}
        >
          <SiDiscord className="w-5 h-5 text-[#5865F2]" />
          Connect Discord
        </a>
        <button
          onClick={() => logout()}
          className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors border border-white/[0.04] hover:border-white/10"
        >
          Logout
        </button>
      </motion.div>
    </div>
  );
}

const STAFF_ROLES = ["admin", "administrator", "moderator", "support", "developer", "owner"];

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (!user.discordId && !STAFF_ROLES.includes(user.role)) return <DiscordRequiredWall />;
  return <>{children}</>;
}

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] gap-6">
        <div className="text-[28px] font-bold tracking-tight text-white" style={{ fontFamily: "'Geist', 'Inter', sans-serif", letterSpacing: "-0.5px" }}>
          hex<span className="text-orange-500">ed</span>
        </div>
        <div className="w-[120px] h-[2px] bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full w-[40%] bg-orange-500 rounded-full"
            style={{ animation: "hexslide 1.1s ease-in-out infinite" }}
          />
        </div>
        <style>{`@keyframes hexslide{0%{transform:translateX(-100%)}50%{transform:translateX(200%)}100%{transform:translateX(200%)}}`}</style>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/"><Landing /></Route>
      <Route path="/login">{user ? <Redirect to="/dashboard" /> : <AuthPage />}</Route>
      <Route path="/register">{user ? <Redirect to="/dashboard" /> : <AuthPage />}</Route>
      <Route path="/dashboard"><ProtectedRoute><Dashboard /></ProtectedRoute></Route>
      <Route path="/profile"><ProtectedRoute><Dashboard activeTab="profile" /></ProtectedRoute></Route>
      <Route path="/options"><ProtectedRoute><Dashboard activeTab="options" /></ProtectedRoute></Route>
      <Route path="/miscellaneous"><ProtectedRoute><Dashboard activeTab="miscellaneous" /></ProtectedRoute></Route>
      <Route path="/extras"><ProtectedRoute><Dashboard activeTab="extras" /></ProtectedRoute></Route>
      <Route path="/dashboard/tags"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="tags" /></ProtectedRoute></Route>
      <Route path="/dashboard/visual"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="visual" /></ProtectedRoute></Route>
      <Route path="/dashboard/tracks"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="tracks" /></ProtectedRoute></Route>
      <Route path="/dashboard/alias"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="alias" /></ProtectedRoute></Route>
      <Route path="/dashboard/embed"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="embed" /></ProtectedRoute></Route>
      <Route path="/dashboard/challenges"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="challenges" /></ProtectedRoute></Route>
      <Route path="/dashboard/templates"><ProtectedRoute><Dashboard activeTab="extras" extrasSection="templates" /></ProtectedRoute></Route>
      <Route path="/dashboard/user/:username"><ProtectedRoute><UserDashboard /></ProtectedRoute></Route>
      <Route path="/markdowns"><ProtectedRoute><Dashboard activeTab="markdowns" /></ProtectedRoute></Route>
      <Route path="/leaderboard"><Leaderboard /></Route>
      <Route path="/shop/:productId"><Shop /></Route>
      <Route path="/shop"><Shop /></Route>
      <Route path="/tos"><TOS /></Route>
      <Route path="/team"><TeamPage /></Route>
      <Route path="/templates"><Templates /></Route>
      <Route path="/changes"><ChangesPage /></Route>
      <Route path="/hexed/founders"><FoundersPage /></Route>
      <Route path="/hexed/wheelspin"><WheelSpinPage /></Route>
      <Route path="/hexed/easter"><EasterPage /></Route>
      <Route path="/hexed/secret"><ProtectedRoute><SecretPage /></ProtectedRoute></Route>
      <Route path="/:username" component={PublicProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <I18nProvider>
          <TooltipProvider>
            <FunFactToast />
            <Router />
            <Toaster />
          </TooltipProvider>
        </I18nProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
