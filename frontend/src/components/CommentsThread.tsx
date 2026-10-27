import React, { useState } from 'react';
import { Comment } from '../types';
import { MessageSquare, Send, CornerDownRight, User } from 'lucide-react';

interface CommentsThreadProps {
  comments: Comment[];
  onAddComment: (body: string, parentId?: number) => Promise<void>;
}

export const CommentsThread: React.FC<CommentsThreadProps> = ({ comments, onAddComment }) => {
  const [commentText, setCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddComment(commentText.trim());
      setCommentText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (parentId: number) => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddComment(replyText.trim(), parentId);
      setReplyText('');
      setReplyingToId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
        <MessageSquare className="w-4 h-4 text-slate-600" />
        <h4 className="text-sm font-bold text-slate-800">Governance & Review Comments ({comments.length})</h4>
      </div>

      {/* List comments */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No reviewer comments yet. Add guidance below.</p>
        ) : (
          comments.map((comm) => (
            <div key={comm.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-800">{comm.author_name}</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {comm.author_role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-700">{comm.body}</p>

              {/* Reply Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setReplyingToId(replyingToId === comm.id ? null : comm.id)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <CornerDownRight className="w-3 h-3" /> Reply
                </button>
              </div>

              {/* Nested replies if any */}
              {comm.replies && comm.replies.map(r => (
                <div key={r.id} className="ml-4 pl-3 border-l-2 border-indigo-200 bg-white p-2 rounded text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800">{r.author_name} ({r.author_role})</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-700">{r.body}</p>
                </div>
              ))}

              {/* Inline reply box */}
              {replyingToId === comm.id && (
                <div className="mt-2 pt-2 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 text-xs p-1.5 rounded border border-slate-300 bg-white"
                  />
                  <button
                    onClick={() => handleReplySubmit(comm.id)}
                    disabled={isSubmitting}
                    className="px-2.5 py-1 bg-indigo-600 text-white rounded text-xs font-semibold"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Main Comment Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Leave a review comment or guideline advice..."
          className="flex-1 text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={isSubmitting || !commentText.trim()}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 disabled:opacity-50 transition"
        >
          <Send className="w-3.5 h-3.5" /> Post
        </button>
      </form>
    </div>
  );
};
