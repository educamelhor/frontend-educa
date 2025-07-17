// src/components/Toast.jsx
import React, { useEffect } from "react";

export default function Toast({ children, onClose, duration = 30000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed top-24 right-6 z-50 max-w-xs bg-white border border-gray-200 rounded shadow-lg p-4">
      <div className="flex justify-between items-start">
        <div className="space-y-1">{children}</div>
        <button
          onClick={onClose}
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          &times;
        </button>
      </div>
    </div>
  );
}