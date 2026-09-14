"""Recompose the original PDF in 9:16, retaining its Type3 glyphs and artwork.

Design coordinates are 1080 x 1920; the delivery raster is 2160 x 3840.
No replacement fonts or generated copy are used. Crop mappings also position
the existing video overlays in the responsive presentation.
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, '.cache/python')
import pymupdf as fitz

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = next((ROOT.parent).glob('Terceiro Espa*PITCH.pdf'))
src = fitz.open(SOURCE)
text_src = fitz.open(SOURCE)
# Architectural captions sit over photos. Retain their original vector glyphs
# on a clean white header, without copying fragments of the photo per word.
for n in (8, 9):
    for xref in text_src[n - 1].get_contents():
        stream = re.sub(rb'/X\d+ Do', b'', text_src.xref_stream(xref))
        text_src.update_stream(xref, stream)
deck = fitz.open()
slides = json.loads((ROOT / 'lib/slides.json').read_text(encoding='utf-8'))
output = ROOT / 'tmp/portrait'
output.mkdir(parents=True, exist_ok=True)
(ROOT / 'public/portrait').mkdir(exist_ok=True)
manifest = []
page = None
number = 0
placements = []
render_pages = set(map(int, sys.argv[1:])) if len(sys.argv) > 1 else set(range(1, 46))


def place(clip, target, rotate=0):
    """Fit a source crop without stretching; save its exact coordinate map."""
    c, t = fitz.Rect(clip), fitz.Rect(target)
    page.show_pdf_page(t, src, number - 1, clip=c, rotate=rotate)
    if not rotate:
        scale = min(t.width / c.width, t.height / c.height)
        x = t.x0 + (t.width - c.width * scale) / 2
        y = t.y0 + (t.height - c.height * scale) / 2
        placements.append({'source': list(c), 'target': [x, y, c.width * scale, c.height * scale]})


def words_in(area):
    area = fitz.Rect(area)
    return [w for w in src[number - 1].get_text('words', sort=True)
            if area.contains(fitz.Point((w[0] + w[2]) / 2, (w[1] + w[3]) / 2))]


def flow(area, x, y, width, size, original_size, align='center', leading=1.22):
    """Wrap original word glyphs. Source line boundaries aren't paragraph breaks."""
    words = words_in(area)
    if not words:
        raise ValueError(f'No words on page {number}, region {area}')
    scale = size / original_size
    gap = size * .25
    lines, line, used = [], [], 0
    for word in words:
        w = (word[2] - word[0]) * scale
        if line and used + gap + w > width:
            lines.append((line, used))
            line, used = [], 0
        if line:
            used += gap
        line.append(word)
        used += w
    if line:
        lines.append((line, used))
    for row, (line, used) in enumerate(lines):
        cursor = x + ((width - used) / 2 if align == 'center' else 0)
        for word in line:
            # Type3 extraction boxes are taller than the ink. Trim only the
            # empty ascender margin so adjacent source lines never bleed in.
            trim = .08 if original_size < 80 and number not in (43, 44) else .24
            clip = fitz.Rect(word[0] - .45, word[1] + original_size * trim,
                             word[2] + .45, word[1] + original_size * 1.19)
            target = fitz.Rect(cursor - .45 * scale, y + row * size * leading,
                               cursor + (word[2] - word[0] + .45) * scale,
                               y + row * size * leading + clip.height * scale)
            page.show_pdf_page(target, text_src if number in (8, 9) else src, number - 1, clip=clip)
            cursor += (word[2] - word[0]) * scale + gap
    end = y + len(lines) * size * leading
    if end > 1800:
        raise ValueError(f'Text overflow on page {number}: {end}')
    return end


def footer():
    if words_in((750, 980, 1160, 1040)):
        if number in (8, 9):
            page.show_pdf_page(fitz.Rect(410, 1822, 670, 1872), text_src, number - 1,
                               clip=fitz.Rect(827, 984, 1094, 1035))
        else:
            place((827, 984, 1094, 1035), (410, 1822, 670, 1872))


def heading(original=50, area=(0, 0, 1920, 120), size=70, y=90):
    return flow(area, 70, y, 940, size, original)


def gallery_header(body_end=225, original=50, title_size=68):
    bottom = heading(original, size=title_size)
    return flow((0, 120 if original == 50 else 172, 1920, body_end),
                92, bottom + 36, 896, 31, 25) + 70


def grid(crops, y, bottom=1735, columns=2, gap=14):
    rows = (len(crops) + columns - 1) // columns
    w = (972 - (columns - 1) * gap) / columns
    h = (bottom - y - (rows - 1) * gap) / rows
    for i, crop in enumerate(crops):
        x = 54 + i % columns * (w + gap)
        top = y + i // columns * (h + gap)
        place(crop, (x, top, x + w, top + h))


