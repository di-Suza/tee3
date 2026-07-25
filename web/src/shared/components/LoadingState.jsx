const SIZE_CLASS = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

const VARIANT_CLASS = {
  inline: 'inline-flex items-center gap-3',
  panel: 'flex min-h-40 flex-col items-center justify-center gap-4 rounded-lg border border-[#26282b] bg-[#111615] p-8 text-center',
  page: 'flex min-h-screen flex-col items-center justify-center gap-5 bg-[#0d1211] px-4 text-center',
  row: 'flex items-center justify-center gap-3 px-4 py-3',
};

function LoadingState({
  label = 'Loading...',
  size = 'md',
  variant = 'panel',
  className = '',
}) {
  const isInline = variant === 'inline' || variant === 'row';

  return (
    <div className={`${VARIANT_CLASS[variant] || VARIANT_CLASS.panel} ${className}`} role="status" aria-live="polite">
      <span className={`cricket-loader-ball ${SIZE_CLASS[size] || SIZE_CLASS.md}`} aria-hidden="true" />
      {label ? (
        <span className={`${isInline ? 'text-xs' : 'text-sm'} font-black uppercase tracking-[0.18em] text-[#d7ff5f]`}>
          {label}
        </span>
      ) : null}
    </div>
  );
}

export default LoadingState;
