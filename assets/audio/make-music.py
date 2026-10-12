"""Composes the invitation's background music in code, so it is royalty-free.

Three loops in the style of a South Indian (Telugu) wedding band, all with a
nadaswaram lead over an ottu drone, thavil/dolu and jalra:

  mangala.wav  slow mangala vadyam in raga Kalyani (opening, invitation, ending)
  festive.wav  Hamsadhwani over an Adi talam groove (Haldi and Sangeet)
  melam.wav    fast pedda melam / gatti melam (Sumuhurtham)

Usage: python make-music.py OUT_DIR   (then encode the WAVs to MP3 with ffmpeg)
"""
import sys
import wave

import numpy as np

SR = 32000
SA = 277.18  # C#4, a common nadaswaram pitch
rng = np.random.default_rng(11)

KALYANI = {'S': 0, 'R': 2, 'G': 4, 'M': 6, 'P': 7, 'D': 9, 'N': 11}
SHANKARA = {'S': 0, 'R': 2, 'G': 4, 'M': 5, 'P': 7, 'D': 9, 'N': 11}
HAMSA = {'S': 0, 'R': 2, 'G': 4, 'P': 7, 'N': 11}


def hz(note, scale):
    octave = 1 + note.count("'") - note.count('_')
    return SA * 2 ** (scale[note[0]] / 12) * 2 ** (octave - 1)


def parse(score, scale):
    """'S1 R.5 -2 ...' -> [(freq or None, beats)]; '-' is a rest, '|' is ignored."""
    out = []
    for tok in score.split():
        if tok == '|':
            continue
        if tok[0] == '-':
            out.append((None, float(tok[1:])))
            continue
        i = 1
        while i < len(tok) and tok[i] in "'_":
            i += 1
        out.append((hz(tok[:i], scale), float(tok[i:])))
    return out


def formant(f):
    """Nasal double-reed colour: peaks near 1.1 kHz and 2.7 kHz."""
    lf = np.log2(np.maximum(f, 1))
    g = 0.22 + np.exp(-((lf - np.log2(1100)) / 0.45) ** 2) + 0.75 * np.exp(-((lf - np.log2(2700)) / 0.4) ** 2)
    return g * (f < 7500)


def reed(freq, amp, n_harm=24, bright=0.62):
    """Additive reed tone following per-sample frequency and amplitude arrays."""
    phase = 2 * np.pi * np.cumsum(freq) / SR
    out = np.zeros_like(freq)
    for k in range(1, n_harm + 1):
        out += (1 / k ** bright) * formant(k * freq) * np.sin(k * phase)
    noise = rng.standard_normal(len(freq))
    breath = np.fft.irfft(np.fft.rfft(noise) * band(len(noise), 900, 4200), len(noise))
    return (out * 0.18 + breath * 0.025) * amp


def band(n, lo, hi):
    f = np.fft.rfftfreq(n, 1 / SR)
    return ((f > lo) & (f < hi)).astype(float)


def nadaswaram(notes, beat, total, start=0.0, vib=0.35, glide=0.07):
    """Render a phrase line. Returns mono samples of length total seconds."""
    n = int(total * SR)
    freq = np.full(n, SA)
    amp = np.zeros(n)
    t = start
    prev = None
    for f, beats in notes:
        d = beats * beat
        i, j = int(t * SR), min(n, int((t + d) * SR))
        if j <= i:
            t += d
            continue
        tt = np.arange(j - i) / SR
        if f is None:
            prev = None
        else:
            semis = np.zeros_like(tt)
            if prev is not None:  # slide in from the previous note
                diff = 12 * np.log2(prev / f)
                w = np.clip(tt / glide, 0, 1)
                semis += diff * (1 - (0.5 - 0.5 * np.cos(np.pi * w)))
            if d > 0.45:  # vibrato that grows on held notes
                grow = np.clip((tt - 0.25 * d) / (0.4 * d), 0, 1)
                semis += vib * grow * np.sin(2 * np.pi * 5.6 * tt)
            freq[i:j] = f * 2 ** (semis / 12)
            a = np.ones_like(tt)
            a *= 1 - 0.35 * np.exp(-tt / 0.03) * (prev is not None)  # tongued re-attack
            if prev is None:
                a *= np.clip(tt / 0.06, 0, 1)
            amp[i:j] = a * (0.92 + 0.08 * np.sin(2 * np.pi * 0.7 * tt))
            prev = f
        t += d
    # release at the end of each phrase
    k = np.ones(int(0.08 * SR)) / int(0.08 * SR)
    amp = np.convolve(amp, k, 'same')
    return reed(freq, amp)


