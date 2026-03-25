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
        <h1 className="font-display font-bold text-foreground text-lg">Terms & Privacy Policy</h1>
      </header>

      <div className="max-w-3xl mx-auto p-6 space-y-10 text-foreground">
        {/* Privacy Policy */}
        <section>
          <h2 className="text-2xl font-display font-bold mb-6">📄 SEKANI AI – Privacy Policy</h2>
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
                <li>Name</li>
                <li>Email address</li>
                <li>Password (encrypted)</li>
                <li>Course details (year, semester, unit selection)</li>
              </ul>
              <p className="font-medium mb-1 mt-3">b) Uploaded Content</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Documents uploaded by users (notes, past papers, academic materials)</li>
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
                <li>Enable access to platform features</li>
                <li>Process and embed uploaded academic documents</li>
                <li>Improve AI responses and system performance</li>
                <li>Prevent abuse, fraud, and unauthorized access</li>
                <li>Provide customer support</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">4. Uploaded Documents</h3>
              <p>Users retain ownership of their uploaded content. By uploading documents, users grant Sekani AI a limited, non-exclusive license to store, process, analyze, and generate embeddings for AI functionality. Uploaded documents are used strictly for educational and system functionality purposes.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">5. Data Sharing</h3>
              <p>We do not sell or rent personal data. We may share limited data only when required by law, necessary to operate services (e.g., hosting, email OTP providers, payment processors), or to enforce security and prevent abuse.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">6. Data Security</h3>
              <p>We implement reasonable technical and organizational measures to protect user data, including encryption of sensitive data, secure authentication systems, access control restrictions, and monitoring for unauthorized access. However, no system is 100% secure.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">7. Data Retention</h3>
              <p>Account data is retained while the account is active. Uploaded documents are retained unless deleted by the user or removed for policy violations. We may retain logs for security and auditing purposes.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">8. User Rights</h3>
              <p>Users may access their data, update their profile information, and request deletion of their account and associated data.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">9. Third-Party Services</h3>
              <p>Sekani AI may use third-party services for email delivery (OTP), payment processing (e.g., M-Pesa integrations), and cloud hosting and storage. These services have their own privacy policies.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">10. Changes to This Policy</h3>
              <p>We may update this Privacy Policy periodically. Continued use of the platform constitutes acceptance of any changes.</p>
            </div>
          </div>
        </section>

        {/* Terms and Conditions */}
        <section>
          <h2 className="text-2xl font-display font-bold mb-6">📜 SEKANI AI – Terms and Conditions</h2>
          <p className="text-sm text-muted-foreground mb-4">Effective Date: March 25, 2026</p>

          <div className="space-y-6 text-sm leading-relaxed">
            <div>
              <h3 className="font-semibold text-base mb-2">1. Acceptance of Terms</h3>
              <p>By accessing or using Sekani AI, you agree to be bound by these Terms and Conditions. If you do not agree, you must not use the platform.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">2. Eligibility</h3>
              <p>Users must provide accurate and truthful information. Users must complete email verification (OTP) before accessing the platform.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">3. Account Responsibilities</h3>
              <p>Users are responsible for maintaining the confidentiality of their login credentials. Users must not share accounts or allow unauthorized access.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">4. Email Restrictions</h3>
              <p>Emails containing ".edu" are not allowed for registration. Users must use personal/non-institutional emails.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">5. Terms & Conditions Agreement</h3>
              <p>Users must accept these terms before proceeding past Step 1. Acceptance is required via checkbox confirmation.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">6. Platform Usage</h3>
              <p>Users agree to use the platform only for lawful and educational purposes, upload only academic materials (notes, past papers, course-related documents), and not attempt to exploit, hack, or reverse-engineer the system.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">7. Prohibited Activities</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Upload malicious files, corrupted files, or harmful content</li>
                <li>Attempt to inject code or exploit system vulnerabilities</li>
                <li>Upload non-academic or irrelevant content</li>
                <li>Use the platform for illegal or unauthorized activities</li>
                <li>Attempt to bypass authentication or payment systems</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">8. Document Uploads</h3>
              <p>Uploaded documents are scanned for malware, corruption, and content relevance. Duplicate or highly similar documents may be rejected to prevent redundancy. Documents must be academic in nature.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">9. Embedding & AI Usage</h3>
              <p>Uploaded documents may be processed and embedded for AI functionality. Embedding operations are separate from chat usage and do not consume chat credits. The platform may reject documents that violate content or duplication rules.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">10. Payments</h3>
              <p><strong>Individual Plan:</strong> Users must pay the applicable fee (KES 129) to access premium features.</p>
              <p className="mt-2"><strong>Group Plan:</strong> Group subscriptions (KES 499 for 5 people) allow multiple users under one payment. The purchaser must provide valid email addresses for all group members. Group membership is only activated after successful payment and validation.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">11. Payment Processing</h3>
              <p>Payments are processed via third-party providers (e.g., mobile money services). Transaction status depends on external confirmation systems. Users must complete payment prompts (e.g., M-Pesa STK push).</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">12. Service Availability</h3>
              <p>We do not guarantee uninterrupted or error-free service. Maintenance, updates, or technical issues may affect availability.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">13. Intellectual Property</h3>
              <p>The platform, including software, design, and branding, belongs to Sekani AI. Users retain ownership of their uploaded content but grant usage rights as described in the Privacy Policy.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">14. Limitation of Liability</h3>
              <p>Sekani AI is provided "as is" without warranties. We are not liable for data loss, service interruptions, incorrect AI outputs, or damages resulting from use of the platform.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">15. Account Suspension or Termination</h3>
              <p>We reserve the right to suspend or terminate accounts that violate these terms, remove content that is malicious, duplicate, or non-academic, and restrict access in cases of abuse or fraud.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">16. Modifications to Terms</h3>
              <p>We may update these Terms at any time. Continued use of the platform constitutes acceptance of the updated Terms.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base mb-2">17. Contact Information</h3>
              <p>For questions or concerns, contact us at: <span className="text-primary font-medium">support@sekani.ai</span></p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
