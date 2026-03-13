// All SVGs are imported from local assets using `?raw`, so they are trusted and safe to render inline.
export default function Icon({ svg, size = 24, className = '', style = {} }) {
  return (
    <span
      className={`inline-icon ${className}`}
      style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
