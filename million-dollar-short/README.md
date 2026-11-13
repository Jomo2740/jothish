# What If You Found $1,000,000? (YouTube Short)

Source for a 28.7 s vertical (1080x1920, 30 fps) stickman short: flat 2D stickman cards in a toon-shaded 3D world,
word-by-word captions (white, active word yellow), synthesized music + SFX mixed at 50 % of the voiceover.

- `web/story.js` - shot list (13 shots), cameras, actions, cash-burst physics; all pure functions of the frame
- `web/main.js` - renderer (three.js r160): street, mansion, sports car, bedroom, police station sets
- `web/stick.js` - stickman character drawer (poses, expressions, props, signs)
- `audio/audio2.py` - music + SFX stems; `captions.py` - caption burn-in
- `work/PLAN.md` - shot plan timed to the voiceover
