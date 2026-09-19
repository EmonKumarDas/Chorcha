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
} from "lucide-react";
import { ActiveUserCounter } from "@/components/active-user-counter";

const examStreams = ["SSC Science", "HSC Science", "HSC Arts", "HSC Commerce", "Admission", "BCS/Job"];

const features = [
  {
    icon: ClipboardList,
    eyebrow: "কাস্টম",
    title: "মক টেস্ট",
    text: "বিষয়, অধ্যায়, সময় ও প্রশ্নের ধরন বেছে নিজের মতো পরীক্ষা দিন।",
  },
  {
    icon: FileQuestion,
    eyebrow: "বিশাল সংখ্যক",
    title: "প্রশ্ন ব্যাংক",
    text: "বোর্ড প্রশ্ন, MCQ ও গুরুত্বপূর্ণ অনুশীলন প্রশ্ন এক জায়গায়।",
  },
  {
    icon: BrainCircuit,
    eyebrow: "AI অ্যাসিসটেন্ট",
    title: "ডাউট সলভার",
    text: "প্রশ্ন বা উত্তরের যেকোন অংশ বুঝতে না পারলে সহজ ব্যাখ্যা নিন।",
  },
  {
    icon: BarChart3,
    eyebrow: "প্রোগ্রেস",
    title: "এনালিটিক্স",
    text: "কোন অধ্যায়ে দুর্বল, কোথায় উন্নতি হচ্ছে, সবকিছু চোখের সামনে।",
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
    text: "প্রশ্ন খুঁজে প্র্যাকটিস করা এখন অনেক দ্রুত। AI ব্যাখ্যাগুলোও সহজ ভাষায়।",
  },
  {
    name: "রাফি হাসান",
    role: "Admission",
    text: "মক টেস্ট আর অধ্যায়ভিত্তিক ফিল্টার একসাথে থাকায় প্রস্তুতি মাপা সহজ হয়েছে।",
  },
  {
    name: "নাবিলা আক্তার",
    role: "SSC 2026",
    text: "আগে কোন টপিকে দুর্বল বুঝতাম না। এখন প্র্যাকটিসের পরই পরিষ্কার ধারণা পাই।",
  },
];

