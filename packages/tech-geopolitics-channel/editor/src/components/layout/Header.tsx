interface HeaderProps {
  currentTab: 'script' | 'settings';
  onTabChange: (tab: 'script' | 'settings') => void;
}

export function Header({ currentTab, onTabChange }: HeaderProps) {
  return (
    <header className="bg-gray-800 text-white px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Script Editor</h1>
        <span className="text-gray-400 text-sm">Remotion + VOICEVOX</span>
      </div>
      <nav className="flex gap-2">
        <button
          onClick={() => onTabChange('script')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentTab === 'script'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Script
        </button>
        <button
          onClick={() => onTabChange('settings')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentTab === 'settings'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Settings
        </button>
      </nav>
    </header>
  );
}
