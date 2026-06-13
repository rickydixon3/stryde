import { useEffect, useState } from 'react'

function App() {
  const [serverStatus, setServerStatus] = useState<string>('checking...')

  useEffect(() => {
    fetch('https://stryde-production-2f0b.up.railway.app/health')
      .then(res => res.json())
      .then(data => setServerStatus(data.message))
      .catch(() => setServerStatus('could not reach server'))
  }, [])

  return (
    <div>
      <h1>Stryde</h1>
      <p>Server status: {serverStatus}</p>
    </div>
  )
}

export default App
