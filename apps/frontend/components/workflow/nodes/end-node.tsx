import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Flag } from 'lucide-react';
import { clsx } from 'clsx';

export const EndNode = memo(({ data, selected }: any) => {
  return (
    <div className={clsx(
      "px-4 py-3 shadow-md rounded-xl bg-white border-2 flex items-center gap-3 min-w-[150px]",
      selected ? "border-slate-800 shadow-slate-200" : "border-slate-200"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-800 border-2 border-white" />
      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
        <Flag className="w-4 h-4" />
      </div>
      <div>
        <div className="text-sm font-bold text-slate-800">End</div>
        <div className="text-xs text-slate-500">{data.config?.status || "Completed"}</div>
      </div>
    </div>
  );
});

EndNode.displayName = 'EndNode';
