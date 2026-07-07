import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Settings, Zap } from 'lucide-react';
import { clsx } from 'clsx';

export const ActionNode = memo(({ data, selected }: any) => {
  return (
    <div className={clsx(
      "px-4 py-3 shadow-md rounded-xl bg-white border-2 flex items-center gap-3 min-w-[180px]",
      selected ? "border-blue-500 shadow-blue-100" : "border-slate-200"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400 border-2 border-white" />
      
      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
        <Zap className="w-4 h-4" />
      </div>
      <div>
        <div className="text-sm font-bold text-slate-800">{data.name || "Action"}</div>
        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
          <Settings className="w-3 h-3" />
          {data.action_type || "No action selected"}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400 border-2 border-white" />
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
