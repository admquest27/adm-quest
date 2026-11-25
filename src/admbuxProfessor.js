// AdmBux do lado do professor: saldo e extrato de cada aluno, prêmios e rendimento da poupança.
import { nomeDe, nomeCurto } from './alunos.js';
import { doc, setDoc, writeBatch, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc } from './ui.js';
import { MUNDO } from './fases.js';
import { calcularCarteira, rendimentoDe, CONQUISTAS } from './economia.js';

// Os dados do professor vêm indexados por uid_fase; a carteira precisa deles por fase, de um aluno só.
export function carteiraDoAluno(st, uid) {
  const porFase = (mapa) => Object.fromEntries(Object.values(mapa ?? {}).filter((x) => x.uid === uid).map((x) => [x.fase, x]));
  return calcularCarteira({
    fases: st.fases,
    progresso: porFase(st.progresso),
    aval: porFase(st.aval),
    recados: (st.comentarios ?? []).filter((c) => c.uid === uid && c.visivel === true),
    carteira: st.carteiras?.[uid] ?? null,
    compras: st.compras?.[uid] ?? null,
    eco: st.eco,
  });
}

const data = (ms) => (ms ? new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '');

export function abrirAdmBux(st, dlg, uid) {
  const a = st.alunos.find((x) => x.uid === uid);
  const pintar = (msg = '') => {
    const c = carteiraDoAluno(st, uid);
    const textos = { ...CONQUISTAS, ...(st.eco?.conquistas ?? {}) };
    dlg.innerHTML = `<form class="form" id="form-premio">
      <h2>AdmBux de ${esc(nomeDe(a))}</h2>
      <p class="saldo-mini ${c.saldo < 0 ? 'erro' : ''}">🪙 <strong>${c.saldo}</strong> AdmBux · entrou ${c.entradas} · saiu ${c.saidas}</p>
      <p class="nota">Conquistas: ${c.conquistas.map((id) => esc(textos[id]?.nome ?? id)).join(', ') || 'nenhuma ainda'}.</p>
      <h3>Dar um prêmio</h3>
      <div class="linha-btn"><input id="pr-valor" type="number" min="1" max="50" value="5" class="min-campo" aria-label="Valor"><input id="pr-motivo" maxlength="80" placeholder="Motivo (o aluno vê no extrato)" required></div>
      <p class="nota">Use para algo que o jogo não vê sozinho: organizou a sala, ajudou na feira, trouxe material.</p>
      <p class="erro" id="pr-msg">${esc(msg)}</p>
      <div class="linha-btn"><button class="botao" type="submit">Dar prêmio</button><button class="botao secundario" type="button" id="pr-fechar">Fechar</button></div>
      <h3>Extrato</h3>
      <ul class="extrato">${c.linhas.slice().reverse().map((l) => `<li class="linha-extrato"><span class="nota">${data(l.quando)}</span><span class="desc">${esc(l.descricao)}</span><span class="valor ${l.valor < 0 ? 'saida' : 'entrada'}">${l.valor > 0 ? '+' : ''}${l.valor}</span></li>`).join('') || '<li class="vazio">Nada ainda.</li>'}</ul>
    </form>`;
  };
  pintar();
  dlg.onclick = (ev) => { if (ev.target.id === 'pr-fechar') dlg.close(); };
  dlg.onsubmit = async (ev) => {
    if (ev.target.id !== 'form-premio') return;
    ev.preventDefault();
    const valor = Math.round(Number(document.getElementById('pr-valor').value));
    const motivo = document.getElementById('pr-motivo').value.trim();
    if (!(valor >= 1 && valor <= 50) || !motivo) { document.getElementById('pr-msg').textContent = 'Escolha um valor de 1 a 50 e escreva o motivo.'; return; }
    try {
      await setDoc(doc(db, 'carteiras', uid), { uid, turma: a?.turma ?? st.turma, premios: arrayUnion({ valor, motivo, em: Date.now() }), atualizadoEm: serverTimestamp() }, { merge: true });
      st.carteiras = { ...st.carteiras, [uid]: { ...(st.carteiras?.[uid] ?? {}), premios: [...(st.carteiras?.[uid]?.premios ?? []), { valor, motivo, em: Date.now() }] } };
      pintar('Prêmio dado ✓');
    } catch { document.getElementById('pr-msg').textContent = 'Não consegui salvar agora.'; }
  };
  dlg.showModal();
}

// Seção de Ajustes.
export function htmlAdmBuxMais(st, ativos) {
  if (!st.eco) {
    return `<h2>AdmBux</h2><p class="nota">A loja ainda não foi carregada no banco. Ela entra com a ferramenta importar-economia.</p>`;
  }
  const saldos = ativos.map((a) => ({ a, c: carteiraDoAluno(st, a.uid) }));
  const negativos = saldos.filter((x) => x.c.saldo < 0);
  const pagos = saldos.filter((x) => st.carteiras?.[x.a.uid]?.rendimentos?.[MUNDO]);
  const total = saldos.reduce((s, x) => s + Math.max(0, x.c.saldo), 0);
  return `<h2>AdmBux</h2>
    <p class="nota">${ativos.length} aluno(s) ativo(s) nesta turma, com ${total} AdmBux guardadas no total. O saldo de cada um aparece no botão 🪙 em Alunos.</p>
    ${negativos.length ? `<div class="alerta"><strong>Saldo negativo</strong><p>${negativos.map((x) => esc(nomeCurto(x.a))).join(', ')}. Acontece quando uma validação é retirada depois de uma compra. Se for estranho, confira o extrato.</p></div>` : ''}
    <h3>Rendimento da poupança</h3>
    <p class="nota">No fim do mundo, cada aluno recebe ${Math.round((st.eco.valores?.rendimento ?? 0.1) * 100)}% do saldo guardado. Pague uma vez só, na semana de fechamento.</p>
    ${pagos.length ? `<p class="nota">Já pago para ${pagos.length} aluno(s) neste mundo.</p>` : ''}
    <button class="botao secundario" data-acao="admbux-rendimento">Pagar o rendimento do mundo</button>`;
}

export async function pagarRendimento(st, ativos) {
  const taxa = st.eco?.valores?.rendimento ?? 0.1;
  const nome = st.mundo?.nome ?? MUNDO;
  const alvo = ativos
    .filter((a) => !st.carteiras?.[a.uid]?.rendimentos?.[MUNDO])
    .map((a) => ({ a, valor: rendimentoDe(carteiraDoAluno(st, a.uid).saldo, taxa) }))
    .filter((x) => x.valor > 0);
  if (!alvo.length) return 'Ninguém para receber: ou todos já receberam, ou ninguém tem saldo.';
  const soma = alvo.reduce((s, x) => s + x.valor, 0);
  if (!confirm(`Pagar o rendimento de ${nome} para ${alvo.length} aluno(s), ${soma} AdmBux no total? Isso é feito uma vez por mundo.`)) return '';
  const lote = writeBatch(db);
  for (const x of alvo) {
    lote.set(doc(db, 'carteiras', x.a.uid), { uid: x.a.uid, turma: x.a.turma, rendimentos: { [MUNDO]: { valor: x.valor, em: Date.now(), nome } }, atualizadoEm: serverTimestamp() }, { merge: true });
  }
  await lote.commit();
  return `Rendimento pago para ${alvo.length} aluno(s).`;
}
