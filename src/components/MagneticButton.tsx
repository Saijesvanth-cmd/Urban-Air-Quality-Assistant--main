import { useRef, useState, type ReactNode } from 'react';

interface MagneticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export function MagneticButton({
  children,
  onClick,
  href,
  className = '',
  ariaLabel,
  type = 'button',
  disabled = false,
}: MagneticButtonProps) {
  const elRef = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled) return;
    const node = elRef.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = node.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    setOffset({ x: dx * 0.14, y: dy * 0.18 });
  };

  const reset = () => setOffset({ x: 0, y: 0 });

  const style = {
    transform: `translate3d(${offset.x.toFixed(1)}px, ${offset.y.toFixed(1)}px, 0)`,
    transition: offset.x === 0 && offset.y === 0 ? 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)' : 'transform 60ms linear',
  };

  if (href) {
    return (
      <a
        ref={elRef}
        href={href}
        aria-label={ariaLabel}
        onMouseMove={handleMouseMove}
        onMouseLeave={reset}
        style={style}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      ref={elRef}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      style={style}
      className={className}
    >
      {children}
    </button>
  );
}
