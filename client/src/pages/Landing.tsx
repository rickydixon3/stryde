import { LogoMark } from '../components/Logo'

const VALUE_PROPS = [
  {
    title: 'Grade-adjusted efficiency',
    body: 'Grade-adjusted pace normalized against your own heart-rate reserve, computed across the whole run, not a rough velocity-to-heart-rate ratio.',
  },
  {
    title: 'Cardiac drift, per run',
    body: 'Also known as aerobic decoupling. See exactly how your cardiovascular efficiency holds up from the first half of a run to the last, so you catch fatigue before it shows up in your times.',
  },
  {
    title: 'Personalized, not generic',
    body: 'Every threshold, effort classification, training load, session spikes, is built from your own historical data, not a fixed number that treats every runner the same.',
  },
  {
    title: 'Backed by real science',
    body: 'Every metric traces back to a real physiological signal: heart rate, pace, and effort, measured and normalized to your own body, not an arbitrary score.',
  },
]

export default function Landing() {
  const handleConnect = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/strava`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">

      {/* Nav */}
      <div className="max-w-5xl mx-auto px-6 py-6 flex items-center gap-2">
        <LogoMark size={28} />
        <span className="font-medium text-[#ededed]">Stryde</span>
      </div>

      {/* Hero -- plain background, no overlay, own clean space */}
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-16 text-center">
        <h1 className="text-3xl sm:text-4xl font-medium text-[#ededed] mb-4 leading-tight">
        See how your running efficiency is trending
        <br />
        Connect with Strava in under a minute.
        </h1>
        <p className="text-base text-[#888888] mb-10 max-w-xl mx-auto">
        Efficiency factor, cardiac drift, and training load. 
        The signals that show what's actually happening in your training
        </p>

        <button onClick={handleConnect} className="inline-block">
          <img
            src="/strava-connect-button.svg"
            alt="Connect with Strava"
            className="h-12"
          />
        </button>

        <p className="text-xs text-[#555555] mt-4">
          By connecting, you agree to our{' '}
          <a href="/privacy" className="text-[#378ADD] hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>

      {/* Dashboard preview -- own contained card, full clarity, no overlay */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <img
          src="/dashboard-preview.png"
          alt="Stryde dashboard showing efficiency factor trend, cardiac drift, training load, and session spike signals"
          className="w-full rounded-xl border border-[#1f1f1f]"
        />
      </div>

      {/* Value props */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 gap-6">
          {VALUE_PROPS.map((prop) => (
            <div
              key={prop.title}
              className="border border-[#1f1f1f] rounded-lg p-6 bg-[#111111]"
            >
              <h3 className="text-sm font-medium text-[#ededed] mb-2">
                {prop.title}
              </h3>
              <p className="text-sm text-[#888888] leading-relaxed">
                {prop.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1f1f1f]">
        <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={18} />
            <span className="text-xs text-[#555555]">Stryde</span>
          </div>
          <a href="/privacy" className="text-xs text-[#555555] hover:text-[#888888] transition-colors">
            Privacy Policy
          </a>
        </div>
      </div>

    </div>
  )
}