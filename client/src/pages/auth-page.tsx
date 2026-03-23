import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, ArrowRight, Zap } from "lucide-react";
import { SiDiscord } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";

function GlowCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -300, y: -300 });
  const pos = useRef({ x: -300, y: -300 });
  const raf = useRef<number>(0);

  // sizes
  const RING = 22;

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      pos.current.x = lerp(pos.current.x, target.current.x, 0.13);
      pos.current.y = lerp(pos.current.y, target.current.y, 0.13);
      const x = pos.current.x;
      const y = pos.current.y;
      // offset by half size so the circle is perfectly centered on the cursor
      if (ringRef.current)
        ringRef.current.style.transform = `translate(${x - RING / 2}px, ${y - RING / 2}px)`;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const base = "pointer-events-none fixed top-0 left-0 rounded-full will-change-transform z-[9999]";

  return (
    <>
      {/* Simple cursor dot — no glow */}
      <div ref={ringRef} className={base}
        style={{
          width: RING, height: RING,
          border: "1.5px solid rgba(249,115,22,0.7)",
        }} />
    </>
  );
}

export default function AuthPage() {
  const { login, register, isLoggingIn, isRegistering, loginError } = useAuth();
  const [location] = useLocation();
  const [mode, setMode] = useState<"login" | "register">(location === "/register" ? "register" : "login");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const isBanned = loginError?.toLowerCase().includes("banned");

  const { data: discordStatus } = useQuery<{ enabled: boolean; configured: boolean }>({
    queryKey: ["/api/discord-status"],
    staleTime: 30000,
  });
  const discordEnabled = discordStatus?.enabled !== false;

  const loginForm = useForm({
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { username: "", password: "", email: "" },
  });

  const inputCls = "bg-white/[0.04] border border-white/[0.08] focus:border-orange-500/60 focus:bg-white/[0.06] rounded-xl h-12 px-4 text-white placeholder:text-gray-600 text-sm font-medium transition-all outline-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full";

  return (
    <div className="min-h-screen bg-[#050505] flex overflow-hidden">
      <GlowCursor />
      {/* Left decorative panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col items-center justify-center p-16 bg-[#070707] border-r border-white/[0.04]">
        {/* Ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-orange-600/5 rounded-full blur-[80px]" />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />

        <div className="relative z-10 text-center max-w-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black uppercase tracking-widest mb-8">
            <Zap className="w-3 h-3" /> Your identity. Your rules.
          </div>
          <h1 className="text-5xl xl:text-6xl font-black text-white tracking-tighter leading-none mb-4">
            hex<span className="text-orange-500">ed</span>
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-10">
            The social profile platform built for creators, communities, and the people behind them.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {["Custom themes", "Discord sync", "Music player", "Badges", "Analytics"].map(f => (
              <span key={f} className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-gray-500 text-[11px] font-bold">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <a href="/" className="text-3xl font-black text-orange-500 tracking-tighter">hexed</a>
        </div>

        {/* Back link */}
        <a href="/" className="absolute top-6 left-6 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1">
          ← Back
        </a>

        <div className="w-full max-w-[380px]">
          {/* Banned state */}
          {isBanned ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 p-8 rounded-2xl bg-red-500/5 border border-red-500/20">
              <div className="text-5xl">🚫</div>
              <div>
                <h2 className="text-xl font-black text-red-400 mb-1">You've been banned</h2>
                <p className="text-gray-500 text-sm">Your account has been suspended. Contact support if you believe this is a mistake.</p>
              </div>
              <button onClick={() => window.location.href = "/"} className="px-6 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-all">
                Go Home
              </button>
            </motion.div>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-8">
                {(["login", "register"] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${mode === m ? "bg-orange-500 text-black shadow-lg" : "text-gray-500 hover:text-gray-300"}`}>
                    {m === "login" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {mode === "login" ? (
                  <motion.div key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.18 }}>
                    <div className="mb-6">
                      <h2 className="text-2xl font-black text-white">Welcome back</h2>
                      <p className="text-gray-500 text-sm mt-1">Sign in to your Hexed account</p>
                    </div>

                    {/* Discord */}
                    {discordEnabled ? (
                      <a href="/auth/discord" data-testid="button-discord-login"
                        className="flex items-center justify-center gap-2.5 w-full h-12 rounded-xl bg-[#5865F2]/10 border border-[#5865F2]/30 text-white font-bold text-sm hover:bg-[#5865F2]/20 hover:border-[#5865F2]/60 transition-all mb-4">
                        <SiDiscord className="w-4 h-4 text-[#7289da]" /> Continue with Discord
                      </a>
                    ) : (
                      <div data-testid="button-discord-login-disabled"
                        className="flex items-center justify-center gap-2.5 w-full h-12 rounded-xl bg-white/[0.02] border border-white/[0.05] text-gray-600 font-bold text-sm cursor-not-allowed mb-4 select-none">
                        <SiDiscord className="w-4 h-4 text-gray-700" /> Continue with Discord
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-white/[0.06] text-gray-600">SOON</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-white/[0.05]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">or</span>
                      <div className="flex-1 h-px bg-white/[0.05]" />
                    </div>

                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit((data: any) => login(data))} className="space-y-3">
                        <FormField control={loginForm.control} name="username" render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <input {...field} placeholder="Username" className={inputCls} data-testid="input-username" autoComplete="username" />
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                          </FormItem>
                        )} />
                        <FormField control={loginForm.control} name="password" render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <input {...field} type={showLoginPw ? "text" : "password"} placeholder="Password" className={`${inputCls} pr-11`} data-testid="input-password" autoComplete="current-password" />
                                <button type="button" onClick={() => setShowLoginPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                  {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                          </FormItem>
                        )} />

                        {loginError && !isBanned && (
                          <p className="text-xs text-red-400 font-medium px-1">{loginError}</p>
                        )}

                        <button type="submit" disabled={isLoggingIn} data-testid="button-login"
                          className="w-full h-12 rounded-xl bg-orange-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1">
                          {isLoggingIn ? "Signing in..." : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
                        </button>
                      </form>
                    </Form>

                    <p className="text-center text-xs text-gray-600 mt-6">
                      Don't have an account?{" "}
                      <button onClick={() => setMode("register")} className="text-orange-500 font-bold hover:text-orange-400 transition-colors">Sign up</button>
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="register" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.18 }}>
                    <div className="mb-6">
                      <h2 className="text-2xl font-black text-white">Create account</h2>
                      <p className="text-gray-500 text-sm mt-1">Join Hexed and build your profile</p>
                    </div>

                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit((data: any) => register(data))} className="space-y-3">
                        <FormField control={registerForm.control} name="username" render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <input {...field} placeholder="Username" className={inputCls} data-testid="input-reg-username" autoComplete="username" />
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                          </FormItem>
                        )} />
                        <FormField control={registerForm.control} name="email" render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <input {...field} type="email" placeholder="Email address" className={inputCls} data-testid="input-reg-email" autoComplete="email" />
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                          </FormItem>
                        )} />
                        <FormField control={registerForm.control} name="password" render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <input {...field} type={showRegPw ? "text" : "password"} placeholder="Password" className={`${inputCls} pr-11`} data-testid="input-reg-password" autoComplete="new-password" />
                                <button type="button" onClick={() => setShowRegPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                                  {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-400" />
                          </FormItem>
                        )} />

                        <button type="submit" disabled={isRegistering} data-testid="button-register"
                          className="w-full h-12 rounded-xl bg-orange-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1">
                          {isRegistering ? "Creating account..." : <><span>Get Started</span><ArrowRight className="w-4 h-4" /></>}
                        </button>
                      </form>
                    </Form>

                    <p className="text-center text-xs text-gray-600 mt-6">
                      Already have an account?{" "}
                      <button onClick={() => setMode("login")} className="text-orange-500 font-bold hover:text-orange-400 transition-colors">Sign in</button>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          <p className="text-center text-[10px] text-gray-700 font-bold mt-8">
            <a href="/shop" className="hover:text-gray-500 transition-colors uppercase tracking-widest">Visit Shop</a>
          </p>
        </div>
      </div>
    </div>
  );
}
