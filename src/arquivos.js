// Geradores de arquivos do Office montados no próprio navegador (um .xlsx e um .docx são pastas zipadas de XML).
// Funções puras: recebem os dados e devolvem os bytes do arquivo.
import { zipSync, strToU8 } from 'fflate';

const x = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // caracteres de controle quebram o XML
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const zipar = (partes) => zipSync(Object.fromEntries(Object.entries(partes).map(([k, v]) => [k, strToU8(v)])), { level: 6 });

// ---------- planilha (.xlsx) ----------
// Estilos: 0 padrão, 1 cabeçalho, 2 célula com borda, 3 verde (A/D), 4 amarelo (PA/ED), 5 vermelho (NA/ND),
// 6 texto longo com quebra, 7 título, 8 centralizado com borda, 9 cabeçalho da competência do bimestre.
export const ESTILO = { padrao: 0, cabecalho: 1, celula: 2, verde: 3, amarelo: 4, vermelho: 5, texto: 6, titulo: 7, centro: 8, destaque: 9 };
export const estiloMencao = (m) => ({ A: 3, D: 3, PA: 4, ED: 4, NA: 5, ND: 5 }[m] ?? 8);

const ESTILOS_XLSX = `${XML}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="13"/><name val="Calibri"/></font></fonts>
<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFEB9C"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFBDD7EE"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FF999999"/></left><right style="thin"><color rgb="FF999999"/></right><top style="thin"><color rgb="FF999999"/></top><bottom style="thin"><color rgb="FF999999"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="10">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
</cellXfs></styleSheet>`;

const letra = (i) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

