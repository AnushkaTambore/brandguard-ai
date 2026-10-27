import React from 'react';
import { Finding } from '../types';

interface TextHighlighterProps {
  text: string;
  findings: Finding[];
  selectedFindingId: number | null;
  onSelectFinding: (findingId: number) => void;
}

export const TextHighlighter: React.FC<TextHighlighterProps> = ({
  text,
  findings,
  selectedFindingId,
  onSelectFinding
}) => {
  if (!findings || findings.length === 0) {
    return <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-800">{text}</div>;
  }

  // Filter only active or pending findings that have valid spans in text
  const validFindings = findings
    .filter(f => f.author_action === 'pending' || f.id === selectedFindingId)
    .sort((a, b) => a.start_char - b.start_char);

  // Build segments
  const segments: React.ReactNode[] = [];
  let currentIndex = 0;

  for (const f of validFindings) {
    // If overlap or out of bounds, skip or clip
    if (f.start_char < currentIndex) continue;
    if (f.start_char > text.length) break;

    // Normal text before finding
    if (f.start_char > currentIndex) {
      segments.push(
        <span key={`text-${currentIndex}`}>
          {text.substring(currentIndex, f.start_char)}
        </span>
      );
    }

    // Highlighted finding text
    const end = Math.min(f.end_char, text.length);
    const highlightedSegment = text.substring(f.start_char, end);
    const isSelected = f.id === selectedFindingId;

    let colorClass = 'highlight-medium';
    if (f.severity === 'high') colorClass = 'highlight-high';
    if (f.severity === 'low') colorClass = 'highlight-low';

    segments.push(
      <mark
        key={`finding-${f.id}`}
        onClick={() => onSelectFinding(f.id)}
        className={`${colorClass} ${isSelected ? 'active ring-2 ring-indigo-500 rounded' : 'rounded'} px-0.5`}
        title={`[${f.severity.toUpperCase()}] ${f.rule_id}: ${f.reason}`}
      >
        {highlightedSegment}
      </mark>
    );

    currentIndex = end;
  }

  // Remaining text
  if (currentIndex < text.length) {
    segments.push(
      <span key={`text-${currentIndex}`}>
        {text.substring(currentIndex)}
      </span>
    );
  }

  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-800 select-text">
      {segments}
    </div>
  );
};
