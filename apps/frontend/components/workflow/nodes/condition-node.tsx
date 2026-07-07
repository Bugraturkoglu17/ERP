import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Split } from 'lucide-react';
import { clsx } from 'clsx';

export const ConditionNode = memo(({ data, selected }: any) => {
  return (
    <div className={clsx(
      "px-4 py-3 shadow-md rounded-xl bg-white border-2 flex flex-col items-center gap-2 min-w-[180px]",
      selected ? "border-amber-500 shadow-amber-100" : "border-slate-200"
    )}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400 border-2 border-white" />
      
      <div className="flex items-center gap-3 w-full">
        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
          <Split className="w-4 h-4" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-800">{data.name || "Condition"}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {data.config?.field ? `${data.config.field} ${data.config.operator} ${data.config.value}` : "Not configured"}
          </div>
        </div>
      </div>
      
      <div className="w-full flex justify-between px-2 mt-2 pt-2 border-t border-slate-100">
        <span className="text-[10px] font-bold text-green-600">TRUE</span>
        <span className="text-[10px] font-bold text-red-600">FALSE</span>
      </div>

      {/* True Branch */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="true"
        style={{ left: '25%' }}
        className="w-3 h-3 bg-green-500 border-2 border-white" 
      />
      {/* False Branch */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="false"
        style={{ left: '75%' }}
        className="w-3 h-3 bg-red-500 border-2 border-white" 
      />
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
