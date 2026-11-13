#!/usr/bin/env python3
"""Music + SFX stems for "What If You Found $1,000,000?" (all original synthesis).
usage: python3 audio2.py <voice> <outdir> -> outdir/music.wav, outdir/sfx.wav (exact voice length)
Music: bouncy pizzicato/glock groove in C at 116 bpm. Party groove in the mansion stops dead on "theft" (f227),
returns cooler at the car, drops to a low drone for the scared night (f358-410), warm music box for the return +
reward, lullaby for "no fear", the bouncy groove for the call to action, a hit on the cash burst (f822) that
carries into the hook so the loop is seamless.
"""
import sys
import numpy as np
from dsp import SR, ns, tt, rng, lp, hp, bp, colored, smooth_noise, fades, phase, modal, pan, place, widen, make_ir, convolve_st, write_wav
from instruments import m2f, pluck, pad, glock, musicbox, timpani, cymbal, brush, triangle, snare, brass, vibes
from sfx_gen import whoosh, bird_chirps, crickets, clink
from audio import voice_len, step_soft, tap

F = lambda f: f / 30.0


def kick(vel, r):
    t = tt(0.4)
    y = np.sin(phase(52 * (1 + 2.2 * np.exp(-t / 0.03)))) * np.exp(-t / 0.16)
    y += lp(r.standard_normal(len(t)), 1800) * np.exp(-t / 0.004) * 0.3
    return fades(y * vel, 0.0, 0.05)


