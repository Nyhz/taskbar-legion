import { useState, type ReactNode } from 'react';
import {
  Bar,
  Check,
  Chip,
  Delta,
  Gold,
  Head,
  ItemIcon,
  Key,
  KitRoot,
  Menu,
  MenuRow,
  Node,
  Rule,
  Sign,
  Slot,
  SlotGrid,
  StatRow,
  Tip,
  TipAffix,
  TipLine,
  TipName,
  TipNote,
  TipRule,
  TipSub,
  TipTag,
  TipText,
  TipTitle,
  TipWarn,
  TipWorn,
  Title,
  Window,
} from './index';
import { Controls } from './GalleryControls';

// DEV ONLY — every kit piece in use, without the game: open the dev server at `/#kit` (or `/#kit=1.5` for another
// zoom). It exists to LOOK at the kit (scripts/shot-app.mjs) and as the worked example of how the pieces compose.
// The texts here are samples; real panels pass theirs through i18n.

const noop = (): void => undefined;

function Caption({ children }: { children: ReactNode }): React.JSX.Element {
  return <div style={{ color: 'var(--k5)', paddingBottom: 5 }}>{children}</div>;
}

function Block({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <div style={{ display: 'grid', justifyItems: 'start', alignContent: 'start' }}>
      <Caption>{title}</Caption>
      {children}
    </div>
  );
}

function SwordTip(): React.JSX.Element {
  return (
    <Tip size="item" tier={3}>
      <TipName>Hoja de caballero</TipName>
      <TipSub
        end={
          <>
            <Sign name="ui_power" alt="Nivel de objeto" />
            86
            <Sign name="crest_knight" alt="Knight" />
          </>
        }
      >
        Espada
      </TipSub>
      <TipRule />
      <TipAffix sign="stat_attackDamage" value="+412" name="Daño de ataque" />
      <TipAffix sign="stat_critDamage" value="+18,4 %" name="Daño crítico" perfect />
      <TipAffix sign="ui_gem" value="+38" name="Daño de ataque" gem />
      <TipNote>«Forjada para un juramento que ya nadie recuerda.»</TipNote>
    </Tip>
  );
}

