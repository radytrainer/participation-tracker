import { useEffect, useState } from 'react'
import { Download, X, GraduationCap } from 'lucide-react'

export default function InstallPWA() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem('pwa-dismissed')) return

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
    const standalone = window.navigator.standalone === true
    if (ios && !standalone) {
      setIsIOS(true)
      setShow(true)
      return
    }

    function onPrompt(e) {
      e.preventDefault()
      setPrompt(e)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    sessionStorage.setItem('pwa-dismissed', '1')
    setShow(false)
    setDismissed(true)
  }

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setShow(false)
  }

  if (!show || dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3 animate-slide-up">
        {/* App icon */}
        <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary-600 flex items-center justify-center">
          <GraduationCap className="h-7 w-7 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">Install ClassTracker</p>
          {isIOS ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Tap <span className="font-medium">Share</span> then{' '}
              <span className="font-medium">Add to Home Screen</span> to install.
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Add to your home screen for quick access, even offline.
            </p>
          )}
          {!isIOS && (
            <button
              onClick={install}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium px-3 py-1.5 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Install app
            </button>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="flex-shrink-0 rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
