#!/usr/bin/env python3
"""
Generate every Sambramo card image from docs/image-prompts/SAMBRAMO-IMAGE-PROMPTS.md
with the OpenAI Images API (gpt-image-1) — one image per "- <id>: <scene>" line.

  python scripts/generate_images.py                 # everything still missing
  python scripts/generate_images.py --only cat-     # just the 18 categories
  python scripts/generate_images.py --only occ-     # occasions
  python scripts/generate_images.py --limit 5       # try a few first
  python scripts/generate_images.py --quality high  # low | medium (default) | high
  python scripts/generate_images.py --ref           # also send the style reference image
  python scripts/generate_images.py --model gpt-image-1   # default: chatgpt-image-latest (what ChatGPT uses)

MODEL: chatgpt-image-latest, the model behind ChatGPT's images - gpt-image-1
washed every background pink and drew the adults as children (tested
2026-10-23). --ref sends docs/image-prompts/style-reference.png through the
edits endpoint; off by default because it made results worse, not better.

Needs OPENAI_API_KEY in .env (or the environment). Standard library only.
Output: generated-images/<id>.png  — already named by ID; existing files are
skipped, so a stopped run just continues where it left off. Then
`node scripts/customer-art.mjs import` makes the app's 512 px WebPs.
hero-* ids are generated wide (1536x1024), everything else square.
"""
import base64, json, os, re, sys, time, uuid, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROMPTS = os.path.join(ROOT, 'docs', 'image-prompts', 'SAMBRAMO-IMAGE-PROMPTS.md')
OUT = os.path.join(ROOT, 'generated-images')
REF = os.path.join(ROOT, 'docs', 'image-prompts', 'style-reference.png')
# id -> what the image is ("Dealer Meet, a Corporate & Business occasion"); scripts/image-titles.mjs writes it
TITLES = os.path.join(ROOT, 'docs', 'image-prompts', 'titles.json')

STYLE = ("Stylised 3D CARTOON character illustration in the style of a family animated feature film - NOT "
         "photorealistic, NOT a photo, NOT semi-realistic. Characters have oversized round sparkling eyes with big "
         "irises and catchlights, small cute noses, soft rounded cartoon faces, wide joyful smiles, glossy voluminous "
         "stylised hair, smooth soft-shaded skin, rich detailed Indian clothing with embroidery and gold jewellery, "
         "soft warm studio lighting, joyful exaggerated expressions. "
         "Adults look like good-looking adults in their twenties "
         "to forties with natural proportions (not children unless the scene names a child). Original characters "
         "only - do not resemble any real person, celebrity or existing film character. Background: PURE WHITE "
         "(#FFFFFF), completely plain and seamless - no colour wash, no gradient, no backdrop, no floor, no shadow "
         "on the ground. The figures are shown waist-up or knees-up, centred, and their lower edge fades softly "
         "into the white. Small props named in the scene may float on the white (petals, sparkles, balloons). "
         "No text, no letters, no logos, no watermark.")


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


def multipart(fields, files):
    b, nl = uuid.uuid4().hex, bytes([13, 10])
    out = b''
    for k, v in fields.items():
        out += f'--{b}'.encode() + nl + f'Content-Disposition: form-data; name="{k}"'.encode() + nl + nl + str(v).encode() + nl
    for k, (name, data) in files.items():
        out += (f'--{b}'.encode() + nl + f'Content-Disposition: form-data; name="{k}"; filename="{name}"'.encode() + nl
                + b'Content-Type: image/png' + nl + nl + data + nl)
    return out + f'--{b}--'.encode() + nl, f'multipart/form-data; boundary={b}'


def brief(iid, scene, titles):
    """The scene alone is not enough: told only 'two leaders shaking hands', the model
    draws a handshake, not a Business Summit. So every prompt says what the card is FOR."""
    what = titles.get(iid)
    lead = (f'This is the card image for {what} in an Indian events app. A customer must recognise at a glance '
            f'that it shows exactly this, so include the setting cues, clothing and props that make it unmistakable. '
            if what else '')
    return (lead + 'Make it heartfelt and emotional - warm smiles, love, pride, joy - so it moves the viewer. '
            'Wherever a family appears, the parents are a young husband and wife unless the scene names grandparents. '
            f'Scene: {scene}.')


def request(key, iid, scene, quality, ref, titles):
    size = '1536x1024' if iid.startswith('hero-') else '1024x1024'
    model = arg('--model', 'chatgpt-image-latest')
    if ref:
        prompt = (f'Create a NEW illustration in exactly the same 3D animated art style, rendering, lighting, skin, '
                  f'eye style and pure white background as the reference image. Do not reuse the reference people, '
                  f'pose or props. {brief(iid, scene, titles)} {STYLE}')
        body, ctype = multipart({'model': model, 'prompt': prompt, 'size': size, 'quality': quality, 'n': '1'},
                                {'image[]': ('reference.png', ref)})
        url = 'https://api.openai.com/v1/images/edits'
    else:
        body = json.dumps({'model': model, 'prompt': STYLE + ' ' + brief(iid, scene, titles), 'size': size, 'quality': quality, 'n': 1}).encode()
        ctype, url = 'application/json', 'https://api.openai.com/v1/images/generations'
    return urllib.request.Request(url, data=body, headers={'Authorization': f'Bearer {key}', 'Content-Type': ctype})


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def main():
    key = env_key()
    only, limit, quality = arg('--only', ''), int(arg('--limit', '0') or 0), arg('--quality', 'medium')
    items = re.findall(r'^- ((?:hero|cat|occ|svc)-[a-z0-9_-]+): (.+)$', open(PROMPTS, encoding='utf-8').read(), re.M)
    items = [(i, s) for i, s in items if i.startswith(only)]
    os.makedirs(OUT, exist_ok=True)
    todo = [(i, s) for i, s in items if not os.path.exists(os.path.join(OUT, i + '.png'))]
    if limit:
        todo = todo[:limit]
    print(f'{len(items)} prompts, {len(items) - len([1 for i, _ in items if not os.path.exists(os.path.join(OUT, i + ".png"))])} done, generating {len(todo)}')

    ref = open(REF, 'rb').read() if '--ref' in sys.argv and os.path.exists(REF) else None
    print('style reference:', 'docs/image-prompts/style-reference.png' if ref else 'none')
    titles = json.load(open(TITLES, encoding='utf-8')) if os.path.exists(TITLES) else {}
    print('titles:', len(titles) or 'MISSING - run node scripts/image-titles.mjs')
    failed = []
    for n, (iid, scene) in enumerate(todo, 1):
        for attempt in range(4):
            try:
                req = request(key, iid, scene, quality, ref, titles)
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
