import { Container, Sprite, Texture } from 'pixi.js';
import { CHIP, SIGN, type ChipView } from './stripHud';
import { stripHudTexture } from './stripHudTextures';

// A row (or a column) of the strip HUD's chips: a 9×9 frame, the 7×7 sign in its well, and a shade that covers
// the sign from the top (an effect running out, an ability recharging). Sprites are made once and reused; a
// frame of the game only moves widths, textures and visibility.

const SHADE = 0x0b0d17; // palette ink 0
const SHADE_ALPHA = 0.66;
const BLINK_MS = 260;
const FLASH_MS = 320; // an ability that has just come ready flashes white

interface Chip {
  box: Container;
  frame: Sprite;
  sign: Sprite;
  shade: Sprite;
  flash: Sprite;
  wasReady: boolean;
  flashMs: number;
}

export class ChipRow extends Container {
  private readonly chips: Chip[] = [];
  private readonly more = new Sprite();
  private elapsed = 0;

  /** `dx`, `dy`: the step from one chip to the next. `flashReady`: a chip flashes when its frame turns 'ready'. */
  constructor(private readonly dx: number, private readonly dy: number, private readonly flashReady = false) {
    super();
    this.more.visible = false;
    this.addChild(this.more);
  }

  /** Show these chips (and "+more" after them). Returns how many places the row now takes. */
  show(views: readonly ChipView[], more: number, dtMs: number): number {
    this.elapsed += dtMs;
    while (this.chips.length < views.length) this.chips.push(this.make());
    const blinkOff = Math.floor(this.elapsed / BLINK_MS) % 2 === 1;
    this.chips.forEach((chip, i) => {
      const view = views[i];
      if (view === undefined) {
        chip.box.visible = false;
        chip.wasReady = false;
        return;
      }
      chip.box.visible = true;
      chip.box.position.set(i * this.dx, i * this.dy);
      chip.frame.texture = stripHudTexture(`hud_s_chip_${view.frame}`);
      chip.frame.alpha = view.ending && blinkOff ? 0.35 : 1;
      chip.sign.texture = stripHudTexture(`hud_s_m_${view.sign}`);
      chip.shade.visible = view.shade > 0;
      chip.shade.height = Math.min(SIGN, view.shade);
      const ready = view.frame === 'ready';
      if (this.flashReady && ready && !chip.wasReady && this.elapsed > dtMs) chip.flashMs = FLASH_MS;
      chip.wasReady = ready;
      chip.flashMs = Math.max(0, chip.flashMs - dtMs);
      chip.flash.visible = chip.flashMs > 0;
      chip.flash.alpha = chip.flashMs / FLASH_MS;
    });
    const places = views.length + (more > 0 ? 1 : 0);
    this.more.visible = more > 0;
    if (more > 0) {
      this.more.texture = stripHudTexture(`hud_s_more_${Math.min(9, more)}`);
      this.more.position.set(views.length * this.dx, views.length * this.dy);
    }
    return places;
  }

  private make(): Chip {
    const box = new Container();
    const frame = new Sprite();
    const sign = new Sprite();
    sign.position.set(1, 1);
    const shade = new Sprite(Texture.WHITE);
    shade.tint = SHADE;
    shade.alpha = SHADE_ALPHA;
    shade.position.set(1, 1);
    shade.width = SIGN;
    const flash = new Sprite(Texture.WHITE);
    flash.width = CHIP;
    flash.height = CHIP;
    flash.visible = false;
    box.addChild(frame, sign, shade, flash);
    this.addChildAt(box, 0);
    return { box, frame, sign, shade, flash, wasReady: false, flashMs: 0 };
  }
}
