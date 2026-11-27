// Guildas e grupos do lado do aluno: montar por convite, aceitar, sair, e nome e escudo da guilda.
import { doc, collection, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc } from './ui.js';
import { htmlTela } from './jogo.js';
import { imgAvatar } from './avatar.js';
import { grupoDe, convitesPara, svgEscudo, nomeGuilda, FORMAS, CORES, SIMBOLOS } from './grupos.js';

const nomeDe = (perfis, uid) => perfis[uid]?.apelido ?? 'Colega';
const pessoa = (perfis, uid, extra = '') => `<span class="pessoa">${imgAvatar(perfis[uid]?.avatar, 'avatar pq')}<span>${esc(nomeDe(perfis, uid))}${extra}</span></span>`;

// Bloco de formação do grupo de uma atividade (dentro da fase ou na página da guilda).
// ctx: { atv, cfg, grupos, perfis, eu, ver, montando }
export function htmlFormacao(ctx) {
  const { atv, cfg, grupos, perfis, eu, ver, montando } = ctx;
  const meu = grupoDe(grupos, atv, eu);
  const convites = convitesPara(grupos, atv, eu);
  const podeMontar = cfg.aberta && cfg.modo === 'alunos' && !ver;

  if (meu) {
    const sou = meu.criador === eu;
    const vagas = cfg.tamanho - meu.membros.length - (meu.convites?.length ?? 0);
    return `<div class="meu-grupo">
      <div class="pessoas">${meu.membros.map((u) => pessoa(perfis, u, u === eu ? ' (você)' : '')).join('')}
        ${(meu.convites ?? []).map((u) => pessoa(perfis, u, ' <span class="nota">convidado</span>')).join('')}</div>
      ${podeMontar ? `<div class="linha-btn">
        ${sou && vagas > 0 ? `<button class="mini" data-grupo="convidar" data-g="${esc(meu.id)}">Convidar mais (${vagas} vaga${vagas > 1 ? 's' : ''})</button>` : ''}
        ${sou && meu.membros.length === 1 ? `<button class="mini ruim" data-grupo="desfazer" data-g="${esc(meu.id)}">Desfazer o grupo</button>` : ''}
        ${!sou ? `<button class="mini ruim" data-grupo="sair" data-g="${esc(meu.id)}">Sair do grupo</button>` : ''}</div>` : ''}
      ${montando?.g === meu.id ? htmlEscolha(ctx, vagas) : ''}</div>`;
  }

  const lista = convites.map((g) => `<li class="convite"><div><strong>${esc(nomeDe(perfis, g.criador))}</strong> convidou você${g.membros.length > 1 ? `, com ${g.membros.filter((u) => u !== g.criador).map((u) => esc(nomeDe(perfis, u))).join(', ')}` : ''}.</div>
    ${ver ? '' : `<div class="linha-btn"><button class="mini ok" data-grupo="aceitar" data-g="${esc(g.id)}">Aceitar</button><button class="mini" data-grupo="recusar" data-g="${esc(g.id)}">Recusar</button></div>`}</li>`).join('');
  const conv = lista ? `<ul class="lista convites">${lista}</ul>` : '';

  if (podeMontar) {
    return `${conv}${montando?.g === 'novo' ? htmlEscolha(ctx, cfg.tamanho - 1) : `<button class="botao" data-grupo="montar">Montar o meu grupo</button>
      <p class="nota">Escolha até ${cfg.tamanho - 1} colega(s). Cada um recebe o convite e confirma.</p>`}`;
  }
  const quem = cfg.modo === 'sorteio' ? 'O professor vai sortear os grupos.' : cfg.modo === 'professor' ? 'O professor vai montar os grupos.' : 'O professor ainda não abriu a formação dos grupos.';
  return `${conv}<p class="nota">${quem}</p>`;
}