def ottu(total, level=0.32):
    """Drone nadaswaram on Sa and Pa with slow swells."""
    n = int(total * SR)
    t = np.arange(n) / SR
    sa = reed(np.full(n, SA / 2), np.ones(n), n_harm=18, bright=0.8)
    pa = reed(np.full(n, SA * 2 ** (7 / 12) / 2), np.ones(n), n_harm=18, bright=0.8)
    swell = 0.85 + 0.15 * np.sin(2 * np.pi * t / total * 3)
    return (sa * 0.6 + pa * 0.4) * swell * level


def thom(level=1.0):
    """Thavil bass side: a low skin with a falling pitch."""
    t = np.arange(int(0.45 * SR)) / SR
    f = 95 + 60 * np.exp(-t / 0.05)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * np.exp(-t / 0.18)
    s += 0.25 * rng.standard_normal(len(t)) * np.exp(-t / 0.01)
    return s * level * 0.9


def ta(level=1.0):
    """Thavil stick side: a hard, bright crack."""
    t = np.arange(int(0.2 * SR)) / SR
    noise = rng.standard_normal(len(t))
    crack = np.fft.irfft(np.fft.rfft(noise) * band(len(noise), 1800, 7000), len(noise)) * np.exp(-t / 0.022)
    ping = np.sin(2 * np.pi * 540 * t) * np.exp(-t / 0.05)
    return (crack * 1.6 + ping * 0.5) * level * 0.7


def jalra(level=1.0):
    """Small hand cymbals."""
    t = np.arange(int(0.35 * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6.3)) for f in (3150, 4420, 5240, 6880, 8010))
    return s * np.exp(-t / 0.11) * level * 0.06


def place(buf, sig, t0, gain=1.0):
    i = int(t0 * SR) % len(buf)
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[:j - i] * gain
    rest = len(sig) - (j - i)
    if rest > 0:  # wrap into the start so the loop stays seamless
        buf[:rest] += sig[j - i:] * gain


def drums(total, beat, pattern, cycles_from=0, accent_every=None):
    """pattern: list of per-subdivision strings, e.g. 'T.t.' (T=thom, t=ta, x=both, .=rest)."""
    n = int(total * SR)
    buf = np.zeros(n)
    steps = len(pattern[0])
    t = 0.0
    bar = 0
    while t < total - 1e-6:
        for beat_pat in pattern:
            for s, c in enumerate(beat_pat):
                tt = t + s * beat / steps
                if tt >= total:
                    break
                acc = 1.15 if (s == 0) else 0.8
                if c in 'Tx':
                    place(buf, thom(acc), tt)
                if c in 'tx':
                    place(buf, ta(acc * rng.uniform(0.85, 1.0)), tt)
                if c == 'r':
                    place(buf, ta(0.45), tt)
            t += beat
        bar += 1
    return buf


def jalra_track(total, beat, every=1.0):
    n = int(total * SR)
    buf = np.zeros(n)
    t = 0.0
    while t < total - 1e-6:
        place(buf, jalra(1.0 if (t / beat) % 2 < 1e-6 else 0.7), t)
        t += beat * every
    return buf


def reverb(x, secs=1.4, mix=0.2, seed=1):
    g = np.random.default_rng(seed)
    n = int(secs * SR)
    tt = np.arange(n) / SR
    ir = g.standard_normal(n) * np.exp(-tt * 4)
    ir[0] = 0
    ir /= np.sqrt((ir ** 2).sum())
    y = np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(ir, len(x)), len(x))  # circular: seamless loop
    return x * (1 - mix) + y * mix * 1.5


