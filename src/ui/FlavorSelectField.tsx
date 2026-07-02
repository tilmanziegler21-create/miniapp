import React from 'react';
import { ChevronDown } from 'lucide-react';

export type FlavorSelectOption = {
  id: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  label?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: FlavorSelectOption[];
  fullWidth?: boolean;
};

export const FlavorSelectField: React.FC<Props> = ({
  label = 'Выберите вкус',
  hint = 'Нажмите, чтобы открыть список',
  value,
  onChange,
  options,
  fullWidth = false,
}) => (
  <div className={`app-select-field${fullWidth ? ' app-select-field--full' : ''}`}>
    <div className="app-select-field__label">{label}</div>
    <div className="app-select-field__control">
      <select
        className="app-flavor-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={18} className="app-select-field__chevron" aria-hidden />
    </div>
    {hint ? <div className="app-select-field__hint">{hint}</div> : null}
  </div>
);
