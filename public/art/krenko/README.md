# Krenko Sprite Slots

Drop your final pixel art files in this folder using these exact names:

- `krenko-boss.png` - centered Krenko sprite
- `krenko-minion-a.png` - small goblin sprite variant A
- `krenko-minion-b.png` - small goblin sprite variant B

Runtime fallback order is:

- boss: `krenko-boss.png` -> `leader-ref.png`
- minion A: `krenko-minion-a.png` -> `token-ref.png`
- minion B: `krenko-minion-b.png` -> `token-ref-2.png`

When both minion files are present, each goblin generation is assigned (deterministically) to A or B,
and also assigned a left/right facing mirror.
