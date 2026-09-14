"""Render the unmodified PDF; SVG export loses PDF clipping groups."""
import json
import pathlib
import sys
sys.path.insert(0, '.cache/python')
import pymupdf as fitz
source = next(pathlib.Path('C:/Users/The Force/Desktop').glob('Terceiro Espa*PITCH.pdf'))
document = fitz.open(source)
pathlib.Path('tmp/rendered').mkdir(parents=True, exist_ok=True)
manifest = []
for index, page in enumerate(document):
    number = index + 1
    page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).save(f'tmp/rendered/{number:02}.png')
    page.get_pixmap(matrix=fitz.Matrix(.25, .25), alpha=False).save(f'public/slides/{number:02}-thumb.jpg')
    corner = page.get_pixmap(matrix=fitz.Matrix(.01, .01)).pixel(0, 0)
    content = page.get_text().strip()
    manifest.append({'number': number, 'background': '#' + ''.join(f'{v:02x}' for v in corner[:3]), 'text': content, 'title': content.split('\n')[0] if content else ('Terceiro Espaço' if number == 1 else 'O espaço'), 'src': f'/slides/{number:02}.webp', 'thumbnail': f'/slides/{number:02}-thumb.jpg'})
pathlib.Path('lib/slides.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Rendered {len(manifest)} original pages at 3840 x 2160')
