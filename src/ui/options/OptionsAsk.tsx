import type { ReactNode } from 'react';
import { Head, Key, Title } from '@/ui/kit';

// A question asked IN the options window, in place of its rows: what is about to happen in one sentence, and two
// keys that say what they do — back, and the action itself (words here: the action is not one a sign can carry).

export function OptionsAsk({
  title,
  text,
  back,
  confirm,
  confirmSign,
  danger = false,
  onBack,
  onConfirm,
}: {
  title: ReactNode;
  text: ReactNode;
  back: string;
  confirm: string;
  confirmSign: string;
  danger?: boolean;
  onBack: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  return (
    <div className="tk-opt-ask">
      <Head>
        <Title>{title}</Title>
      </Head>
      <p>{text}</p>
      <div className="tk-opt-keys">
        <Key sign="opt_back" onClick={onBack}>
          {back}
        </Key>
        <Key sign={confirmSign} tone={danger ? 'danger' : 'plum'} onClick={onConfirm}>
          {confirm}
        </Key>
      </div>
    </div>
  );
}
