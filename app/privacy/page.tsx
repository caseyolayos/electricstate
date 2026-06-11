export const metadata = {
  title: 'Privacy Policy — Electric State',
  description: 'Privacy Policy for the Electric State app.',
}

export default function PrivacyPage() {
  const updated = 'May 20, 2026'

  return (
    <div className="max-w-2xl mx-auto px-5 py-12 text-white">
      <h1 className="text-3xl font-black mb-2">Privacy Policy</h1>
      <p className="text-white/40 text-sm mb-10">Last updated: {updated}</p>

      <div className="space-y-8 text-white/70 text-sm leading-relaxed">

        <section>
          <h2 className="text-white font-bold text-base mb-2">1. Who We Are</h2>
          <p>Electric State (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the Electric State app and website at electricstate.app. We build tools for electronic music fans to discover festivals, follow artists, and track their experiences.</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">2. Information We Collect</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li><span className="text-white font-medium">Account info:</span> Email address and password when you sign up.</li>
            <li><span className="text-white font-medium">Profile info:</span> Username, display name, bio, and avatar you choose to add.</li>
            <li><span className="text-white font-medium">Activity:</span> Festivals you save, artists you follow, stamps you earn, and XP activity.</li>
            <li><span className="text-white font-medium">Location:</span> Approximate location (if you grant permission) to surface nearby festivals and enable geo-based notifications.</li>
            <li><span className="text-white font-medium">Device token:</span> Push notification token to deliver alerts about artists and events you follow.</li>
            <li><span className="text-white font-medium">Usage data:</span> Standard server logs including IP address, browser/device type, and pages visited.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">3. How We Use Your Information</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li>To operate your account and provide app features.</li>
            <li>To send push notifications about artists and festivals you follow.</li>
            <li>To show your public passport profile to other users (if you have one).</li>
            <li>To improve the app through aggregate usage analytics.</li>
            <li>To respond to support requests.</li>
          </ul>
          <p className="mt-3">We do not sell your personal data to third parties.</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">4. Data Sharing</h2>
          <p className="mb-2">We use the following third-party services to operate the app:</p>
          <ul className="space-y-2 list-disc list-inside">
            <li><span className="text-white font-medium">Supabase</span> — database and authentication hosting.</li>
            <li><span className="text-white font-medium">Firebase (Google)</span> — push notification delivery.</li>
            <li><span className="text-white font-medium">Vercel</span> — web hosting and infrastructure.</li>
            <li><span className="text-white font-medium">Stripe</span> — payment processing (for ticket purchases, if applicable).</li>
            <li><span className="text-white font-medium">Spotify</span> — artist metadata and images (read-only, no account access).</li>
          </ul>
          <p className="mt-3">Each of these services has its own privacy policy. We only share the minimum data necessary for them to operate.</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">5. Location Data</h2>
          <p>Location access is optional. If granted, we use your approximate location to surface nearby festivals and send geo-relevant notifications. We do not share your precise location with third parties or store it beyond what is needed for notification delivery.</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">6. Push Notifications</h2>
          <p>If you enable push notifications, we store your device token to deliver alerts. You can disable notifications at any time in your device settings. Disabling does not delete your account.</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">7. Data Retention</h2>
          <p>We retain your data for as long as your account is active. If you delete your account, we permanently delete your profile, activity, and associated data within 30 days. Some anonymized aggregate data may be retained for analytics.</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">8. Your Rights</h2>
          <p className="mb-2">You can at any time:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Update or delete your profile information in the app.</li>
            <li>Delete your account at <a href="/account-deletion" className="text-purple-400 underline">electricstate.app/account-deletion</a>.</li>
            <li>Request a copy of your data by contacting us.</li>
            <li>Opt out of push notifications in your device settings.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">9. Children&apos;s Privacy</h2>
          <p>Electric State is not directed at children under 13. We do not knowingly collect data from anyone under 13. If you believe a child has provided us information, please contact us and we will delete it.</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">10. Changes to This Policy</h2>
          <p>We may update this policy occasionally. We&apos;ll update the &ldquo;Last updated&rdquo; date at the top. Continued use of the app after changes constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-white font-bold text-base mb-2">11. Contact</h2>
          <p>Questions? Email us at <a href="mailto:casey@electricstate.app" className="text-purple-400 underline">casey@electricstate.app</a></p>
        </section>

      </div>
    </div>
  )
}
