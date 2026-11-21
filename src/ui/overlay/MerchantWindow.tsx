import { useState } from 'react';
import { getEngine } from '@/game/engineRef';
import { useStore } from '@/state/store';
import { format } from '@/sim/num';
import { isItem } from '@/sim/items';
import type { MerchantOffer } from '@/sim/stripEvents';
import type { GemInstance } from '@/data/gems';
import type { ItemInstance } from '@/sim/items';
import { useT } from '@/i18n';
import { Bar, Head, Key, KitRoot, Sign, Tip, TipText, TipTitle, Title, Window } from '@/ui/kit';
import { ItemCell } from '@/ui/panels/items/ItemCell';
import { useMerchantWindow } from './merchantWindowState';
import './events.css';

// The WANDERING MERCHANT's window (data/stripEvents MERCHANT): opened by tapping him on the strip, it shows what he
// sells — each piece in its slot with the same card as anywhere else, its price, and a key to buy it (once) — and
// a bar that empties as his stay runs out. It closes when he leaves (game/GameStrip) or with its close key. It
// floats above the strip at its left, where he stands; it never blocks the rest of the game.

export function MerchantWindow(): React.JSX.Element | null {
  const t = useT();
  const open = useMerchantWindow((s) => s.open);
  const eventN = useMerchantWindow((s) => s.eventN);
  const hide = useMerchantWindow((s) => s.hide);
  useStore((s) => Math.floor(s.hud.clockMs / 250)); // his stay and what is sold: four times a second
  const gold = useStore((s) => s.gold);
  const zoom = useStore((s) => s.uiScale * s.gameScale);
  const [noRoom, setNoRoom] = useState(false);
  if (!open) return null;
  const ev = getEngine()?.world.stripEvents?.active;
  if (ev?.kind !== 'merchant' || ev.n !== eventN || ev.offers === undefined) return null;
  const left = Math.max(0, Math.ceil((ev.totalMs - ev.ms) / 1000));

  const buy = (i: number): void => {
    const ok = getEngine()?.buyFromMerchant(i) ?? false;
    setNoRoom(!ok && (ev.offers?.[i]?.price ?? Infinity) <= useStore.getState().gold);
  };

  return (
    <div className="tk-merchant-zone">
      <KitRoot zoom={zoom}>
        <Window id="merchant" closeLabel={t('events.merchantClose')} onClose={hide} width={150}>
          <Head>
            <Title>{t('events.merchantTitle')}</Title>
          </Head>
          <div className="tk-merchant-stay has">
            <Sign name="pet_sign_timer" />
            <Bar value={ev.totalMs > 0 ? 1 - ev.ms / ev.totalMs : 0} tone="xp" />
            <Tip side="below">
              <TipTitle>{t('events.merchantName')}</TipTitle>
              <TipText>{t('events.merchantLeaves', { s: left })}</TipText>
              <TipText>{t('events.merchantHelp')}</TipText>
            </Tip>
          </div>
          {ev.offers.map((offer, i) => (
            <OfferRow key={i} offer={offer} gold={gold} onBuy={() => buy(i)} />
          ))}
          {noRoom && <p className="tk-merchant-note">{t('events.noRoom')}</p>}
        </Window>
      </KitRoot>
    </div>
  );
}

function OfferRow({ offer, gold, onBuy }: { offer: MerchantOffer; gold: number; onBuy: () => void }): React.JSX.Element {
  const t = useT();
  const entry = offer.entry;
  const item: ItemInstance | null = isItem(entry) ? entry : null;
  const gem: GemInstance | undefined = isItem(entry) ? undefined : entry;
  const poor = gold < offer.price;
  return (
    <div className={`tk-merchant-row${offer.sold ? ' sold' : ''}`}>
      <ItemCell item={offer.sold ? null : item} gem={offer.sold ? undefined : gem} label={t('events.sold')} />
      {offer.sold ? (
        <Key sign="map_check" label={t('events.sold')} disabled tip={<Tip side="below"><TipTitle>{t('events.sold')}</TipTitle><TipText>{t('events.soldHelp')}</TipText></Tip>} />
      ) : (
        // The key IS the price (the kit's price key: the coin and the amount), as the stash sells its pages; the
        // word lives in its tooltip.
        <Key
          tone="gold"
          price={format(offer.price)}
          label={t('events.buy')}
          disabled={poor}
          onClick={poor ? undefined : onBuy}
          tip={<Tip side="below"><TipTitle>{t('events.buy')}</TipTitle><TipText>{poor ? t('events.tooPoor') : t('events.buyHelp', { price: format(offer.price) })}</TipText></Tip>}
        />
      )}
    </div>
  );
}
