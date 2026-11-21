// Avatar montado em camadas com a arte LPC (public/lpc/av, catálogo gerado por ferramentas/lpc-catalogo.mjs).
// O banco guarda só as escolhas do aluno (ids curtos), nunca a imagem; o desenho é montado no aparelho.
// Avatares do formato antigo ({ fantasia, tom }) viram um visual padrão com o tom de pele equivalente.

const BASE = import.meta.env.BASE_URL + 'lpc/av/';

// Opções de cor oferecidas na tela (ids das paletas do catálogo) e um nome curto para cada uma.
export const PELES = [['light', 'Clara'], ['amber', 'Âmbar'], ['olive', 'Morena clara'], ['taupe', 'Parda'], ['bronze', 'Morena'], ['brown', 'Marrom'], ['black', 'Retinta']];
export const CORES_CABELO = [['black', 'Preto'], ['dark_brown', 'Castanho escuro'], ['chestnut', 'Castanho'], ['ash_brown', 'Castanho acinzentado'], ['light_brown', 'Castanho claro'], ['blonde', 'Loiro'], ['platinum', 'Platinado'], ['ginger', 'Ruivo'], ['redhead', 'Acobreado'], ['gray', 'Grisalho'], ['white', 'Branco'], ['blue', 'Azul'], ['pink', 'Rosa'], ['purple', 'Roxo'], ['green', 'Verde']];
export const CORES_OLHOS = [['brown', 'Castanhos'], ['black', 'Pretos'], ['hazel', 'Mel'], ['green', 'Verdes'], ['blue', 'Azuis'], ['gray', 'Cinza']];
export const CORES_ROUPA = [['white', 'Branco'], ['gray', 'Cinza'], ['charcoal', 'Grafite'], ['black', 'Preto'], ['navy', 'Marinho'], ['blue', 'Azul'], ['sky', 'Céu'], ['teal', 'Petróleo'], ['green', 'Verde'], ['forest', 'Musgo'], ['yellow', 'Amarelo'], ['orange', 'Laranja'], ['red', 'Vermelho'], ['maroon', 'Vinho'], ['pink', 'Rosa'], ['rose', 'Rosê'], ['lavender', 'Lilás'], ['purple', 'Roxo'], ['tan', 'Bege'], ['brown', 'Marrom'], ['leather', 'Couro'], ['slate', 'Ardósia'], ['bluegray', 'Azul acinzentado'], ['walnut', 'Nogueira']];

// Campos guardados no banco, na ordem. Mudar aqui exige mudar as regras do Firestore.
export const CAMPOS = ['pele', 'rosto', 'nariz', 'sobrancelha', 'olhos', 'cabelo', 'corCabelo', 'cima', 'corCima', 'baixo', 'corBaixo', 'pes', 'corPes'];
export const PADRAO = { v: 2, pele: 'olive', rosto: 'a', nariz: 'botao', sobrancelha: 'fina', olhos: 'brown', cabelo: 'curto', corCabelo: 'dark_brown', cima: 'camiseta', corCima: 'blue', baixo: 'calca', corBaixo: 'navy', pes: 'tenis', corPes: 'white' };
const TOM_ANTIGO = ['light', 'amber', 'olive', 'taupe', 'bronze', 'brown'];

export function normalizar(av) {
  if (!av || typeof av !== 'object') return { ...PADRAO };
  if (av.v !== 2) return { ...PADRAO, pele: TOM_ANTIGO[av.tom] ?? PADRAO.pele };
  const r = { ...PADRAO };
  for (const c of CAMPOS) if (typeof av[c] === 'string' && av[c]) r[c] = av[c];
  return r;
}
// Só os campos que vão para o banco.
export const paraSalvar = (av) => { const n = normalizar(av); const r = { v: 2 }; for (const c of CAMPOS) r[c] = n[c]; return r; };

let catP = null;
export const catalogo = () => (catP ??= fetch(BASE + 'catalogo.json').then((r) => { if (!r.ok) throw new Error('catálogo'); return r.json(); }).catch((e) => { catP = null; throw e; }));

const imagens = new Map();
function imagem(url) {
  if (!imagens.has(url)) imagens.set(url, new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => { imagens.delete(url); erro(new Error(url)); }; i.src = url; }));
  return imagens.get(url);
}

const hex = (h) => h.slice(1).toLowerCase();
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
// Troca as cores da rampa de origem pela escolhida (cada material tem de 3 a 6 tons).
function recolorir(g, w, h, trocas) {
  const mapa = new Map();
  for (const [de, para] of trocas) de.forEach((c, i) => mapa.set(hex(c), rgb(para[Math.min(i, para.length - 1)])));
  const d = g.getImageData(0, 0, w, h); const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const k = ((px[i] << 16) | (px[i + 1] << 8) | px[i + 2]).toString(16).padStart(6, '0');
    const t = mapa.get(k);
    if (t) { px[i] = t[0]; px[i + 1] = t[1]; px[i + 2] = t[2]; }
  }
  g.putImageData(d, 0, 0);
}

const novaTela = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false; return [c, g]; };
const camadaCache = new Map();
function camada(arq, anim, trocas, chave) {
  const k = arq + anim + '|' + chave;
  if (!camadaCache.has(k)) camadaCache.set(k, imagem(BASE + arq + anim + '.png').then((img) => {
    if (!trocas.length) return img;
    const [c, g] = novaTela(img.width, img.height); g.drawImage(img, 0, 0); recolorir(g, img.width, img.height, trocas); return c;
  }));
  return camadaCache.get(k);
}

