import logo from '../assets/images/logo.png';

const SIZE_CLASS = {
  sm: 'h-7',
  md: 'h-9',
  lg: 'h-12',
};

function BrandLogo({ size = 'md', className = '', withGlow = false }) {
  return (
    <img
      src={logo}
      alt="Tee3"
      className={`${SIZE_CLASS[size] || SIZE_CLASS.md} w-auto object-contain ${withGlow ? 'drop-shadow-[0_0_18px_rgba(185,255,20,0.28)]' : ''} ${className}`}
    />
  );
}

export default BrandLogo;
