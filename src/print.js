// Print-ready PDF: artwork at real size (mm) + 3 mm bleed + crop marks + dieline
// (magenta solid = cut, magenta dashed = fold). Written by hand — a PDF is just text
// objects plus one JPEG stream, so no library is needed.
const MM = 72 / 25.4; // points per mm

// extend the edge pixels outwards so the artwork runs past the trim line (real bleed, no stretching)
function withBleed(art, bpx) {
  const W = art.width, H = art.height, c = document.createElement('canvas');
  c.width = W + bpx * 2; c.height = H + bpx * 2;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(art, bpx, bpx);
  g.drawImage(art, 0, 0, 1, H, 0, bpx, bpx, H); g.drawImage(art, W - 1, 0, 1, H, W + bpx, bpx, bpx, H);
  g.drawImage(art, 0, 0, W, 1, bpx, 0, W, bpx); g.drawImage(art, 0, H - 1, W, 1, bpx, H + bpx, W, bpx);
  for (const [sx, sy, dx, dy] of [[0, 0, 0, 0], [W - 1, 0, W + bpx, 0], [0, H - 1, 0, H + bpx], [W - 1, H - 1, W + bpx, H + bpx]]) g.drawImage(art, sx, sy, 1, 1, dx, dy, bpx, bpx);
  return c;
}

export function printPDF({ art, mmW, mmH, cuts = [], folds = [], title = 'Wrapt print file' }) {
  const bleed = 3, margin = 14, cap = 10;
  const pageW = mmW + 2 * margin, pageH = mmH + 2 * margin + cap;
  const pxPerMm = art.width / mmW, bpx = Math.round(bleed * pxPerMm);
  const img = withBleed(art, bpx);
  const jpg = Uint8Array.from(atob(img.toDataURL('image/jpeg', 0.92).split(',')[1]), (c) => c.charCodeAt(0));
  const X = (mm) => ((margin + mm) * MM).toFixed(2), Y = (mm) => ((pageH - margin - mm) * MM).toFixed(2); // artwork mm → PDF points (y up)
  let cs = 'q\n';
  cs += `${((mmW + 2 * bleed) * MM).toFixed(2)} 0 0 ${((mmH + 2 * bleed) * MM).toFixed(2)} ${X(-bleed)} ${Y(mmH + bleed)} cm /Im1 Do\nQ\n`;
  // crop marks
  cs += '0 0 0 RG 0.3 w\n';
  for (const [cx, cy, sx, sy] of [[0, 0, -1, -1], [mmW, 0, 1, -1], [0, mmH, -1, 1], [mmW, mmH, 1, 1]]) {
    cs += `${X(cx + sx * 3)} ${Y(cy)} m ${X(cx + sx * 11)} ${Y(cy)} l S\n`;
    cs += `${X(cx)} ${Y(cy + sy * 3)} m ${X(cx)} ${Y(cy + sy * 11)} l S\n`;
  }
  // dieline
  cs += '1 0 1 RG 0.6 w [] 0 d\n';
  for (const [x0, y0, x1, y1] of cuts) cs += `${X(x0)} ${Y(y0)} m ${X(x1)} ${Y(y1)} l S\n`;
  cs += '[3 2] 0 d\n';
  for (const [x0, y0, x1, y1] of folds) cs += `${X(x0)} ${Y(y0)} m ${X(x1)} ${Y(y1)} l S\n`;
  const ascii = (t) => t.replace(/[^\x20-\x7e]/g, '').replace(/[()\\]/g, '');
  cs += `[] 0 d BT /F1 7 Tf 0.35 0.35 0.35 rg ${(margin * MM).toFixed(2)} ${(4 * MM).toFixed(2)} Td (${ascii(`${title}  |  trim ${mmW.toFixed(1)} x ${mmH.toFixed(1)} mm  |  3 mm bleed  |  magenta = cut, dashed = fold  |  made with Wrapt`)}) Tj ET\n`;

  const enc = new TextEncoder(), parts = [], offsets = [];
  let len = 0;
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); (Array.isArray(body) ? body : [body]).forEach(push); push('\nendobj\n'); };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${(pageW * MM).toFixed(2)} ${(pageH * MM).toFixed(2)}] /TrimBox [${X(0)} ${Y(mmH)} ${X(mmW)} ${Y(0)}] /Resources << /XObject << /Im1 4 0 R >> /Font << /F1 6 0 R >> >> /Contents 5 0 R >>`);
  obj(4, [`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`, jpg, '\nendstream']);
  obj(5, `<< /Length ${enc.encode(cs).length} >>\nstream\n${cs}endstream`);
  obj(6, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const xref = len;
  push(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(parts, { type: 'application/pdf' });
}
