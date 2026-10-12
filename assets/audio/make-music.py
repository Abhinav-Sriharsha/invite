# Procedural "pelli" background music: tanpura drone + veena-like plucks in raga Mohanam + soft temple bell.
import numpy as np, wave, sys
SR = 32000
rng = np.random.default_rng(7)
BEAT = 0.8                      # slow, ~75 bpm
SA = 146.83                     # D3
DEG = {'S': 0, 'R': 2, 'G': 4, 'P': 7, 'D': 9}
LOOP = 136 * BEAT                # 136 beats, ~109 s
N = int(LOOP * SR)
TAIL = int(6 * SR)
L = np.zeros(N + TAIL); R = np.zeros(N + TAIL)

def add(buf_l, buf_r, sig, t0, pan=0.0):
    i = int(t0 * SR); j = min(i + len(sig), len(buf_l))
    if j <= i: return
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf_l[i:j] += sig[:j - i] * gl; buf_r[i:j] += sig[:j - i] * gr

def tanpura(f, dur=6.0):
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for k in range(1, 28):
        amp = 1 / k ** 0.9
        # jawari: upper harmonics bloom after the pluck, then fade
        bloom = (1 - np.exp(-t * (1.5 + 0.15 * k))) if k > 3 else 1
        env = np.exp(-t * (0.35 + 0.045 * k)) * bloom
        for det in (-0.6, 0.6):
            out += 0.5 * amp * env * np.sin(2 * np.pi * (k * f + det * k * 0.02) * t + rng.uniform(0, 6.28))
    out *= np.minimum(1, t / 0.01)
    return out / 6

def pluck(f, dur=3.2, slide=False):
    t = np.arange(int(dur * SR)) / SR
    ff = f * (1 - 0.06 * np.exp(-t / 0.05)) if slide else f   # gentle gamaka into the note
    ph = 2 * np.pi * np.cumsum(np.full_like(t, 1.0) * ff) / SR
    out = np.zeros_like(t)
    for k in range(1, 14):
        a = abs(np.sin(np.pi * k * 0.18)) / k ** 1.05
        out += a * np.exp(-t * (0.9 + 0.55 * k)) * np.sin(k * ph * (1 + 0.0004 * k * k))
    out *= np.minimum(1, t / 0.004)
    return out / 3

def bell(f=880, dur=5.0):
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for r, a, d in ((1, 1, 0.9), (2.0, .5, 1.3), (2.76, .35, 1.8), (5.4, .2, 3), (8.93, .1, 4.5)):
        out += a * np.exp(-t * d) * np.sin(2 * np.pi * f * r * t)
    return out * np.minimum(1, t / 0.002) / 4

# --- tanpura cycle: P, S', S', S (every 4 beats), the whole loop
tp = [(SA * 2 ** (7 / 12) / 2 * 2, -0.5), (SA * 2, 0.3), (SA * 2, 0.4), (SA, -0.2)]   # P, Sa, Sa, low Sa
notes_cache = {}
t = 0.0
while t < LOOP:
    for f, pan in tp:
        key = round(f, 2)
        if key not in notes_cache: notes_cache[key] = tanpura(f)
        add(L, R, notes_cache[key] * 0.55, t, pan)
        t += BEAT
# --- melody, octave of D4 (with '_' = lower octave, "'" = upper)
def hz(n):
    o = 2 if n.endswith("'") else (0.5 if n.endswith('_') else 1)
    return SA * 2 * 2 ** (DEG[n[0]] / 12) * o
A = "G1 P1 D2 P1 G1 R2 | S1 R1 G2 R1 S1 D_2 | S1 R1 G1 P1 G2 R2 | S4 -4"
B = "P1 D1 S'2 D1 P1 G2 | R1 G1 P1 G1 R2 S2 | D_1 S1 R1 G1 P2 G2 | R2 S2 -4"
Cq = "-8 | G2 P2 D4 | P2 G2 R4 | S4 -4"   # sparse, calm
form = [A, B, Cq, B]
t = 4 * BEAT
for line in form:
    for tok in line.replace('|', ' ').split():
        n, d = (tok[:-1], int(tok[-1])) if tok[0] != '-' else ('-', int(tok[1:]))
        if n != '-':
            sig = pluck(hz(n), slide=(rng.random() < 0.35))
            add(L, R, sig * 0.9, t, 0.05)
            # a quiet octave double for the long notes
            if d >= 2: add(L, R, pluck(hz(n) * 2, 2.0) * 0.18, t + 0.01, -0.1)
        t += d * BEAT
# --- a soft temple bell at the start of each half
for tb in (0.0, LOOP / 2):
    add(L, R, bell(SA * 8 * 2 ** (7/12) / 2) * 0.35, tb + 0.05, 0.4)

# --- wrap the tail into the start so the loop is seamless
L[:TAIL] += L[N:]; R[:TAIL] += R[N:]
L, R = L[:N], R[:N]
# --- simple reverb: convolve with decaying noise (FFT)
def reverb(x, secs=2.2, mix=0.28, seed=1):
    g = np.random.default_rng(seed)
    n = int(secs * SR); tt = np.arange(n) / SR
    ir = g.standard_normal(n) * np.exp(-tt * 3.2); ir[0] = 0; ir /= np.sqrt((ir ** 2).sum())
    # circular convolution keeps the loop seamless
    y = np.fft.irfft(np.fft.rfft(x) * np.fft.rfft(ir, len(x)), len(x))
    return x * (1 - mix) + y * mix * 1.6
L, R = reverb(L, seed=1), reverb(R, seed=2)
# gentle low-pass for warmth (one-pole) applied circularly-ish
def lp(x, fc=5200):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = x[-1]
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
L, R = lp(L), lp(R)
peak = max(abs(L).max(), abs(R).max()); L, R = L / peak * 0.6, R / peak * 0.6
rms = np.sqrt(((L ** 2 + R ** 2) / 2).mean())
print('seconds', N / SR, 'rms dBFS', 20 * np.log10(rms))
pcm = (np.stack([L, R], 1) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
