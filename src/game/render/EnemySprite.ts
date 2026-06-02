import { Container, Graphics } from 'pixi.js';
import type { Combatant } from '@/sim/world';
import type { AttackStyle } from '@/data/field';
import { RANGE } from '@/data/field';
import { hexToNum } from '@/styles/palette';
import { drawEnemy } from './textures';
import { drawSwing, SWING_MS } from './swing';
import { auraColor } from './fx';

// An enemy display object. Tinted by archetype; bosses are bigger + crowned. Melee
// enemies get a (left-facing) sword swing; ranged/casters fire projectiles (spawned
// by the driver). Shows a cast burst + a debuff/DoT aura. Reads sim state only.

const CAST_MS = 340;

export class EnemySprite extends Container {
  readonly style: AttackStyle;
  private readonly body = new Graphics();
  private readonly aura = new Graphics();
  private readonly enrageAura = new Graphics(); // red "super-saiyan" glow
  private readonly swingG = new Graphics();
  private readonly hpBg = new Graphics();
  private readonly hpBar = new Graphics();
  private flash = 0;
  private lunge = 0;
  private swingMs = 0;
  private castMs = 0;
  private castColor = 0xffffff;
  private elapsed = 0;
  private readonly barW: number;

  constructor(c: Combatant, stageTint: number) {
    super();
    this.style = c.enemyMagic === true ? 'caster' : c.range >= RANGE.ranged ? 'ranged' : 'melee';
    drawEnemy(this.body, { isBoss: c.isBoss === true, magic: c.enemyMagic === true, tint: stageTint });
    this.barW = c.isBoss === true ? 26 : 16;
    this.hpBg.rect(-2, -8, this.barW, 3).fill({ color: hexToNum('#3a2030') });
    // enrageAura sits BEHIND the body so the red glow haloes it.
    this.addChild(this.hpBg, this.hpBar, this.enrageAura, this.body, this.aura, this.swingG);
  }

  flashHit(): void {
    this.flash = 1;
  }

  lungeAttack(): void {
    this.lunge = 1;
  }

  swing(): void {
    this.swingMs = SWING_MS;
  }

  castBurst(color: number): void {
    this.castMs = CAST_MS;
    this.castColor = color;
  }

  update(c: Combatant, x: number, groundY: number, dtMs: number): void {
    this.elapsed += dtMs;
    this.visible = true;
    this.lunge = Math.max(0, this.lunge - dtMs / 180);
    this.x = x - Math.round(this.lunge * 6); // enemies lunge LEFT toward the party
    this.y = groundY;
    this.flash = Math.max(0, this.flash - dtMs / 220);
    const enraged = c.isBoss === true && c.alive && (c.fightMs ?? 0) > (c.enrageMs ?? Number.POSITIVE_INFINITY);
    // hit-flash wins; otherwise enraged bosses run hot (reddened body).
    this.body.tint = this.flash > 0 ? 0xffd0d0 : enraged ? 0xff9a86 : 0xffffff;
    this.alpha = c.alive ? 1 : Math.max(0, this.alpha - dtMs / 200);

    this.swingMs = Math.max(0, this.swingMs - dtMs);
    drawSwing(this.swingG, this.swingMs, hexToNum('#ffd0d0'), -1);

    const frac = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
    this.hpBar.clear();
    this.hpBar.rect(-2, -8, Math.round(this.barW * frac), 3).fill({ color: hexToNum('#c0473a') });

    this.castMs = Math.max(0, this.castMs - dtMs);
    this.drawAura(c);
    this.drawEnrage(enraged);
  }

  // Red "super-saiyan" aura — pulsing rings + upward flame licks — while a boss is
  // enraged. (The stack count is shown on the enrage timer bar, not on the sprite.)
  private drawEnrage(enraged: boolean): void {
    this.enrageAura.clear();
    if (!enraged) return;
    const cx = 4;
    const cy = 2;
    const pulse = 0.5 + 0.5 * Math.sin(this.elapsed / 110);
    for (let r = 0; r < 3; r++) {
      this.enrageAura.circle(cx, cy, 13 + r * 5 + pulse * 3).stroke({ color: 0xff3322, width: 2, alpha: (0.45 - r * 0.12) * (0.5 + 0.5 * pulse) });
    }
    for (let i = 0; i < 7; i++) {
      const ang = -Math.PI / 2 + (i - 3) * 0.3;
      const base = 9;
      const len = base + 7 + 5 * Math.abs(Math.sin(this.elapsed / 90 + i * 1.3));
      this.enrageAura
        .moveTo(cx + Math.cos(ang) * base, cy + Math.sin(ang) * base)
        .lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len)
        .stroke({ color: 0xff5a2a, width: 2, alpha: 0.4 + 0.4 * pulse });
    }
  }

  private drawAura(c: Combatant): void {
    this.aura.clear();
    const cx = 4;
    const cy = 2;
    if (this.castMs > 0) {
      const t = this.castMs / CAST_MS;
      this.aura.circle(cx, cy, (1 - t) * 15 + 5).stroke({ color: this.castColor, width: 2, alpha: t });
    }
    if (!c.alive) return;
    const col = auraColor(c.effects);
    if (col === null) return;
    for (let i = 0; i < 4; i++) {
      const ang = this.elapsed / 600 + (i * Math.PI) / 2;
      const px = cx + Math.cos(ang) * 12;
      const py = cy + Math.sin(ang) * 8;
      const tw = 0.3 + 0.5 * Math.abs(Math.sin(this.elapsed / 170 + i * 1.7));
      const s = 2.2;
      this.aura.poly([px, py - s, px + s, py, px, py + s, px - s, py]).fill({ color: col, alpha: tw });
    }
  }
}
