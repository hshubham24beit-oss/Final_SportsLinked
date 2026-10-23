import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import Input from './ui/Input';

export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      endAdornment={
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="rounded-full p-1.5 text-slate transition-colors hover:bg-sand hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? (
            <FiEyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <FiEye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      }
    />
  );
}