function htmlEscolha(ctx, maximo) {
  const { atv, grupos, perfis, eu, montando } = ctx;
  const ocupados = new Set(grupos.filter((g) => g.atividade === atv).flatMap((g) => g.membros));
  const livres = Object.entries(perfis).filter(([u]) => u !== eu && !ocupados.has(u)).sort((a, b) => a[1].apelido.localeCompare(b[1].apelido, 'pt-BR'));
  const sel = montando?.sel ?? [];
  return `<div class="escolha">
    <p><strong>Quem vai com você?</strong> <span class="nota">Escolha até ${maximo}.</span></p>
    <ul class="escolha-lista">${livres.map(([u]) => `<li><label class="check">${pessoa(perfis, u)}<input type="checkbox" data-escolha="${esc(u)}" ${sel.includes(u) ? 'checked' : ''} ${!sel.includes(u) && sel.length >= maximo ? 'disabled' : ''}></label></li>`).join('') || '<li class="nota">Todos os colegas já estão em grupos.</li>'}</ul>
    <div class="linha-btn"><button class="botao" data-grupo="enviar" ${sel.length || montando?.g === 'novo' ? '' : 'disabled'}>${montando?.g === 'novo' ? (sel.length ? `Criar o grupo e convidar ${sel.length}` : 'Criar o grupo só comigo por enquanto') : 'Enviar convites'}</button>
      <button class="botao secundario" data-grupo="cancelar">Cancelar</button></div></div>`;
}

// Página da guilda.
export function htmlGuilda(ctx) {
  const { grupos, perfis, eu, ver, rascunho, aviso } = ctx;
  const g = grupoDe(grupos, ctx.atv, eu);
  const molde = (corpo) => htmlTela({ aba: 'guilda', rec: ctx.rec, titulo: 'Minha guilda', corpo });
  if (!g) {
    return molde(`
      <p>A guilda é o seu grupo fixo neste mundo, com nome e escudo criados por vocês.</p>
      ${htmlFormacao(ctx)}<p class="erro" id="msg">${esc(aviso ?? '')}</p>`);
  }
  const p = g.proposta;
  const todos = p && g.membros.every((u) => p.confirmacoes.includes(u));
  const jaConfirmei = p?.confirmacoes?.includes(eu);
  const r = rascunho ?? { nome: '', forma: 'classico', cor1: CORES[0], cor2: CORES[3], simbolo: '⭐' };
  const editor = ver ? '' : `<details class="mais" ${p ? '' : 'open'}><summary>${p ? 'Propor outro nome e escudo' : 'Criar o nome e o escudo'}</summary>
    <label for="gd-nome">Nome da guilda</label><input id="gd-nome" maxlength="24" value="${esc(r.nome)}" placeholder="Ex.: Os Planejadores">
    <div class="escudo-editor"><div class="escudo-previa">${svgEscudo(r, 96)}</div>
      <div><p class="nota">Forma</p><div class="opcoes">${Object.keys(FORMAS).map((k) => `<button type="button" class="opcao-escudo ${r.forma === k ? 'sel' : ''}" data-escudo="forma" data-v="${k}" aria-label="${k}">${svgEscudo({ ...r, forma: k }, 32)}</button>`).join('')}</div>
      <p class="nota">Cor da esquerda</p><div class="opcoes">${CORES.map((c) => `<button type="button" class="cor ${r.cor1 === c ? 'sel' : ''}" style="background:${c}" data-escudo="cor1" data-v="${c}" aria-label="Cor ${c}"></button>`).join('')}</div>
      <p class="nota">Cor da direita</p><div class="opcoes">${CORES.map((c) => `<button type="button" class="cor ${r.cor2 === c ? 'sel' : ''}" style="background:${c}" data-escudo="cor2" data-v="${c}" aria-label="Cor ${c}"></button>`).join('')}</div>
      <p class="nota">Símbolo</p><div class="opcoes">${SIMBOLOS.map((s) => `<button type="button" class="simbolo ${r.simbolo === s ? 'sel' : ''}" data-escudo="simbolo" data-v="${s}">${s}</button>`).join('')}</div></div></div>
    <button class="botao" data-grupo="propor" data-g="${esc(g.id)}">Propor para a guilda</button>
    <p class="nota">Os outros integrantes confirmam, e o professor aprova antes de aparecer no jogo.</p></details>`;
  return molde(`
    <div class="guilda-cab">${g.escudo ? svgEscudo(g.escudo, 72) : '<div class="escudo-vazio">?</div>'}<div><h1>${esc(nomeGuilda(g))}</h1><p class="nota">${g.membros.length} integrante(s)</p></div></div>
    ${htmlFormacao(ctx)}
    ${p ?`<div class="proposta"><strong>Proposta de ${esc(nomeDe(perfis, p.por))}</strong>
      <div class="guilda-cab">${svgEscudo(p.escudo, 56)}<div><strong>${esc(p.nome)}</strong><p class="nota">Confirmaram: ${p.confirmacoes.map((u) => esc(nomeDe(perfis, u))).join(', ')}</p></div></div>
      ${todos ? '<p class="nota">Todos confirmaram. Agora é com o professor.</p>' : !jaConfirmei && !ver ? `<button class="botao" data-grupo="confirmar" data-g="${esc(g.id)}">Confirmar esta proposta</button>` : '<p class="nota">Esperando os outros integrantes confirmarem.</p>'}</div>` : ''}
    ${editor}
    <p class="erro" id="msg">${esc(aviso ?? '')}</p>`);
}

