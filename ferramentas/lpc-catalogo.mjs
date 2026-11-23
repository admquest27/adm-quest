// Copia do gerador LPC só as peças escolhidas em lpc-escolhas.json e monta o catálogo do avatar.
// Uso: node ferramentas/lpc-catalogo.mjs <pasta do gerador LPC> [--listar]
//   --listar mostra as pastas que faltam baixar (para o sparse-checkout) e não copia nada.
// Saída: public/lpc/av/<caminho da peça>/<animação>.png, public/lpc/av/catalogo.json e public/lpc/creditos-avatar.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(aqui, '..');
const lpc = process.argv[2];
const listar = process.argv.includes('--listar');
if (!lpc || !fs.existsSync(path.join(lpc, 'sheet_definitions'))) {
  console.error('Informe a pasta do gerador LPC (a que tem sheet_definitions).');
  process.exit(1);
}
const esc = JSON.parse(fs.readFileSync(path.join(aqui, 'lpc-escolhas.json'), 'utf8'));
const CORPO = esc.corpo;
const ANIMS = esc.animacoes;
const destino = path.join(site, 'public', 'lpc', 'av');

const lerJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const faltando = new Set();
const creditos = new Map();

// Uma peça vira uma lista de camadas (algumas têm parte da frente e de trás do corpo, com zPos diferentes).
function peca(arqDef, variante = null) {
  const def = lerJson(path.join(lpc, 'sheet_definitions', arqDef));
  const camadas = [];
  for (const [k, v] of Object.entries(def)) {
    if (!/^layer_\d+$/.test(k) || !v[CORPO]) continue;
    if (v.custom_animation) continue;
    // rostos têm o tipo de cabeça no caminho: aqui usamos o de rosto masculino (serve para os moradores)
    // rostos têm o tipo de cabeça no caminho (como ${head}): usamos o masculino, que serve para os moradores
    camadas.push({ z: v.zPos, dir: v[CORPO].replace('${head}', 'male') });
  }
  if (!camadas.length) throw new Error(`${arqDef} não tem versão para o corpo ${CORPO}`);
  const anims = ANIMS.filter((a) => (def.animations ?? ['walk']).includes(a));
  const rc = def.recolors ?? {};
  // material de recolorir: um só (cabelo, roupa, pele) ou dois (cabeça: pele e olhos)
  const mats = rc.material ? [rc.material] : [rc.color_1?.material, rc.color_2?.material].filter(Boolean);
  for (const c of camadas) {
    for (const a of anims) {
      const rel = variante ? path.join(a, variante + '.png') : a + '.png';
      const origem = path.join(lpc, 'spritesheets', c.dir, rel);
      if (!fs.existsSync(origem)) { faltando.add('spritesheets/' + c.dir); continue; }
      if (!listar) {
        const alvo = path.join(destino, c.dir, rel);
        fs.mkdirSync(path.dirname(alvo), { recursive: true });
        fs.copyFileSync(origem, alvo);
      }
    }
  }
  for (const cr of def.credits ?? []) {
    const chave = cr.file;
    if (!creditos.has(chave)) creditos.set(chave, { arquivo: cr.file, autores: cr.authors ?? [], licencas: cr.licenses ?? [], links: cr.urls ?? [] });
  }
  return { camadas: camadas.map((c) => ({ z: c.z, arq: c.dir, ...(variante ? { v: variante } : {}) })), anims, mats };
}

const catalogo = { corpo: CORPO, animacoes: ANIMS, fixos: {}, grupos: {}, paletas: {} };
for (const [id, arq] of Object.entries(esc.fixos)) catalogo.fixos[id] = peca(arq);
for (const [grupo, itens] of Object.entries(esc.grupos)) {
  catalogo.grupos[grupo] = itens.map(([id, nome, arq, variante]) => ({ id, nome, ...peca(arq, variante) }));
}

// Paletas: a de origem de cada material e as opções de cor.
const pal = (mat, arq) => lerJson(path.join(lpc, 'palette_definitions', mat, arq));
const base = (mat) => lerJson(path.join(lpc, 'palette_definitions', mat, 'meta_' + mat + '.json')).base;
const cabeloUlpc = pal('hair', 'hair_ulpc.json');
const olhoUlpc = pal('eye', 'eye_ulpc.json');
catalogo.paletas = {
  body: { base: pal('body', 'body_ulpc.json')[base('body')], cores: pal('body', 'body_ulpc.json') },
  hair: { base: cabeloUlpc[base('hair')], cores: { ...pal('hair', 'hair_lpcr.json'), ...cabeloUlpc } },
  cloth: { base: pal('cloth', 'cloth_ulpc.json')[base('cloth')], cores: pal('cloth', 'cloth_ulpc.json') },
  eye: { base: olhoUlpc[base('eye')], cores: { ...pal('eye', 'eye_lpcr.json'), ...olhoUlpc } },
};

if (listar || faltando.size) {
  console.log(faltando.size ? 'Faltam estas pastas:\n' + [...faltando].join('\n') : 'Nada faltando.');
  process.exit(faltando.size && !listar ? 1 : 0);
}
fs.writeFileSync(path.join(destino, 'catalogo.json'), JSON.stringify(catalogo));
fs.writeFileSync(path.join(site, 'public', 'lpc', 'creditos-avatar.json'), JSON.stringify([...creditos.values()], null, 1));
const total = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? total(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log('Catálogo pronto:', Object.entries(catalogo.grupos).map(([g, l]) => g + ' ' + l.length).join(', '), '| tamanho', Math.round(total(destino) / 1024) + ' KB', '| créditos', creditos.size);
