import { art } from './art';

// A sign: one piece of pixel art standing where a word would go. `alt` is what it says (for assistive tech);
// decorative pieces leave it empty.

export function Sign({
  name,
  alt = '',
  className,
}: {
  name: string;
  alt?: string;
  className?: string;
}): React.JSX.Element {
  return <img src={art(name)} alt={alt} className={className} draggable={false} />;
}