// abas: [{ nome, linhas: [[{ v, s } | texto | número]], mesclas: ['C2:I2'], larguras: [n...], alturas: { linha: pontos }, congelar: 'C4' }]
export function gerarXlsx(abas) {
  const partes = {};
  abas.forEach((aba, i) => {
    const linhas = aba.linhas.map((cels, r) => {
      const alt = aba.alturas?.[r + 1];
      const cs = cels.map((c, k) => {
        if (c === null || c === undefined) return '';
        const cel = typeof c === 'object' ? c : { v: c };
        const ref = `${letra(k)}${r + 1}`;
        const s = cel.s ? ` s="${cel.s}"` : '';
        if (cel.v === '' || cel.v === null || cel.v === undefined) return cel.s ? `<c r="${ref}"${s}/>` : '';
        if (typeof cel.v === 'number') return `<c r="${ref}"${s}><v>${cel.v}</v></c>`;
        return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${x(cel.v)}</t></is></c>`;
      }).join('');
      return `<row r="${r + 1}"${alt ? ` ht="${alt}" customHeight="1"` : ''}>${cs}</row>`;
    }).join('');
    const cols = aba.larguras?.length ? `<cols>${aba.larguras.map((w, k) => `<col min="${k + 1}" max="${k + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
    const [cc, rr] = aba.congelar ? [aba.congelar.match(/[A-Z]+/)[0], Number(aba.congelar.match(/\d+/)[0])] : [];
    const xs = cc ? cc.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1 : 0;
    const painel = aba.congelar ? `<sheetViews><sheetView workbookViewId="0"><pane xSplit="${xs}" ySplit="${rr - 1}" topLeftCell="${aba.congelar}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>` : '';
    const mesclas = aba.mesclas?.length ? `<mergeCells count="${aba.mesclas.length}">${aba.mesclas.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';
    partes[`xl/worksheets/sheet${i + 1}.xml`] = `${XML}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${painel}${cols}<sheetData>${linhas}</sheetData>${mesclas}</worksheet>`;
  });
  partes['[Content_Types].xml'] = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`;
  partes['_rels/.rels'] = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  partes['xl/workbook.xml'] = `${XML}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${abas.map((a, i) => `<sheet name="${x(a.nome.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;
  partes['xl/_rels/workbook.xml.rels'] = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  partes['xl/styles.xml'] = ESTILOS_XLSX;
  return zipar(partes);
}

// ---------- documento (.docx) ----------
// blocos: { tipo: 'titulo'|'subtitulo'|'p'|'lista'|'tabela', texto, itens, colunas: [larguras em cm], linhas, cabecalho: n }
// Cada célula: texto (\n vira novo parágrafo) ou { texto, negrito, fundo: 'D9D9D9', mesclar: n }.
const run = (t, { negrito, tam } = {}) => `<w:r>${negrito || tam ? `<w:rPr>${negrito ? '<w:b/>' : ''}${tam ? `<w:sz w:val="${tam}"/>` : ''}</w:rPr>` : ''}<w:t xml:space="preserve">${x(t)}</w:t></w:r>`;
// "**negrito**" dentro do texto
const runs = (t, op = {}) => String(t ?? '').split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((p) => (p.startsWith('**') ? run(p.slice(2, -2), { ...op, negrito: true }) : run(p, op))).join('');
const par = (t, { negrito, tam, depois = 80, antes = 0 } = {}) => `<w:p><w:pPr><w:spacing w:before="${antes}" w:after="${depois}"/></w:pPr>${runs(t, { negrito, tam })}</w:p>`;
const CM = 567; // twips por centímetro

function tabela(b) {
  const larg = b.colunas.map((c) => Math.round(c * CM));
  const grade = `<w:tblGrid>${larg.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;
  const linhas = b.linhas.map((cels, r) => {
    let k = 0;
    const tcs = cels.map((c) => {
      const cel = typeof c === 'object' && c !== null ? c : { texto: c };
      const span = cel.mesclar ?? 1;
      const w = larg.slice(k, k + span).reduce((a, n) => a + n, 0);
      k += span;
      const cab = r < (b.cabecalho ?? 0);
      const fundo = cel.fundo ?? (cab ? 'D9D9D9' : null);
      const paras = String(cel.texto ?? '').split('\n').map((t) => `<w:p><w:pPr><w:spacing w:before="0" w:after="40"/></w:pPr>${runs(t, { negrito: cel.negrito || cab, tam: 18 })}</w:p>`).join('');
      return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${fundo ? `<w:shd w:val="clear" w:color="auto" w:fill="${fundo}"/>` : ''}</w:tcPr>${paras}</w:tc>`;
    }).join('');
    return `<w:tr>${r < (b.cabecalho ?? 0) ? '<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>' : '<w:trPr><w:cantSplit/></w:trPr>'}${tcs}</w:tr>`;
  }).join('');
  const borda = (n) => `<w:${n} w:val="single" w:sz="4" w:space="0" w:color="999999"/>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${larg.reduce((a, n) => a + n, 0)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(borda).join('')}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>${grade}${linhas}</w:tbl>${par('', { depois: 120 })}`;
}

export function gerarDocx(blocos, { paisagem = true } = {}) {
  const corpo = blocos.map((b) => {
    if (b.tipo === 'titulo') return par(b.texto, { negrito: true, tam: 30, depois: 120 });
    if (b.tipo === 'subtitulo') return par(b.texto, { negrito: true, tam: 24, antes: 200, depois: 80 });
    if (b.tipo === 'lista') return b.itens.map((t) => `<w:p><w:pPr><w:spacing w:after="40"/><w:ind w:left="360" w:hanging="240"/></w:pPr>${run('• ')}${runs(t)}</w:p>`).join('');
    if (b.tipo === 'tabela') return tabela(b);
    return par(b.texto);
  }).join('');
  const [w, h] = paisagem ? [16838, 11906] : [11906, 16838];
  const doc = `${XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corpo}<w:sectPr><w:pgSz w:w="${w}" w:h="${h}"${paisagem ? ' w:orient="landscape"' : ''}/><w:pgMar w:top="851" w:right="851" w:bottom="851" w:left="851" w:header="425" w:footer="425" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return zipar({
    '[Content_Types].xml': `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    '_rels/.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'word/styles.xml': `${XML}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="20"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
    'word/document.xml': doc,
  });
}

// Baixa os bytes como arquivo (no navegador).
export function baixarArquivo(nome, bytes, tipo) {
  const url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const TIPO_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
