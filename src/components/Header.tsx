interface HeaderProps {
  onFaqClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export function Header({ onFaqClick }: HeaderProps) {
  return (
    <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            NG
          </div>
          <h1 className="text-xl font-semibold text-white">
            Noise<span className="text-indigo-400">Gone</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/30 border border-green-700/50 text-green-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            100% On-Device
          </span>
          <a
            href="#faq"
            onClick={onFaqClick}
            className="text-gray-400 hover:text-gray-200 text-sm transition-colors"
          >
            FAQ
          </a>
        </div>
      </div>
    </header>
  )
}

