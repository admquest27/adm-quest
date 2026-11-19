// Tela das AdmBux do aluno: saldo, loja, conquistas e extrato. Função pura: recebe os dados e devolve o HTML.
import { esc } from './ui.js';
import { imgAvatar } from './avatar.js';
import { CONQUISTAS, itensDaLoja, podeComprar } from './economia.js';

const TIPOS = { titulo: 'Títulos', moldura: 'Molduras', fundo: 'Fundos do cartão' };
const data = (ms) => (ms ? new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '');
const moeda = (n) => `${n} AdmBux`;

// O que o aluno está usando, já com o item da loja (para mostrar no cabeçalho e, depois, na praça).
export function visual(eco, compras) {
  const u = compras?.usando ?? {};
  const item = (id) => (id ? eco?.loja?.[id] : null);
  return { titulo: item(u.titulo)?.nome ?? '', moldura: item(u.moldura)?.estilo ?? '', fundo: item(u.fundo)?.estilo ?? '' };
}

// Avatar com moldura (usado no cabeçalho do aluno e na tela da carteira).
export const avatarComMoldura = (avatar, estilo, classe = 'avatar p') => `<span class="moldura ${estilo ? `mold-${esc(estilo)}` : ''}">${imgAvatar(avatar, classe)}</span>`;

function previa(i, avatar) {
  if (i.tipo === 'titulo') return `<span class="titulo-aluno">${esc(i.nome)}</span>`;
  if (i.tipo === 'moldura') return avatarComMoldura(avatar, i.estilo);
  return `<span class="amostra-fundo fundo-${esc(i.estilo)}"></span>`;
}

export function htmlCarteira({ c, eco, compras, avatar, mundoAtual, ver, aviso }) {
  const dicas = eco?.dicas ?? [];
  const dica = dicas.length ? dicas[Math.floor(Date.now() / 86400000) % dicas.length] : '';
  const usando = compras?.usando ?? {};
  const tenho = new Set((compras?.itens ?? []).map((x) => x.id));
  const itens = itensDaLoja(eco, mundoAtual);
  // itens comprados que saíram da venda continuam aparecendo para quem tem
  for (const id of tenho) if (!itens.some((i) => i.id === id) && eco?.loja?.[id]) itens.push({ id, ...eco.loja[id] });

  const cartao = (i) => {
    const meu = tenho.has(i.id);
    const emUso = usando[i.tipo] === i.id;
    const pode = podeComprar(i, c.saldo, compras);
    let botao;
    if (ver) botao = '';
    else if (meu) botao = `<button class="mini ${emUso ? 'ok cheio' : ''}" data-usar="${esc(i.id)}" data-tipo="${esc(i.tipo)}">${emUso ? 'Em uso ✓' : 'Usar'}</button>`;
    else botao = `<button class="mini ${pode.ok ? 'ok' : ''}" data-comprar="${esc(i.id)}" ${pode.ok ? '' : 'disabled'}>Comprar</button>${pode.ok ? '' : `<span class="nota">${esc(pode.motivo)}</span>`}`;
    return `<li class="item-loja ${meu ? 'meu' : ''}">
      <div class="item-previa">${previa(i, avatar)}</div>
      <div class="item-info"><strong>${esc(i.nome)}</strong>
        <span class="preco">${meu ? 'Seu' : moeda(i.preco)}</span>
        ${i.limitado && !meu ? '<span class="chip limitado" title="Some da loja no fim do mundo">Só neste mundo</span>' : ''}</div>
      <div class="item-acao">${botao}</div></li>`;
  };
  const loja = Object.keys(TIPOS).map((t) => {
    const lista = itens.filter((i) => i.tipo === t);
    return lista.length ? `<details class="loja-sec" ${t === 'titulo' ? 'open' : ''}><summary>${TIPOS[t]} (${lista.length})</summary><ul class="loja">${lista.map(cartao).join('')}</ul></details>` : '';
  }).join('');

  const textos = { ...CONQUISTAS, ...(eco?.conquistas ?? {}) };
  const total = Object.keys(textos).length;
  const ganhas = c.conquistas.map((id) => `<li class="conquista"><span class="trofeu" aria-hidden="true">🏆</span><div><strong>${esc(textos[id]?.nome ?? id)}</strong><p class="nota">${esc(textos[id]?.texto ?? '')}</p></div></li>`).join('');
  const escondidas = total - c.conquistas.length;

  const extrato = c.linhas.slice().reverse().map((l) => `<li class="linha-extrato"><span class="nota">${data(l.quando)}</span><span class="desc">${esc(l.descricao)}</span><span class="valor ${l.valor < 0 ? 'saida' : 'entrada'}">${l.valor > 0 ? '+' : ''}${l.valor}</span></li>`).join('');
  const V = c.V;

  return `<section class="cartao largo esq">
    <button id="voltar-carteira" class="mini">← Fases</button>
    <h1>Minhas AdmBux</h1>
    <div class="saldo ${c.saldo < 0 ? 'negativo' : ''}"><span class="moeda" aria-hidden="true">🪙</span><strong>${c.saldo}</strong><span>AdmBux</span></div>
    <p class="nota centro-txt">Entrou ${c.entradas} · Saiu ${c.saidas}</p>
    ${c.saldo < 0 ? '<p class="banner">Seu saldo ficou negativo, porque uma fase deixou de estar validada depois de uma compra. Você não perde o que comprou, mas só volta a comprar quando o saldo ficar positivo.</p>' : ''}
    ${dica ? `<p class="dica-adm"><strong>Dica de administrador.</strong> ${esc(dica)}</p>` : ''}
    <p class="erro" id="msg">${esc(aviso ?? '')}</p>
    <h2>Loja</h2>
    <p class="nota">Itens só para enfeitar o seu avatar e o seu cartão. Ninguém vê o seu saldo.</p>
    ${loja || '<p class="vazio">A loja ainda está sendo montada.</p>'}
    <h2>Conquistas</h2>
    ${ganhas ? `<ul class="lista conquistas">${ganhas}</ul>` : '<p class="nota">Nenhuma ainda. Elas aparecem de surpresa.</p>'}
    ${escondidas > 0 ? `<p class="nota">Ainda há ${escondidas} conquista(s) escondida(s).</p>` : ''}
    <details class="mais"><summary>Como ganhar AdmBux</summary>
      <p>Fase validada pelo professor: ${V.fase}. Cada bônus feito numa fase validada: ${V.bonus}. Atitude positiva registrada pelo professor: ${V.atitude}. Conquista: ${V.conquista}. No fim de cada mundo, quem guardou AdmBux recebe ${Math.round(V.rendimento * 100)}% do saldo como rendimento da poupança. A menção nunca vale AdmBux.</p></details>
    <h2>Extrato</h2>
    ${extrato ? `<ul class="extrato">${extrato}</ul>` : '<p class="nota">Nada por aqui ainda. Conclua uma fase e espere o professor validar.</p>'}
  </section>`;
}

// Aviso de conquista nova (guardado no aparelho, só para não repetir o aviso).
export function conquistasNovas(uid, conquistas) {
  const chave = `admq-conq-${uid}`;
  let vistas = [];
  try { vistas = JSON.parse(localStorage.getItem(chave) ?? '[]'); } catch { vistas = []; }
  return { novas: conquistas.filter((id) => !vistas.includes(id)), marcar: () => { try { localStorage.setItem(chave, JSON.stringify(conquistas)); } catch { /* sem armazenamento: o aviso volta na próxima vez */ } } };
}