def master(parts, name, out_dir, target_db=-19.0):
    L = sum(p * g * np.cos((pan + 1) * np.pi / 4) for p, g, pan in parts)
    R = sum(p * g * np.sin((pan + 1) * np.pi / 4) for p, g, pan in parts)
    L, R = reverb(L, seed=1), reverb(R, seed=2)
    rms = np.sqrt(((L ** 2 + R ** 2) / 2).mean())
    gain = 10 ** (target_db / 20) / rms
    L, R = L * gain, R * gain
    peak = max(abs(L).max(), abs(R).max())
    if peak > 0.89:  # soft limit
        L, R = np.tanh(L / 0.89) * 0.89, np.tanh(R / 0.89) * 0.89
    pcm = (np.stack([L, R], 1) * 32767).astype('<i2')
    with wave.open(f'{out_dir}/{name}.wav', 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(name, f'{len(L) / SR:.1f}s')


def mangala(out_dir):
    beat = 60 / 72
    melody = (
        "-2 N_1 R1 G1 M1 P4 | M1 D1 N1 S'2 N1 D1 P4 | M1 G1 R1 G1 M2 P2 | G1 R1 S1 N_1 S4 -2 "
        "| P1 D1 N1 S'1 R'2 S'1 N1 D4 | P1 M1 D1 P1 M1 G1 R2 | G1 M1 P1 M1 G1 R1 S1 N_1 | S6 -2"
    )
    notes = parse(melody, KALYANI)
    total = sum(b for _, b in notes) * beat
    cycles = int(np.ceil(total / (8 * beat)))
    total = cycles * 8 * beat
    lead = nadaswaram(notes, beat, total, vib=0.3)
    drone = ottu(total)
    pattern = ['T...', '..t.', 't...', '..r.', 'T...', '..t.', 't.t.', '....']
    dr = drums(total, beat, pattern)
    jl = jalra_track(total, beat, every=2)
    master([(lead, 1.0, 0.0), (drone, 1.0, -0.15), (dr, 0.55, -0.35), (jl, 0.6, 0.4)], 'mangala', out_dir)


def festive(out_dir):
    beat = 60 / 112
    melody = (
        "S.5 R.5 G1 P1 N1 | P.5 N.5 S'1 N1 P1 | G.5 P.5 N1 P1 G1 | R.5 G.5 R.5 S.5 N_1 S1 "
        "| G.5 P.5 N.5 S'.5 R'1 S'1 | N.5 S'.5 N.5 P.5 G1 P1 | N.5 P.5 G.5 R.5 S1 R1 | G2 -2 "
        "| P1 P.5 N.5 S'2 | R'.5 S'.5 N.5 P.5 N2 | P.5 G.5 R.5 G.5 P1 G1 | R1 S1 N_.5 S1.5 -2"
    )
    notes = parse(melody, HAMSA)
    total = sum(b for _, b in notes) * beat
    cycles = int(np.ceil(total / (8 * beat)))
    total = cycles * 8 * beat
    lead = nadaswaram(notes, beat, total, vib=0.25, glide=0.045)
    drone = ottu(total, level=0.28)
    pattern = ['T.t.', 'tTt.', 'T.tt', '.tT.', 'T.t.', 'tTt.', 'T.tt', 'x.x.']
    dr = drums(total, beat, pattern)
    jl = jalra_track(total, beat, every=0.5)
    master([(lead, 1.0, 0.0), (drone, 1.0, -0.15), (dr, 0.8, -0.3), (jl, 0.75, 0.4)], 'festive', out_dir)


def melam(out_dir):
    beat = 60 / 150
    melody = (
        "S'2 R'.25 S'.25 N.25 S'.25 R'1 | S.25 R.25 G.25 M.25 P.25 D.25 N.25 S'.25 R'2 "
        "| S'.5 N.5 D.5 P.5 M.5 G.5 R.5 S.5 | G.25 M.25 P.25 D.25 N.25 S'.25 R'.25 G'.25 R'2 "
        "| S'1 S'.5 N.5 S'1 R'.5 S'.5 | N.5 D.5 P.5 M.5 G.5 R.5 S1 | P2 N.25 S'.25 R'.25 S'.25 S'4 "
        "| P1 D.25 P.25 M.25 P.25 D1 N.5 S'.5 | R'1 G'.5 R'.5 S'1 N.5 S'.5 "
        "| R'.25 S'.25 N.25 S'.25 R'.25 S'.25 N.25 S'.25 G'2 | R'.5 S'.5 N.5 D.5 P1 M.5 G.5 "
        "| R.25 G.25 M.25 P.25 D.25 N.25 S'.25 R'.25 S'2 | P.5 D.5 N.5 S'.5 S'4"
    )
    notes = parse(melody, SHANKARA)
    total = sum(b for _, b in notes) * beat
    cycles = int(np.ceil(total / (8 * beat)))
    total = cycles * 8 * beat
    lead = nadaswaram(notes, beat, total, vib=0.2, glide=0.03)
    drone = ottu(total, level=0.3)
    # gatti melam: continuous rolls with thom accents
    pattern = ['xtrt', 'Ttrt', 'xtrt', 'Ttrt', 'xtrt', 'Ttrt', 'xtTt', 'xxxx']
    dr = drums(total, beat, pattern)
    jl = jalra_track(total, beat, every=0.5)
    master([(lead, 1.0, 0.0), (drone, 1.0, -0.15), (dr, 0.95, -0.3), (jl, 0.9, 0.4)], 'melam', out_dir, target_db=-17.5)


if __name__ == '__main__':
    out = sys.argv[1]
    mangala(out)
    festive(out)
    melam(out)
