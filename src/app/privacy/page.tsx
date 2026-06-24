import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "OpenLedger privacy policy — we do not collect, sell, or share your personal financial data.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p className="legal-updated">Last updated: June 21, 2026</p>

      <section>
        <h2>Our Commitment to Privacy</h2>
        <p>
          OpenLedger is built from the ground up with privacy as a core principle. Your financial data belongs to you
          and stays under your control. We do not collect, sell, rent, or share your personal information or financial
          transactions with any third party.
        </p>
      </section>

      <section>
        <h2>Local-First Data Model</h2>
        <p>
          In default guest mode, all data — accounts, transactions, budgets, goals, and settings — is stored exclusively
          in your browser&apos;s <code>localStorage</code>. No data is sent to any server. You can export a JSON backup at
          any time from Settings &rarr; Local data &rarr; Export JSON.
        </p>
      </section>

      <section>
        <h2>Optional Cloud Backup</h2>
        <p>
          If you choose to sign in (via Google OAuth), you may optionally back up your ledger to Supabase,
          a hosted PostgreSQL database. This backup is manually triggered — it is never automatic. Only the data you
          explicitly upload is stored. You may delete your cloud backup at any time from the Cloud Backup panel.
        </p>
      </section>

      <section>
        <h2>What We Collect</h2>
        <p>
          <strong>Nothing.</strong> OpenLedger does not include analytics, telemetry, tracking pixels, or crash
          reporting. The app does not make network requests except:
        </p>
        <ul>
          <li>
            <strong>Service worker caching</strong> — standard PWA shell assets are cached for offline use.
          </li>
          <li>
            <strong>Supabase Auth</strong> — if you sign in, authentication requests are sent to the Supabase project.
          </li>
          <li>
            <strong>Cloud Backup</strong> — if you manually trigger a backup, your data is sent to Supabase.
          </li>
        </ul>
      </section>

      <section>
        <h2>Third-Party Services</h2>
        <p>
          OpenLedger is deployed on Vercel. Vercel may process standard HTTP request logs (IP address, user agent,
          request path) as part of their hosting service. We do not access or analyse these logs. See{" "}
          <a href="https://vercel.com/legal/privacy" target="_blank" rel="noopener noreferrer">
            Vercel&apos;s Privacy Policy
          </a>{" "}
          for details.
        </p>
        <p>
          Supabase is used as an optional cloud backup provider. If you sign in and use backup features, data is stored
          on Supabase infrastructure. See{" "}
          <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">
            Supabase&apos;s Privacy Policy
          </a>{" "}
          for details.
        </p>
      </section>

      <section>
        <h2>Data Deletion</h2>
        <ul>
          <li>
            <strong>Guest mode:</strong> Clear your browser data or use the &ldquo;Clear local data&rdquo; button in
            Settings. This removes all locally stored data immediately.
          </li>
          <li>
            <strong>Cloud backup:</strong> The Cloud Backup panel includes a delete option. All remote data for your
            account is removed on confirmation. You may also email{" "}
            <a href="mailto:sparshsam@gmail.com">sparshsam@gmail.com</a> to request deletion.
          </li>
        </ul>
      </section>

      <section>
        <h2>Data Export</h2>
        <p>
          You can export your full ledger as a JSON file at any time from the Settings panel. This export includes all
          accounts, transactions, budgets, goals, and import metadata. No additional requests are necessary.
        </p>
      </section>

      <section>
        <h2>Changes to This Policy</h2>
        <p>
          If this policy changes materially, the &ldquo;Last updated&rdquo; date at the top will be revised. We will
          never reduce your privacy rights without notice.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          For privacy questions or data deletion requests, email{" "}
          <a href="mailto:sparshsam@gmail.com">sparshsam@gmail.com</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
