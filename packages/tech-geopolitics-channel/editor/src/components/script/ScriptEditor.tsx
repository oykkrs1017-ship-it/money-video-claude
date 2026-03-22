import { useState, useEffect } from 'react';
import type { ScriptLine, Metadata } from '../../types';

interface ScriptEditorProps {
  line: ScriptLine;
  metadata: Metadata;
  isNew: boolean;
  onSave: (data: Partial<ScriptLine>) => Promise<void>;
  onClose: () => void;
}

export function ScriptEditor({
  line,
  metadata,
  isNew,
  onSave,
  onClose,
}: ScriptEditorProps) {
  const [formData, setFormData] = useState<ScriptLine>(line);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(line);
  }, [line]);

  const handleChange = (field: keyof ScriptLine, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVisualChange = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      visual: {
        ...prev.visual,
        type: prev.visual?.type || 'none',
        [field]: value,
      },
    }));
  };

  const handleSeChange = (field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      se: {
        ...prev.se,
        src: prev.se?.src || '',
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const emotions = metadata.emotions[formData.character] || ['normal'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {isNew ? 'Add Script Line' : `Edit Line #${line.id}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Character */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Character
            </label>
            <select
              value={formData.character}
              onChange={(e) => handleChange('character', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {metadata.characters.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name} ({char.id})
                </option>
              ))}
            </select>
          </div>

          {/* Text (for voice) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text (Voice)
            </label>
            <textarea
              value={formData.text}
              onChange={(e) => handleChange('text', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Voice generation text (use katakana for English)"
            />
          </div>

          {/* Display Text (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Text (optional)
            </label>
            <textarea
              value={formData.displayText || ''}
              onChange={(e) => handleChange('displayText', e.target.value || undefined)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Subtitle text (if different from voice)"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Scene */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scene
              </label>
              <input
                type="number"
                value={formData.scene}
                onChange={(e) => handleChange('scene', parseInt(e.target.value, 10))}
                min={1}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Emotion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emotion
              </label>
              <select
                value={formData.emotion || 'normal'}
                onChange={(e) => handleChange('emotion', e.target.value === 'normal' ? undefined : e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {emotions.map((emotion) => (
                  <option key={emotion} value={emotion}>
                    {emotion}
                  </option>
                ))}
              </select>
            </div>

            {/* Pause After */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pause After (frames)
              </label>
              <input
                type="number"
                value={formData.pauseAfter}
                onChange={(e) => handleChange('pauseAfter', parseInt(e.target.value, 10))}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Visual Content */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Visual Content</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  value={formData.visual?.type || 'none'}
                  onChange={(e) => handleVisualChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {metadata.visualTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Animation</label>
                <select
                  value={formData.visual?.animation || 'fadeIn'}
                  onChange={(e) => handleVisualChange('animation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {metadata.animations.map((anim) => (
                    <option key={anim} value={anim}>
                      {anim}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.visual?.type === 'image' && (
              <div className="mt-2">
                <label className="block text-xs text-gray-500 mb-1">Image Source</label>
                <input
                  type="text"
                  value={formData.visual?.src || ''}
                  onChange={(e) => handleVisualChange('src', e.target.value)}
                  placeholder="filename.png (in public/content/)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}

            {formData.visual?.type === 'text' && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Visual Text</label>
                  <input
                    type="text"
                    value={formData.visual?.text || ''}
                    onChange={(e) => handleVisualChange('text', e.target.value)}
                    placeholder="Text to display"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Font Size</label>
                    <input
                      type="number"
                      value={formData.visual?.fontSize || 72}
                      onChange={(e) => handleVisualChange('fontSize', parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Color</label>
                    <input
                      type="color"
                      value={formData.visual?.color || '#ffffff'}
                      onChange={(e) => handleVisualChange('color', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sound Effect */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Sound Effect</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">SE Source</label>
                <input
                  type="text"
                  value={formData.se?.src || ''}
                  onChange={(e) => handleSeChange('src', e.target.value)}
                  placeholder="filename.mp3 (in public/se/)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Volume (0-1)</label>
                <input
                  type="number"
                  value={formData.se?.volume || 1}
                  onChange={(e) => handleSeChange('volume', parseFloat(e.target.value))}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