def music(N):
    r = rng(5)
    out = np.zeros((2, N))
    bpm = 116.0
    beat = 60 / bpm
    C2, G1, A1, F1, E2 = m2f(36), m2f(31), m2f(33), m2f(29), m2f(40)
    roots = [C2, A1, F1, G1]

    def groove(t0, t1, inten=1.0, drums=True, mel=True, brassy=False):
        t, i = t0, 0
        while t < t1 - 0.02:
            bar = i // 4
            b = i % 4
            root = roots[bar % 4]
            if drums:
                if b in (0, 2):
                    place(out, kick(0.8 * inten, r), t, 0.9)
                if b in (1, 3):
                    place(out, pan(snare(0.45 * inten, r, 0.25, tune=1.1, snappy=0.8), 0.1), t, 0.5)
                place(out, pan(brush(0.2 * inten, r, 0.12), 0.35), t + beat / 2, 0.45)
            # bouncy bass: root, octave, fifth, octave
            for k, mul in enumerate([1, 2, 1.5, 2]):
                if k == b:
                    place(out, pan(pluck(root * mul, 0.7, r, dur=0.35, bright=0.4, pos=0.2), -0.05), t, 0.6 * inten)
            if mel:
                motif = [[72, 76, 79, 76], [72, 76, 81, 76], [72, 77, 81, 77], [71, 74, 79, 74]][bar % 4]
                place(out, pan(glock(m2f(motif[b]), 0.42 * inten, r, 0.9), 0.3), t + (beat / 2 if b % 2 else 0), 0.45)
            if brassy and b == 0:
                for m in ([60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62])[bar % 4]:
                    place(out, pan(brass(m2f(m), beat * 0.45, 0.55, r, kind="horn"), 0.0), t, 0.25 * inten)
            t += beat
            i += 1

    # hook + look: groove carries from the loop end, thins for the suspense
    groove(0.0, F(80), 0.85, drums=True, mel=True)
    place(out, pad([m2f(48), m2f(55), m2f(63)], F(142) - F(80), 0.3, r, att=0.5, rel=0.3, warm=700), F(80), 1.0)  # tense minor colour
    for k, tm in enumerate(np.arange(F(84), F(140), beat / 2)):
        place(out, pan(pluck(m2f(60 if k % 2 else 63), 0.35, r, dur=0.25, bright=0.5), 0.2), tm, 0.35)
    # keep it: sly brass stab, then the mansion party
    place(out, pan(brass(m2f(55), 0.35, 0.7, r, kind="horn", scoop=-40), 0.0), F(149), 0.5)
    groove(F(150), F(172), 0.8, drums=False)
    groove(F(172), F(226), 1.1, brassy=True)
    place(out, cymbal(0.5, r, 1.4), F(172), 0.35)
    # theft: dead stop + low drone under the siren
    place(out, pad([m2f(36), m2f(43)], F(245) - F(228), 0.35, r, att=0.05, rel=0.3, warm=400), F(228), 1.0)
    # car: cooler groove (no glock), cymbal on "Rich"
    groove(F(245), F(356), 0.9, mel=False)
    for j, tm in enumerate(np.arange(F(247), F(326), beat * 2)):
        place(out, pan(vibes(m2f([67, 64, 69, 65][j % 4]), 0.4, r, 1.2), 0.3), tm, 0.4)
    place(out, cymbal(0.45, r, 1.6), F(330), 0.3)
    place(out, pan(brass(m2f(60), 0.5, 0.7, r, kind="horn"), 0.0), F(330), 0.35)
    # night: drone + slow heartbeat-ish timpani
    place(out, pad([m2f(37), m2f(44), m2f(49)], F(410) - F(358), 0.38, r, att=0.15, rel=0.25, warm=450), F(358), 1.0)
    # return + reward: warm music box + pad
    place(out, pad([m2f(48), m2f(55), m2f(64)], F(572) - F(412), 0.28, r, att=0.4, rel=0.4, warm=1100), F(412), 1.0)
    mel = [72, 76, 79, 77, 76, 74, 72, 74, 76, 79, 81, 79, 77, 76, 74, 76]
    for j, tm in enumerate(np.arange(F(414), F(570), beat)):
        place(out, pan(musicbox(m2f(mel[j % len(mel)]), 0.42, r, 1.3), 0.2), tm, 0.55)
        if j % 2 == 0:
            place(out, pan(pluck([C2, A1, F1, G1][(j // 4) % 4] * 2, 0.5, r, dur=0.8, bright=0.3), -0.1), tm, 0.45)
    place(out, pan(glock(m2f(84), 0.6, r, 1.6), 0.2), F(551), 0.5)
    # less money / no fear: lullaby
    place(out, pad([m2f(53), m2f(57), m2f(60), m2f(64)], F(640) - F(574), 0.26, r, att=0.4, rel=0.5, warm=900), F(574), 1.0)
    for j, m in enumerate([79, 76, 72, 74, 76, 72, 67, 72]):
        place(out, pan(musicbox(m2f(m), 0.35, r, 1.5), 0.15), F(578) + j * beat * 1.0, 0.5)
    # call to action: bouncy groove; pops; loop ending
    groove(F(642), F(804), 1.0)
    place(out, pan(whoosh(0.3, r, 0.2, 400, 2400), 0.0), F(804), 0.3)
    place(out, pan(timpani(m2f(36), 0.9, r, 1.6), 0.0), F(822), 0.9)
    place(out, cymbal(0.55, r, 1.8), F(822), 0.35)
    groove(F(826), N / SR, 0.85)
    ir = make_ir(1.0, 7, hf=1.4)
    out = out + 0.14 * convolve_st(out, ir)
    return fades(out, 0.0, 0.02)


def rustle(dur, r, dens=14.0):
    n = ns(dur)
    y = np.zeros(n)
    for _ in range(int(dens * dur)):
        i = r.integers(0, max(1, n - ns(0.12)))
        t = tt(0.1)
        y[i: i + len(t)] += bp(r.standard_normal(len(t)), 1800, 7500, 1) * np.exp(-t / 0.018) * r.uniform(0.3, 1.0)
    return y


def thunk(r, f0=110, a=1.0, d=0.35):
    t = tt(d)
    y = np.sin(phase(f0 * (1 + 0.6 * np.exp(-t / 0.02)))) * np.exp(-t / 0.08) * 1.2
    y += lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.02) * 0.8
    return y * a


def pop(r, f0=600, a=1.0):
    t = tt(0.18)
    y = np.sin(phase(f0 * (1 + 1.5 * np.exp(-t / 0.02)))) * np.exp(-t / 0.05)
    return y * a


def siren(dur, r, a=1.0):
    n = ns(dur)
    t = np.arange(n) / SR
    f = np.where((t % 1.1) < 0.55, 960.0, 760.0)
    f = lp(f, 30)
    y = np.sign(np.sin(phase(f))) * 0.4 + np.sin(phase(f)) * 0.6
    y = bp(y, 500, 2200, 1) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.3 * t))
    return fades(y * a, 0.3, 0.3)


def heartbeat(r, a=1.0):
    out = np.zeros(ns(0.6))
    for t0, g in [(0, 1.0), (0.22, 0.7)]:
        x = thunk(r, 55, g, 0.3)
        out[ns(t0): ns(t0) + len(x)] += x[: len(out) - ns(t0)]
    return lp(out, 200) * a


def engine(dur, r, a=1.0):
    n = ns(dur)
    t = np.arange(n) / SR
    f = 40 + 90 * np.clip(t / 0.4, 0, 1) * np.exp(-np.clip(t - 0.4, 0, None) * 1.5)
    y = np.sign(np.sin(phase(f))) + 0.3 * r.standard_normal(n)
    return fades(lp(y, 700) * a, 0.02, 0.3)


def sfx(N):
    r = rng(29)
    out = np.zeros((2, N))
    END = N / SR
    # city ambience on the street shots
    city = lp(colored(N, r, 1.0), 600) * (0.7 + 0.3 * smooth_noise(N, r, 0.3))
    lvl = np.interp(np.arange(N) / SR, [0, F(170), F(174), F(636), F(642), END], [1, 1, 0, 0, 1, 1])
    out += np.stack([city, city]) * lvl[None, :] * 0.25
    place(out, widen(bird_chirps(F(172), r, 0.5), r), 0.0, 0.05)
    place(out, widen(bird_chirps(F(358) - F(245), r, 0.7), r), F(245), 0.06)
    place(out, widen(crickets(F(640) - F(602), r, 3), r), F(602), 0.04)
    # cash flutter (hook carries from the loop end)
    place(out, widen(rustle(F(140), r, 12) * np.linspace(1, 0.3, ns(F(140))), r), 0.0, 0.35)
    place(out, pan(glock(m2f(96), 0.6, r, 1.2), 0.2), F(36), 0.35)
    place(out, pan(triangle(0.4, r, 1.2), 0.3), F(37), 0.3)
    # look left/right, heartbeat on "What do you do"
    place(out, pan(whoosh(0.25, r, 0.15, 500, 2600), -0.4), F(86), 0.18)
    place(out, pan(whoosh(0.25, r, 0.15, 500, 2600), 0.4), F(99), 0.18)
    for fh in (118, 134):
        place(out, heartbeat(r, 0.9), F(fh), 0.7)
    # keep it: grab
    place(out, pan(whoosh(0.2, r, 0.15, 400, 3000), 0.0), F(146), 0.3)
    place(out, pan(thunk(r, 140, 0.8), 0.0), F(149), 0.6)
    place(out, pan(rustle(0.4, r, 30), 0.0), F(149), 0.4)
    # mansion: flash whoosh, raining cash, siren + sting on "theft"
    place(out, pan(whoosh(0.5, r, 0.35, 300, 4000, 0.8, 0.1, 0.3), 0.0), F(170), 0.35)
    place(out, widen(rustle(F(227) - F(172), r, 10), r), F(172), 0.25)
    place(out, widen(siren(F(245) - F(221), r, 1.0), r), F(221), 0.22)
    place(out, pan(thunk(r, 50, 1.2, 0.8), 0.0), F(227), 0.7)
    place(out, pan(whoosh(0.35, r, 0.3, 200, 900), 0.0), F(226), 0.3)
    # car: engine rev, phone beep on "noticed"
    place(out, pan(engine(1.4, r, 0.8), -0.4), F(247), 0.25)
    for k in range(2):
        t0 = F(289) + k * 0.16
        tb = tt(0.1)
        place(out, pan(np.sin(phase(1400 * np.ones(len(tb)))) * np.exp(-tb / 0.06), 0.4), t0, 0.12)
    place(out, pan(pop(r, 700, 0.8), 0.4), F(289), 0.3)
    # night: siren through the window, heartbeat, jolt
    place(out, pan(whoosh(0.4, r, 0.25, 200, 1200), 0.0), F(356), 0.25)
    place(out, widen(siren(F(410) - F(358), r, 1.0), r), F(358), 0.35)
    for fh in (362, 380, 398):
        place(out, heartbeat(r, 1.0), F(fh), 0.8)
    # station: bag on the desk, surprise pop, cane + steps, joy
    place(out, pan(thunk(r, 120, 1.0), 0.0), F(416), 0.7)
    place(out, pan(pop(r, 520, 1.0), 0.2), F(420), 0.35)
    for k, fs in enumerate(np.arange(446, 472, 7)):
        place(out, pan(step_soft(r, 0.45), 0.4), F(fs), 0.6)
        if k % 2 == 0:
            place(out, pan(tap(r, 1800, 0.35), 0.4), F(fs + 2), 0.4)
    place(out, pan(rustle(0.3, r, 20), 0.3), F(478), 0.35)
    place(out, pan(glock(m2f(88), 0.5, r, 1.4), 0.2), F(479), 0.3)
    # reward: envelope, paper
    place(out, pan(rustle(0.35, r, 25), 0.0), F(548), 0.35)
    place(out, pan(rustle(0.4, r, 25), 0.0), F(574), 0.35)
    # call to action: steps, point pop, sign pops
    for fs in np.arange(644, 680, 9):
        place(out, pan(step_soft(r, 0.45), 0.1), F(fs), 0.55)
    place(out, pan(whoosh(0.25, r, 0.2, 400, 2600), 0.0), F(683), 0.3)
    place(out, pan(pop(r, 650, 0.9), 0.0), F(686), 0.35)
    place(out, pan(pop(r, 560, 1.0), -0.35), F(725), 0.4)
    place(out, pan(pop(r, 760, 1.0), 0.35), F(745), 0.4)
    # trip + burst (loops into the hook)
    for fs in np.arange(778, 804, 8):
        place(out, pan(step_soft(r, 0.45), 0.0), F(fs), 0.55)
    place(out, pan(thunk(r, 180, 0.6, 0.2), 0.1), F(804), 0.5)
    place(out, pan(whoosh(0.4, r, 0.3, 300, 2400), 0.0), F(806), 0.35)
    place(out, pan(thunk(r, 80, 1.0), 0.0), F(818), 0.6)
    place(out, pan(whoosh(0.3, r, 0.2, 600, 5000, 0.8, 0.05, 0.4), 0.0), F(821), 0.35)
    place(out, pan(thunk(r, 70, 0.9, 0.5), 0.0), F(822), 0.5)
    place(out, widen(rustle(END - F(822), r, 16), r), F(822), 0.38)
    place(out, pan(glock(m2f(96), 0.5, r, 1.0), 0.2), F(823), 0.3)
    return fades(out, 0.0, 0.02)


if __name__ == "__main__":
    voice, outdir = sys.argv[1], sys.argv[2]
    N = voice_len(voice)
    m = music(N)
    s = sfx(N)
    write_wav(f"{outdir}/music.wav", m / max(1e-9, np.abs(m).max()) * 0.5)
    write_wav(f"{outdir}/sfx.wav", s / max(1e-9, np.abs(s).max()) * 0.5)
    print("stems written", N / SR, "s")
