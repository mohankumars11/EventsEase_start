#!/usr/bin/env python3
"""
Generate every Sambramo card image from docs/image-prompts/SAMBRAMO-IMAGE-PROMPTS.md
with the OpenAI Images API (gpt-image-1) — one image per "- <id>: <scene>" line.

  python scripts/generate_images.py                 # everything still missing
  python scripts/generate_images.py --only cat-     # just the 18 categories
  python scripts/generate_images.py --only occ-     # occasions
  python scripts/generate_images.py --limit 5       # try a few first
  python scripts/generate_images.py --quality high  # low | medium (default) | high

Needs OPENAI_API_KEY in .env (or the environment). Standard library only.
Output: generated-images/<id>.png  — already named by ID; existing files are
skipped, so a stopped run just continues where it left off.
"""
import base64, json, os, re, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROMPTS = os.path.join(ROOT, 'docs', 'image-prompts', 'SAMBRAMO-IMAGE-PROMPTS.md')
OUT = os.path.join(ROOT, 'generated-images')

STYLE = ("High-quality 3D animated character illustration — soft rounded features, large expressive friendly eyes, "
         "smooth glossy skin, Indian characters in detailed Indian clothing and jewellery, warm soft studio lighting, "
         "heartfelt emotion that fits the scene. Original characters only; do not resemble any real person, celebrity, "
         "or existing film or cartoon character. Isolated on a pure white background, no scenery, no floor, no ground "
         "shadow; the bottom of the figures fades softly into white. Characters shown from the waist or knees up, "
         "centred, with white space around them. Only the props named in the scene. No text, no letters, no logos, "
         "no brand names, no watermark.")


def env_key():
    if os.environ.get('OPENAI_API_KEY'):
        return os.environ['OPENAI_API_KEY']
    for name in ('.env', '.env.local'):
        p = os.path.join(ROOT, name)
        if os.path.exists(p):
            for line in open(p, encoding='utf-8'):
                if line.startswith('OPENAI_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"')
    sys.exit('OPENAI_API_KEY is not set (add it to EventsEase_start/.env)')


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    key = env_key()
    only, limit, quality = arg('--only', ''), int(arg('--limit', '0') or 0), arg('--quality', 'medium')
    items = re.findall(r'^- ((?:cat|occ|svc)-[a-z0-9_-]+): (.+)$', open(PROMPTS, encoding='utf-8').read(), re.M)
    items = [(i, s) for i, s in items if i.startswith(only)]
    os.makedirs(OUT, exist_ok=True)
    todo = [(i, s) for i, s in items if not os.path.exists(os.path.join(OUT, i + '.png'))]
    if limit:
        todo = todo[:limit]
    print(f'{len(items)} prompts, {len(items) - len([1 for i, _ in items if not os.path.exists(os.path.join(OUT, i + ".png"))])} done, generating {len(todo)}')

    failed = []
    for n, (iid, scene) in enumerate(todo, 1):
        body = json.dumps({'model': 'gpt-image-1', 'prompt': f'{scene}. {STYLE}', 'size': '1024x1024',
                           'quality': quality, 'n': 1}).encode()
        for attempt in range(4):
            try:
                req = urllib.request.Request('https://api.openai.com/v1/images/generations', data=body,
                                             headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=240) as r:
                    data = json.load(r)['data'][0]
                png = base64.b64decode(data['b64_json']) if data.get('b64_json') else urllib.request.urlopen(data['url']).read()
                open(os.path.join(OUT, iid + '.png'), 'wb').write(png)
                print(f'[{n}/{len(todo)}] {iid} ok')
                break
            except urllib.error.HTTPError as e:
                msg = e.read().decode(errors='ignore')[:300]
                if e.code in (429, 500, 502, 503) and attempt < 3:
                    time.sleep(20 * (attempt + 1)); continue
                if e.code in (401, 402) or 'billing' in msg or 'quota' in msg:
                    sys.exit(f'stopped: {e.code} {msg}')
                print(f'[{n}/{len(todo)}] {iid} FAILED {e.code} {msg}'); failed.append(iid); break
            except Exception as e:
                if attempt < 3:
                    time.sleep(10); continue
                print(f'[{n}/{len(todo)}] {iid} FAILED {e}'); failed.append(iid)
    print(f'\ndone. failed: {len(failed)} {failed if failed else ""}')


if __name__ == '__main__':
    main()
