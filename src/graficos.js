// Gráficos simples em SVG e HTML, sem biblioteca. Funcionam no celular e no computador.
import { esc } from './ui.js';

// Rosca: partes = [{ n, classe, rotulo }]
export function rosca(partes, centro) {
  const total = partes.reduce((s, p) => s + p.n, 0);
  if (!total) return '<p class="vazio">Sem dados ainda.</p>';
  const r = 42;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const arcos = partes.filter((p) => p.n).map((p) => {
    const len = (c * p.n) / total;
    const s = `<circle class="rosca ${p.classe}" cx="60" cy="60" r="${r}" fill="none" stroke-width="18" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-acc}" transform="rotate(-90 60 60)"><title>${esc(p.rotulo)}: ${p.n}</title></circle>`;
    acc += len;
    return s;
  }).join('');
  const legenda = partes.filter((p) => p.n).map((p) => `<li><span class="lg ${p.classe}"></span>${esc(p.rotulo)} <strong>${p.n}</strong></li>`).join('');
  return `<div class="grafico-rosca"><svg viewBox="0 0 120 120" role="img" aria-label="Gráfico em rosca"><g>${arcos}</g><text x="60" y="66" text-anchor="middle" class="rosca-centro">${esc(centro ?? total)}</text></svg><ul class="legenda">${legenda}</ul></div>`;
}

// Barras horizontais: itens = [{ rotulo, valor (0 a 100), texto, classe, acao, id }]
export function barrasH(itens) {
  if (!itens.length) return '<p class="vazio">Sem dados ainda.</p>';
  return `<ul class="bh">${itens.map((i) => `<li ${i.acao ? `class="clicavel" data-acao="${i.acao}" data-tipo="${i.tipo ?? ''}" data-id="${esc(i.id ?? '')}" tabindex="0" role="button"` : ''}>
    <span class="bh-rot">${esc(i.rotulo)}</span>
    <span class="bh-trilha"><span class="bh-barra ${i.classe ?? 'b-info'}" style="width:${Math.max(0, Math.min(100, i.valor))}%"></span></span>
    <span class="bh-val">${esc(i.texto ?? `${Math.round(i.valor)}%`)}</span></li>`).join('')}</ul>`;
}

// Colunas: itens = [{ rotulo, valor }]
export function colunas(itens, rotuloEixo = '') {
  if (!itens.length || !itens.some((i) => i.valor > 0)) return '<p class="vazio">Sem dados ainda.</p>';
  const max = Math.max(...itens.map((i) => i.valor), 1);
  const larg = 26;
  const W = Math.max(240, itens.length * larg + 20);
  const H = 120;
  const base = H - 22;
  const barras = itens.map((i, k) => {
    const h = ((base - 14) * i.valor) / max;
    const x = 10 + k * larg;
    return `<g><rect class="coluna" x="${x}" y="${base - h}" width="${larg - 8}" height="${h}" rx="3"><title>${esc(i.rotulo)}: ${i.valor}</title></rect>
      <text x="${x + (larg - 8) / 2}" y="${base - h - 3}" text-anchor="middle" class="col-val">${i.valor}</text>
      <text x="${x + (larg - 8) / 2}" y="${H - 8}" text-anchor="middle" class="col-rot">${esc(i.rotulo)}</text></g>`;
  }).join('');
  return `<div class="rolagem-x"><svg viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="${esc(rotuloEixo)}">${barras}</svg></div>`;
}
