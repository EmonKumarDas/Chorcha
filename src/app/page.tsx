import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Medal,
  PlayCircle,
  Search,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
  Check,
} from "lucide-react";
import { ActiveUserCounter } from "@/components/active-user-counter";

const examStreams = [
  { name: "HSC Science", badge: "এইচএসসি বিজ্ঞান", count: "বোর্ড ও বিশ্ববিদ্যালয় প্রশ্ন", href: "/question-bank" },
  { name: "SSC Science", badge: "এসএসসি বিজ্ঞান", count: "সকল বোর্ড ও টেস্ট পেপার", href: "/question-bank" },
  { name: "University Admission", badge: "বিশ্ববিদ্যালয় ভর্তি", count: "CUET, BUET, DU ও গুচ্ছ", href: "/question-bank/university-questions" },
  { name: "Medical & Dental", badge: "মেডিকেল ভর্তি", count: "বিগত বছরের প্রশ্ন ও ব্যাখ্যা", href: "/question-bank" },
  { name: "HSC Commerce & Arts", badge: "মানবিক ও ব্যবসায়", count: "বিষয়ভিত্তিক পূর্ণাঙ্গ প্রস্তুতি", href: "/question-bank" },
  { name: "BCS & Govt Job", badge: "চাকরি প্রস্তুতি", count: "বিগত বছরের প্রিলিমিনারি", href: "/question-bank" },
];

const features = [
  {
    icon: ClipboardList,
    eyebrow: "কাস্টম",
    title: "মক টেস্ট",
    text: "বিষয়, অধ্যায়, সময় ও প্রশ্নের ধরন বেছে নিজের মতো লাইভ পরীক্ষা দিন।",
  },
  {
    icon: FileQuestion,
    eyebrow: "বিশাল সংখ্যক",
    title: "প্রশ্ন ব্যাংক",
    text: "বোর্ড প্রশ্ন, বিশ্ববিদ্যালয় ভর্তি ও গুরুত্বপূর্ণ অনুশীলন প্রশ্ন এক জায়গায়।",
  },
  {
    icon: BrainCircuit,
    eyebrow: "AI অ্যাসিসটেন্ট",
    title: "ডাউট সলভার",
    text: "প্রশ্ন বা উত্তরের যেকোনো অংশ বুঝতে না পারলে লাইন-বাই-লাইন সহজ ব্যাখ্যা নিন।",
  },
  {
    icon: BarChart3,
    eyebrow: "প্রোগ্রেস",
    title: "এনালিটিক্স",
    text: "কোন অধ্যায়ে দুর্বল, কোথায় উন্নতি হচ্ছে, সবকিছু স্পষ্ট চোখের সামনে।",
  },
  {
    icon: Trophy,
    eyebrow: "দেশসেরা",
    title: "লিডারবোর্ড",
    text: "প্র্যাকটিসের সাথে নিজের অবস্থান দেখুন ও প্রস্তুতিতে গতি আনুন।",
  },
  {
    icon: BookOpen,
    eyebrow: "পাঠ্যবই",
    title: "গোছানো পড়া",
    text: "বই, অধ্যায় ও প্রশ্নের মধ্যে দ্রুত যাতায়াত করে সময় বাঁচান।",
  },
];

const testimonials = [
  {
    name: "সাদিয়া ইসলাম",
    role: "HSC 2026",
    text: "প্রশ্ন খুঁজে প্র্যাকটিস করা এখন অনেক দ্রুত। AI ব্যাখ্যাগুলোও সহজ ভাষায় বুঝতে পারি।",
  },
  {
    name: "রাফি হাসান",
    role: "CUET Aspirant",
    text: "বিশ্ববিদ্যালয় প্রশ্নগুলো বিষয়ভিত্তিক ভাগ করা থাকায় এবং মক টেস্ট থাকায় প্রস্তুতি গোছানো হয়েছে।",
  },
  {
    name: "নাবিলা আক্তার",
    role: "SSC 2026",
    text: "আগে কোন টপিকে দুর্বল বুঝতাম না। এখন প্র্যাকটিসের পরই পরিষ্কার ধারণা পাই।",
  },
];