// ---------- ações ----------
const refVaga = (atv, uid) => doc(db, 'vagas', `${atv}_${uid}`);

export async function criarGrupo({ atv, turma, eu, convites }) {
  const ref = doc(collection(db, 'grupos'));
  const b = writeBatch(db);
  b.set(ref, { turma, atividade: atv, membros: [eu], convites, criador: eu, criadoEm: serverTimestamp() });
  b.set(refVaga(atv, eu), { uid: eu, turma, atividade: atv, grupo: ref.id });
  await b.commit();
}

export async function aceitarConvite(g, eu, outros) {
  const b = writeBatch(db);
  b.update(doc(db, 'grupos', g.id), { membros: [...g.membros, eu], convites: g.convites.filter((u) => u !== eu) });
  b.set(refVaga(g.atividade, eu), { uid: eu, turma: g.turma, atividade: g.atividade, grupo: g.id });
  await b.commit();
  // os outros convites da mesma atividade ficam sem efeito
  for (const o of outros) await updateDoc(doc(db, 'grupos', o.id), { convites: o.convites.filter((u) => u !== eu) }).catch(() => {});
}

export const recusarConvite = (g, eu) => updateDoc(doc(db, 'grupos', g.id), { convites: g.convites.filter((u) => u !== eu) });

export const convidarMais = (g, novos) => updateDoc(doc(db, 'grupos', g.id), { convites: [...new Set([...(g.convites ?? []), ...novos])] });

export async function sairDoGrupo(g, eu) {
  const b = writeBatch(db);
  b.update(doc(db, 'grupos', g.id), { membros: g.membros.filter((u) => u !== eu) });
  b.delete(refVaga(g.atividade, eu));
  await b.commit();
}

export async function desfazerGrupo(g, eu) {
  const b = writeBatch(db);
  b.delete(doc(db, 'grupos', g.id));
  b.delete(refVaga(g.atividade, eu));
  await b.commit();
}

export const proporNome = (g, eu, r) => updateDoc(doc(db, 'grupos', g.id), {
  proposta: { nome: r.nome, escudo: { forma: r.forma, cor1: r.cor1, cor2: r.cor2, simbolo: r.simbolo }, por: eu, confirmacoes: [eu] },
});

export const confirmarProposta = (g, eu) => updateDoc(doc(db, 'grupos', g.id), { proposta: { ...g.proposta, confirmacoes: [...g.proposta.confirmacoes, eu] } });
