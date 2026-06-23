import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function TermsPage() {
  return (
    <section className="legal-page">
      <div className="page-heading">
        <div className="eyebrow">Legal</div>
        <h1>Terms of Service</h1>
        <p>Last updated: {new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p>
      </div>
      <div className="legal-content">
        <h2>1. Acceptance of Terms</h2>
        <p>By creating a SkillLoop account or using any part of the platform, you agree to these Terms of Service. If you do not agree, please do not use SkillLoop.</p>

        <h2>2. What SkillLoop Provides</h2>
        <p>SkillLoop is a peer-to-peer skill exchange platform where members teach and learn from each other through structured sessions. We provide matching, scheduling, chat, credit tracking, and community tools to facilitate these exchanges.</p>

        <h2>3. Member Responsibilities</h2>
        <p>You agree to: provide accurate profile information, treat other members with respect, show up for scheduled sessions, honor your commitments in the credit system, and not misuse the reporting or blocking tools. SkillLoop reserves the right to suspend accounts that violate community guidelines.</p>

        <h2>4. Credits and Exchanges</h2>
        <p>SkillLoop credits are a platform-internal unit used to facilitate fair exchanges. Credits have no monetary value and cannot be purchased, sold, or transferred outside the platform. Credits are earned by helping others and spent when requesting help.</p>

        <h2>5. Content and Conduct</h2>
        <p>You retain ownership of content you post. You grant SkillLoop a license to display it within the platform. You may not post content that is unlawful, harassing, deceptive, or infringes on others' rights. SkillLoop may remove content that violates these terms.</p>

        <h2>6. Disclaimers</h2>
        <p>SkillLoop is provided "as is" without warranties. We do not guarantee that every session will be completed or that every match will be successful. We are not liable for the conduct of individual members or the outcomes of peer exchanges.</p>

        <h2>7. Account Suspension</h2>
        <p>SkillLoop may suspend or terminate accounts that violate these terms, engage in fraudulent behavior, or pose a risk to the community. Suspended accounts may appeal through the support channel.</p>

        <h2>8. Changes to Terms</h2>
        <p>We may update these terms as the platform evolves. Members will be notified of significant changes. Continued use after changes constitutes acceptance.</p>

        <h2>9. Contact</h2>
        <p>Questions about these terms can be directed to the SkillLoop team through the platform's support channels.</p>
      </div>
      <Link className="button button-secondary" to="/settings"><ArrowLeft size={16} /> Back to Settings</Link>
    </section>
  )
}

export function PrivacyPage() {
  return (
    <section className="legal-page">
      <div className="page-heading">
        <div className="eyebrow">Legal</div>
        <h1>Privacy Policy</h1>
        <p>Last updated: {new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p>
      </div>
      <div className="legal-content">
        <h2>1. Information We Collect</h2>
        <p>When you sign up, we collect your name, email, and authentication data. During onboarding, we collect your teaching and learning skills, goals, availability, language preferences, and learning styles. As you use the platform, we collect session data, messages, reviews, and activity logs needed to run the service.</p>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to: match you with compatible learning partners, schedule and track sessions, calculate reputation and credits, send notifications, prevent abuse, and improve the platform. We do not sell your data to third parties.</p>

        <h2>3. What Is Visible to Others</h2>
        <p>Your profile name, bio, skills, reputation score, badges, and reviews are visible to other members. Your Skill Passport can be shared publicly if you choose. Your email, authentication data, and private messages are never shown to other members.</p>

        <h2>4. Data Storage and Security</h2>
        <p>Your data is stored in secured databases with row-level security policies. Passwords are hashed by our authentication provider. Sensitive operations are protected by server-side authorization checks. We use HTTPS for all connections.</p>

        <h2>5. Cookies and Local Storage</h2>
        <p>SkillLoop uses local storage to maintain your session and remember preferences like draft onboarding data. We do not use third-party tracking cookies.</p>

        <h2>6. Your Rights</h2>
        <p>You can update your profile information at any time. You can delete your account by contacting support. You can control notification preferences in Settings. You can control the visibility of your public passport.</p>

        <h2>7. Data Retention</h2>
        <p>We retain your data for as long as your account is active. If you delete your account, we remove your personal data within 30 days, except where retention is required by law.</p>

        <h2>8. Children's Privacy</h2>
        <p>SkillLoop is intended for users 16 years and older. We do not knowingly collect data from anyone under 16.</p>

        <h2>9. Changes to This Policy</h2>
        <p>We may update this privacy policy as the platform evolves. Members will be notified of significant changes.</p>

        <h2>10. Contact</h2>
        <p>Questions about your privacy can be directed to the SkillLoop team through the platform's support channels.</p>
      </div>
      <Link className="button button-secondary" to="/settings"><ArrowLeft size={16} /> Back to Settings</Link>
    </section>
  )
}