for number in range(1, 46):
    page = deck.new_page(width=1080, height=1920)
    placements = []
    color = slides[number - 1]['background']
    if number in (6, 8, 9):
        color = '#ffffff'
    rgb = tuple(int(color[i:i+2], 16) / 255 for i in (1, 3, 5))
    page.draw_rect(page.rect, color=rgb, fill=rgb)

    if number == 1:
        place((300, 0, 1620, 1080), (0, 518.1818, 1080, 1401.8182))
    elif number in (2, 4, 5, 7):
        area = (0, 100, 1920, 950)
        count = len(words_in(area))
        size = 90 if number == 2 else 78
        # Center the complete statement vertically using its wrapped line count.
        total = sum((w[2] - w[0]) * size / 120 + size * .25 for w in words_in(area))
        estimated_lines = max(1, round(total / 850 + .5))
        flow(area, 90, 880 - estimated_lines * size * 1.22 / 2,
             900, size, 120)
    elif number == 3:
        for i, sy in enumerate((155, 355, 555, 758)):
            end = flow((0, sy, 1920, sy + 60), 86, 240 + i * 365, 908, 42, 40)
            flow((0, sy + 61, 1920, sy + 110), 90, end + 23, 900, 27, 25)
    elif number == 6:
        grid([(25, 25, 960, 975), (966, 25, 1895, 975)], 100, 1750, columns=1, gap=36)
    elif number in (8, 9, 10):
        # Reframe the architectural photo for the tall display; retain its caption.
        place((660, 135, 1260, 957), (0, 330, 1080, 1810))
        page.draw_rect((0, 0, 1080, 330), fill=rgb, color=rgb)
        flow((0, 0, 1920, 140), 90, 90, 900, 34, 20)
    elif number == 11:
        flow((0, 80, 1920, 160), 90, 270, 900, 40, 40)
        for i, sy in enumerate((210, 375, 540, 705)):
            flow((0, sy, 1920, sy + 150), 90, 560 + i * 235, 900, 83, 120)
    elif number in (12, 13, 14, 23, 27, 29, 30):
        end = gallery_header()
        if number in (12, 13, 14):
            xs = [60, 512, 965, 1418]
            ys = [(270, 578), (591, 900)]
        elif number == 23:
            xs = [60, 512, 965, 1418]
            ys = [(215, 580), (606, 967)]
        else:
            xs = [54, 509, 963, 1417]
            ys = [(233, 600), (613, 978)]
        crops = [(x, y0, x + 443, y1) for y0, y1 in ys for x in xs]
        grid(crops, max(end, 420), bottom=1760)
    elif number == 15:
        heading(size=78)
        for i in range(4):
            x, y = 54 + i % 2 * 496, 310 + i // 2 * 735
            place((40 + i * 460, 195, 500 + i * 460, 885), (x, y, x + 460, y + 690))
    elif number in (16, 24, 35, 41):
        heading(original=200, area=(0, 30, 1920, 315), size=108, y=275)
        if number == 16:
            clip = (650, 330, 1290, 970)
        elif number in (24, 35):
            clip = (680, 320, 1320, 960)
        else:
            clip = (580, 330, 1340, 1010)
        place(clip, (115, 670, 965, 1520))
    elif number in (17, 25, 36):
        if number == 17:
            flow((0, 170, 1920, 240), 80, 235, 920, 38, 40)
            end = flow((0, 260, 1920, 445), 70, 360, 940, 102, 120)
            for area in [(0, 475, 1920, 585), (0, 610, 1920, 810), (0, 830, 1920, 940)]:
                end = flow(area, 100, end + 90, 880, 43, 40)
        elif number == 25:
            flow((0, 120, 1920, 300), 80, 340, 920, 38, 40)
            end = flow((0, 300, 1920, 490), 70, 480, 940, 110, 120)
            end = flow((0, 500, 1920, 690), 100, end + 120, 880, 44, 40)
            flow((0, 700, 1920, 850), 100, end + 70, 880, 44, 40)
        else:
            flow((0, 120, 1920, 280), 80, 210, 920, 38, 40)
            end = flow((0, 280, 1920, 555), 70, 340, 940, 88, 120)
            end = flow((0, 555, 1920, 690), 100, end + 90, 880, 42, 40)
            flow((0, 700, 1920, 870), 100, end + 65, 880, 42, 40)
    elif 18 <= number <= 22:
        for i in range(4):
            x, y = 54 + i % 2 * 498, 65 + i // 2 * 870
            left = 50 + i * 464.521484
            place((left, 136, left + 440, 924), (x, y, x + 474, y + 849))
    elif number in (26, 34):
        place((660, 0, 1267.5, 1080), (0, 0, 1080, 1920))
    elif number == 28:
        end = gallery_header()
        place((54, 235, 952, 978), (54, max(end, 400), 1026, 1185))
        grid([(964, 235, 1413, 600), (1421, 235, 1870, 600),
              (964, 613, 1413, 978), (1421, 613, 1870, 978)], 1200, 1770)
    elif number in (31, 37, 39, 40):
        end = gallery_header(body_end=290 if number >= 37 else 225,
                             original=120 if number >= 37 else 50,
                             title_size=110 if number >= 37 else 68)
        top = 310 if number >= 37 else 240
        bottom = 950 if number >= 37 else 950
        grid([(54, top, 955, bottom), (965, top, 1870, bottom)], max(end, 420), 1760, columns=1, gap=25)
    elif number == 32:
        end = gallery_header()
        place((394, 254, 741, 955), (145, 490, 485, 1178))
        place((793, 240, 1698, 950), (430, 1040, 1040, 1518))
    elif number == 33:
        flow((0, 20, 1920, 200), 90, 135, 900, 38, 25)
        place((105, 255, 1815, 885), (65, 300, 1015, 650))
        place((105, 255, 965, 885), (65, 715, 1015, 1410))
        place((965, 255, 1815, 885), (300, 1430, 780, 1786))
    elif number == 38:
        heading(original=120, area=(0, 0, 1920, 170), size=112)
        place((50, 190, 580, 545), (70, 360, 510, 655))
        place((790, 190, 1120, 630), (625, 360, 1010, 873))
        page.draw_line((70, 990), (1010, 990), color=(0, 0, 0), width=.8)
        flow((1400, 195, 1920, 255), 80, 1050, 920, 43, 40)
        place((1440, 275, 1900, 565), (70, 1200, 500, 1471))
        place((1440, 565, 1900, 840), (570, 1200, 1000, 1457))
    elif number == 42:
        heading(original=20, area=(0, 45, 1920, 90), size=38)
        flow((30, 190, 630, 270), 90, 300, 900, 48, 40, align='left')
        flow((30, 345, 630, 515), 90, 410, 900, 52, 40, align='left')
        place((700, 190, 1050, 865), (80, 850, 535, 1728))
        place((1145, 190, 1685, 865), (545, 850, 1030, 1456))
    elif number == 43:
        heading(original=20, area=(800, 45, 1100, 100), size=38)
        for i, sy in enumerate((160, 308, 456, 604)):
            y = 265 + i * 315
            flow((35, sy, 610, sy + 85), 80, y, 920, 58, 60, align='left')
            flow((35, sy + 85, 610, sy + 125), 80, y + 85, 920, 32, 25, align='left')
            # The PDF's hidden text layer is offset from these visible bullets.
            # Preserve each full paragraph, including the original numbering.
            place((640, sy - 2, 1460, sy + 125), (80, y + 145, 1000, y + 287.5))
            page.draw_line((80, y + 290), (1000, y + 290), color=(0, 0, 0), width=.8)
        flow((35, 798, 650, 845), 80, 1565, 920, 27, 25, align='left')
        flow((35, 848, 650, 950), 80, 1615, 920, 27, 25, align='left')
        place((1390, 798, 1580, 840), (80, 1718, 254.8, 1756.64))
        flow((1380, 845, 1910, 950), 280, 1718, 720, 23, 25, align='left')
    elif number == 44:
        heading(original=20, area=(800, 45, 1100, 100), size=38)
        flow((35, 140, 550, 230), 80, 255, 920, 64, 60, align='left')
        flow((35, 230, 550, 275), 80, 345, 920, 30, 25, align='left')
        flow((570, 140, 1470, 225), 80, 425, 920, 33, 25, align='left')
        page.draw_line((80, 595), (1000, 595), color=(0, 0, 0), width=.8)
        flow((35, 300, 550, 385), 80, 660, 920, 64, 60, align='left')
        flow((35, 385, 550, 435), 80, 750, 920, 30, 25, align='left')
        y = 850
        for area in [(570, 300, 1470, 396), (570, 398, 1470, 520),
                     (570, 525, 1470, 720), (570, 725, 1470, 867)]:
            height = (area[3] - area[1]) * 920 / (area[2] - area[0])
            place(area, (80, y, 1000, y + height))
            y += height + 45
    elif number == 45:
        place((210, 220, 1710, 855), (60, 720, 1020, 1126.4))
    else:
        raise ValueError(f'Unmapped page {number}')

    if number not in (1, 16, 18, 19, 20, 21, 22, 24, 26, 34, 35, 41, 45):
        footer()
    if number in render_pages:
        page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).save(str(output / f'{number:02}.png'))
        page.get_pixmap(matrix=fitz.Matrix(.25, .25), alpha=False).save(str(ROOT / f'public/portrait/{number:02}-thumb.jpg'))
    manifest.append({'number': number, 'src': f'/portrait/{number:02}.webp',
                     'thumbnail': f'/portrait/{number:02}-thumb.jpg', 'placements': placements})
    print(f'Portrait {number:02}/45', flush=True)

deck.save(output / 'Terceiro-Espaco-9x16.pdf', garbage=4, deflate=True)
(ROOT / 'lib/portrait.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
