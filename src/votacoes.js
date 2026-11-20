// Votações das bifurcações: o professor abre e encerra; cada aluno vota uma vez e pode mudar enquanto está aberta.
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc } from './ui.js';

export const idVotacao = (turma, faseId) => `${turma}_${faseId}`;

export function contar(v, votos) {
  const c = Object.fromEntries((v?.opcoes ?? []).map((o) => [o.id, 0]));
  for (const x of votos) if (x.votacao === v.id && x.opcao in c) c[x.opcao] += 1;
  const max = Math.max(0, ...Object.values(c));
  const lideres = Object.keys(c).filter((k) => c[k] === max && max > 0);
  return { c, total: Object.values(c).reduce((s, n) => s + n, 0), lideres };
}

const textoOpcao = (v, id) => v.opcoes.find((o) => o.id === id)?.texto ?? id;

// ---------- aluno ----------
export function htmlVotacaoAluno(v, meuVoto, ver) {
  if (v.estado === 'aberta') {
    return `<div class="votacao"><span class="chip">Votação aberta</span><h3>${esc(v.pergunta)}</h3>
      <div class="opcoes-voto">${v.opcoes.map((o) => `<button class="opcao-voto ${meuVoto?.opcao === o.id ? 'sel' : ''}" data-votar="${esc(v.id)}" data-op="${esc(o.id)}" ${ver ? 'disabled' : ''}>${meuVoto?.opcao === o.id ? '✓ ' : ''}${esc(o.texto)}</button>`).join('')}</div>
      <p class="nota">${meuVoto ? 'Voto registrado. Dá para mudar até o professor encerrar.' : 'Toque numa opção para votar. Ninguém vê o seu voto.'}</p></div>`;
  }
  if (v.vencedora) return `<div class="votacao fechada"><span class="chip">Resultado</span><p><strong>${esc(v.pergunta)}</strong><br>A turma escolheu: <strong>${esc(textoOpcao(v, v.vencedora))}</strong></p></div>`;
  return '';
}

export const votar = (v, opcao, uid, turma) => setDoc(doc(db, 'votos', `${v.id}_${uid}`), { uid, turma, votacao: v.id, opcao, em: serverTimestamp() });

// ---------- professor ----------
export function htmlVotacaoProfessor(st, f, ativos) {
  if (!f.votacao) return '';
  const id = idVotacao(st.turma, f.id);
  const v = (st.votacoes ?? []).find((x) => x.id === id);
  if (!v) {
    return `<h2>Votação do cenário</h2><p>${esc(f.votacao.pergunta)}</p><p class="nota">${f.votacao.opcoes.map((o) => esc(o.texto)).join(' · ')}</p>
      <button class="botao secundario" data-acao="vt-abrir" data-id="${esc(f.id)}">Abrir a votação para a turma</button>`;
  }
  const { c, total, lideres } = contar(v, st.votos ?? []);
  const barras = v.opcoes.map((o) => {
    const pct = total ? Math.round((100 * c[o.id]) / total) : 0;
    return `<li><span>${esc(o.texto)}${v.vencedora === o.id ? ' 🏆' : ''}</span><span class="barra-voto"><span style="width:${pct}%"></span></span><strong>${c[o.id]}</strong></li>`;
  }).join('');
  const empate = v.estado === 'fechada' && !v.vencedora && lideres.length > 1;
  return `<h2>Votação do cenário</h2><p>${esc(v.pergunta)}</p>
    <ul class="resultado-voto">${barras}</ul>
    <p class="nota">${total} de ${ativos.length} aluno(s) votaram · ${v.estado === 'aberta' ? 'aberta' : 'encerrada'}</p>
    ${empate ? `<div class="alerta"><strong>Empate</strong><p>Escolha o cenário (ou desempate na sala e marque aqui).</p><div class="linha-btn">${lideres.map((k) => `<button class="mini ok" data-acao="vt-vencedora" data-id="${esc(v.id)}" data-op="${esc(k)}">${esc(textoOpcao(v, k))}</button>`).join('')}</div></div>` : ''}
    <div class="linha-btn">${v.estado === 'aberta'
      ? `<button class="botao" data-acao="vt-encerrar" data-id="${esc(v.id)}">Encerrar e mostrar o resultado</button>`
      : `<button class="mini" data-acao="vt-reabrir" data-id="${esc(v.id)}">Reabrir a votação</button>`}</div>
    ${v.vencedora ? '<p class="nota">Use o dossiê e as cartas do cenário vencedor, em "Material do professor".</p>' : ''}`;
}

export async function tratarVotacao(acao, b, st) {
  const v = (st.votacoes ?? []).find((x) => x.id === b.dataset.id);
  switch (acao) {
    case 'vt-abrir': {
      const f = st.fases.find((x) => x.id === b.dataset.id);
      if (!confirm('Abrir a votação? Os alunos da turma veem a pergunta na tela das fases.')) return true;
      await setDoc(doc(db, 'votacoes', idVotacao(st.turma, f.id)), {
        turma: st.turma, fase: f.id, pergunta: f.votacao.pergunta, opcoes: f.votacao.opcoes, opcoesIds: f.votacao.opcoes.map((o) => o.id), estado: 'aberta', abertaEm: serverTimestamp(),
      });
      return true;
    }
    case 'vt-encerrar': {
      const { c, lideres } = contar(v, st.votos ?? []);
      await updateDoc(doc(db, 'votacoes', v.id), { estado: 'fechada', contagem: c, vencedora: lideres.length === 1 ? lideres[0] : null, encerradaEm: serverTimestamp() });
      return true;
    }
    case 'vt-vencedora': await updateDoc(doc(db, 'votacoes', v.id), { vencedora: b.dataset.op }); return true;
    case 'vt-reabrir':
      if (confirm('Reabrir a votação? O resultado some até você encerrar de novo.')) await updateDoc(doc(db, 'votacoes', v.id), { estado: 'aberta', vencedora: null });
      return true;
    default: return false;
  }
}
