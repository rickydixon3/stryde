export default function Landing() {
  const handleConnect = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/strava`
  }
  
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-medium text-[#ededed] mb-3">Stryde</h1>
          <p className="text-base text-[#888888] mb-8">
            In Development
          </p>
          <button
            onClick={handleConnect}
            className="bg-[#FC4C02] hover:bg-[#e34402] text-white text-sm font-medium px-6 py-3 rounded-md transition-colors"
          >
            Connect with Strava
          </button>

          <p className="text-xs text-[#555555] mt-4">
          By connecting, you agree to our{' '}
          <a href="/privacy" className="text-[#378ADD] hover:underline">
            Privacy Policy
          </a>
        </p>
        </div>
      </div>
    )
  }