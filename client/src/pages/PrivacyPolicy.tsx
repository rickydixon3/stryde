import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-[#888888] hover:text-[#ededed] transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <h1 className="text-lg font-medium text-[#ededed] mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-[#555555] mb-8">
        Last updated: July 2026
      </p>

      <div className="flex flex-col gap-6 text-sm text-[#888888] leading-relaxed">
        <section>
          <h2 className="text-[#ededed] font-medium mb-2">
            What we collect
          </h2>
          <p>
            When you connect your Strava account, Stryde collects your basic
            profile information (name and profile photo), your running
            activities (distance, pace, heart rate, elevation, and duration),
            and heart rate stream data for runs within the last 60 days,
            which is processed to compute your training metrics and is not
            stored. We also ask you for your resting and max heart rate,
            which you provide directly during setup.
          </p>
        </section>

        <section>
          <h2 className="text-[#ededed] font-medium mb-2">
            How we use it
          </h2>
          <p>
            This data is used solely to compute training metrics for your own
            account — efficiency factor, cardiac drift, training load (using
            a heart-rate-based training-stress formula called TRIMP), and
            related signals shown on your dashboard. We do not sell your data,
            share it with advertisers, or use it to train machine learning
            models. Your data is never visible to other Stryde users.
          </p>
        </section>

        <section>
          <h2 className="text-[#ededed] font-medium mb-2">
            How long we keep it
          </h2>
          <p>
            Detailed stream data (heart rate, pace, elevation per second) is
            processed to compute your training metrics and discarded
            immediately afterward — it is not stored. Activity summaries
            (distance, date, overall effort) and computed training metrics
            are retained for as long as your account remains connected, so
            your longer-term trends stay visible.
          </p>
        </section>

        <section>
          <h2 className="text-[#ededed] font-medium mb-2">
            How we protect it
          </h2>
          <p>
            Your data is stored in an access-controlled database and is only
            accessible from your own authenticated account. We don't share
            access with anyone outside of the infrastructure providers (such as
            our hosting and database providers) needed to run Stryde itself,
            and those providers don't use your data for any purpose beyond
            that.
          </p>
        </section>

        <section>
          <h2 className="text-[#ededed] font-medium mb-2">
            Your controls
          </h2>
          <p>
            You can disconnect Stryde from your Strava account at any time from
            Settings — this revokes our access immediately while keeping your
            existing training history intact. You can also permanently delete
            your account and all associated data from the same page; this
            cannot be undone, and we'll confirm once it's complete.
          </p>
        </section>

        <section>
          <h2 className="text-[#ededed] font-medium mb-2">
            Strava
          </h2>
          <p>
            Stryde is not affiliated with Strava. Your use of Strava itself is
            governed by{' '}
            <a
              href="https://www.strava.com/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#378ADD] hover:underline"
            >
              Strava&apos;s own privacy policy
            </a>
            . You can also manage or revoke Stryde&apos;s access directly from{' '}
            <a
              href="https://www.strava.com/settings/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#378ADD] hover:underline"
            >
              your Strava account settings
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-[#ededed] font-medium mb-2">
            Changes to this policy
          </h2>
          <p>
            If this policy changes, we'll update the date at the top of this
            page. If a change meaningfully affects how your data is used, we'll
            do our best to let you know directly.
          </p>
        </section>

        <section>
          <h2 className="text-[#ededed] font-medium mb-2">
            Contact
          </h2>
          <p>
            Questions about this policy or how your data is handled? Reach out
            at{' '}
            <a
              href="mailto:stryde.application@gmail.com"
              className="text-[#378ADD] hover:underline"
            >
              stryde.application@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}