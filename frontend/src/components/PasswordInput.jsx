import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { getInputClass } from '../utils/authStyles';

function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  autoComplete,
  hasError = false,
  maxLength,
  placeholder,
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        autoComplete={autoComplete}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={hasError}
        className={getInputClass(hasError, true)}
      />

      <button
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        title={isVisible ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export default PasswordInput;