function HeroWindow(): React.JSX.Element {
  const [tab, setTab] = useState('gear');
  return (
    <Window
      id="kit-gallery-hero"
      closeLabel="Cerrar"
      onClose={noop}
      onTab={setTab}
      tabs={[
        { key: 'gear', sign: 'tab_gear', label: 'Equipo', state: tab === 'gear' ? 'on' : 'idle' },
        { key: 'talents', sign: 'tab_talents', label: 'Talentos', state: tab === 'talents' ? 'on' : 'idle' },
        { key: 'sheet', sign: 'bag_sheet', label: 'Hoja', state: tab === 'sheet' ? 'on' : 'idle' },
      ]}
      places={[
        { key: 'h0', sign: 'crest_knight', text: '47', label: 'Knight · nivel 47', state: 'on' },
        {
          key: 'h1',
          sign: 'crest_ranger',
          text: '45',
          label: 'Ranger · nivel 45',
          dot: true,
          tip: (
            <Tip side="below">
              <TipTitle>Ranger · nivel 45</TipTitle>
              <TipText>Tiene 2 puntos de talento sin gastar.</TipText>
            </Tip>
          ),
        },
        { key: 'new', sign: 'bag_recruit', label: 'Reclutar', state: 'free' },
        { key: 'shut', sign: 'map_lock_s', small: true, label: 'Plaza cerrada', state: 'shut' },
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '36px 100px 36px 50px 226px', gap: '0 6px' }}>
        <div style={{ display: 'grid', gap: 2, alignContent: 'start' }}>
          <Slot icon={<ItemIcon tier={3} art="sm_helmet_plate_3" alt="Gran yelmo de acero" />} />
          <Slot icon={<ItemIcon tier={5} art="sm_chest_plate_4" alt="Coraza dorada alada" />} />
          <Slot icon={<ItemIcon tier={1} art="sm_gloves_plate_2" alt="Guantelete articulado" />} target />
          <Slot icon={<ItemIcon tier={3} art="sm_legs_plate_3" alt="Arnés acanalado" />} />
          <Slot icon={<ItemIcon tier={0} art="sm_boots_plate_1" alt="Canillera de hierro" />} gone />
        </div>
        <div style={{ display: 'grid', justifyItems: 'center', alignContent: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 24, marginTop: -2 }}>
            <Sign name="crest_knight" />
            <Title>Knight</Title>
          </div>
          <Sign name="ui_alcove" />
          <div
            className="has"
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '16px 1fr',
              gap: 3,
              alignItems: 'center',
              width: 100,
              marginTop: 5,
            }}
          >
            <Sign name="ui_xp" alt="Experiencia" />
            <Bar value={0.62}>62 %</Bar>
            <Tip side="above">
              <TipTitle>Experiencia</TipTitle>
              <TipLine label="Para el nivel 48" value="184 300" />
            </Tip>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 2, alignContent: 'start' }}>
          <Slot icon={<ItemIcon tier={3} art="sm_sword_3" alt="Hoja de caballero" />} selected>
            <SwordTip />
          </Slot>
          <Slot icon={<ItemIcon tier={5} art="sm_shield_4" alt="Égida alada" />} />
          <Slot icon={<ItemIcon tier={8} art="sm_ring_5" alt="Anillo de la Grieta" />} />
          <Slot icon={<ItemIcon tier={1} art="sm_amulet_2" alt="Medalla de bronce" />} />
          <Slot ghost="sm_trinket_1">
            <TipTag>Abalorio</TipTag>
          </Slot>
        </div>
        <div className="tk-stats">
          <StatRow sign="stat_attackDamage" alt="Daño de ataque" value="1 842">
            <Tip>
              <TipTitle>Daño de ataque</TipTitle>
              <TipText>Lo que quita cada golpe antes de la armadura del enemigo.</TipText>
              <TipLine label="Equipo" value="1 420" />
              <TipLine label="Talentos" value="+6 %" tone="good" />
            </Tip>
          </StatRow>
          <StatRow sign="stat_attackSpeed" alt="Velocidad de ataque" value="1,32" />
          <StatRow sign="stat_critChance" alt="Crítico" value="24,5 %" />
          <StatRow sign="stat_critDamage" alt="Daño crítico" value="182 %" tone="up" />
          <StatRow sign="stat_multistrike" alt="Golpe múltiple" value="12 %" />
          <StatRow sign="stat_health" alt="Vida" value="48 210" gap />
          <StatRow sign="stat_armor" alt="Armadura" value="3 480" />
          <StatRow sign="stat_magicResist" alt="Resistencia mágica" value="1 120" />
          <StatRow sign="stat_block" alt="Bloqueo" value="31 %" />
          <StatRow sign="stat_damageReduction" alt="Reducción de daño" value="18 %" />
        </div>
        <div>
          <Head>
            <Sign name="bag_pack" alt="Bolsa" />
            <span className="note" style={{ paddingTop: 1 }}>
              21 / 26
            </span>
            <div className="end">
              <Chip
                sign="btn_sort"
                label="Ordenar por rareza"
                tip={<TipTag side="below-end">Ordenar por rareza</TipTag>}
              />
              <Chip
                sign="bag_gems_out"
                label="Gemas al alijo"
                on
                tip={<TipTag side="below-end">Gemas al alijo</TipTag>}
              />
            </div>
          </Head>
          <SlotGrid cols={6}>
            <Slot icon={<ItemIcon tier={5} art="sm_helmet_plate_4" alt="Yelmo alado" />} />
            <Slot icon={<ItemIcon tier={3} art="sm_boots_plate_3" alt="Escarpe acanalado" />} />
            <Slot
              icon={<ItemIcon tier={3} art="sm_chest_cloth_3" alt="Casulla blanca" />}
              unusable
              crest="crest_priest"
            />
            <Slot
              icon={<ItemIcon tier={5} art="sm_bow_4" alt="Gran arco dorado" />}
              unusable
              crest="mark_crest_ranger"
            />
            <Slot icon={<ItemIcon tier={2} art="sm_gem_ruby" alt="Rubí" />} />
            <Slot icon={<ItemIcon tier={2} art="sm_gem_emerald" alt="Esmeralda" />} count="3" />
            <Slot
              icon={<ItemIcon tier={8} art="sm_tome_5" alt="Tomo de la Grieta" />}
              unusable
              crest="crest_priest"
            />
            <Slot icon={<ItemIcon tier={5} art="sm_amulet_4" alt="Colgante solar" />} mark="ui_up" />
            <Slot />
            <Slot />
            <Slot />
            <Slot icon={<Sign name="mark_buy" alt="Comprar un hueco" />} className="buy" interactive>
              <Tip side="left">
                <TipTitle>Un hueco más</TipTitle>
                <TipLine label="Precio" value="572 de oro" tone="gold" />
                <TipLine label="Huecos" value="26 / 80" />
              </Tip>
            </Slot>
          </SlotGrid>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 30, marginTop: 6 }}>
            <Node kind="ultimate" state="on" sign="tal_crown" alt="Definitiva">
              <Tip side="above" size="item" tier={3}>
                <TipName>Última resistencia</TipName>
                <TipSub>Definitiva</TipSub>
                <TipText>Un golpe que lo mataría lo deja con un hilo de vida.</TipText>
              </Tip>
            </Node>
            <Node kind="ability" state="on" sign="tal_stone_skin" alt="Piel de piedra" cooldown="12" />
            <Node kind="ability" state="max" sign="tal_cleave" alt="Tajo debilitante" />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
              <Key sign="bag_farm" label="Preajuste de farmeo" lamp />
              <Key sign="hud_boss" label="Preajuste de jefe" disabled />
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}

