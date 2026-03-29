import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 flex items-center px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display font-bold text-foreground text-lg">Sekani — Terms & Privacy</h1>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-10 text-foreground">
        {/* About Sekani AI */}
        <section>
          <h2 className="text-2xl font-display font-bold mb-4">🤖 About Sekani</h2>
          <div className="space-y-4 text-sm leading-relaxed">
            <p>I'm <strong>Sekani AI</strong>, an academic AI assistant.</p>
            <p>I was created by the <strong>Soma na Sekani</strong> team, an initiative focused on developing AI tools to help students with learning, studying, problem-solving, and creative projects.</p>
            <div>
              <h3 className="font-semibold text-base mb-2">Why I was made</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Make educational information easier to access</li>
                <li>Help students think through problems and study material efficiently</li>
                <li>Assist with academic tasks, learning exercises, and study planning</li>
                <li>Save time by answering questions and generating insights based on student-contributed notes</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-base mb-2">What I actually am</h3>
              <p className="text-muted-foreground">I don't have consciousness or feelings. I generate responses based on patterns learned from large amounts of data, including notes shared by students. Think of me as a smart study tool, not a human.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base mb-2">Important Legal Notes</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>All responses are generated based on student-contributed notes and not official course content.</li>
                <li>Users are responsible for ensuring that uploaded notes are their own work or that they have permission to share them.</li>
                <li>Sekani AI does not store or redistribute copyrighted material from universities or official exams.</li>
                <li>AI answers are transformative: they summarize, explain, or analyze notes rather than reproduce them verbatim.</li>
                <li>Sekani AI is <strong>not</strong> officially affiliated with or endorsed by any university.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Terms of Service */}
        <section>
          <h2 className="text-2xl font-display font-bold mb-6">📜 Sekani — Terms of Service</h2>
          <p className="text-sm text-muted-foreground mb-4">Effective Date: March 25, 2026</p>

          <div className="space-y-6 text-sm leading-relaxed">
            <div>
              <h3 className="font-semibold text-base mb-2">1️⃣ Use of the Platform</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Sekani AI is an AI study assistant built to help students learn using student-contributed notes.</li>
                <li>You may only use the platform for educational purposes.</li>
                <li>All AI responses are based on notes uploaded by students. Sekani AI does not provide official university material.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">2️⃣ Uploading Notes / Content</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>By uploading content, you confirm that it is your own work or that you have permission to share it.</li>
                <li><strong>Prohibited content includes:</strong> Official university exams or past papers without explicit permission; lecture slides or copyrighted material from any university unless you have rights to share; content that violates copyright laws, privacy, or other legal restrictions.</li>
                <li>Sekani AI does not review uploaded content for copyright. You are solely responsible for anything you upload.</li>
                <li>You grant Sekani AI a license to store and process your content for AI training and study functionality. This license is limited, non-exclusive, and revocable if content is removed.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">3️⃣ Intellectual Property</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Sekani AI owns the platform, the AI, and all related software and branding.</li>
                <li>Universities' intellectual property, including unit codes, course names, and official exams, remain the property of the respective institution.</li>
                <li>The platform is <strong>not</strong> officially affiliated with or endorsed by any university.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">4️⃣ Liability</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Sekani AI provides educational assistance "as-is".</li>
                <li>We do not guarantee accuracy of AI responses.</li>
                <li>Sekani AI is not responsible for any academic consequences arising from using the platform.</li>
                <li>Users assume all risk for sharing and using content on the platform.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">5️⃣ Safe Practices / Compliance</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Students must verify permissions before uploading content.</li>
                <li>AI answers are transformative summaries, explanations, or guidance — not reproductions of official content.</li>
                <li>Sekani AI reserves the right to remove content that violates these terms.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">6️⃣ Payment & Subscriptions</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Paid plans give access to higher AI usage limits.</li>
                <li><strong>Individual Plan:</strong> KES 129 — 1 user, 200K tokens/day.</li>
                <li><strong>Group Plan:</strong> KES 499 — 5 users, 200K tokens/day each.</li>
                <li>All payments are non-refundable.</li>
                <li>Sekani AI reserves the right to adjust pricing or limits at any time with notice.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">7️⃣ Enforcement</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Users who violate these terms may have their accounts suspended or terminated.</li>
                <li>Sekani AI may modify these terms at any time; continued use constitutes acceptance.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Privacy Policy */}
        <section>
          <h2 className="text-2xl font-display font-bold mb-6">📄 Sekani — Privacy Policy</h2>
          <p className="text-sm text-muted-foreground mb-4">Effective Date: March 25, 2026</p>

          <div className="space-y-6 text-sm leading-relaxed">
            <div>
              <h3 className="font-semibold text-base mb-2">1. Introduction</h3>
              <p>Sekani AI ("we", "our", "us") is an AI-powered learning platform that allows users to upload academic materials, interact with AI, and access educational features. By using Sekani AI, you agree to this Privacy Policy.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">2. Information We Collect</h3>
              <p className="font-medium mb-1">a) Account Information</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Name, email address, password (encrypted)</li>
                <li>Course details (year, semester, unit selection)</li>
              </ul>
              <p className="font-medium mb-1 mt-3">b) Uploaded Content</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Documents uploaded by users (notes, academic materials)</li>
                <li>Metadata related to files (file name, size, timestamps)</li>
              </ul>
              <p className="font-medium mb-1 mt-3">c) Usage Data</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Interaction with the platform (queries, features used)</li>
                <li>System logs for debugging and security</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">3. How We Use Information</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Create and manage user accounts</li>
                <li>Authenticate users (including OTP verification)</li>
                <li>Process and embed uploaded academic documents</li>
                <li>Improve AI responses and system performance</li>
                <li>Prevent abuse, fraud, and unauthorized access</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">4. Uploaded Documents</h3>
              <p>Users retain ownership of their uploaded content. By uploading, users grant Sekani AI a limited, non-exclusive license to store, process, and generate embeddings for AI functionality. Uploaded documents are used strictly for educational purposes.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">5. Data Sharing</h3>
              <p>We do not sell or rent personal data. We may share limited data only when required by law, necessary to operate services, or to enforce security.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">6. Data Security</h3>
              <p>We implement reasonable technical and organizational measures to protect user data. However, no system is 100% secure.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">7. User Rights</h3>
              <p>Users may access their data, update their profile, and request deletion of their account and associated data.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">8. Changes to This Policy</h3>
              <p>We may update this Privacy Policy periodically. Continued use of the platform constitutes acceptance of any changes.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">9. Contact</h3>
              <p>For questions or concerns, contact us at: <span className="text-primary font-medium">support@sekani.ai</span></p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
