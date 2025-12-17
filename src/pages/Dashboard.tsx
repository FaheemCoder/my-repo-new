import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  Award, 
  BookOpen,
  Calendar,
  Bell,
  Settings,
  LogOut,
  Sparkles,
  Target,
  FileText,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { MaterialCard } from "@/components/ui/material-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LokYodhaLogo } from "@/components/LokYodhaLogo";
import { useNavigate } from "react-router";
import { Dialog as CDialog, DialogContent as CDialogContent, DialogHeader as CDialogHeader, DialogTitle as CDialogTitle, DialogFooter as CDialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";

export default function Dashboard() {
  // 1) ALL HOOKS DECLARED AT TOP - FIXED ORDER, NO CONDITIONS
  const { user, signOut, isAuthenticated, isLoading, sessionActive } = useAuth();
  const navigate = useNavigate();

  // CHANGE: gate queries until both hydration finished and we've seen a sessionActive flag or explicit unauthenticated
  const queriesEnabled = !isLoading && user !== undefined && (sessionActive || isAuthenticated);

  const analytics = useQuery(
    api.analytics.getDashboardAnalytics,
    queriesEnabled ? {} : "skip"
  );

  const profile = useQuery(
    api.users.getCurrentUser,
    queriesEnabled ? {} : "skip"
  );
  
  const updateProfile = useMutation(api.users.updateProfile);
  const uploadAvatar = useMutation(api.users.uploadAvatar);
  const createPlanFromLearning = useMutation(api.developmentPlans.createFromLearning);
  const updateActivityProgress = useMutation(api.developmentPlans.updateActivityProgress);
  const deletePlan = useMutation(api.developmentPlans.deletePlan);
  // RELAXED GATE: Allow myPlans to subscribe as soon as identity is ready, even before full sessionActive
  const myPlansEnabled = !isLoading && user !== undefined && isAuthenticated;
  
  // Add refresh key to force re-subscription after plan creation
  const [plansRefreshKey, setPlansRefreshKey] = useState(0);
  
  // Use the refresh key to force a new subscription by toggling the query on/off
  const myPlans = useQuery(
    api.developmentPlans.listMine, 
    myPlansEnabled ? { _refreshKey: plansRefreshKey } : "skip"
  );
  
  // All useState hooks in fixed order
  const [activePlansLocal, setActivePlansLocal] = useState<any[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pName, setPName] = useState("");
  const [pGender, setPGender] = useState("");
  const [pDepartment, setPDepartment] = useState("");
  const [pTargetRole, setPTargetRole] = useState("");
  const [pCourses, setPCourses] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false); // add: confirmation dialog open state
  const avatarFileRef = useRef<HTMLInputElement | null>(null); // add ref for avatar file input
  const [gaOpen, setGaOpen] = useState(false); // AI Gap Analysis modal
  const [gaStep, setGaStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [gaCurrentRole, setGaCurrentRole] = useState("");
  const [gaTargetRole, setGaTargetRole] = useState("");
  const [gaTimeframe, setGaTimeframe] = useState("");
  const [gaCurrentSkills, setGaCurrentSkills] = useState("");
  const [gaTargetSkills, setGaTargetSkills] = useState("");
  const [gaAnalyzing, setGaAnalyzing] = useState(false);
  const [gaResult, setGaResult] = useState<null | {
    overlap: string[];
    gaps: string[];
    suggestions: {
      learn: string[];
      practice: string[];
      milestones: string[];
    };
    summary: string;
  }>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [mentorModalOpen, setMentorModalOpen] = useState(false);
  const [viewPlansOpen, setViewPlansOpen] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // ADD: simple validation error state
  const [errors, setErrors] = useState<{ name?: string; gender?: string; department?: string; targetRole?: string; courses?: string }>({});

  // ADD: expanded plan state for details view

  // ADD: validate helper
  function validateProfileForm(values: { name: string; gender: string; department: string; targetRole: string; courses: string }) {
    const e: { name?: string; gender?: string; department?: string; targetRole?: string; courses?: string } = {};
    const name = values.name.trim();
    if (name.length < 2) e.name = "Please enter your full name (min 2 characters).";
    if (name.length > 60) e.name = "Name is too long (max 60).";

    if (values.gender && values.gender.trim().length > 30) e.gender = "Keep under 30 characters.";

    if (values.department && values.department.trim().length > 60) e.department = "Keep under 60 characters.";

    if (values.targetRole && values.targetRole.trim().length > 80) e.targetRole = "Keep under 80 characters.";

    if (values.courses) {
      const items = values.courses.split(",").map((c) => c.trim()).filter(Boolean);
      if (items.length > 20) e.courses = "Too many courses (max 20).";
      for (const it of items) {
        if (it.length < 2 || it.length > 80) {
          e.courses = "Each course should be 2–80 characters.";
          break;
        }
      }
    }
    return e;
  }

  // Add: simple local analysis generator (no backend)
  function analyzeGap(params: {
    currentRole: string;
    targetRole: string;
    timeframe: string;
    currentSkills: string;
    targetSkills: string;
  }) {
    const cur: string[] = params.currentSkills
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    const tgt: string[] = params.targetSkills
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    // dedupe
    const curSet = Array.from(new Set(cur));
    const tgtSet = Array.from(new Set(tgt));

    const overlap: string[] = tgtSet.filter(s => curSet.includes(s));
    const gaps: string[] = tgtSet.filter(s => !curSet.includes(s));

    const cap = (s: string) => s.slice(0,1).toUpperCase() + s.slice(1);
    const learn = gaps.map(s => `Complete a focused course on ${cap(s)}`);
    const practice = gaps.map(s => `Apply ${cap(s)} on a small weekly task`);
    const milestones = gaps.slice(0,3).map((s, i) => `Milestone ${i+1}: Demonstrate ${cap(s)} in a mini-project`);

    const tf = params.timeframe.trim() || "your timeframe";
    const summary = `To move from ${params.currentRole || "your current role"} to ${params.targetRole || "your target role"} in ${tf}, prioritize ${gaps.length > 0 ? gaps.map(cap).join(", ") : "reinforcing your strengths"}. Keep goals small and measurable.`;

    return {
      overlap,
      gaps,
      suggestions: { learn, practice, milestones },
      summary,
    };
  }

  // Add: helper to process image as data URL (resize down a bit for perf)
  async function toDataUrl(file: File): Promise<{ contentType: string; base64: string; dataUrl: string }> {
    // Only basic pass-through if not image
    if (!file.type.startsWith("image/")) {
      const buf = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      return { contentType: file.type, base64, dataUrl: `data:${file.type};base64,${base64}` };
    }
    const bitmap = await createImageBitmap(file);
    const maxSide = 600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const preferType = "image/webp";
    const dataUrl = canvas.toDataURL(preferType, 0.85);
    const base64 = dataUrl.split(",")[1] ?? "";
    return { contentType: preferType, base64, dataUrl };
  }

  // ADD: debounce timer ref for auto-save
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);

  // ADD: helper to trigger debounced auto-save when profile fields change
  const triggerAutoSave = (payload: {
    name?: string;
    gender?: string;
    department?: string;
    targetRole?: string;
    currentCourses?: string;
  }) => {
    // clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    // schedule save after short delay
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        setAutoSaving(true);
        const courses = (payload.currentCourses ?? "")
          .split(",")
          .map((c) => c.trim())
          .filter((c) => c.length > 0);
        await updateProfile({
          name: payload.name || undefined,
          gender: payload.gender || undefined,
          department: payload.department || undefined,
          targetRole: payload.targetRole || undefined,
          currentCourses: courses.length > 0 ? courses : undefined,
        } as any);
      } catch {
        // silent fail; user will see eventual state restore from subscription if needed
      } finally {
        setAutoSaving(false);
      }
    }, 600); // 600ms debounce
  };

  // CLEANUP: clear timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // ADD: My Learning modal state and selection
  const [browseOpen, setBrowseOpen] = useState(false);
  const [selectedLearningId, setSelectedLearningId] = useState<"communication-skills" | "financial-management" | null>(null);
  const [browseJustSelectedPlanId, setBrowseJustSelectedPlanId] = useState<string | null>(null); // newly selected plan id
  const selectedPlansAnchorRef = useRef<HTMLDivElement | null>(null); // anchor to scroll to "Your Selected Plans"

  // ADD: Static learning catalog seeded from public assets (minimal, no backend)
  const learningItems = [
    {
      id: "communication-skills" as const,
      title: "Course 1: Communication Skills",
      description: "Comprehensive training on effective communication skills including verbal, non-verbal, written, and digital communication. Essential for professional development and workplace success.",
      type: "pdf" as const,
      sizeLabel: "1.8 MB",
      href: "/assets/Course_1_Sample_-_Communication_Skills__1_.pdf",
      tags: ["Training", "Soft Skills", "Professional Development"] as const,
    },
    // NEW: Financial Management course item
    {
      id: "financial-management" as const,
      title: "Financial Management Course",
      description: "Budgeting, investment planning, risk management, and capital allocation with practical real-world applications to build strategic, analytical decision-making.",
      type: "pdf" as const,
      sizeLabel: "870 KB",
      href: "/assets/Financial_Management_Course_ppt.pdf",
      tags: ["Finance", "Management", "Strategy"] as const,
    },
  ];

  // ADD: Search state and filtered list for learning items
  const [learningSearch, setLearningSearch] = useState("");
  const filteredLearningItems = learningItems.filter((item) => {
    if (!learningSearch.trim()) return true;
    const q = learningSearch.toLowerCase();
    const inTitle = item.title.toLowerCase().includes(q);
    const inDesc = item.description.toLowerCase().includes(q);
    const inTags = (item.tags as readonly string[]).some((t) => t.toLowerCase().includes(q));
    return inTitle || inDesc || inTags;
  });

  const selectedItem = selectedLearningId
    ? learningItems.find((i) => i.id === selectedLearningId) ?? null
    : null;

  // Add a ref to scroll the new section into view after selecting a plan
  const yourPlansRef = useRef<HTMLDivElement | null>(null);

  // Smoothly scroll to "Your Plans" after a plan is selected from My Learning
  useEffect(() => {
    if (browseJustSelectedPlanId && yourPlansRef.current) {
      yourPlansRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [browseJustSelectedPlanId]);

  // Ensure we have a merged list of plans for immediate visibility
  const yourPlans: any[] = (() => {
    const serverPlans: any[] = Array.isArray(myPlans) ? myPlans : [];
    const localPlans: any[] = Array.isArray(activePlansLocal) ? activePlansLocal : [];
    const byId: Record<string, any> = {};
    for (const p of [...localPlans, ...serverPlans]) {
      const id = (p as any)?._id || (p as any)?.id || (p as any)?.tempId;
      if (id && !byId[id]) byId[id] = p;
    }
    return Object.values(byId);
  })();

  // 2) Derived values (no hooks)
  const isAdmin = !!user && (user.role === "admin" || user.role === "committee");
  const isGuest = user?.isAnonymous ?? false;
  const greetingName = isGuest ? "Guest" : (user?.name && user.name.trim().length > 0 ? user.name : "to LokYodha");
  const greetingPrefix = isGuest ? "Welcome," : (user?.name && user.name.trim().length > 0 ? "Welcome back," : "Welcome,");
  const hasAchievements = (analytics?.personal?.achievements ?? 0) > 0;

  // 3) useEffect hooks
  useEffect(() => {
    if (profile) {
      setPName(profile.name ?? "");
      setPGender((profile as any).gender ?? "");
      setPDepartment(profile.department ?? "");
      setPTargetRole((profile as any).targetRole ?? "");
      setPCourses(((profile as any).currentCourses ?? []).join(", "));
      const url = (profile as any).avatarUrl || profile.image || null;
      setAvatarPreview(url);
      // Reset errors when hydrated
      setErrors({});
    }
  }, [profile]);

  // 4) Event handlers (no hooks inside)
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Loading gate
  const showInitialLoading = isLoading || user === undefined;
  // Unauthorized gate (definitive)
  const showAuthRequired = (!isAuthenticated || !user) && !sessionActive;
  // Analytics loading gate
  const showAnalyticsLoading = analytics === undefined;
  // Analytics not ready after hydration (safe fallback view)
  const showAnalyticsGuard = !analytics || !analytics.personal;


  // 6) Main render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <LokYodhaLogo onClick={() => navigate("/")} minimal animated />
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              <Button variant="ghost" size="icon" className="hover:bg-muted/60 transition-colors">
                <Bell className="h-5 w-5" />
              </Button>

              {/* Avatar button replaces settings icon; opens profile modal */}
              <button
                className="flex items-center gap-2 rounded-full p-1 hover:bg-muted/60 transition-colors"
                onClick={() => setProfileOpen(true)}
                aria-label="Open profile"
              >
                <Avatar className="h-8 w-8 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  <AvatarImage src={isGuest ? "" : (avatarPreview ?? "https://harmless-tapir-303.convex.cloud/api/storage/e850de78-4846-4774-8f5d-3dc9cb9b1fa5")} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-sm">
                    {isGuest ? "G" : (pName?.trim() ? pName.trim().slice(0, 2).toUpperCase() : "U")}
                  </AvatarFallback>
                </Avatar>
              </button>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setGaOpen(true)}
                className="hover:bg-purple-100 text-purple-600 transition-colors"
                aria-label="Open AI Gap Analysis"
              >
                <Sparkles className="h-5 w-5" />
              </Button>

              <Button variant="ghost" size="icon" onClick={handleSignOut} className="hover:bg-destructive/10 text-destructive transition-colors">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1.5">
            Welcome back!
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your development progress and explore new opportunities.
          </p>
        </motion.div>

        {/* Personal Analytics Cards - FIXED STRUCTURE */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <MaterialCard elevation={2} className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/50 hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Learning Streak</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-orange-600">{analytics?.personal?.activePlans ?? 0}</p>
                    <span className="text-sm font-medium text-orange-500">days</span>
                  </div>
                </div>
                <motion.div 
                  className="p-3 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Award className="h-6 w-6 text-white" />
                </motion.div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <div className="flex-1 h-2 bg-orange-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-orange-400 to-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <span className="text-xs font-semibold text-orange-600">🔥</span>
              </div>
            </MaterialCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <MaterialCard elevation={2} className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/50 hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Completed Learning</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-emerald-600">{analytics?.personal?.completedLearning ?? 0}</p>
                    <span className="text-sm font-medium text-emerald-500">courses</span>
                  </div>
                </div>
                <motion.div 
                  className="p-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <BookOpen className="h-6 w-6 text-white" />
                </motion.div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <div className="flex-1 h-2 bg-emerald-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                    initial={{ width: 0 }}
                    animate={{ width: "85%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <span className="text-xs font-semibold text-emerald-600">✓</span>
              </div>
            </MaterialCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <MaterialCard elevation={2} className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200/50 hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Achievements</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-amber-600">{analytics?.personal?.achievements ?? 0}</p>
                    <span className="text-sm font-medium text-amber-500">badges</span>
                  </div>
                </div>
                <motion.div 
                  className="p-3 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Award className="h-6 w-6 text-white" />
                </motion.div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <div className="flex-1 h-2 bg-amber-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-500"
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <span className="text-xs font-semibold text-amber-600">🏆</span>
              </div>
            </MaterialCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <MaterialCard elevation={2} className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/50 hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Avg Progress</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-bold text-blue-600">{analytics?.personal?.avgProgress ?? 0}%</p>
                    <span className="text-sm font-medium text-blue-500">overall</span>
                  </div>
                </div>
                <motion.div 
                  className="p-3 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <TrendingUp className="h-6 w-6 text-white" />
                </motion.div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                <div className="flex-1 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-blue-400 to-indigo-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${analytics?.personal?.avgProgress ?? 0}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <span className="text-xs font-semibold text-blue-600">📈</span>
              </div>
            </MaterialCard>
          </motion.div>
        </div>

        {/* Organizational Analytics */}
        {isAdmin && analytics?.organizational && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">Organizational Overview</h2>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-5">
              <MaterialCard elevation={2} className="p-5 sm:p-6 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{analytics?.organizational?.totalEmployees ?? 0}</p>
                  </div>
                  <Users className="h-7 w-7 text-gray-600" />
                </div>
              </MaterialCard>
              <MaterialCard elevation={2} className="p-5 sm:p-6 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">High Potential</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{analytics?.organizational?.highPotential ?? 0}</p>
                  </div>
                  <TrendingUp className="h-7 w-7 text-purple-600" />
                </div>
              </MaterialCard>
              <MaterialCard elevation={2} className="p-5 sm:p-6 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Ready Now</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{analytics?.organizational?.readyNow ?? 0}</p>
                  </div>
                  <Award className="h-7 w-7 text-green-600" />
                </div>
              </MaterialCard>
              <MaterialCard elevation={2} className="p-5 sm:p-6 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">In Development</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{analytics?.organizational?.inDevelopment ?? 0}</p>
                  </div>
                  <BookOpen className="h-7 w-7 text-blue-600" />
                </div>
              </MaterialCard>
              <MaterialCard elevation={2} className="p-5 sm:p-6 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Succession Health</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{analytics?.organizational?.successionHealth ?? 0}%</p>
                  </div>
                  <Target className="h-7 w-7 text-emerald-600" />
                </div>
              </MaterialCard>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 max-w-4xl">

            {/* Mentor Connect with dynamic UI */}
            <MaterialCard
              elevation={2}
              interactive
              className="p-5 sm:p-6 rounded-xl hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200/50"
              onClick={() => setMentorModalOpen(true)}
            >
              {/* Animated gradient background on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 via-blue-100/50 to-gray-100/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative flex items-center space-x-4">
                <motion.div 
                  className="p-3 bg-gradient-to-br from-slate-200 to-blue-200 rounded-full group-hover:scale-110 transition-transform duration-300"
                  whileHover={{ rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Users className="h-6 w-6 text-slate-700 group-hover:text-blue-700 transition-colors" />
                </motion.div>

                <div className="flex-1">
                  <h3 className="font-semibold tracking-tight text-gray-900 group-hover:text-slate-800 transition-colors">
                    Mentor Connect
                  </h3>
                  <p className="text-sm text-muted-foreground">Find your perfect mentor match</p>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="text-slate-600"
                >
                  <ArrowRight className="h-5 w-5" />
                </motion.div>
              </div>
              
              {/* Pulse indicator for "new feature" */}
              <div className="absolute top-3 right-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-500"></span>
                </span>
              </div>
            </MaterialCard>

            {/* My Learning opens modal */}
            <MaterialCard
              elevation={2}
              interactive
              className="p-5 sm:p-6 rounded-xl hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200/50"
              onClick={() => {
                setSelectedLearningId(null);
                setBrowseOpen(true);
              }}
            >
              {/* Animated gradient background on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-teal-100/50 via-cyan-100/50 to-teal-200/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative flex items-center space-x-4">
                <motion.div 
                  className="p-3 bg-gradient-to-br from-teal-200 to-cyan-200 rounded-full group-hover:scale-110 transition-transform duration-300"
                  whileHover={{ rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <BookOpen className="h-6 w-6 text-teal-700 group-hover:text-teal-800 transition-colors" />
                </motion.div>
                
                <div className="flex-1">
                  <h3 className="font-semibold tracking-tight text-gray-900 group-hover:text-teal-800 transition-colors">
                    My Learning
                  </h3>
                  <p className="text-sm text-muted-foreground">Explore training opportunities</p>
                </div>
                
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="text-teal-600"
                >
                  <ArrowRight className="h-5 w-5" />
                </motion.div>
              </div>
            </MaterialCard>
          </div>
        </motion.div>

        {/* Recent Activity Section - keeping existing code */}
        {/* ... existing Recent Activity code ... */}

      </main>

      {/* Styled Profile Modal */}
      <CDialog open={profileOpen} onOpenChange={setProfileOpen}>
        <CDialogContent className="sm:max-w-lg">
          <CDialogHeader>
            <CDialogTitle className="tracking-tight">Your Profile</CDialogTitle>
          </CDialogHeader>
          <div className="space-y-4">
            {/* Avatar editor card */}
            <MaterialCard elevation={2} className="p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-4 ring-primary/20">
                  {/* Default silhouette if no image */}
                  <AvatarImage src={avatarPreview ?? "https://harmless-tapir-303.convex.cloud/api/storage/e850de78-4846-4774-8f5d-3dc9cb9b1fa5"} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold text-xl">
                    {/* Simple WhatsApp-like no-profile circle with initials fallback */}
                    {pName?.trim()
                      ? pName.trim().slice(0, 2).toUpperCase()
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground mb-2">
                    Add a profile photo. Use your camera or pick from your gallery.
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex">
                      <input
                        ref={avatarFileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setUploadingAvatar(true);
                            const { contentType, base64, dataUrl } = await toDataUrl(file);
                            // Optimistic preview
                            setAvatarPreview(dataUrl);
                            await uploadAvatar({ contentType, base64 } as any);
                            const { toast } = await import("sonner");
                            toast("Photo updated");
                          } catch (err: any) {
                            const { toast } = await import("sonner");
                            toast.error(`Failed to update photo${err?.message ? `: ${String(err.message)}` : ""}`);
                          } finally {
                            setUploadingAvatar(false);
                            // reset file input safely
                            if (avatarFileRef.current) {
                              avatarFileRef.current.value = "";
                            }
                          }
                        }}
                      />
                      <Button
                        asChild
                        variant="secondary"
                        disabled={uploadingAvatar}
                      >
                        <span>{uploadingAvatar ? "Uploading..." : "Change photo"}</span>
                      </Button>
                    </label>
                    {avatarPreview && (
                      <Button
                        variant="ghost"
                        className="text-destructive"
                        disabled={uploadingAvatar}
                        onClick={async () => {
                          try {
                            setUploadingAvatar(true);
                            // Clear to a neutral fallback (no upload; simply clear image to remove)
                            setAvatarPreview(null);
                            // Save empty data URL to clear
                            await uploadAvatar({ contentType: "image/png", base64: "" } as any);
                            const { toast } = await import("sonner");
                            toast("Photo removed");
                          } catch (err: any) {
                            const { toast } = await import("sonner");
                            toast.error("Failed to remove photo");
                          } finally {
                            setUploadingAvatar(false);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </MaterialCard>

            {/* Details editor card */}
            <MaterialCard elevation={2} className="p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="mb-1 block">Name</Label>
                  <Input
                    placeholder="Your name"
                    value={pName}
                    onChange={(e) => {
                      setPName(e.target.value);
                      setErrors((prev) => ({ ...prev, name: undefined }));
                      // trigger auto-save
                      triggerAutoSave({
                        name: e.target.value,
                        gender: pGender,
                        department: pDepartment,
                        targetRole: pTargetRole,
                        currentCourses: pCourses,
                      });
                    }}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <div className="mt-1 text-xs text-destructive">{errors.name}</div>
                  )}
                </div>
                <div>
                  <Label className="mb-1 block">Gender</Label>
                  <Input
                    placeholder="e.g., Female"
                    value={pGender}
                    onChange={(e) => {
                      setPGender(e.target.value);
                      setErrors((prev) => ({ ...prev, gender: undefined }));
                      triggerAutoSave({
                        name: pName,
                        gender: e.target.value,
                        department: pDepartment,
                        targetRole: pTargetRole,
                        currentCourses: pCourses,
                      });
                    }}
                    aria-invalid={!!errors.gender}
                  />
                  {errors.gender && (
                    <div className="mt-1 text-xs text-destructive">{errors.gender}</div>
                  )}
                </div>
                <div>
                  <Label className="mb-1 block">Department</Label>
                  <Input
                    placeholder="e.g., Product"
                    value={pDepartment}
                    onChange={(e) => {
                      setPDepartment(e.target.value);
                      setErrors((prev) => ({ ...prev, department: undefined }));
                      triggerAutoSave({
                        name: pName,
                        gender: pGender,
                        department: e.target.value,
                        targetRole: pTargetRole,
                        currentCourses: pCourses,
                      });
                    }}
                    aria-invalid={!!errors.department}
                  />
                  {errors.department && (
                    <div className="mt-1 text-xs text-destructive">{errors.department}</div>
                  )}
                </div>
                <div>
                  <Label className="mb-1 block">Target Role</Label>
                  <Input
                    placeholder="e.g., Senior Product Manager"
                    value={pTargetRole}
                    onChange={(e) => {
                      setPTargetRole(e.target.value);
                      setErrors((prev) => ({ ...prev, targetRole: undefined }));
                      triggerAutoSave({
                        name: pName,
                        gender: pGender,
                        department: pDepartment,
                        targetRole: e.target.value,
                        currentCourses: pCourses,
                      });
                    }}
                    aria-invalid={!!errors.targetRole}
                  />
                  {errors.targetRole && (
                    <div className="mt-1 text-xs text-destructive">{errors.targetRole}</div>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1 block">Current Courses (comma-separated)</Label>
                  <Input
                    placeholder="Leadership Fundamentals, Strategic Thinking"
                    value={pCourses}
                    onChange={(e) => {
                      setPCourses(e.target.value);
                      setErrors((prev) => ({ ...prev, courses: undefined }));
                      triggerAutoSave({
                        name: pName,
                        gender: pGender,
                        department: pDepartment,
                        targetRole: pTargetRole,
                        currentCourses: e.target.value,
                      });
                    }}
                    aria-invalid={!!errors.courses}
                  />
                  {errors.courses && (
                    <div className="mt-1 text-xs text-destructive">{errors.courses}</div>
                  )}
                </div>
              </div>

              {/* ADD: Autosave notice */}
              <div className="mt-3 text-sm font-semibold text-foreground">
                Your Changes Will Be Saved Automatically
              </div>
              {autoSaving && (
                <div className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/60 border-t-transparent" />
                  Saving…
                </div>
              )}
            </MaterialCard>

            {/* REPLACE: Actions row – remove Save button, keep Close */}
            <div className="flex items-center justify-end">
              <Button variant="outline" onClick={() => setProfileOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </CDialogContent>
      </CDialog>

      {/* AI Gap Analysis Modal */}
      <CDialog open={gaOpen} onOpenChange={(o) => {
        setGaOpen(o);
        if (!o) {
          setGaStep(0);
          setGaAnalyzing(false);
          setGaResult(null);
          setGaCurrentRole("");
          setGaTargetRole("");
          setGaTimeframe("");
          setGaCurrentSkills("");
          setGaTargetSkills("");
        }
      }}>
        <CDialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <CDialogHeader>
            <CDialogTitle className="tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Gap Analysis
            </CDialogTitle>
          </CDialogHeader>

          <div className="space-y-4">
            {!gaResult && (
              <>
                {gaStep === 0 && (
                  <MaterialCard elevation={1} className="p-4 rounded-lg">
                    <Label className="mb-1 block">Current Role</Label>
                    <Input
                      placeholder="e.g., Product Manager"
                      value={gaCurrentRole}
                      onChange={(e) => setGaCurrentRole(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      Tip: Be specific (e.g., "Frontend Engineer").
                    </div>
                  </MaterialCard>
                )}
                {gaStep === 1 && (
                  <MaterialCard elevation={1} className="p-4 rounded-lg">
                    <Label className="mb-1 block">Target Role</Label>
                    <Input
                      placeholder="e.g., Senior Product Manager"
                      value={gaTargetRole}
                      onChange={(e) => setGaTargetRole(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      Tip: Choose one target to keep the plan focused.
                    </div>
                  </MaterialCard>
                )}
                {gaStep === 2 && (
                  <MaterialCard elevation={1} className="p-4 rounded-lg">
                    <Label className="mb-1 block">Expected Timeframe</Label>
                    <Input
                      placeholder="e.g., 6 months"
                      value={gaTimeframe}
                      onChange={(e) => setGaTimeframe(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      Tip: Use simple ranges like "3 months" or "1 year".
                    </div>
                  </MaterialCard>
                )}
                {gaStep === 3 && (
                  <MaterialCard elevation={1} className="p-4 rounded-lg">
                    <Label className="mb-1 block">Current Skills (comma-separated)</Label>
                    <Input
                      placeholder="Leadership, Communication, Roadmapping"
                      value={gaCurrentSkills}
                      onChange={(e) => setGaCurrentSkills(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      Tip: List 3–6 strengths you actively use today.
                    </div>
                  </MaterialCard>
                )}
                {gaStep === 4 && (
                  <MaterialCard elevation={1} className="p-4 rounded-lg">
                    <Label className="mb-1 block">Skills to Learn (comma-separated)</Label>
                    <Input
                      placeholder="Strategic Thinking, Cross-functional Leadership"
                      value={gaTargetSkills}
                      onChange={(e) => setGaTargetSkills(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      Tip: Add skills expected for your target role.
                    </div>
                  </MaterialCard>
                )}

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setGaOpen(false)}
                    disabled={gaAnalyzing}
                  >
                    Close
                  </Button>

                  <div className="flex items-center gap-2">
                    {gaStep > 0 && (
                      <Button
                        variant="secondary"
                        onClick={() => setGaStep((s) => (s > 0 ? ((s - 1) as typeof gaStep) : s))}
                        disabled={gaAnalyzing}
                      >
                        Back
                      </Button>
                    )}
                    {gaStep < 4 && (
                      <Button
                        onClick={async () => {
                          // basic field presence validation per step
                          if (gaStep === 0 && !gaCurrentRole.trim()) return;
                          if (gaStep === 1 && !gaTargetRole.trim()) return;
                          if (gaStep === 2 && !gaTimeframe.trim()) return;
                          if (gaStep === 3 && !gaCurrentSkills.trim()) return;
                          setGaStep((s) => ((s + 1) as typeof gaStep));
                        }}
                        disabled={
                          gaAnalyzing ||
                          (gaStep === 0 && !gaCurrentRole.trim()) ||
                          (gaStep === 1 && !gaTargetRole.trim()) ||
                          (gaStep === 2 && !gaTimeframe.trim()) ||
                          (gaStep === 3 && !gaCurrentSkills.trim())
                        }
                      >
                        Next
                      </Button>
                    )}
                    {gaStep === 4 && (
                      <Button
                        onClick={async () => {
                          if (!gaTargetSkills.trim()) return;
                          setGaAnalyzing(true);
                          try {
                            // simulate short delay
                            await new Promise((r) => setTimeout(r, 650));
                            const res = analyzeGap({
                              currentRole: gaCurrentRole,
                              targetRole: gaTargetRole,
                              timeframe: gaTimeframe,
                              currentSkills: gaCurrentSkills,
                              targetSkills: gaTargetSkills,
                            });
                            setGaResult(res);
                          } finally {
                            setGaAnalyzing(false);
                          }
                        }}
                        disabled={gaAnalyzing || !gaTargetSkills.trim()}
                        aria-busy={gaAnalyzing}
                      >
                        {gaAnalyzing ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/60 border-t-transparent" />
                            Analyzing...
                          </span>
                        ) : (
                          "Analyze"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {gaResult && (
              <div className="space-y-4">
                <MaterialCard elevation={1} className="p-4 rounded-lg">
                  <div className="font-semibold tracking-tight mb-1">Summary</div>
                  <div className="text-sm text-muted-foreground">{gaResult.summary}</div>
                </MaterialCard>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <MaterialCard elevation={1} className="p-4 rounded-lg">
                    <div className="font-semibold tracking-tight mb-2">Overlap</div>
                    <ul className="text-sm list-disc pl-4 space-y-1">
                      {gaResult.overlap.length > 0 ? gaResult.overlap.map((s, i) => (
                        <li key={i}>{s}</li>
                      )) : <li className="text-muted-foreground">No overlaps listed</li>}
                    </ul>
                  </MaterialCard>
                  <MaterialCard elevation={1} className="p-4 rounded-lg">
                    <div className="font-semibold tracking-tight mb-2">Gaps</div>
                    <ul className="text-sm list-disc pl-4 space-y-1">
                      {gaResult.gaps.length > 0 ? gaResult.gaps.map((s, i) => (
                        <li key={i} className="text-amber-700">{s}</li>
                      )) : <li className="text-muted-foreground">No gaps listed</li>}
                    </ul>
                  </MaterialCard>
                  <MaterialCard elevation={1} className="p-4 rounded-lg">
                    <div className="font-semibold tracking-tight mb-2">Milestones</div>
                    <ul className="text-sm list-disc pl-4 space-y-1">
                      {gaResult.suggestions.milestones.length > 0 ? gaResult.suggestions.milestones.map((s, i) => (
                        <li key={i}>{s}</li>
                      )) : <li className="text-muted-foreground">Add milestones after you pick gaps</li>}
                    </ul>
                  </MaterialCard>
                </div>

                <MaterialCard elevation={1} className="p-4 rounded-lg">
                  <div className="font-semibold tracking-tight mb-2">What to Do Next</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm font-medium mb-1">Learn</div>
                      <ul className="text-sm list-disc pl-4 space-y-1">
                        {gaResult.suggestions.learn.length > 0 ? gaResult.suggestions.learn.map((s, i) => (
                          <li key={i}>{s}</li>
                        )) : <li className="text-muted-foreground">No learning suggestions</li>}
                      </ul>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1">Practice</div>
                      <ul className="text-sm list-disc pl-4 space-y-1">
                        {gaResult.suggestions.practice.length > 0 ? gaResult.suggestions.practice.map((s, i) => (
                          <li key={i}>{s}</li>
                        )) : <li className="text-muted-foreground">No practice suggestions</li>}
                      </ul>
                    </div>
                  </div>
                </MaterialCard>

                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={() => setGaOpen(false)}>
                    Close
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setGaResult(null);
                        setGaStep(0);
                      }}
                    >
                      Start Over
                    </Button>
                    <Button
                      onClick={() => {
                        setGaOpen(false);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CDialogContent>
      </CDialog>

      {/* Active Plans Modal */}
      <CDialog open={viewPlansOpen} onOpenChange={setViewPlansOpen}>
        <CDialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <CDialogHeader>
            <CDialogTitle className="tracking-tight flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Your Active Plans
            </CDialogTitle>
          </CDialogHeader>

          <div className="space-y-3">
            {!myPlans || myPlans.length === 0 ? (
              <MaterialCard elevation={1} className="p-8 rounded-lg text-center">
                <div className="text-muted-foreground mb-4">
                  <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="font-medium">No active plans yet</p>
                  <p className="text-sm mt-1">Select a course from My Learning to get started</p>
                </div>
                <Button
                  onClick={() => {
                    setViewPlansOpen(false);
                    setBrowseOpen(true);
                  }}
                >
                  My Learning
                </Button>
              </MaterialCard>
            ) : (
              myPlans.map((plan: any) => {
                const activities = (plan.activities ?? []) as Array<{ title: string; completed?: boolean; done?: boolean }>;
                const completedCount = activities.filter((a) => a.completed || a.done).length;
                const progress = activities.length > 0 ? Math.round((completedCount / activities.length) * 100) : 0;
                const isExpanded = expandedPlanId === plan._id;

                return (
                  <MaterialCard key={plan._id} elevation={2} className="p-4 rounded-lg">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-semibold tracking-tight text-gray-900">{plan.title}</div>
                          {plan.description && (
                            <div className="text-xs text-muted-foreground mt-1">{plan.description}</div>
                          )}
                          {plan.sourceRef && (
                            <a
                              href={plan.sourceRef}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                            >
                              View Source <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedPlanId(isExpanded ? null : plan._id)}
                          >
                            {isExpanded ? "Collapse" : "Expand"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={async () => {
                              if (deletingPlanId === plan._id) return;
                              setDeletingPlanId(plan._id);
                              try {
                                await deletePlan({ planId: plan._id });
                                toast.success("Plan deleted");
                              } catch (e: any) {
                                toast.error(e?.message || "Failed to delete plan");
                              } finally {
                                setDeletingPlanId(null);
                              }
                            }}
                            disabled={deletingPlanId === plan._id}
                          >
                            {deletingPlanId === plan._id ? "..." : "Delete"}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold text-blue-700">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-2 pt-2 border-t"
                          >
                            {activities.map((activity, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={activity.completed || activity.done || false}
                                  onChange={async (e) => {
                                    try {
                                      await updateActivityProgress({
                                        planId: plan._id,
                                        activityIndex: idx,
                                        done: e.target.checked,
                                      });
                                    } catch (err: any) {
                                      toast.error(err?.message || "Failed to update");
                                    }
                                  }}
                                  className="mt-1"
                                />
                                <span className="text-sm flex-1">{activity.title}</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </MaterialCard>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setViewPlansOpen(false)}>
              Close
            </Button>
          </div>
        </CDialogContent>
      </CDialog>

      {/* ADD: My Learning Modal */}
      <CDialog
        open={browseOpen}
        onOpenChange={(o) => {
          setBrowseOpen(o);
          if (!o) {
            setSelectedLearningId(null);
            setBrowseJustSelectedPlanId(null);
          }
        }}
      >
        <CDialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <CDialogHeader>
            <CDialogTitle className="tracking-tight">My Learning</CDialogTitle>
          </CDialogHeader>

          {!browseJustSelectedPlanId ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Left: List */}
              <div className="md:col-span-2 space-y-2">
                {/* ADD: Search input */}
                <MaterialCard elevation={1} className="p-3 rounded-lg">
                  <Input
                    placeholder="Search courses by title, description, or tag..."
                    value={learningSearch}
                    onChange={(e) => setLearningSearch(e.target.value)}
                  />
                </MaterialCard>

                {/* SHOW: Empty state if no results */}
                {filteredLearningItems.length === 0 && (
                  <MaterialCard elevation={1} className="p-6 rounded-lg text-center text-sm text-muted-foreground">
                    No results found. Try a different search.
                  </MaterialCard>
                )}

                {filteredLearningItems.map((item) => {
                  const active = selectedLearningId === item.id;
                  return (
                    <MaterialCard
                      key={item.id}
                      elevation={active ? 3 : 1}
                      interactive
                      className={`p-4 rounded-lg border ${active ? "border-primary/50" : ""} cursor-pointer`}
                      onClick={() => setSelectedLearningId(item.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-muted">
                          <FileText className="h-4 w-4 text-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium tracking-tight">{item.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              {item.type.toUpperCase()}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {item.sizeLabel}
                            </span>
                            {(item.tags as readonly string[]).map((t) => (
                              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </MaterialCard>
                  );
                })}
              </div>

              {/* Right: Preview */}
              <div className="md:col-span-3">
                {!selectedItem ? (
                  <MaterialCard elevation={1} className="p-6 rounded-lg h-full flex items-center justify-center text-sm text-muted-foreground">
                    Select an item to preview it here.
                  </MaterialCard>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold tracking-tight">{selectedItem.title}</div>
                        <div className="text-xs text-muted-foreground">{selectedItem.description}</div>
                      </div>
                      <a
                        href={selectedItem.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Open <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>

                    <MaterialCard elevation={2} className="rounded-lg overflow-hidden">
                      <div className="aspect-[4/3] w-full bg-muted">
                        <iframe
                          src={selectedItem.href}
                          title={selectedItem.title}
                          className="w-full h-full"
                        />
                      </div>
                    </MaterialCard>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          setSelectedLearningId(null);
                        }}
                      >
                        Deselect
                      </Button>
                      {selectedItem && (
                        <Button
                          onClick={async () => {
                            try {
                              // Auth gating to prevent backend "User not found"
                              if (isLoading) {
                                toast("Please wait a moment while we finish signing you in…");
                                return;
                              }
                              if (!isAuthenticated || !sessionActive) {
                                toast.error("Sign in to select plans");
                                navigate("/auth");
                                return;
                              }

                              // Show loading state
                              setSavingProfile(true);
                              
                              const id = await createPlanFromLearning({
                                title: selectedItem.title,
                                description: selectedItem.description,
                                href: selectedItem.href,
                              } as any);
                              
                              if (!id) {
                                throw new Error("Failed to create plan - no ID returned");
                              }
                              
                              toast.success("Plan selected successfully");
                              setBrowseJustSelectedPlanId(String(id));
                              
                              // Force refresh of plans subscription
                              setPlansRefreshKey(prev => prev + 1);
                              
                              // Open PDF in new tab immediately after successful plan creation
                              if (selectedItem.href) {
                                window.open(selectedItem.href, '_blank', 'noopener,noreferrer');
                              }
                              
                              // Convex queries are reactive - myPlans will auto-update
                              // keep modal open to show confirmation step
                            } catch (e: any) {
                              console.error("Plan selection error:", e);
                              const errorMessage = e?.message || e?.toString() || "Failed to add plan";
                              toast.error(errorMessage);
                              // Reset selection on error
                              setSelectedLearningId(null);
                            } finally {
                              setSavingProfile(false);
                            }
                          }}
                          disabled={savingProfile}
                        >
                          {savingProfile ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/60 border-t-transparent" />
                              Selecting...
                            </span>
                          ) : (
                            "See Plan"
                          )}
                        </Button>
                      )}
                      <a href={selectedItem?.href} download className="inline-flex">
                        <Button>Download</Button>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <MaterialCard elevation={3} className="p-6 rounded-xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100 relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
                <div className="relative flex items-start gap-3">
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="p-2 bg-emerald-500 rounded-full"
                  >
                    <Award className="h-5 w-5 text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <div className="font-bold tracking-tight text-emerald-900 text-lg">Plan Selected Successfully!</div>
                    <div className="text-sm text-emerald-800 mt-1">
                      Your learning plan has been added and is ready to start.
                    </div>
                  </div>
                </div>
              </MaterialCard>
            </motion.div>
              {selectedItem && (
                <MaterialCard elevation={1} className="p-4 rounded-lg">
                  <div className="font-medium tracking-tight">{selectedItem.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{selectedItem.description}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <a
                      href={selectedItem.href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                    <a href={selectedItem.href} download className="text-xs">
                      <Button size="sm" variant="secondary">Download</Button>
                    </a>
                  </div>
                </MaterialCard>
              )}
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    // keep browsing
                    setBrowseJustSelectedPlanId(null);
                    setSelectedLearningId(null);
                  }}
                >
                  Keep Browsing
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBrowseOpen(false);
                    setBrowseJustSelectedPlanId(null);
                    setSelectedLearningId(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </CDialogContent>
      </CDialog>

      {/* Mentor Connect Modal */}
      <CDialog open={mentorModalOpen} onOpenChange={setMentorModalOpen}>
        <CDialogContent className="sm:max-w-md">
          <CDialogHeader>
            <CDialogTitle className="tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Choose Your Mentor
            </CDialogTitle>
          </CDialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect with experienced mentors who can guide your professional development journey.
            </p>

            {/* Mentor Option 1: Dr. Shankar Kodate */}
            <a
              href="https://www.linkedin.com/in/dr-shankar-kodate-479540140"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMentorModalOpen(false)}
            >
              <MaterialCard
                elevation={2}
                interactive
                className="p-4 rounded-lg hover:shadow-lg transition-all cursor-pointer group border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full">
                    <Users className="h-5 w-5 text-blue-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold tracking-tight text-gray-900 group-hover:text-blue-700 transition-colors">
                      Dr. Shankar Kodate
                    </div>
                    <div className="text-xs text-muted-foreground">Senior Leadership Mentor</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-700 transition-colors" />
                </div>
              </MaterialCard>
            </a>

            {/* Mentor Option 2: S.V. Patil */}
            <a
              href="https://www.linkedin.com/in/siddheshwarpatilwce?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMentorModalOpen(false)}
            >
              <MaterialCard
                elevation={2}
                interactive
                className="p-4 rounded-lg hover:shadow-lg transition-all cursor-pointer group border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full">
                    <Users className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold tracking-tight text-gray-900 group-hover:text-emerald-700 transition-colors">
                      S.V. Patil
                    </div>
                    <div className="text-xs text-muted-foreground">Professional Development Coach</div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-emerald-700 transition-colors" />
                </div>
              </MaterialCard>
            </a>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button variant="outline" onClick={() => setMentorModalOpen(false)}>
              Close
            </Button>
          </div>
        </CDialogContent>
      </CDialog>

    </div>
  );
}