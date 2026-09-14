import sys,pathlib,json
sys.path.insert(0,'.cache/python')
import pymupdf as fitz
src=fitz.open(next(pathlib.Path('C:/Users/The Force/Desktop').glob('Terceiro Espa*PITCH.pdf')))
pathlib.Path('public/stories').mkdir(exist_ok=True)
refs={18:[2261,2235,2221,2205],19:[2405,2387,2373,2357],20:[2545,2527,2513,2497],21:[2685,2667,2653,2637],22:[2825,2807,2793,2777]}
for n,xrefs in refs.items():
 infos=src[n-1].get_image_info(xrefs=True)
 for col,xref in enumerate(xrefs):
  left=[50,514.521484,979.042969,1443.5625][col]
  info=next(v for v in infos if v['xref']==xref)
  b=fitz.Rect(info['bbox']); b.x0-=left;b.x1-=left;b.y0-=136;b.y1-=136
  out=fitz.open();p=out.new_page(width=440,height=788)
  p.insert_image(b,stream=src.extract_image(xref)['image'])
  p.get_pixmap(matrix=fitz.Matrix(2,2)).save(f'public/stories/{n}-{col}.png')
print('20 clean story artworks exported without baked Instagram UI')
