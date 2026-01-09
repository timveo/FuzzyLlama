/**
 * TaskItem Component
 *
 * Displays a single task with checkbox, title, and actions.
 * Implements optimistic UI updates for instant feedback.
 *
 * @example
 * <TaskItem
 *   task={task}
 *   onToggle={handleToggle}
 *   onDelete={handleDelete}
 *   onEdit={handleEdit}
 * />
 */

import { useState } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import type { Task } from '../types';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
}

export function TaskItem({ task, onToggle, onDelete, onEdit }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);

  const handleSave = () => {
    if (editTitle.trim()) {
      onEdit(task.id, editTitle.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <li
      className={`
        group flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm
        border border-gray-100 transition-all hover:shadow-md
        ${task.completed ? 'opacity-60' : ''}
      `}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`
          flex-shrink-0 w-6 h-6 rounded-full border-2
          flex items-center justify-center transition-colors
          ${task.completed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-green-400'
          }
        `}
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {task.completed && <Check size={14} />}
      </button>

      {/* Title */}
      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="flex-1 px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      ) : (
        <span
          className={`flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}
          onDoubleClick={() => setIsEditing(true)}
        >
          {task.title}
        </span>
      )}

      {/* Due Date */}
      {task.dueDate && !task.completed && (
        <span className="text-xs text-gray-400">
          {new Date(task.dueDate).toLocaleDateString()}
        </span>
      )}

      {/* Actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              className="p-1 text-green-500 hover:bg-green-50 rounded"
              aria-label="Save"
            >
              <Check size={18} />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-500 hover:bg-gray-50 rounded"
              aria-label="Cancel"
            >
              <X size={18} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
              aria-label="Edit task"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
              aria-label="Delete task"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
