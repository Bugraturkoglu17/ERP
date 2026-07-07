import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';
import { clsx } from 'clsx';

export const StartNode = memo(({ data, selected }: any) => {
  return (
    <div className={clsx(
      "px-4 py-3 shadow-md rounded-xl bg-white border-2 flex items-center gap-3 min-w-[180px]",
      selected ? "border-green-500 shadow-green-100" : "border-slate-200"
    )}>
      <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
        <Play className="w-4 h-4 ml-0.5" />
      </div>
      <div>
        <div className="text-sm font-bold text-slate-800">Start</div>
        <div className="text-xs text-slate-500">{data.config?.trigger_type || "Event"}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500 border-2 border-white" />
    </div>
  );
});

StartNode.displayName = 'StartNode';