export default function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* HERO SECTION — Fully responsive, attractive, and free of negative margin bugs */}
      <section className="relative overflow-hidden border-b border-border/40 bg-[linear-gradient(180deg,#f4fbf7_0%,#ffffff_55%,#fcfaf4_100%)]">
        {/* Soft background ambient gradient shapes */}
        <div className="absolute top-0 left-1/4 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container relative mx-auto px-4 py-10 sm:py-14 md:py-18 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Headline, CTAs, Stats */}
            <div className="space-y-6 text-center lg:text-left lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 backdrop-blur-md px-3.5 py-1.5 text-xs sm:text-sm font-bold text-primary shadow-sm">
                <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                <span>বাংলায় স্মার্ট পরীক্ষা প্রস্তুতি • AI চালিত</span>
              </div>

              <div className="space-y-4">
                <h1 className="font-headline text-3xl sm:text-5xl md:text-6xl font-black leading-[1.15] tracking-tight text-teal-950">
                  চর্চা করো{" "}
                  <span className="bg-gradient-to-r from-primary via-emerald-600 to-teal-700 bg-clip-text text-transparent">
                    নিজের গতিতে
                  </span>
                  , জয় করো প্রতিটি পরীক্ষা
                </h1>
                <p className="mx-auto max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-slate-600 lg:mx-0">
                  সিলেবাসের যেকোনো টপিক থেকে প্রশ্ন খুঁজে প্র্যাকটিস করো, বিষয়ভিত্তিক বিশ্ববিদ্যালয় প্রশ্ন সমাধান করো, AI দিয়ে ব্যাখ্যা বুঝে নাও এবং মক টেস্টে নিজের অবস্থান যাচাই করো।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  href="/question-bank"
                  className="w-full sm:w-auto brand-btn brand-btn-primary shadow-md hover:shadow-lg text-sm sm:text-base"
                >
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                  প্রশ্ন প্র্যাকটিস শুরু
                </Link>
                <Link
                  href="/question-bank/university-questions"
                  className="w-full sm:w-auto brand-btn brand-btn-secondary text-sm sm:text-base border border-teal-900/15"
                >
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  বিশ্ববিদ্যালয় প্রশ্ন
                </Link>
                <Link
                  href="/mcq-practice"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-bold text-slate-700 hover:text-primary hover:bg-primary/5 transition-all"
                >
                  <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                  মক টেস্ট দিন
                </Link>
              </div>

              {/* Quick Exam Streams Pills */}
              <div className="pt-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  জনপ্রিয় প্রস্তুতি ক্যাটাগরি
                </p>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  {[
                    { label: "HSC বিজ্ঞান", href: "/question-bank" },
                    { label: "বিশ্ববিদ্যালয় ভর্তি (CUET/BUET/DU)", href: "/question-bank/university-questions" },
                    { label: "SSC পরীক্ষা", href: "/question-bank" },
                    { label: "মেডিকেল ভর্তি", href: "/question-bank" },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:border-primary/40 hover:text-primary transition-all shadow-xs"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Highlights Cards (Responsive Grid) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3 text-left max-w-lg mx-auto lg:mx-0">
                {[
                  ["১০ লক্ষ+", "প্রশ্ন সংগ্রহ"],
                  ["AI চালিত", "সহজ ব্যাখ্যা"],
                  ["২৪/৭", "লাইভ টেস্ট"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-teal-900/10 bg-white/90 backdrop-blur-sm p-2.5 sm:p-3.5 shadow-xs text-center sm:text-left"
                  >
                    <p className="text-base sm:text-xl md:text-2xl font-black text-primary leading-tight">
                      {value}
                    </p>
                    <p className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-0.5">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Active Learners Counter */}
              <div className="flex justify-center lg:justify-start pt-1">
                <ActiveUserCounter />
              </div>
            </div>

            {/* Right Column: Sleek, Fully-Responsive Interactive Showcase Card */}
            <div className="w-full lg:col-span-5 relative mt-4 lg:mt-0">
              {/* Floating review badge */}
              <div className="absolute -top-4 -left-2 sm:-left-4 z-20 rounded-2xl bg-white/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg border border-slate-100 flex items-center gap-2.5 animate-fade-in">
                <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Medal className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs sm:text-sm font-black text-slate-800">৪.৮ রেটিং</span>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">৫০,০০০+ শিক্ষার্থীর পছন্দ</p>
                </div>
              </div>

              {/* Main Showcase Card */}
              <div className="w-full rounded-3xl border border-teal-950/15 bg-white shadow-2xl shadow-teal-950/15 overflow-hidden">
                {/* Header of the mock exam */}
                <div className="bg-gradient-to-r from-teal-950 via-primary to-teal-900 px-5 py-5 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/logo.png"
                        alt="Chorcha Logo"
                        width={40}
                        height={40}
                        className="h-9 w-9 rounded-xl bg-white p-1 object-contain"
                      />
                      <span className="font-bold text-sm tracking-wide">স্মার্ট ড্যাশবোর্ড</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      লাইভ প্র্যাকটিস
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-white/70">বর্তমান লক্ষ্য</p>
                    <h3 className="text-lg sm:text-xl font-black mt-0.5">
                      HSC & বিশ্ববিদ্যালয় ভর্তি প্রশ্ন ব্যাংক
                    </h3>
                  </div>
                </div>

                {/* Body of the mock */}
                <div className="p-4 sm:p-5 space-y-3.5 bg-slate-50/50">
                  {/* Progress block */}
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800">
                      <span>বিষয়ভিত্তিক প্রস্তুতি অগ্রগতি</span>
                      <span className="text-amber-600 font-black">৮৮% সমাপ্ত</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-amber-200/50 overflow-hidden">
                      <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
                    </div>
                  </div>

                  {/* Sample Subject Badges */}
                  <div className="space-y-2">
                    {[
                      { subject: "রসায়ন (Chemistry)", q: "২৫টি প্রশ্ন প্রস্তুত", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                      { subject: "পদার্থবিজ্ঞান (Physics)", q: "২৪টি প্রশ্ন প্রস্তুত", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
                      { subject: "উচ্চতর গণিত (Higher Math)", q: "২৫টি প্রশ্ন প্রস্তুত", color: "bg-amber-50 text-amber-700 border-amber-200" },
                    ].map((item, idx) => (
                      <div
                        key={item.subject}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 bg-white shadow-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="h-7 w-7 rounded-lg bg-teal-50 text-primary font-black text-xs flex items-center justify-center">
                            ০{idx + 1}
                          </span>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                              {item.subject}
                            </p>
                            <p className="text-[10px] text-slate-500">{item.q}</p>
                          </div>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      </div>
                    ))}
                  </div>

                  {/* AI Solution Feature Pill */}
                  <div className="rounded-2xl bg-teal-950 p-3.5 text-white flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-teal-800/80 flex items-center justify-center shrink-0 text-amber-300">
                        <BrainCircuit className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold">AI ডাউট সলভার</p>
                        <p className="text-[10px] text-white/70">ধাপে ধাপে ব্যাখ্যা ও সমাধান</p>
                      </div>
                    </div>
                    <Link
                      href="/explanation"
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors shrink-0"
                    >
                      পরীক্ষা করুন
                    </Link>
                  </div>
                </div>
              </div>

              {/* Bottom floating badge */}
              <div className="absolute -bottom-4 -right-2 sm:-right-4 z-20 rounded-2xl bg-white/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg border border-slate-100 flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-teal-50 text-primary flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-black text-slate-800">১০ লক্ষ+ প্র্যাকটিস</p>
                  <p className="text-[10px] text-slate-500">প্রতিদিন হাজারো শিক্ষার্থী</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXAM STREAMS / TARGET EXAMS SECTION */}
      <section className="bg-white py-14 sm:py-20 border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center space-y-3">
            <span className="inline-block text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">
              লক্ষ্য নির্ধারণ
            </span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-teal-950">
              আপনার পরীক্ষার প্রস্তুতি শুরু করুন
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
              অধ্যায়ভিত্তিক প্রশ্ন ব্যাংক, বোর্ড প্রশ্ন ও বিগত বছরের ভর্তি পরীক্ষার প্রশ্ন এক ক্লিকেই।
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {examStreams.map((stream) => (
              <Link
                key={stream.name}
                href={stream.href}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-[#f8fffb] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                      {stream.badge}
                    </span>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                  </div>
                  <h3 className="text-lg font-black text-teal-950 group-hover:text-primary transition-colors">
                    {stream.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{stream.count}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="bg-[#f6fbf8] py-14 sm:py-20 border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div className="max-w-xl">
              <span className="text-xs font-black uppercase tracking-widest text-amber-600">
                বৈশিষ্ট্যসমূহ
              </span>
              <h2 className="mt-1.5 text-2xl sm:text-4xl font-black text-teal-950">
                কেন চর্চা সবার চেয়ে আলাদা?
              </h2>
            </div>
            <p className="max-w-md text-sm sm:text-base text-slate-600">
              শিক্ষার্থীদের প্রতিদিনের অনুশীলনের জন্য প্রয়োজনীয় সব ফিচার এক জায়গায় পরিষ্কার ও সুন্দরভাবে সাজানো।
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/30"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <p className="text-xs font-black text-amber-500 uppercase tracking-wider">
                  {feature.eyebrow}
                </p>
                <h3 className="mt-1 text-xl font-black text-teal-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI EXPLANATION SHOWCASE SECTION */}
      <section className="bg-white py-14 sm:py-20 border-b border-border/30">
        <div className="container mx-auto grid items-center gap-10 px-4 lg:grid-cols-12">
          <div className="lg:col-span-5 rounded-3xl bg-teal-950 p-5 sm:p-6 text-white shadow-xl shadow-teal-950/20">
            <div className="rounded-2xl bg-white p-4 sm:p-5 text-teal-950">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <Target className="h-5 w-5 text-primary" />
                  <p className="font-black text-sm sm:text-base">সাপ্তাহিক বিষয়ভিত্তিক প্রস্তুতি</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-600">
                  +১৮% অগ্রগতি
                </span>
              </div>
              <div className="mt-4 space-y-3.5">
                {[
                  ["পদার্থবিজ্ঞান", "৯২%"],
                  ["রসায়ন", "৭৮%"],
                  ["উচ্চতর গণিত", "৮৫%"],
                  ["জীববিজ্ঞান", "৮০%"],
                ].map(([subject, score]) => (
                  <div key={subject}>
                    <div className="mb-1 flex justify-between text-xs sm:text-sm font-bold">
                      <span>{subject}</span>
                      <span className="text-primary font-black">{score}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                        style={{ width: score }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5 lg:col-span-7">
            <span className="text-xs font-black uppercase tracking-widest text-amber-600">
              AI ব্যাখ্যা ও ডাউট সলভার
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-teal-950 leading-tight">
              উত্তর শুধু জানা নয়, প্রতিটি ধাপ বুঝে নিন
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600">
              কোনো প্রশ্নে আটকে গেলে আর চিন্তা নেই! আমাদের AI অ্যাসিস্ট্যান্ট প্রতিটি প্রশ্নের লাইন-বাই-লাইন বাংলা ব্যাখ্যা এবং প্রয়োজনীয় সূত্র বুঝিয়ে দেয়।
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
              {[
                "ধাপে ধাপে বিস্তারিত সমাধান",
                "অধ্যায়ভিত্তিক বিশ্ববিদ্যালয় প্রশ্ন",
                "কাস্টম মক টেস্ট ও স্কোর",
                "যেকোনো ডিভাইস থেকে সহজ প্র্যাকটিস",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 rounded-xl bg-[#f6fbf8] p-3 text-xs sm:text-sm font-bold text-teal-950 border border-teal-900/5"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <Link href="/question-bank/university-questions" className="brand-btn brand-btn-primary">
                বিশ্ববিদ্যালয় প্রশ্ন দেখুন
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="bg-[#fffdf7] py-14 sm:py-20 border-b border-border/30">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center space-y-2 mb-10">
            <span className="text-xs font-black uppercase tracking-widest text-amber-600">
              সাফল্যের গল্প
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-teal-950">
              শিক্ষার্থীরা কী বলছে
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((item) => (
              <div
                key={item.name}
                className="rounded-2xl border border-amber-200/60 bg-white p-5 sm:p-6 shadow-xs"
              >
                <div className="mb-3 flex gap-1">
                  {[...Array(5)].map((_, star) => (
                    <Star key={star} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-700">&quot;{item.text}&quot;</p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary text-sm">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-teal-950">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="bg-gradient-to-r from-teal-950 via-primary to-teal-900 py-12 sm:py-16 text-white">
        <div className="container mx-auto px-4 flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black">
              আজ থেকেই শুরু হোক স্মার্ট প্রস্তুতি
            </h2>
            <p className="text-sm sm:text-base text-white/80">
              প্রশ্ন ব্যাংক, MCQ প্র্যাকটিস ও AI ব্যাখ্যা নিয়ে পরীক্ষায় এগিয়ে থাকো অন্যদের চেয়ে।
            </p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/signup"
              className="brand-btn bg-white text-primary hover:bg-amber-50 shadow-lg font-bold"
            >
              বিনামূল্যে একাউন্ট খুলুন
              <GraduationCap className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
