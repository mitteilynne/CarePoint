import { useState } from 'react';

interface OrganizationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  className?: string;
}

export default function OrganizationCodeInput({
  value,
  onChange,
  error,
  placeholder = "Enter your organization code",
  className = ""
}: OrganizationCodeInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to uppercase for consistency
    onChange(e.target.value.toUpperCase());
  };

  return (
    <div className={className}>
      <label htmlFor="organizationCode" className="block text-sm font-medium text-gray-700">
        Organization Code
      </label>
      <div className="mt-1 relative">
        <input
          id="organizationCode"
          name="organizationCode"
          type="text"
          required
          className={`appearance-none relative block w-full px-4 py-3 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
            error
              ? 'border-red-300 focus:ring-red-500 focus:border-transparent'
              : 'border-gray-300 focus:ring-primary-500 focus:border-transparent'
          }`}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          maxLength={20}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <svg 
            className={`h-5 w-5 transition-colors duration-200 ${
              isFocused ? 'text-primary-500' : 'text-gray-400'
            }`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
            />
          </svg>
        </div>
      </div>
      <div className="mt-1 min-h-[20px]">
        {error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : (
          <p className="text-xs text-gray-500">
            This code identifies your healthcare facility
          </p>
        )}
      </div>
    </div>
  );
}
