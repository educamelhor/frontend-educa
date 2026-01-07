import React from "react";

export default function Input({ label, name, className = "", error, ...rest }) {
  return (
    <div className="flex flex-col gap-1 w-64">
      {label && (
        <label htmlFor={name} className="font-medium text-sm text-gray-700">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        className={`border p-2 rounded ${className}`}
        {...rest}
      />
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
}