import { useState } from 'react';
import type { ScriptLine, Metadata } from '../../types';
import { ScriptRow } from './ScriptRow';
import { ScriptEditor } from './ScriptEditor';

interface ScriptTableProps {
  script: ScriptLine[];
  metadata: Metadata;
  onUpdate: (id: number, data: Partial<ScriptLine>) => Promise<ScriptLine>;
  onCreate: (data: Omit<ScriptLine, 'id'>) => Promise<ScriptLine>;
  onDelete: (id: number) => Promise<void>;
}

export function ScriptTable({
  script,
  metadata,
  onUpdate,
  onCreate,
  onDelete,
}: ScriptTableProps) {
  const [editingLine, setEditingLine] = useState<ScriptLine | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleEdit = (line: ScriptLine) => {
    setEditingLine(line);
    setIsCreating(false);
  };

  const handleCreate = () => {
    const lastLine = script[script.length - 1];
    const newLine: ScriptLine = {
      id: 0, // Will be assigned by server
      character: metadata.characters[0]?.id || 'zundamon',
      text: '',
      scene: lastLine?.scene || 1,
      voiceFile: '',
      durationInFrames: 60,
      pauseAfter: 15,
    };
    setEditingLine(newLine);
    setIsCreating(true);
  };

  const handleSave = async (data: Partial<ScriptLine>) => {
    if (!editingLine) return;

    try {
      if (isCreating) {
        await onCreate(data as Omit<ScriptLine, 'id'>);
      } else {
        await onUpdate(editingLine.id, data);
      }
      setEditingLine(null);
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this line?')) return;
    try {
      await onDelete(id);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const handleClose = () => {
    setEditingLine(null);
    setIsCreating(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Script</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          + Add Line
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16"></th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Char</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Text</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-14">Dur</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-14">Pause</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {script.map((line) => (
              <ScriptRow
                key={line.id}
                line={line}
                characters={metadata.characters}
                onEdit={() => handleEdit(line)}
                onDelete={() => handleDelete(line.id)}
                onQuickUpdate={(field, value) => onUpdate(line.id, { [field]: value })}
              />
            ))}
          </tbody>
        </table>

        {script.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No script lines yet. Click "Add Line" to create one.
          </div>
        )}
      </div>

      {editingLine && (
        <ScriptEditor
          line={editingLine}
          metadata={metadata}
          isNew={isCreating}
          onSave={handleSave}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
