import React from "react";

export default function Modal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black opacity-30"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-md w-full z-50">
          {children}
        </div>
      </div>
    </div>
  );
}
