// 상태를 그림으로 보여 주는 작은 도트 아이콘 (외부 그림을 받기 전까지 쓰는 것)
const G = {
  hot: { pal: { r: '#e8401e', o: '#ff9a2a', y: '#ffe066' }, rows: ['.....r.....', '....rr.....', '....ror....', '...roor.r..', '..rooorrr..', '..royoorr..', '.rooyyoor..', '.royyyyor..', '.royyyyor..', '..royyor...', '...rrrr....'] },
  cold: { pal: { w: '#ffffff', b: '#7fd4ff', d: '#3a8fd0' }, rows: ['.....w.....', '..b.www.b..', '...b.w.b...', '.w..bwb..w.', '.ww.dwd.ww.', 'wwwwwdwwwww', '.ww.dwd.ww.', '.w..bwb..w.', '...b.w.b...', '..b.www.b..', '.....w.....'] },
  wet: { pal: { b: '#4aa8ff', w: '#dff3ff', d: '#2a6fc0' }, rows: ['.....d.....', '.....d.....', '....dbd....', '....dbd....', '...dbbbd...', '..dbwbbbd..', '..dbwbbbd..', '.dbwbbbbbd.', '.dbbbbbbbd.', '..dbbbbbd..', '...ddddd...'] },
  big: { pal: { y: '#ffd24a', d: '#a8741a' }, rows: ['.....d.....', '....dyd....', '...dyyyd...', '..dyyyyyd..', '.dyyyyyyyd.', 'ddddyyydddd', '...dyyyd...', '...dyyyd...', '...dyyyd...', '...dyyyd...', '...ddddd...'] },
  small: { pal: { p: '#c9a0ff', d: '#6a3fb0' }, rows: ['...ddddd...', '...dpppd...', '...dpppd...', '...dpppd...', '...dpppd...', 'ddddpppdddd', '.dpppppppd.', '..dpppppd..', '...dpppd...', '....dpd....', '.....d.....'] },
  sleepy: { pal: { w: '#ffffff', l: '#b8b8e8' }, rows: ['...........', '.wwwww.....', '....w......', '...w...lll.', '..w......l.', '.wwwww..l..', '.......lll.', '...........', '..ll.......', '...l.......', '..ll.......'] },
  angry: { pal: { r: '#ff4d6a', d: '#a01030' }, rows: ['...........', '..rr...rr..', '..rr...rr..', '.rrrr.rrrr.', '...rr.rr...', '...........', '...rr.rr...', '.rrrr.rrrr.', '..rr...rr..', '..rr...rr..', '...........'] },
};
const gem = (c, d) => ({ pal: { c, d, w: '#ffffff' }, rows: ['...........', '...ddddd...', '..dcccccd..', '.dcwwccccd.', '.dcwcccccd.', '.dcccccccd.', '.dcccccccd.', '.dcccccccd.', '..dcccccd..', '...ddddd...', '...........'] });
G.blue = gem('#59c8e8', '#1f6f90'); G.green = gem('#7fdc6a', '#2f7a2a'); G.red = gem('#ff6b5e', '#9a2018');

const cache = {};
export function icon(name) {
  if (cache[name]) return cache[name];
  const g = G[name]; if (!g) return '';
  const c = document.createElement('canvas'); c.width = c.height = 13; const x = c.getContext('2d');
  // 어두운 테두리 한 칸
  for (let pass = 0; pass < 2; pass++) g.rows.forEach((row, y) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch === '.') continue; if (pass === 0) { x.fillStyle = '#1b1320'; x.fillRect(i, y, 3, 3); } else { x.fillStyle = g.pal[ch]; x.fillRect(i + 1, y + 1, 1, 1); } } });
  return (cache[name] = c.toDataURL());
}
export const iconImg = (name, cls = 'ico') => `<img class="${cls}" src="${icon(name)}" alt="">`;
