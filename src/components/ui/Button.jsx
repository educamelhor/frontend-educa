import React from "react";

export function Button({
  type = "button",
  children,
  className,
  onClick,
  ...rest
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}