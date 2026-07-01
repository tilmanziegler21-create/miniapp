import React from 'react';

type Props = {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
};

export const FadeImage: React.FC<Props> = ({ src, alt = '', className = '', style }) => {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`img-fade-in${loaded ? ' img-fade-in--visible' : ''} ${className}`.trim()}
      style={style}
      onLoad={() => setLoaded(true)}
    />
  );
};