function StashWindow(): React.JSX.Element {
  const [page, setPage] = useState('1');
  const [filter, setFilter] = useState('all');
  return (
    <Window
      id="kit-gallery-stash"
      closeLabel="Cerrar"
      onClose={noop}
      onTab={setPage}
      tabs={[
        { key: '1', text: '1', label: 'Página 1', state: page === '1' ? 'on' : 'idle' },
        { key: '2', text: '2', label: 'Página 2', state: page === '2' ? 'on' : 'idle' },
        {
          key: '3',
          sign: 'map_lock_s',
          small: true,
          label: 'Página 3',
          state: 'next',
          tip: (
            <Tip>
              <TipTitle>Página 3</TipTitle>
              <TipLine label="Precio" value="48 000 de oro" tone="gold" />
            </Tip>
          ),
        },
        { key: '4', sign: 'map_lock_s', small: true, label: 'Página 4', state: 'shut' },
      ]}
    >
      <Head>
        <Title>Alijo</Title>
        <span className="note">52 / 60</span>
        <div className="end">
          <Chip
            sign="bag_f_all"
            label="Todo"
            on={filter === 'all'}
            onClick={() => setFilter('all')}
            tip={<TipTag side="above-end">Todo</TipTag>}
          />
          <Chip
            sign="stat_armor"
            label="Armadura"
            on={filter === 'armor'}
            onClick={() => setFilter('armor')}
            tip={<TipTag side="above-end">Armadura</TipTag>}
          />
          <Chip
            sign="stat_attackDamage"
            label="Armas"
            on={filter === 'weapon'}
            onClick={() => setFilter('weapon')}
            tip={<TipTag side="above-end">Armas</TipTag>}
          />
          <Chip
            sign="bag_f_jewel"
            label="Joyas"
            on={filter === 'jewel'}
            onClick={() => setFilter('jewel')}
            tip={<TipTag side="above-end">Joyas</TipTag>}
          />
          <Chip
            sign="ui_gem"
            label="Gemas"
            on={filter === 'gem'}
            onClick={() => setFilter('gem')}
            tip={<TipTag side="above-end">Gemas</TipTag>}
          />
        </div>
      </Head>
      <SlotGrid cols={6} className="kit-gallery-gap">
        <Slot icon={<ItemIcon tier={3} art="sm_chest_plate_3" alt="" />} />
        <Slot icon={<ItemIcon tier={5} art="sm_sword_4" alt="" />} />
        <Slot
          icon={<ItemIcon tier={3} art="sm_helmet_leather_3" alt="" />}
          unusable
          crest="mark_crest_ranger"
        />
        <Slot icon={<ItemIcon tier={5} art="sm_ring_4" alt="" />} />
        <Slot icon={<ItemIcon tier={2} art="sm_gem_sapphire" alt="" />} />
        <Slot icon={<ItemIcon tier={3} art="sm_gem_amethyst" alt="" />} />
        <Slot icon={<ItemIcon tier={7} art="sm_shield_4" alt="" />} />
        <Slot icon={<ItemIcon tier={6} art="sm_trinket_4" alt="" />} />
        <Slot icon={<ItemIcon tier={4} art="sm_quiver_3" alt="" />} unusable crest="mark_crest_ranger" />
        <Slot />
        <Slot />
        <Slot />
      </SlotGrid>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6 }}>
        <Key
          sign="btn_sort"
          label="Ordenar por rareza"
          tip={<TipTag side="above">Ordenar por rareza</TipTag>}
        />
        <Key
          price="380"
          className="kit-gallery-end"
          tip={
            <Tip side="above-end">
              <TipTitle>Un hueco más por página</TipTitle>
              <TipLine label="Precio" value="380 de oro" tone="gold" />
              <TipLine label="Huecos por página" value="30 / 50" />
            </Tip>
          }
        >
          +1 hueco
        </Key>
      </div>
    </Window>
  );
}

