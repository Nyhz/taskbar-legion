import { art } from './art';

// A sign: one piece of pixel art standing where a word would go. `alt` is what it says (for assistive tech);
// decorative pieces leave it empty.

export function Sign({
  name,
  alt = '',
  className,
  style,
}: {
  name: string;
  alt?: string;
  className?: string;
  /** For a sign placed by its owner (a mark on a line, a pin on a map). */
  style?: React.CSSProperties;
}): React.JSX.Element {
  return <img src={art(name)} alt={alt} className={className} style={style} draggable={false} />;
}
