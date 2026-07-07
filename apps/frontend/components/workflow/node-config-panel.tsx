import React, { useEffect, useMemo, useState } from 'react';
import { Node } from '@xyflow/react';
import { Settings, X, Save, Code, FormInput, ChevronRight } from 'lucide-react';
import { useWorkflowActions } from '@/hooks/use-workflow-api';
import { clsx } from 'clsx';

interface NodeConfigPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: any) => void;
  onClose: () => void;
}

// ─── JSON Schema field types renderer ───────────────────────────────────────

type SchemaProperty = {
  type: string;
  title?: string;
  enum?: string[];
  'x-display'?: string;
};

type JsonSchema = {
  type: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
};

function SchemaForm({
  schema,
  values,
  onChange,
}: {
  schema: JsonSchema;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const props = schema.properties || {};

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(props).map(([key, prop]) => {
        const isRequired = schema.required?.includes(key);
        const label = prop.title || key;
        const value = values[key] ?? '';

        const labelEl = (
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        );

        const inputCls =
          'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white';

        if (prop.enum && prop.enum.length > 0) {
          return (
            <div key={key}>
              {labelEl}
              <select
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                className={inputCls}
              >
                <option value="">Seçiniz...</option>
                {prop.enum.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (prop.type === 'boolean') {
          return (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{label}</span>
              <button
                type="button"
                onClick={() => onChange(key, !value)}
                className={clsx(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  value ? 'bg-violet-600' : 'bg-slate-300'
                )}
              >
                <span
                  className={clsx(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                    value ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          );
        }

        if (prop['x-display'] === 'textarea') {
          return (
            <div key={key}>
              {labelEl}
              <textarea
                rows={4}
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                className={clsx(inputCls, 'resize-none')}
              />
            </div>
          );
        }

        if (prop.type === 'number') {
          return (
            <div key={key}>
              {labelEl}
              <input
                type="number"
                value={value}
                onChange={(e) => onChange(key, e.target.valueAsNumber)}
                className={inputCls}
              />
            </div>
          );
        }

        // default: string
        return (
          <div key={key}>
            {labelEl}
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(key, e.target.value)}
              className={inputCls}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function NodeConfigPanel({ selectedNode, onUpdateNode, onClose }: NodeConfigPanelProps) {
  const { actions } = useWorkflowActions();
  const [formData, setFormData] = useState<any>({});
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  useEffect(() => {
    if (selectedNode) {
      const data = {
        name: selectedNode.data?.name || '',
        action_type: selectedNode.data?.action_type || '',
        config: selectedNode.data?.config || {},
      };
      setFormData(data);
      setJsonText(JSON.stringify(data.config || {}, null, 2));
      setJsonError('');
    }
  }, [selectedNode]);

  const selectedAction = useMemo(
    () => actions.find((a) => a.action_type === formData.action_type),
    [actions, formData.action_type]
  );

  const parsedSchema: JsonSchema | null = useMemo(() => {
    if (!selectedAction?.config_schema) return null;
    try {
      return JSON.parse(selectedAction.config_schema);
    } catch {
      return null;
    }
  }, [selectedAction]);

  if (!selectedNode) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleConfigChange = (field: string, value: any) => {
    const newConfig = { ...(formData.config || {}), [field]: value };
    setFormData((prev: any) => ({ ...prev, config: newConfig }));
    setJsonText(JSON.stringify(newConfig, null, 2));
  };

  const handleActionTypeChange = (actionType: string) => {
    setFormData((prev: any) => ({ ...prev, action_type: actionType, config: {} }));
    setJsonText('{}');
    setJsonError('');
  };

  const handleJsonChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setFormData((prev: any) => ({ ...prev, config: parsed }));
      setJsonError('');
    } catch {
      setJsonError('Geçersiz JSON');
    }
  };

  const handleSave = () => {
    onUpdateNode(selectedNode.id, {
      ...selectedNode.data,
      ...formData,
    });
  };

  const inputCls =
    'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white';

  return (
    <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl flex flex-col z-10">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2 text-slate-800 font-semibold">
          <Settings className="w-4 h-4 text-slate-500" />
          Configure <span className="capitalize">{selectedNode.type}</span>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-5">
        {/* Node Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
            Node Name
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            className={inputCls}
          />
        </div>

        {/* Start Node */}
        {selectedNode.type === 'start' && (
          <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100">
            Start node trigger type is set during workflow creation.
          </div>
        )}

        {/* Action Node */}
        {selectedNode.type === 'action' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Action Type
              </label>
              <select
                value={formData.action_type || ''}
                onChange={(e) => handleActionTypeChange(e.target.value)}
                className={inputCls}
              >
                <option value="">Select Action...</option>
                {actions.map((act) => (
                  <option key={act.action_type} value={act.action_type}>
                    {act.label_tr}
                  </option>
                ))}
              </select>
            </div>

            {formData.action_type && (
              <>
                {/* JSON Mode Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 uppercase">
                    Configuration
                  </span>
                  <button
                    type="button"
                    onClick={() => setJsonMode((v) => !v)}
                    className={clsx(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                      jsonMode
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {jsonMode ? (
                      <>
                        <FormInput className="w-3 h-3" /> Form
                      </>
                    ) : (
                      <>
                        <Code className="w-3 h-3" /> JSON Mode
                      </>
                    )}
                  </button>
                </div>

                {jsonMode ? (
                  <div>
                    <textarea
                      rows={10}
                      value={jsonText}
                      onChange={(e) => handleJsonChange(e.target.value)}
                      className={clsx(
                        'w-full px-3 py-2 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-900 text-green-400',
                        jsonError ? 'border-red-400' : 'border-slate-300'
                      )}
                    />
                    {jsonError && (
                      <p className="text-xs text-red-500 mt-1">{jsonError}</p>
                    )}
                  </div>
                ) : parsedSchema ? (
                  <SchemaForm
                    schema={parsedSchema}
                    values={formData.config || {}}
                    onChange={handleConfigChange}
                  />
                ) : (
                  <div>
                    <textarea
                      rows={8}
                      value={jsonText}
                      onChange={(e) => handleJsonChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50"
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Condition Node */}
        {selectedNode.type === 'condition' && (
          <>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <ChevronRight className="w-3 h-3" />
              Bağlı &quot;true&quot; ve &quot;false&quot; çıkışları ile dallanır
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Alan (Field)
              </label>
              <input
                type="text"
                placeholder="örn. payload.amount"
                value={formData.config?.field || ''}
                onChange={(e) => handleConfigChange('field', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Operatör
              </label>
              <select
                value={formData.config?.operator || 'equals'}
                onChange={(e) => handleConfigChange('operator', e.target.value)}
                className={inputCls}
              >
                <option value="equals">Eşittir (equals)</option>
                <option value="not_equals">Eşit değil (not_equals)</option>
                <option value="greater_than">Büyüktür (greater_than)</option>
                <option value="less_than">Küçüktür (less_than)</option>
                <option value="contains">İçerir (contains)</option>
                <option value="exists">Var mı (exists)</option>
              </select>
            </div>
            {formData.config?.operator !== 'exists' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Değer (Value)
                </label>
                <input
                  type="text"
                  value={formData.config?.value || ''}
                  onChange={(e) => handleConfigChange('value', e.target.value)}
                  className={inputCls}
                />
              </div>
            )}
          </>
        )}

        {/* End Node */}
        {selectedNode.type === 'end' && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
              Final Status
            </label>
            <select
              value={formData.config?.status || 'completed'}
              onChange={(e) => handleConfigChange('status', e.target.value)}
              className={inputCls}
            >
              <option value="completed">Completed (Success)</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          Apply Changes
        </button>
      </div>
    </div>
  );
}
