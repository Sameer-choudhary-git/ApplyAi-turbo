import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  User,
  BookOpen,
  BrainCircuit,
  Workflow,
  ThumbsUp,
  ChevronRight,
  ChevronLeft,
  UploadCloud,
  Plus,
  X,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { apiConfig } from "@applyai/config";
import { supabase } from "@/supabaseClient";

// ─── Constants ───────────────────────────────────────────────────────────────
const steps = [
  { id: "profile", title: "Profile", icon: User },
  { id: "education", title: "Education", icon: BookOpen },
  { id: "experience", title: "Experience", icon: BrainCircuit },
  { id: "preferences", title: "Preferences", icon: Workflow },
  { id: "review", title: "Review", icon: ThumbsUp },
];

const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const OPP_TYPES = [
  "Internship",
  "Full-time Job",
  "Part-time Job",
  "Hackathon",
  "Competition",
];
const PLATFORMS = [
  "LinkedIn",
  "Unstop",
  "Internshala",
  "AngelList",
  "Indeed",
  "Glassdoor",
  "Wellfound",
  "Devfolio",
];
const SKILL_SUGGESTIONS = [
  "JavaScript",
  "Python",
  "React",
  "Node.js",
  "SQL",
  "Machine Learning",
  "Data Analysis",
  "UI/UX Design",
  "Java",
  "C++",
  "TypeScript",
  "AWS",
  "Docker",
  "Git",
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const OnboardingInput = ({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="w-full">
    <label className="block text-xs md:text-sm font-medium text-foreground mb-1">
      {label}
    </label>
    <input
      {...props}
      className="w-full bg-input text-foreground border border-border rounded-lg p-2.5 md:p-3 text-sm focus:ring-2 focus:ring-ring focus:border-ring outline-none transition-all placeholder:text-muted-foreground/50"
    />
  </div>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface EducationEntry {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  gpa: string;
  startYear: string;
  endYear: string;
}

interface ExperienceEntry {
  company: string;
  role: string;
  duration: string;
  description: string;
}

type UploadStatus = "idle" | "uploading" | "done" | "error";

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Onboarding() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex];
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // Add this line
  // Profile
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  // Resume upload
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Education
  const [education, setEducation] = useState<EducationEntry[]>([
    {
      institution: "",
      degree: "",
      fieldOfStudy: "",
      gpa: "",
      startYear: "",
      endYear: "",
    },
  ]);

  // Experience
  const [experience, setExperience] = useState<ExperienceEntry[]>([
    { company: "", role: "", duration: "", description: "" },
  ]);

  // Skills
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  // Preferences
  const [preferences, setPreferences] = useState({
    workModes: [] as string[],
    opportunityTypes: [] as string[],
    platforms: [] as string[],
  });

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) setCurrentStepIndex((s) => s + 1);
    else handleComplete();
  };

  const prevStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex((s) => s - 1);
  };

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed))
      setSkills((prev) => [...prev, trimmed]);
    setNewSkill("");
  };

  const removeSkill = (s: string) =>
    setSkills((prev) => prev.filter((x) => x !== s));

  const togglePref = (category: keyof typeof preferences, item: string) => {
    setPreferences((prev) => {
      const arr = prev[category];
      return {
        ...prev,
        [category]: arr.includes(item)
          ? arr.filter((x) => x !== item)
          : [...arr, item],
      };
    });
  };

  // Resume upload — calls your Hono API
  const handleResumeUpload = async (file: File) => {
    setUploadError("");

    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.");
      setUploadStatus("error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File must be under 5 MB.");
      setUploadStatus("error");
      return;
    }

    setResumeFile(file);
    setUploadStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        setUploadError("You are not authenticated");
        setUploadStatus("error");
        return;
      }

      const res = await fetch(
        `${apiConfig.baseUrl}${apiConfig.endpoints.resume.upload}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as any).error || "Upload failed");
      }

      const { url } = (await res.json()) as { url: string };
      setResumeUrl(url);
      setUploadStatus("done");
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed. Please try again.");
      setUploadStatus("error");
    }
  };

  const handleComplete = async () => {
  if (!fullName.trim()) {
    alert("Full name is required");
    return;
  }

  setIsSaving(true);

  try {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) {
      alert("You are not authenticated");
      return;
    }

    const payload = {
      fullName,
      phone: phone || undefined,
      location: location || undefined,
      bio: bio || undefined,
      resumeUrl,
      linkedinUrl,
      githubUrl,

      education: education
        .filter((e) => e.institution.trim())
        .map((e) => ({
          institution: e.institution,
          degree: e.degree,
          fieldOfStudy: e.fieldOfStudy,
          gpa: e.gpa,
          startYear: e.startYear ? Number(e.startYear) : undefined,
          endYear: e.endYear ? Number(e.endYear) : undefined,
        })),

      experience: experience
        .filter((e) => e.company.trim())
        .map((e) => ({
          company: e.company,
          role: e.role,
          duration: e.duration,
          description: e.description,
        })),

      skills,
      preferences,
    };

    const res = await fetch(
      `${apiConfig.baseUrl}${apiConfig.endpoints.auth.onboard}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) throw new Error("Failed to save profile");

    // 🔥 ensure fresh fetch
    await queryClient.invalidateQueries({ queryKey: ["userProfile"] });

    navigate("/");
  } catch (err) {
    console.error("Onboarding error:", err);
    alert("There was a problem saving your profile.");
  } finally {
    setIsSaving(false);
  }
};

  // ─── Step Rendering ─────────────────────────────────────────────────────────
  const renderStepContent = () => {
    switch (currentStep.id) {
      // ── PROFILE ──────────────────────────────────────────────────────────────
      case "profile":
        return (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-gradient">
                Basic Information
              </h2>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Tell us about yourself to help the agents personalize their
                strategy.
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <OnboardingInput
                  label="Full Name *"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <OnboardingInput
                  label="Phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <OnboardingInput
                  label="Location"
                  type="text"
                  placeholder="Mumbai, India"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Bio
                </label>
                <textarea
                  className="w-full bg-input text-foreground border border-border rounded-lg p-3 h-28 text-sm focus:ring-2 focus:ring-ring outline-none transition-all placeholder:text-muted-foreground/50"
                  placeholder="A brief description about yourself, your skills, and your career goals."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              {/* ── Resume Upload ── */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Resume{" "}
                  <span className="text-muted-foreground font-normal">
                    (PDF · max 5 MB)
                  </span>
                </label>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleResumeUpload(file);
                  }}
                  onClick={() => {
                    if (uploadStatus !== "uploading")
                      document.getElementById("resume-file-input")?.click();
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer select-none",
                    isDragging
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : uploadStatus === "done"
                        ? "border-green-500/40 bg-green-500/5"
                        : uploadStatus === "error"
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-border bg-input/50 hover:border-primary/50 hover:bg-input",
                  )}
                >
                  <input
                    id="resume-file-input"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleResumeUpload(f);
                      e.target.value = "";
                    }}
                  />

                  {uploadStatus === "uploading" && (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        Uploading{" "}
                        <span className="text-foreground font-medium">
                          {resumeFile?.name}
                        </span>
                        …
                      </p>
                    </div>
                  )}

                  {uploadStatus === "done" && (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="w-10 h-10 text-green-400" />
                      <p className="font-semibold text-green-400 text-sm">
                        {resumeFile?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded successfully ·{" "}
                        <span
                          className="text-primary cursor-pointer hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadStatus("idle");
                            setResumeFile(null);
                            setResumeUrl("");
                          }}
                        >
                          Replace
                        </span>
                      </p>
                    </div>
                  )}

                  {uploadStatus === "error" && (
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-10 h-10 text-destructive" />
                      <p className="text-sm text-destructive font-medium">
                        {uploadError || "Upload failed"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click to try again
                      </p>
                    </div>
                  )}

                  {uploadStatus === "idle" && (
                    <>
                      <UploadCloud
                        className={cn(
                          "w-10 h-10 mx-auto mb-4 transition-colors",
                          isDragging ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                      <p className="font-semibold text-foreground text-sm">
                        Upload your resume
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">
                        Drag & drop or click to browse
                      </p>
                      <button
                        type="button"
                        className="px-5 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
                      >
                        Choose File
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <OnboardingInput
                  label="LinkedIn URL"
                  type="url"
                  placeholder="linkedin.com/in/…"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
                <OnboardingInput
                  label="GitHub URL"
                  type="url"
                  placeholder="github.com/…"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        );

      // ── EDUCATION ─────────────────────────────────────────────────────────────
      case "education":
        return (
          <motion.div
            key="education"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-gradient">
                Education History
              </h2>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Add your educational background.
              </p>
            </div>

            <div className="space-y-6">
              {education.map((edu, i) => (
                <div
                  key={i}
                  className="relative p-5 rounded-xl border border-border bg-input/30 space-y-4"
                >
                  {education.length > 1 && (
                    <button
                      onClick={() =>
                        setEducation(education.filter((_, idx) => idx !== i))
                      }
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <OnboardingInput
                        label="Institution"
                        placeholder="University / College Name"
                        value={edu.institution}
                        onChange={(e) => {
                          const ed = [...education];
                          ed[i].institution = e.target.value;
                          setEducation(ed);
                        }}
                      />
                    </div>
                    <OnboardingInput
                      label="Degree"
                      placeholder="B.Tech / B.Sc / MBA"
                      value={edu.degree}
                      onChange={(e) => {
                        const ed = [...education];
                        ed[i].degree = e.target.value;
                        setEducation(ed);
                      }}
                    />
                    <OnboardingInput
                      label="Field of Study"
                      placeholder="Computer Science"
                      value={edu.fieldOfStudy}
                      onChange={(e) => {
                        const ed = [...education];
                        ed[i].fieldOfStudy = e.target.value;
                        setEducation(ed);
                      }}
                    />
                    <OnboardingInput
                      label="GPA / Marks"
                      placeholder="8.5 / 90%"
                      value={edu.gpa}
                      onChange={(e) => {
                        const ed = [...education];
                        ed[i].gpa = e.target.value;
                        setEducation(ed);
                      }}
                    />
                    <div className="flex gap-4">
                      <OnboardingInput
                        label="Start Year"
                        placeholder="2021"
                        type="number"
                        min="1990"
                        max="2099"
                        value={edu.startYear}
                        onChange={(e) => {
                          const ed = [...education];
                          ed[i].startYear = e.target.value;
                          setEducation(ed);
                        }}
                      />
                      <OnboardingInput
                        label="End Year"
                        placeholder="2025"
                        type="number"
                        min="1990"
                        max="2099"
                        value={edu.endYear}
                        onChange={(e) => {
                          const ed = [...education];
                          ed[i].endYear = e.target.value;
                          setEducation(ed);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  setEducation([
                    ...education,
                    {
                      institution: "",
                      degree: "",
                      fieldOfStudy: "",
                      gpa: "",
                      startYear: "",
                      endYear: "",
                    },
                  ])
                }
                className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground font-medium flex items-center justify-center gap-2 hover:bg-input hover:text-foreground hover:border-primary/50 transition-all text-sm"
              >
                <Plus className="w-4 h-4" /> Add Another Institution
              </button>
            </div>
          </motion.div>
        );

      // ── EXPERIENCE ────────────────────────────────────────────────────────────
      case "experience":
        return (
          <motion.div
            key="experience"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-gradient">
                Skills & Experience
              </h2>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                What can you do? Tell us about your professional background.
              </p>
            </div>

            {/* Skills */}
            <div className="mb-10">
              <label className="block text-sm font-medium text-foreground mb-3">
                Core Skills
              </label>
              <div className="flex gap-2 mb-4">
                <input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill(newSkill);
                    }
                  }}
                  placeholder="e.g. Next.js, Solidity…"
                  className="flex-1 bg-input text-foreground border border-border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-ring outline-none"
                />
                <button
                  onClick={() => addSkill(newSkill)}
                  className="px-4 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg transition-colors flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center gap-1.5 border border-primary/20"
                    >
                      {s}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-white"
                        onClick={() => removeSkill(s)}
                      />
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground mb-2">Suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => addSkill(s)}
                      className="px-3 py-1.5 rounded-full border border-border text-muted-foreground text-xs hover:border-primary/50 hover:text-foreground transition-colors"
                    >
                      + {s}
                    </button>
                  ),
                )}
              </div>
            </div>

            <hr className="border-border mb-8" />

            {/* Work Experience */}
            <div className="space-y-6">
              <label className="block text-sm font-medium text-foreground">
                Work Experience
              </label>
              {experience.map((exp, i) => (
                <div
                  key={i}
                  className="relative p-5 rounded-xl border border-border bg-input/30 space-y-4"
                >
                  {experience.length > 1 && (
                    <button
                      onClick={() =>
                        setExperience(experience.filter((_, idx) => idx !== i))
                      }
                      className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <OnboardingInput
                      label="Company"
                      placeholder="Google"
                      value={exp.company}
                      onChange={(e) => {
                        const ex = [...experience];
                        ex[i].company = e.target.value;
                        setExperience(ex);
                      }}
                    />
                    <OnboardingInput
                      label="Role"
                      placeholder="Software Engineer Intern"
                      value={exp.role}
                      onChange={(e) => {
                        const ex = [...experience];
                        ex[i].role = e.target.value;
                        setExperience(ex);
                      }}
                    />
                    <OnboardingInput
                      label="Duration"
                      placeholder="May 2024 – Aug 2024"
                      value={exp.duration}
                      onChange={(e) => {
                        const ex = [...experience];
                        ex[i].duration = e.target.value;
                        setExperience(ex);
                      }}
                    />
                    <div className="md:col-span-2">
                      <label className="block text-xs md:text-sm font-medium text-foreground mb-1">
                        Description
                      </label>
                      <textarea
                        className="w-full bg-input text-foreground border border-border rounded-lg p-3 h-20 text-sm focus:ring-2 focus:ring-ring outline-none transition-all placeholder:text-muted-foreground/50"
                        placeholder="Briefly describe your responsibilities…"
                        value={exp.description}
                        onChange={(e) => {
                          const ex = [...experience];
                          ex[i].description = e.target.value;
                          setExperience(ex);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() =>
                  setExperience([
                    ...experience,
                    { company: "", role: "", duration: "", description: "" },
                  ])
                }
                className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground font-medium flex items-center justify-center gap-2 hover:bg-input hover:text-foreground hover:border-primary/50 transition-all text-sm"
              >
                <Plus className="w-4 h-4" /> Add Experience
              </button>
            </div>
          </motion.div>
        );

      // ── PREFERENCES ───────────────────────────────────────────────────────────
      case "preferences":
        return (
          <motion.div
            key="preferences"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mb-10">
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-gradient">
                Agent Preferences
              </h2>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                Configure what opportunities your AI agents should hunt for.
              </p>
            </div>

            <div className="space-y-8">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Work Mode
                </label>
                <div className="flex flex-wrap gap-3">
                  {WORK_MODES.map((m) => (
                    <button
                      key={m}
                      onClick={() => togglePref("workModes", m)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                        preferences.workModes.includes(m)
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                          : "bg-input border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Opportunity Types
                </label>
                <div className="flex flex-wrap gap-3">
                  {OPP_TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => togglePref("opportunityTypes", t)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                        preferences.opportunityTypes.includes(t)
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                          : "bg-input border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Target Platforms
                </label>
                <div className="flex flex-wrap gap-3">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePref("platforms", p)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                        preferences.platforms.includes(p)
                          ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                          : "bg-input border-border text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );

      // ── REVIEW ────────────────────────────────────────────────────────────────
      case "review":
        return (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="py-4"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-foreground">
                Ready to Deploy
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
                Your profile is complete. EngiBuddy agents will use this data to
                automatically apply to jobs on your behalf.
              </p>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                {
                  value: education.filter((e) => e.institution.trim()).length,
                  label: "Degrees",
                  color: "text-foreground",
                },
                {
                  value: experience.filter((e) => e.company.trim()).length,
                  label: "Roles",
                  color: "text-foreground",
                },
                {
                  value: skills.length,
                  label: "Skills",
                  color: "text-primary",
                },
                {
                  value: preferences.platforms.length,
                  label: "Platforms",
                  color: "text-accent",
                },
              ].map(({ value, label, color }) => (
                <div
                  key={label}
                  className="p-4 rounded-xl border border-border bg-input/30 text-center"
                >
                  <p className={cn("text-2xl font-bold mb-1", color)}>
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Profile summary */}
            <div className="rounded-xl border border-border bg-input/30 p-5 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {fullName || "—"}
                  </p>
                </div>
                {resumeUrl && (
                  <span className="ml-auto px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Resume
                  </span>
                )}
              </div>

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {skills.slice(0, 8).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/10"
                    >
                      {s}
                    </span>
                  ))}
                  {skills.length > 8 && (
                    <span className="px-2 py-0.5 rounded-full bg-input text-muted-foreground text-xs border border-border">
                      +{skills.length - 8} more
                    </span>
                  )}
                </div>
              )}

              {preferences.workModes.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  Work mode:{" "}
                  <span className="text-foreground">
                    {preferences.workModes.join(", ")}
                  </span>
                </p>
              )}
              {preferences.opportunityTypes.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  Looking for:{" "}
                  <span className="text-foreground">
                    {preferences.opportunityTypes.join(", ")}
                  </span>
                </p>
              )}
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  // ─── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col bg-background relative font-body pb-32"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -20%, hsla(258,92%,68%,0.08) 0%, transparent 60%)",
      }}
    >
      {/* Header */}
      <div className="text-center pt-8 md:pt-12 pb-6 md:pb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 glow-primary shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-heading text-white">
            Welcome to EngiBuddy
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl w-full mx-auto flex flex-col gap-4 md:gap-6 px-4 relative z-10">
        {/* Step tabs */}
        <div className="glass rounded-xl p-1.5 flex gap-1 border border-white/5 overflow-x-auto no-scrollbar">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(index)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : isCompleted
                      ? "text-primary/70 hover:bg-sidebar-accent/50 hover:text-white"
                      : "text-muted-foreground/70 hover:bg-sidebar-accent/50 hover:text-white",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 hidden sm:block text-primary/70" />
                ) : (
                  <step.icon
                    className={cn(
                      "w-4 h-4 hidden sm:block",
                      isActive && "drop-shadow-sm",
                    )}
                  />
                )}
                <span>{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Main card */}
        <div className="glass border-shimmer rounded-2xl shadow-xl relative p-5 md:p-8">
          <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
        </div>
      </div>

      {/* Fixed footer nav */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-background/95 backdrop-blur-md border-t border-sidebar-border z-50">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className={cn(
              "px-4 md:px-6 py-2.5 md:py-3 rounded-lg text-muted-foreground font-medium flex items-center gap-2 hover:bg-input transition-all text-sm md:text-base border border-transparent hover:border-border",
              currentStepIndex === 0 && "opacity-40 pointer-events-none",
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={nextStep}
            disabled={isSaving}
            className="px-6 md:px-8 py-2.5 md:py-3 rounded-lg gradient-primary glow-sm text-primary-foreground font-semibold flex items-center gap-2.5 hover:opacity-90 transition-all shadow-lg text-sm md:text-base disabled:opacity-60 disabled:pointer-events-none"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving…
              </>
            ) : currentStepIndex < steps.length - 1 ? (
              <>
                Next Step <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Complete Setup <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
