"""分析整幅原画之间的运动对应关系；输出向量场数据，不修改或生成角色原画。"""
import json
import hashlib
from pathlib import Path
import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
manifest = json.loads((ROOT / 'artifacts/flow-input.json').read_text(encoding='utf-8'))
size, grid, columns = 256, 64, 8
cache, fields, entries = {}, [], {}

def frame(atlas, number):
    key = (atlas, number)
    if key not in cache:
        img = cv2.imread(str(ROOT / 'assets/whale' / (atlas + '.png')), cv2.IMREAD_UNCHANGED)
        cell = img.shape[1] // 4
        x, y = number % 4 * cell, number // 4 * cell
        tile = cv2.resize(img[y:y+cell, x:x+cell], (size, size), interpolation=cv2.INTER_AREA)
        alpha = tile[:, :, 3:4].astype(np.float32) / 255
        color = tile[:, :, :3] * alpha + np.array([248, 241, 237]) * (1-alpha)
        cache[key] = cv2.cvtColor(color.astype(np.uint8), cv2.COLOR_BGR2GRAY)
    return cache[key]

for group in manifest:
    frames = group['frames']
    for i, a in enumerate(frames):
        if i == len(frames)-1 and not group['loop']:
            continue
        b = frames[(i+1) % len(frames)]
        key = f"{group['atlas']}:{a}:{b}"
        if key in entries:
            continue
        first, second = frame(group['atlas'], a), frame(group['atlas'], b)
        vectors = []
        for before, after in [(first, second), (second, first)]:
            flow = cv2.calcOpticalFlowFarneback(before, after, None, .5, 4, 25, 7, 7, 1.5, 0)
            vectors.append(cv2.resize(flow, (grid, grid), interpolation=cv2.INTER_AREA))
        encoded = np.clip(np.rint(np.concatenate(vectors, axis=2) * 4 + 128), 1, 255).astype(np.uint8)
        entries[key] = len(fields)
        fields.append(encoded)

# PNG 只是四通道向量数据容器；RGBA 分别保存前向 dx/dy 与反向 dx/dy。
atlas = np.full(((len(fields)+columns-1)//columns*grid, columns*grid, 4), 128, np.uint8)
for i, field in enumerate(fields):
    y, x = i//columns*grid, i % columns*grid
    atlas[y:y+grid, x:x+grid] = field
cv2.imwrite(str(ROOT/'assets/whale/motion-flow.png'), cv2.cvtColor(atlas, cv2.COLOR_RGBA2BGRA))
data = {'size': size, 'grid': grid, 'columns': columns, 'rows': atlas.shape[0]//grid, 'entries': entries}
data['sourceHashes'] = {name:hashlib.sha256((ROOT/'assets/whale'/f'{name}.png').read_bytes()).hexdigest() for name in {g['atlas'] for g in manifest}}
(ROOT/'assets/whale/motion-flow.js').write_text('globalThis.PetFlowData='+json.dumps(data,separators=(',', ':'))+';\n', encoding='utf-8')
print(f'Analyzed {len(fields)} forward/backward frame pairs')
