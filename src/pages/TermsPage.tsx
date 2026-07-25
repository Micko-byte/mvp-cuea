import { ArrowLeft, BookOpen, Shield, ScrollText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

type SectionId = "about" | "terms" | "privacy";

const sections: { id: SectionId; icon: React.ReactNode; label: string }[] = [
  { id: "about", icon: <BookOpen className="w-4 h-4" />, label: "About Sekani" },
  { id: "terms", icon: <ScrollText className="w-4 h-4" />, label: "Terms of Service" },
  { id: "privacy", icon: <Shield className="w-4 h-4" />, label: "Privacy Policy" },
];

const Collapsible = ({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left bg-card/60 hover:bg-card/90 transition-colors"
      >
        <span className="font-semibold text-sm text-foreground">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-4 py-4 bg-background text-sm leading-relaxed space-y-2 text-muted-foreground border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
};

const UL = ({ items }: { items: (string | React.ReactNode)[] }) => (
  <ul className="list-disc pl-5 space-y-1">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

const TermsPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SectionId>("about");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 flex items-center px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display font-bold text-foreground text-lg">Sekani — Terms & Privacy</h1>
      </header>

      {/* Section Nav Tabs */}
      <div className="sticky top-14 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex max-w-3xl mx-auto px-4">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSection === s.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.icon}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-4 text-foreground">
        {/* ── ABOUT SEKANI ────────────────────────────── */}
        {activeSection === "about" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-display font-bold mb-1">About Sekani</h2>
              <p className="text-sm text-muted-foreground">Last updated: March 25, 2026</p>
            </div>

            <div className="bg-card rounded-xl border border-border p-5 space-y-3 text-sm leading-relaxed">
              <p>
                I'm <strong>Sekani</strong>, an academic AI assistant built by the <strong>Soma na Sekani</strong> team
                — an initiative focused on creating AI tools that help students learn, study, and solve problems more
                effectively.
              </p>
              <p className="text-muted-foreground">
                I don't have consciousness or feelings. I generate responses based on patterns learned from data,
                including notes shared by students. Think of me as a smart study tool, not a human.
              </p>
            </div>

            <Collapsible title="Why Sekani was made" defaultOpen>
              <UL
                items={[
                  "Make educational information easier to access for students",
                  "Help students think through problems and study material efficiently",
                  "Assist with academic tasks, learning exercises, and study planning",
                  "Generate insights based on student-contributed notes",
                ]}
              />
            </Collapsible>

            <Collapsible title="Important legal notes">
              <UL
                items={[
                  "All responses are generated from student-contributed notes, not official course content.",
                  "Users are responsible for ensuring uploaded notes are their own work or that they have permission to share them.",
                  "Sekani does not store or redistribute official copyrighted university material. Embeddings derived from uploaded content are used strictly for AI functionality.",
                  "AI answers are transformative: they summarize, explain, or analyze notes rather than reproduce them verbatim.",
                  <span>
                    Sekani is <strong>not</strong> officially affiliated with or endorsed by any university or academic
                    institution.
                  </span>,
                ]}
              />
            </Collapsible>

            <Collapsible title="Copyright takedown procedure">
              <p className="mb-2">
                If you believe content on Sekani infringes your copyright, contact us at{" "}
                <span className="text-primary font-medium">support@sekani.ai</span> with:
              </p>
              <UL
                items={[
                  "Your contact information (name, email, organization)",
                  "A description of the copyrighted work you believe has been infringed",
                  "The specific content on Sekani you believe is infringing",
                  "A statement that you have a good-faith belief the use is not authorized",
                  "A statement that the information in your notice is accurate",
                ]}
              />
              <p className="mt-2">
                We will review and respond to valid takedown requests within 5 business days. Repeat infringers will
                have their accounts terminated.
              </p>
            </Collapsible>
          </section>
        )}

        {/* ── TERMS OF SERVICE ────────────────────────── */}
        {activeSection === "terms" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-display font-bold mb-1">Terms of Service</h2>
              <p className="text-sm text-muted-foreground">Effective Date: March 25, 2026</p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
              By using Sekani, you agree to these Terms. Please read them — they protect both you and the platform.
            </div>

            <Collapsible title="1. Eligibility & Age Requirement" defaultOpen>
              <UL
                items={[
                  "You must be at least 16 years old to use Sekani.",
                  "If you are under 18, you confirm that a parent or legal guardian has reviewed and consented to these Terms on your behalf.",
                  "By using the platform, you represent that you meet these age requirements.",
                  "We do not knowingly collect data from users under 16. If we discover an underage user, we will delete their account and data promptly.",
                ]}
              />
            </Collapsible>

            <Collapsible title="2. Use of the Platform">
              <UL
                items={[
                  "Sekani is an AI study assistant built to help students learn using student-contributed notes.",
                  "You may use the platform for personal, non-commercial educational purposes only.",
                  "All AI responses are based on notes uploaded by students. Sekani does not provide official university material.",
                  "You are responsible for verifying AI responses before relying on them academically.",
                ]}
              />
            </Collapsible>

            <Collapsible title="3. Academic Integrity">
              <UL
                items={[
                  "Sekani is a study and learning tool. It is not intended to help you commit academic dishonesty.",
                  <span>
                    <strong>Prohibited uses include:</strong> Submitting AI-generated responses as your own work; using
                    Sekani during exams or assessments where AI assistance is prohibited; sharing exam content through
                    the platform; any other use that violates your institution's academic integrity policy.
                  </span>,
                  "You are solely responsible for understanding and complying with your institution's academic integrity rules.",
                  "Sekani is not liable for any academic misconduct findings, penalties, or consequences arising from your use of the platform.",
                ]}
              />
            </Collapsible>

            <Collapsible title="4. Acceptable Use Policy">
              <p className="mb-2">In addition to academic integrity rules, the following are strictly prohibited:</p>
              <UL
                items={[
                  "Harassment, abuse, or threatening behaviour toward any person",
                  "Uploading illegal, defamatory, or privacy-violating content",
                  "Sharing personal data of others without their consent",
                  "Attempting to hack, reverse-engineer, or exploit the platform",
                  "Using Sekani to generate harmful, misleading, or fraudulent content",
                  "Circumventing usage limits or accessing features without paying",
                  "Uploading copyrighted material you do not have the right to share",
                ]}
              />
              <p className="mt-2">
                Violating this policy may result in immediate account suspension or termination without refund.
              </p>
            </Collapsible>

            <Collapsible title="5. Uploading Notes & Content">
              <UL
                items={[
                  "By uploading content, you confirm that it is your own work or that you have permission to share it.",
                  <span>
                    <strong>Prohibited uploads include:</strong> Official university exams or past papers without
                    explicit permission; lecture slides or copyrighted material from any institution unless you have
                    rights to share; content that violates copyright law, privacy, or other legal restrictions.
                  </span>,
                  "Sekani does not proactively review uploaded content for copyright. You are solely responsible for anything you upload.",
                  "You grant Sekani a limited, non-exclusive, revocable licence to store and process your content to provide AI study functionality. This licence ends when you delete your content.",
                  <span>
                    <strong>AI training consent:</strong> By uploading content, you also grant Sekani permission to use
                    anonymised, aggregated data derived from your uploads to improve our AI models. This data is
                    processed in a way that does not personally identify you. You may opt out by contacting{" "}
                    <span className="text-primary">support@sekani.ai</span>.
                  </span>,
                ]}
              />
            </Collapsible>

            <Collapsible title="6. Intellectual Property">
              <UL
                items={[
                  "Sekani owns the platform, the AI, and all related software and branding.",
                  "Universities' intellectual property, including unit codes, course names, and official exams, remains the property of the respective institution.",
                  <span>
                    The platform is <strong>not</strong> officially affiliated with or endorsed by any university.
                  </span>,
                  "User-uploaded content remains owned by the user, subject to the licence granted above.",
                ]}
              />
            </Collapsible>

            <Collapsible title="7. Disclaimer & Limitation of Liability">
              <UL
                items={[
                  'Sekani is provided on an "as-is" and "as-available" basis without warranties of any kind.',
                  "We do not guarantee the accuracy, completeness, or fitness of AI responses for any academic purpose.",
                  "To the maximum extent permitted by Kenyan law, Sekani is not liable for: loss of grades or academic standing; academic misconduct penalties; lost, corrupted, or deleted data; service outages or interruptions; any indirect, incidental, or consequential damages.",
                  "Our total liability to you for any claim arising from use of the platform is limited to the amount you paid to Sekani in the 30 days preceding the claim, or KES 500 — whichever is greater.",
                  "Nothing in these Terms limits liability for fraud, death, or personal injury caused by our negligence.",
                ]}
              />
            </Collapsible>

            <Collapsible title="8. Payment & Subscriptions">
              <UL
                items={[
                  "Paid plans give access to higher AI usage limits.",
                  <span>
                    <strong>Individual Plan:</strong> KES 129 — 1 user, 200K tokens/day.
                  </span>,
                  <span>
                    <strong>Group Plan:</strong> KES 499 — 5 users, 200K tokens/day each.
                  </span>,
                  "Payments are generally non-refundable.",
                  <span>
                    <strong>Exceptions:</strong> You may request a refund within 48 hours of payment if you have not
                    used the platform during that period, or if a confirmed billing error occurred. Contact{" "}
                    <span className="text-primary">support@sekani.ai</span> for disputes.
                  </span>,
                  "If the platform is unavailable for more than 72 consecutive hours due to our fault, affected paid users will receive a pro-rated credit.",
                  "Sekani reserves the right to adjust pricing with at least 14 days' notice to active subscribers.",
                ]}
              />
            </Collapsible>

            <Collapsible title="9. Modifications to Terms">
              <UL
                items={[
                  "We may update these Terms from time to time.",
                  "We will notify you of material changes via email or an in-app notice at least 7 days before the changes take effect.",
                  "Continued use of the platform after the effective date of updated Terms constitutes your acceptance of the changes.",
                  "If you do not agree with updated Terms, you may close your account before the effective date.",
                ]}
              />
            </Collapsible>

            <Collapsible title="10. Governing Law & Jurisdiction">
              <UL
                items={[
                  "These Terms are governed by the laws of the Republic of Kenya.",
                  "Any disputes arising from or relating to these Terms or your use of Sekani shall be subject to the exclusive jurisdiction of the courts of Kenya.",
                  "If any provision of these Terms is found to be unenforceable, the remaining provisions remain in full force.",
                ]}
              />
            </Collapsible>

            <Collapsible title="11. Enforcement & Termination">
              <UL
                items={[
                  "Users who violate these Terms may have their accounts suspended or permanently terminated.",
                  "Termination does not entitle you to a refund except where required by Kenyan consumer law.",
                  "We reserve the right to remove content that violates these Terms without prior notice.",
                ]}
              />
            </Collapsible>
          </section>
        )}

        {/* ── PRIVACY POLICY ──────────────────────────── */}
        {activeSection === "privacy" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-display font-bold mb-1">Privacy Policy</h2>
              <p className="text-sm text-muted-foreground">Effective Date: March 25, 2026</p>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 text-sm leading-relaxed text-muted-foreground">
              Sekani ("we", "our", "us") operates under Kenya's{" "}
              <strong className="text-foreground">Data Protection Act, 2019</strong> and is registered with the Office
              of the Data Protection Commissioner (ODPC). By using Sekani, you agree to this Privacy Policy.
            </div>

            <Collapsible title="1. Information We Collect" defaultOpen>
              <p className="font-medium text-foreground mb-1">Account Information</p>
              <UL
                items={["Name, email address, encrypted password", "Course details (year, semester, unit selection)"]}
              />
              <p className="font-medium text-foreground mb-1 mt-3">Uploaded Content</p>
              <UL
                items={[
                  "Documents uploaded by users (notes, academic materials)",
                  "File metadata (name, size, upload timestamps)",
                ]}
              />
              <p className="font-medium text-foreground mb-1 mt-3">Usage Data</p>
              <UL
                items={[
                  "Queries submitted and features used",
                  "System logs for debugging and security purposes",
                  "Device type and browser (no fingerprinting)",
                ]}
              />
            </Collapsible>

            <Collapsible title="2. Legal Basis for Processing (KDPA)">
              <p className="mb-2">Under Kenya's Data Protection Act, we process your data on the following grounds:</p>
              <UL
                items={[
                  <span>
                    <strong>Contract:</strong> To provide the service you signed up for (account creation, AI responses,
                    note storage).
                  </span>,
                  <span>
                    <strong>Legitimate interest:</strong> Security monitoring, fraud prevention, and improving the
                    platform.
                  </span>,
                  <span>
                    <strong>Consent:</strong> AI model training using anonymised data from uploads (you may withdraw
                    consent at any time).
                  </span>,
                  <span>
                    <strong>Legal obligation:</strong> Where required by Kenyan law or court order.
                  </span>,
                ]}
              />
            </Collapsible>

            <Collapsible title="3. How We Use Your Information">
              <UL
                items={[
                  "Create and manage your user account",
                  "Authenticate you (including OTP verification)",
                  "Process and embed uploaded academic documents for AI functionality",
                  "Improve AI response quality and system performance",
                  "Prevent abuse, fraud, and unauthorised access",
                  "Send service-related notifications (not marketing, unless opted in)",
                ]}
              />
            </Collapsible>

            <Collapsible title="4. Data Storage & Third-Party Processors">
              <p className="mb-2">
                Your data is stored on servers located in <strong>Europe and/or the United States</strong> via the
                following processors:
              </p>
              <UL
                items={[
                  "Supabase — database and authentication",
                  "OpenAI / Anthropic — AI inference (queries are sent to these services)",
                  "Firebase (if applicable) — real-time features",
                ]}
              />
              <p className="mt-2">
                These processors are bound by data processing agreements and may not use your data for their own
                purposes. Where data is transferred outside Kenya, we ensure appropriate safeguards are in place.
              </p>
            </Collapsible>

            <Collapsible title="5. Data Retention">
              <UL
                items={[
                  "Account data is retained for as long as your account is active.",
                  "Uploaded documents and embeddings are retained until you delete them or close your account.",
                  "System logs are retained for 90 days.",
                  "On account deletion, your personal data is permanently deleted within 30 days.",
                ]}
              />
            </Collapsible>

            <Collapsible title="6. Data Sharing">
              <p>We do not sell or rent your personal data. We share limited data only when:</p>
              <UL
                items={[
                  "Required by Kenyan law or a valid court order",
                  "Necessary to operate services via third-party processors listed above",
                  "Required to investigate or prevent fraud or security threats",
                  "You have given explicit consent",
                ]}
              />
            </Collapsible>

            <Collapsible title="7. Your Rights (KDPA)">
              <p className="mb-2">Under the Kenya Data Protection Act, you have the right to:</p>
              <UL
                items={[
                  "Access a copy of personal data we hold about you",
                  "Correct inaccurate or outdated data",
                  "Request deletion of your account and all associated data",
                  "Withdraw consent for AI training use of your uploads",
                  "Object to certain types of processing",
                  "Lodge a complaint with the Office of the Data Protection Commissioner (ODPC)",
                ]}
              />
              <p className="mt-2">
                To exercise any of these rights, contact us at{" "}
                <span className="text-primary font-medium">support@sekani.ai</span>. We will respond within 21 days.
              </p>
            </Collapsible>

            <Collapsible title="8. Data Security">
              <UL
                items={[
                  "Passwords are encrypted using industry-standard hashing (bcrypt).",
                  "Data in transit is protected via TLS/HTTPS.",
                  "Access to user data is restricted to authorised team members only.",
                  "We conduct periodic security reviews.",
                  "No system is 100% secure. In the event of a breach affecting your data, we will notify you within 72 hours as required by the KDPA.",
                ]}
              />
            </Collapsible>

            <Collapsible title="9. Minors' Privacy">
              <UL
                items={[
                  "Sekani is not intended for users under 16.",
                  "We do not knowingly collect personal data from children under 16.",
                  "If we become aware that a user is under 16, we will delete their account and data promptly.",
                  "Parents or guardians who believe their child under 16 has registered may contact us at support@sekani.ai for immediate account removal.",
                ]}
              />
            </Collapsible>

            <Collapsible title="10. Changes to This Policy">
              <p>
                We may update this Privacy Policy periodically. We will notify you of material changes via email or
                in-app notice. Continued use of the platform after the effective date of the updated Policy constitutes
                acceptance of the changes.
              </p>
            </Collapsible>

            <Collapsible title="11. Contact & Data Controller">
              <p>
                The data controller for Sekani is the <strong>Soma na Sekani team</strong>, operating in Kenya.
              </p>
              <p className="mt-2">
                For privacy questions, data requests, or concerns:{" "}
                <span className="text-primary font-medium">support@sekani.ai</span>
              </p>
              <p className="mt-2">
                To file a complaint with the regulator: <span className="text-primary font-medium">www.odpc.go.ke</span>
              </p>
            </Collapsible>
          </section>
        )}

        <p className="text-xs text-muted-foreground text-center pb-8 pt-4">
          Questions? Reach us at <span className="text-primary">support@sekani.ai</span>
        </p>
      </div>
    </div>
  );
};

export default TermsPage;