function Menus(): React.JSX.Element {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, auto)',
        gap: '8px 12px',
        justifyContent: 'start',
        alignItems: 'start',
      }}
    >
      <Menu>
        <MenuRow sign="tab_gear" active onClick={noop}>
          Equipar
        </MenuRow>
        <MenuRow sign="hud_stash" onClick={noop}>
          Enviar al alijo
        </MenuRow>
      </Menu>
      <Menu>
        <MenuRow sign="tab_gear" disabled>
          No es de su clase
        </MenuRow>
        <MenuRow sign="hud_stash" onClick={noop}>
          Enviar al alijo
        </MenuRow>
      </Menu>
      <Menu>
        <MenuRow sign="ui_gem" onClick={noop}>
          Engastar en Yelmo
        </MenuRow>
        <MenuRow sign="ui_gem" onClick={noop}>
          Engastar en Arma
        </MenuRow>
        <MenuRow onClick={noop}>Sin signo</MenuRow>
        <MenuRow sign="opt_new" danger onClick={noop}>
          Borrar el preajuste
        </MenuRow>
      </Menu>
      <Menu tall>
        <MenuRow sign="crest_ranger" name active end="Reclutar" onClick={noop}>
          Ranger
        </MenuRow>
        <MenuRow
          sign="crest_priest"
          name
          end={
            <>
              <Sign name="map_lock_s" />
              <Sign name="ui_gold" />
              500
            </>
          }
          onClick={noop}
        >
          Priest
        </MenuRow>
      </Menu>
    </div>
  );
}

function Compare(): React.JSX.Element {
  return (
    <div className="tk-cmp">
      <Tip size="item" tier={3} still>
        <TipWorn>Puesto</TipWorn>
        <TipName>Gran yelmo de acero</TipName>
        <TipSub
          end={
            <>
              <Sign name="ui_power" alt="Nivel de objeto" />
              82
              <Sign name="crest_knight" alt="Knight" />
            </>
          }
        >
          Yelmo
        </TipSub>
        <TipRule />
        <TipAffix sign="stat_armor" value="+624" name="Armadura" />
        <TipAffix sign="stat_health" value="+3 180" name="Vida" />
        <TipAffix sign="stat_block" value="+4,2 %" name="Bloqueo" />
      </Tip>
      <Tip size="wide" tier={5} still>
        <TipName>Yelmo alado dorado</TipName>
        <TipSub
          end={
            <>
              <Sign name="ui_power" alt="Nivel de objeto" />
              93<Delta tone="up">+11</Delta>
              <Sign name="crest_knight" alt="Knight" />
            </>
          }
        >
          Yelmo
        </TipSub>
        <TipRule />
        <TipAffix sign="stat_armor" value="+802" name="Armadura" delta="+178" />
        <TipAffix sign="stat_health" value="+3 940" name="Vida" delta="+760" perfect />
        <TipAffix sign="stat_critChance" value="+2,6 %" name="Crítico" delta="+2,6 %" />
        <TipAffix sign="stat_block" name="Bloqueo" delta="−4,2 %" deltaTone="dn" lost />
        <TipAffix sign="ui_gem" name="Engaste vacío" empty />
        <TipRule />
        <TipLine label="Aguante" value="+3,8 %" tone="good" />
        <TipLine label="Daño" value="−0,6 %" tone="bad" />
        <TipWarn>No es de su clase.</TipWarn>
        <TipNote>Mayús: comparar sin contar las gemas.</TipNote>
      </Tip>
    </div>
  );
}

