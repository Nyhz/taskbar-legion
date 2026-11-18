"""Is an ambient bed shrill? A measure of what pierces: sound in the 2–8 kHz band (where the ear is most sensitive,
and where a pure whistle or chirp grates when it plays all day), and how far its loudest moment stands above the
bed as a whole.

User, 2026-11-18, on the W1 meadow: «algo estridente… no es muy cozy… hay un pájaro súper estridente que molesta
bastante. Revisa que no haya cosas estridentes, ni molestas, ni muy agudas en ningún mapa». The beds are meant to
be heard all day behind other work: what stands out may be a soft, round, mid-pitched detail — never a sharp one.

Three numbers per bed (mono mix, 46 ms frames):
- `bite_peak_db`: the loudest frame's 2–8 kHz level, relative to the bed's loudness. The shrill moment: a chirp or
  whistle that jumps out of the place.
- `bite_share`: the share of the energy in 2–8 kHz over the loudest tenth of the frames (what the details are made
  of: a bright bed has most of its details up there).
- `tonal_hz`: the pitch of the loudest bite frame and how pure it is (peak over the band's median, dB): a pure tone
  up there is a whistle, the hardest thing to listen to for hours.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .process import RATE, loudness_db

FRAME = 2048
BITE = (2000.0, 8000.0)

# The ceiling a bed must stay under (set 2026-11-18 from the measured beds after the softening pass: the rounded
# birds and crickets of W1 sit near it; anything above is a detail that pierces).
MAX_BITE_PEAK_DB = 1.0
MAX_BITE_SHARE = 0.15


@dataclass
class Harshness:
    bite_peak_db: float
    bite_share: float
    tonal_hz: float
    tonal_purity_db: float

    @property
    def shrill(self) -> bool:
        return self.bite_peak_db > MAX_BITE_PEAK_DB or self.bite_share > MAX_BITE_SHARE


def measure(x: np.ndarray) -> Harshness:
    mono = x.mean(axis=1) if x.ndim == 2 else x
    frames = len(mono) // FRAME
    if frames == 0:
        return Harshness(-120.0, 0.0, 0.0, 0.0)
    win = np.hanning(FRAME)
    spec = np.abs(np.fft.rfft(mono[: frames * FRAME].reshape(frames, FRAME) * win, axis=1)) ** 2
    freqs = np.fft.rfftfreq(FRAME, 1.0 / RATE)
    bite = (freqs >= BITE[0]) & (freqs < BITE[1])
    total = spec.sum(axis=1) + 1e-20
    bite_e = spec[:, bite].sum(axis=1) + 1e-20
    # Frame energy → level comparable with loudness_db (mean square of the windowed frame).
    norm = (np.sum(win**2) * FRAME) / 2.0
    bite_db = 10.0 * np.log10(bite_e / norm)
    loud = loudness_db(x if x.ndim == 2 else x[:, None])
    top = np.argsort(total)[-max(1, frames // 10) :]
    share = float(bite_e[top].sum() / total[top].sum())
    k = int(np.argmax(bite_db))
    band_spec = spec[k, bite]
    peak_i = int(np.argmax(band_spec))
    purity = float(10.0 * np.log10(band_spec[peak_i] / (np.median(band_spec) + 1e-20)))
    return Harshness(float(bite_db[k] - loud), share, float(freqs[bite][peak_i]), purity)