// Monta a folha de uma animação (walk: 9 quadros x 4 direções de 64 px; idle: 2 x 4; jump: 5 x 4).
// Resolve null quando alguma peça escolhida não tem a animação.
// Direções nas linhas: 0 cima, 1 esquerda, 2 baixo, 3 direita.
const folhas = new Map();
export function folha(avBruto, anim = 'walk') {
  const av = normalizar(avBruto);
  const chave = anim + JSON.stringify(av);
  if (!folhas.has(chave)) folhas.set(chave, montar(av, anim).catch((e) => { folhas.delete(chave); throw e; }));
  return folhas.get(chave);
}
async function montar(av, anim) {
  const cat = await catalogo(); const P = cat.paletas;
  const corDoGrupo = { cima: av.corCima, baixo: av.corBaixo, pes: av.corPes };
  const pecas = [{ ...cat.fixos.corpo, grupo: 'corpo' }];
  for (const g of ['rosto', 'nariz', 'sobrancelha', 'cabelo', 'cima', 'baixo', 'pes']) {
    const lista = cat.grupos[g]; const p = lista.find((x) => x.id === av[g]) ?? lista[0];
    pecas.push({ ...p, grupo: g });
  }
  // Se alguma peça não tem esta animação (as saias não têm pulo), devolve null e quem chamou usa outra.
  if (pecas.some((p) => !p.anims.includes(anim))) return null;
  const camadas = [];
  for (const p of pecas) {
    const trocas = []; const ids = [];
    for (const m of p.mats) {
      const id = m === 'body' ? av.pele : m === 'hair' ? av.corCabelo : m === 'eye' ? av.olhos : corDoGrupo[p.grupo];
      const c = P[m]?.cores[id]; if (c) { trocas.push([P[m].base, c]); ids.push(m + ':' + id); }
    }
    for (const cm of p.camadas) camadas.push({ z: cm.z, prom: camada(cm.arq, anim, trocas, ids.join(',')) });
  }
  camadas.sort((a, b) => a.z - b.z);
  const imgs = await Promise.all(camadas.map((c) => c.prom));
  const w = Math.max(...imgs.map((i) => i.width)); const h = Math.max(...imgs.map((i) => i.height));
  const [c, g] = novaTela(w, h);
  for (const i of imgs) g.drawImage(i, 0, 0);
  return c;
}

// Retrato (cabeça e ombros, de frente) para listas, carteira e guilda; ou o corpo inteiro, de frente.
const RECORTE = { retrato: [12, 4, 40, 40], corpo: [8, 8, 48, 56], rosto: [18, 12, 28, 28] };
const retratos = new Map();
export function retrato(av, modo = 'retrato') {
  const chave = modo + JSON.stringify(normalizar(av));
  if (!retratos.has(chave)) retratos.set(chave, folha(av, 'walk').then((f) => {
    const [x, y, w, h] = RECORTE[modo] ?? RECORTE.retrato;
    const [c, g] = novaTela(w, h); g.drawImage(f, x, 128 + y, w, h, 0, 0, w, h); return c.toDataURL();
  }).catch((e) => { retratos.delete(chave); throw e; }));
  return retratos.get(chave);
}

// HTML de um avatar. A imagem é pintada logo depois de entrar na página (ver pintarAvatares).
const VAZIO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
export function imgAvatar(av, classe = 'avatar', modo = 'retrato') {
  const dado = encodeURIComponent(JSON.stringify(normalizar(av)));
  const [, , w, h] = RECORTE[modo] ?? RECORTE.retrato;
  return `<img class="${classe}" src="${VAZIO}" data-av="${dado}" data-modo="${modo}" alt="" width="${w}" height="${h}">`;
}
export function pintarAvatares(raiz = document) {
  for (const el of raiz.querySelectorAll('img[data-av]')) {
    const dado = el.getAttribute('data-av'); const modo = el.dataset.modo || 'retrato';
    if (el.dataset.pintado === dado) continue;
    el.dataset.pintado = dado;
    let av; try { av = JSON.parse(decodeURIComponent(dado)); } catch { continue; }
    retrato(av, modo).then((url) => { if (el.getAttribute('data-av') === dado) el.src = url; }).catch(() => { delete el.dataset.pintado; });
  }
}
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
  let agendado = false;
  new MutationObserver(() => { if (agendado) return; agendado = true; requestAnimationFrame(() => { agendado = false; pintarAvatares(); }); })
    .observe(document.documentElement, { childList: true, subtree: true });
}

// Avatar sorteado (botão "Surpresa" e moradores do mapa).
export async function sortear(rnd = Math.random) {
  const cat = await catalogo();
  const um = (l) => l[Math.floor(rnd() * l.length)];
  return {
    v: 2, pele: um(PELES)[0], rosto: um(cat.grupos.rosto).id, nariz: um(cat.grupos.nariz).id, sobrancelha: um(cat.grupos.sobrancelha).id,
    olhos: um(CORES_OLHOS)[0], cabelo: um(cat.grupos.cabelo).id, corCabelo: um(CORES_CABELO.slice(0, 11))[0],
    cima: um(cat.grupos.cima).id, corCima: um(CORES_ROUPA)[0], baixo: um(cat.grupos.baixo).id, corBaixo: um(CORES_ROUPA)[0],
    pes: um(cat.grupos.pes).id, corPes: um(CORES_ROUPA)[0],
  };
}
