import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { LwaiLogo } from "@/components/ui/lwai-logo";

const footerGroups = [
  {
    title: "Features",
    links: [
      { href: "/mcq-practice", label: "Mock Exam" },
      { href: "/question-bank", label: "Question Bank" },
      { href: "/explanation", label: "AI Explanation" },
    ],
  },
  {
    title: "Streams",
    links: [
      { href: "/subjects", label: "SSC Science" },
      { href: "/subjects", label: "HSC Science" },
      { href: "/subjects", label: "Admission" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/", label: "About" },
      { href: "/login", label: "Login" },
      { href: "/signup", label: "Register" },
    ],
  },
];

export function MainFooter() {
  return (
    <footer className="border-t border-teal-900/10 bg-teal-950 text-white">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div className="space-y-5">
          <div className="inline-flex rounded-lg bg-white p-2">
            <LwaiLogo size="default" />
          </div>
          <p className="max-w-sm leading-7 text-white/70">
            বোর্ড প্রশ্ন, MCQ প্র্যাকটিস, মক টেস্ট ও AI ব্যাখ্যা নিয়ে বাংলায় গোছানো পরীক্ষা প্রস্তুতি।
          </p>
          <div className="space-y-3 text-sm text-white/70">
            <p className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-amber-300" />
              01605-002711
            </p>
            <p className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-amber-300" />
              support@banglaeducation.com
            </p>
            <p className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-amber-300" />
              Dhaka, Bangladesh
            </p>
          </div>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title}>
            <h3 className="font-black text-amber-300">{group.title}</h3>
            <div className="mt-4 grid gap-3">
              {group.links.map((link) => (
                <Link key={link.label} href={link.href} className="text-sm text-white/70 transition hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 py-5 text-sm text-white/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Bangla Education. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="#" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-white">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
