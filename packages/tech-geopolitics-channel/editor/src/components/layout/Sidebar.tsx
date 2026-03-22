interface SidebarProps {
  onPreview: () => void;
  onGenerateVoices: () => void;
  onBuildVideo: () => void;
  isGenerating?: boolean;
}

export function Sidebar({
  onPreview,
  onGenerateVoices,
  onBuildVideo,
  isGenerating = false,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-100 border-r border-gray-200 p-4 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Actions</h2>
        <div className="flex flex-col gap-2">
          <button
            onClick={onPreview}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Open Preview
          </button>
          <button
            onClick={onGenerateVoices}
            disabled={isGenerating}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Generating...' : 'Generate Voices'}
          </button>
          <button
            onClick={onBuildVideo}
            className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Build Video
          </button>
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Links</h2>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500"
            >
              Remotion Studio
            </a>
          </li>
        </ul>
      </div>

      <div className="mt-auto text-xs text-gray-400">
        <p>Editor: localhost:3001</p>
        <p>API: localhost:3002</p>
        <p>Remotion: localhost:3000</p>
      </div>
    </aside>
  );
}
