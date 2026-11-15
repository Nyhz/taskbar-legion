import { Sign } from './Sign';

// The divider: a thin line with its brass ornament in the middle. Use it only where a real break helps.

export function Rule(): React.JSX.Element {
  return (
    <div className="tk-rule">
      <i />
      <Sign name="ui_rule" />
      <i />
    </div>
  );
}
