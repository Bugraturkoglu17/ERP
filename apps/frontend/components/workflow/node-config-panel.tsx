import React, { useEffect, useState } from 'react';
import { Node } from '@xyflow/react';
import { Settings, X, Save } from 'lucide-react';
import { useWorkflowActions } from '@/hooks/use-workflow-api';
import { clsx } from 'clsx';

interface NodeConfigPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ selectedNode, onUpdateNode, onClose }: NodeConfigPanelProps) {
  const { actions } = useWorkflowActions();
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (selectedNode) {
      setFormData({
        name: selectedNode.data?.name || '',
        action_type: selectedNode.data?.action_type || '',
        config: selectedNode.data?.config || {},
      });
    }
  }, [selectedNode]);

  if (!selectedNode) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleConfigChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      config: { ...prev.config, [field]: value },
    }));
  };

  const handleSave = () => {
    onUpdateNode(selectedNode.id, {
      ...selectedNode.data,
      ...formData,
    });
  };

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl flex flex-col z-10 animate-in slide-in-from-right-10">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Settings className="w-4 h-4 text-slate-500" />
          Configure {selectedNode.type}
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-5">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Node Name</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {selectedNode.type === 'start' && (
          <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
            Start node trigger type is set during workflow creation.
          </div>
        )}

        {selectedNode.type === 'action' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Action Type</label>
              <select
                value={formData.action_type || ''}
                onChange={(e) => handleChange('action_type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select Action...</option>
                {actions.map((act) => (
                  <option key={act.action_type} value={act.action_type}>
                    {act.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Simple raw JSON editor for config since action types vary wildly */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Configuration (JSON)</label>
              <textarea
                rows={8}
                value={JSON.stringify(formData.config || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleChange('config', parsed);
                  } catch (err) {
                    // ignore invalid JSON while typing
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
              />
            </div>
          </>
        )}

        {selectedNode.type === 'condition' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Field to Check</label>
              <input
                type="text"
                placeholder="e.g. data.amount"
                value={formData.config?.field || ''}
                onChange={(e) => handleConfigChange('field', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Operator</label>
              <select
                value={formData.config?.operator || '=='}
                onChange={(e) => handleConfigChange('operator', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="==">Equals (==)</option>
                <option value="!=">Not Equals (!=)</option>
                <option value=">">Greater Than (&gt;)</option>
                <option value="<">Less Than (&lt;)</option>
                <option value=">=">Greater or Equal (&gt;=)</option>
                <option value="<=">Less or Equal (&lt;=)</option>
                <option value="contains">Contains</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Value</label>
              <input
                type="text"
                value={formData.config?.value || ''}
                onChange={(e) => handleConfigChange('value', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        )}

        {selectedNode.type === 'end' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">Final Status</label>
            <select
              value={formData.config?.status || 'completed'}
              onChange={(e) => handleConfigChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="completed">Completed (Success)</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          Apply Changes
        </button>
      </div>
    </div>
  );
}