export default function HomePage() {
  return (
    <div className="bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-teal-900/10 bg-[linear-gradient(180deg,#f7fffb_0%,#ffffff_62%,#fffaf0_100%)]">
        <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_20%_20%,rgba(246,178,36,0.22),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(0,91,93,0.18),transparent_30%)]" />
        <div className="container relative mx-auto grid items-center gap-10 px-4 py-12 md:py-16 lg:-mt-24 lg:grid-cols-[1fr_0.92fr] lg:py-20">
          <div className="space-y-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-900/10 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
              বাংলায় স্মার্ট পরীক্ষা প্রস্তুতি
            </div>

            <div className="space-y-5">
              <h1 className="font-headline text-4xl font-black leading-tight tracking-normal text-teal-950 md:text-6xl lg:text-7xl">
                চর্চা করো
                <span className="block text-primary">নিজের গতিতে</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg leading-8 text-slate-600 md:text-xl lg:mx-0">
                সিলেবাসের যেকোন টপিক থেকে প্রশ্ন খুঁজে প্র্যাকটিস করো, AI দিয়ে ব্যাখ্যা বুঝে নাও, আর মক টেস্ট দিয়ে নিজের প্রস্তুতি মাপো।
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/question-bank" className="brand-btn brand-btn-primary">
                <Search className="h-5 w-5" />
                প্রশ্ন প্র্যাকটিস শুরু
              </Link>
              <Link href="/mcq-practice" className="brand-btn brand-btn-secondary">
                <PlayCircle className="h-5 w-5" />
                মক টেস্ট দিন
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 text-left sm:max-w-xl lg:max-w-none">
              {[
                ["১০ লক্ষ+", "প্রশ্ন সংগ্রহ"],
                ["AI", "ব্যাখ্যা সহায়তা"],
                ["২৪/৭", "নিজের গতিতে"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-teal-900/10 bg-white px-4 py-3 shadow-sm">
                  <p className="text-2xl font-black text-primary">{value}</p>
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-center lg:justify-start">
              <ActiveUserCounter />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] lg:max-w-none">
            <div className="absolute -left-6 top-8 hidden rounded-lg bg-white px-4 py-3 shadow-xl ring-1 ring-teal-900/10 md:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Medal className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-teal-950">4.8 Rating</p>
                  <p className="text-xs text-slate-500">শিক্ষার্থীদের পছন্দ</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto aspect-[9/16] max-h-[680px] w-[78%] rounded-[2rem] border-[10px] border-teal-950 bg-teal-950 p-2 shadow-2xl shadow-teal-950/25 sm:w-[68%] lg:w-[72%]">
              <div className="h-full overflow-hidden rounded-[1.35rem] bg-white">
                <div className="bg-primary px-5 py-5 text-white">
                  <div className="flex items-center justify-between">
                    <Image src="/logo.png" alt="Bangla Education logo" width={82} height={82} className="h-12 w-12 rounded-lg bg-white object-contain p-1" priority />
                    <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">লাইভ</span>
                  </div>
                  <p className="mt-5 text-sm text-white/75">আজকের প্রস্তুতি</p>
                  <h2 className="mt-1 text-2xl font-black leading-tight">HSC Physics Mock</h2>
                </div>

                <div className="space-y-4 p-4">
                  <div className="rounded-lg bg-amber-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-teal-950">অধ্যায়ভিত্তিক স্কোর</p>
                      <span className="text-sm font-black text-amber-600">৮৭%</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-amber-100">
                      <div className="h-full w-[87%] rounded-full bg-amber-400" />
                    </div>
                  </div>

                  {["তড়িৎ ক্ষেত্র", "চৌম্বকত্ব", "তরঙ্গ"].map((topic, index) => (
                    <div key={topic} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 font-black text-primary">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-teal-950">{topic}</p>
                        <p className="text-xs text-slate-500">MCQ + ব্যাখ্যা প্রস্তুত</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                  ))}

                  <div className="rounded-lg bg-teal-950 p-4 text-white">
                    <div className="flex items-center gap-3">
                      <BrainCircuit className="h-6 w-6 text-amber-300" />
                      <div>
                        <p className="text-sm font-black">AI ডাউট সলভার</p>
                        <p className="text-xs text-white/65">লাইন বাই লাইন ব্যাখ্যা</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-2 bottom-16 rounded-lg bg-white px-4 py-3 shadow-xl ring-1 ring-teal-900/10 sm:right-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-teal-950">1M+ practice</p>
                  <p className="text-xs text-slate-500">প্রতিদিন শেখা</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-500">Smart Study</p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-teal-950 md:text-5xl">
              পড়াশোনা হবে স্মার্ট, ফান ও সহজ
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              মক টেস্ট, প্রশ্ন ব্যাংক, AI ব্যাখ্যা ও প্রোগ্রেস ট্র্যাকিং একসাথে থাকায় প্রস্তুতি থাকে গোছানো।
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {examStreams.map((stream) => (
              <Link key={stream} href="/question-bank" className="group flex items-center justify-between rounded-lg border border-teal-900/10 bg-[#f8fffb] p-5 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                <span className="font-black text-teal-950">{stream}</span>
                <ArrowRight className="h-5 w-5 text-primary transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f6fbf8] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-500">Features</p>
              <h2 className="mt-3 text-3xl font-black text-teal-950 md:text-5xl">ফিচারসমূহ</h2>
            </div>
            <p className="max-w-lg text-lg leading-8 text-slate-600">
              শিক্ষার্থীর প্রতিদিনের প্রস্তুতির জন্য দরকারি কাজগুলো দ্রুত, পরিষ্কার ও সুন্দরভাবে সাজানো।
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-teal-900/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-primary">
                  <feature.icon className="h-6 w-6" />
                </div>
                <p className="text-sm font-black text-amber-500">{feature.eyebrow}</p>
                <h3 className="mt-1 text-2xl font-black text-teal-950">{feature.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="container mx-auto grid items-center gap-12 px-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg bg-teal-950 p-6 text-white shadow-2xl shadow-teal-950/20">
            <div className="rounded-lg bg-white p-4 text-teal-950">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-primary" />
                  <p className="font-black">Weekly Progress</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600">+১৮%</span>
              </div>
              <div className="mt-5 space-y-4">
                {[
                  ["Physics", "92%"],
                  ["Chemistry", "76%"],
                  ["Math", "84%"],
                ].map(([subject, score]) => (
                  <div key={subject}>
                    <div className="mb-2 flex justify-between text-sm font-bold">
                      <span>{subject}</span>
                      <span>{score}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: score }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-500">AI Explanation</p>
            <h2 className="text-3xl font-black leading-tight text-teal-950 md:text-5xl">
              উত্তর, ব্যাখ্যা ও AI ডাউট সলভিং
            </h2>
            <p className="text-lg leading-8 text-slate-600">
              প্রশ্ন দেখার পর শুধু উত্তর নয়, কেন উত্তরটি সঠিক সেটাও বুঝুন। AI সহায়তা আপনার বই, অধ্যায় ও পরীক্ষার লক্ষ্য ধরে ব্যাখ্যা দিতে সাহায্য করে।
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {["লাইন-বাই-লাইন ব্যাখ্যা", "অধ্যায়ভিত্তিক প্র্যাকটিস", "দ্রুত সার্চ", "প্রোগ্রেস রিপোর্ট"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg bg-[#f6fbf8] p-4 font-bold text-teal-950">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  {item}
                </div>
              ))}
            </div>
            <Link href="/explanation" className="brand-btn brand-btn-primary">
              AI ব্যাখ্যা দেখুন
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#fff8e8] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-600">Success</p>
            <h2 className="mt-3 text-3xl font-black text-teal-950 md:text-5xl">শিক্ষার্থীদের সাফল্য</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <div key={item.name} className="rounded-lg border border-amber-200/70 bg-white p-6 shadow-sm">
                <div className="mb-4 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="leading-7 text-slate-700">&quot;{item.text}&quot;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary font-black text-white">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-teal-950">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-16 text-white md:py-20">
        <div className="container mx-auto flex flex-col items-center justify-between gap-8 px-4 text-center lg:flex-row lg:text-left">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black md:text-5xl">আজ থেকেই প্রস্তুতি শুরু করুন</h2>
            <p className="mt-4 text-lg leading-8 text-white/75">
              প্রশ্ন ব্যাংক, MCQ প্র্যাকটিস ও AI ব্যাখ্যা নিয়ে আপনার পড়াশোনাকে আরেক ধাপ এগিয়ে নিন।
            </p>
          </div>
          <Link href="/signup" className="brand-btn bg-white text-primary hover:bg-amber-50">
            ফ্রি অ্যাকাউন্ট খুলুন
            <GraduationCap className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