function Confirm(): React.JSX.Element {
  const [skip, setSkip] = useState(false);
  return (
    <Window id="kit-gallery-confirm" closeLabel="Cerrar" onClose={noop} width={150}>
      <Head>
        <Title>Engastar</Title>
      </Head>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
        <Slot icon={<ItemIcon tier={2} art="sm_gem_ruby" alt="Rubí" />} interactive={false} />
        <Sign name="cube_arrow" />
        <Slot icon={<ItemIcon tier={3} art="sm_sword_3" alt="Hoja de caballero" />} interactive={false} />
      </div>
      <Rule />
      <Check checked={skip} onChange={setSkip}>
        No volver a preguntar
      </Check>
      <div style={{ display: 'flex', marginTop: 6 }}>
        <Key onClick={noop}>Volver</Key>
        <Key tone="gold" className="kit-gallery-end" onClick={noop}>
          Engastar
        </Key>
      </div>
    </Window>
  );
}

function Keys(): React.JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 6, justifyItems: 'start' }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <Key sign="btn_sort" label="Ordenar" />
        <Key sign="btn_open" label="Abrir" tone="gold" badge="7" />
        <Key sign="btn_sell" label="Vender" disabled />
        <Key sign="opt_new" label="Borrar" tone="danger" />
        <Key sign="bag_farm" label="Encendido" lamp />
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <Key>Rellenar</Key>
        <Key tone="gold">Sintetizar</Key>
        <Key disabled>Fundir</Key>
        <Key tone="danger" sign="opt_new">
          Borrar todo
        </Key>
        <Key price="380">+1 hueco</Key>
        <Key price="48 K" disabled>
          Página 3
        </Key>
      </div>
      <Gold>12 480</Gold>
      <div style={{ width: 96 }}>
        <StatRow sign="stat_armor" alt="Armadura" value="3 480" extra="−41 %" />
        <StatRow sign="stat_magicResist" alt="Resistencia mágica" value="1 120" extra="−19 %" tone="up" />
      </div>
    </div>
  );
}

function Nodes(): React.JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', height: 36 }}>
      <Node kind="ability" state="off" sign="tal_bulwark" pips={{ rank: 0, max: 5 }} locked />
      <Node kind="ability" state="on" sign="tal_stone_skin" pips={{ rank: 3, max: 5 }} onClick={noop} />
      <Node kind="ability" state="max" sign="tal_cleave" pips={{ rank: 5, max: 5 }} onClick={noop} />
      <Node kind="passive" state="off" sign="stat_block" pips={{ rank: 0, max: 5 }} onClick={noop} />
      <Node kind="passive" state="on" sign="stat_health" pips={{ rank: 3, max: 5 }} onClick={noop} />
      <Node kind="passive" state="max" sign="stat_armor" pips={{ rank: 5, max: 5 }} onClick={noop} />
      <Node kind="modifier" state="off" sign="tal_stone_skin" onClick={noop} />
      <Node kind="modifier" state="on" sign="tal_cleave" onClick={noop} />
      <Node kind="ultimate" state="off" sign="tal_crown" locked />
      <Node kind="ultimate" state="on" sign="tal_crown" />
      <Node kind="ability" state="on" sign="tal_battle_cry" cooldown="4" />
    </div>
  );
}

export function Gallery(): React.JSX.Element {
  const asked = Number(window.location.hash.split('=')[1]);
  const zoom = Number.isFinite(asked) && asked > 0 ? asked : 2;
  return (
    <div style={{ minHeight: '100vh', background: '#2a1f3d', padding: 16 }}>
      <KitRoot zoom={zoom} style={{ display: 'grid', gap: 18, justifyItems: 'start' }}>
        <style>{'.kit-gallery-end { margin-left: auto; } .kit-gallery-gap { margin-top: 5px; }'}</style>
        <Block title="Window · tabs · places · Slot · ItemIcon · StatRow · Bar · Chip · Node · Key">
          <HeroWindow />
        </Block>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Block title="Window · page tabs · Head · Title · SlotGrid">
            <StashWindow />
          </Block>
          <Block title="Menu · MenuRow">
            <Menus />
          </Block>
          <Block title="Window · Rule · Check · worded Key">
            <Confirm />
          </Block>
        </div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Block title="Tip (still) · TipWorn · TipName · TipSub · TipAffix · Delta · TipLine · TipWarn · TipNote">
            <Compare />
          </Block>
          <Block title="Key">
            <Keys />
          </Block>
          <Block title="Node">
            <Nodes />
          </Block>
        </div>
        <Block title="Pager · Segment · Switch · SlimKey · big number · role Node · niche">
          <Controls />
        </Block>
      </KitRoot>
    </div>
  );
}
