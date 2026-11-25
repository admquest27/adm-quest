// Castelo do chefão: barra de vida e baús que as guildas abrem com código.
// A barra cai pela metade com as fases encerradas e pela outra metade com os baús abertos por todas as guildas.
import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc } from './ui.js';
import { ATV_GUILDA, grupoDe, svgEscudo, nomeGuilda } from './grupos.js';

export const normalizarCodigo = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);

// Pura: { vida, parteFases, parteCastelo, abertos, total, guildas }
export function vidaDoChefao({ f, fases, estados, grupos, acertos }) {
  const normais = fases.filter((x) => x.mundo === f.mundo && x.tipo !== 'chefao' && x.tipo !== 'excel');
  const encerradas = normais.filter((x) => estados?.[x.id] === 'encerrada').length;
  const guildas = grupos.filter((g) => g.atividade === ATV_GUILDA && g.membros?.length);
  const total = (f.baus?.length ?? 0) * guildas.length;
  const abertos = acertos.filter((a) => a.fase === f.id && guildas.some((g) => g.id === a.grupo)).length;
  const parteFases = normais.length ? (50 * encerradas) / normais.length : 0;
  const parteCastelo = total ? (50 * abertos) / total : 0;
  return { vida: Math.max(0, Math.round(100 - parteFases - parteCastelo)), parteFases, parteCastelo, abertos, total, guildas };
}

export const htmlBarra = (vida, grande = false) => `<div class="barra-vida ${grande ? 'grande' : ''}" role="img" aria-label="Vida do Barão: ${vida}%">
  <span class="barra-rotulo">Barão da Bagunça</span><span class="barra-fundo"><span class="barra-cheia" style="width:${vida}%"></span></span><strong>${vida}%</strong></div>`;

// ---------- aluno ----------
export function htmlCasteloAluno(ctx) {
  const { f, eu, grupos, acertos, ver, est } = ctx;
  const v = vidaDoChefao(ctx);
  const g = grupoDe(grupos, ATV_GUILDA, eu);
  if (v.vida === 0) return `<div class="castelo">${htmlBarra(0)}<p class="vitoria">🎉 O Barão da Bagunça foi derrotado! A Vila está livre.</p></div>`;
  if (!g) return `<div class="castelo">${htmlBarra(v.vida)}<p class="nota">Você precisa estar numa guilda para abrir os baús. Fale com o professor.</p></div>`;
  const meus = new Set(acertos.filter((a) => a.grupo === g.id && a.fase === f.id).map((a) => a.bau));
  const aberto = est === 'aberta';
  return `<div class="castelo">${htmlBarra(v.vida)}
    <p class="nota">Baús abertos pela turma: ${v.abertos} de ${v.total}. A vitória só vem quando todas as guildas abrirem todos os baús.</p>
    <h3>Baús da guilda ${esc(nomeGuilda(g))}</h3>
    <ul class="baus">${(f.baus ?? []).map((b) => (meus.has(b.id)
      ? `<li class="bau aberto"><span>📦 ${esc(b.nome)}</span><strong>Aberto ✓</strong></li>`
      : `<li class="bau"><span>🔒 ${esc(b.nome)}</span>${aberto && !ver ? `<span class="bau-acao"><input data-codigo="${esc(b.id)}" maxlength="20" autocomplete="off" autocapitalize="characters" placeholder="Código" aria-label="Código do baú ${esc(b.nome)}"><button class="mini ok" data-abrir-bau="${esc(b.id)}" data-g="${esc(g.id)}">Abrir</button></span>` : ''}</li>`)).join('')}</ul>
    <p class="erro" id="msg-bau"></p></div>`;
}

export async function abrirBau({ f, bau, codigo, grupo, uid, turma }) {
  const c = normalizarCodigo(codigo);
  if (!c) return 'Digite o código.';
  try {
    await setDoc(doc(db, 'acertos', `${turma}_${f.id}_${bau}_${grupo}`), { turma, fase: f.id, bau, grupo, codigo: c, uid, em: serverTimestamp() });
    return '';
  } catch {
    return 'Código errado. Confiram o enigma e tentem de novo.';
  }
}

// ---------- professor ----------
export function htmlCasteloProfessor(st, f, turma) {
  if (f.tipo !== 'chefao') return '';
  const v = vidaDoChefao({ f, fases: st.fases, estados: turma?.estadoFases, grupos: st.grupos ?? [], acertos: st.acertos ?? [] });
  const codigos = st.profFase?.professor?.codigos ?? {};
  const enigmas = st.profFase?.professor?.baus ?? [];
  const linhas = v.guildas.map((g) => {
    const feitos = new Set((st.acertos ?? []).filter((a) => a.grupo === g.id && a.fase === f.id).map((a) => a.bau));
    return `<li class="aluno">${g.escudo ? svgEscudo(g.escudo, 24) : ''}<span class="nome">${esc(nomeGuilda(g))}</span><span class="nota">${(f.baus ?? []).map((b) => (feitos.has(b.id) ? '📦' : '🔒')).join('')}</span><strong>${feitos.size}/${f.baus?.length ?? 0}</strong></li>`;
  }).join('');
  return `<h2>Castelo</h2>${htmlBarra(v.vida)}
    <p class="nota">Fases encerradas derrubam ${Math.round(v.parteFases)}% e os baús ${Math.round(v.parteCastelo)}%. ${v.abertos} de ${v.total} baús abertos.</p>
    <button class="botao" data-acao="cs-projetar">Projetar na tela da sala</button>
    <ul class="lista">${linhas || '<li class="vazio">Nenhuma guilda ainda. As guildas são montadas em Alunos, na aba Guildas.</li>'}</ul>
    <details class="roteiro"><summary>Códigos dos baús (só você vê)</summary>
      <p class="nota">Letras e números, sem espaço. O jogo ignora acentos e maiúsculas.</p>
      ${(f.baus ?? []).map((b, i) => `<div class="cod-bau"><strong>${esc(b.nome)}</strong>${enigmas[i] ? `<span class="nota">${esc(enigmas[i].enigma)} · ${esc(enigmas[i].codigo)}</span>` : ''}
        <span class="linha-btn"><input data-cod-bau="${esc(b.id)}" value="${esc(codigos[b.id] ?? '')}" maxlength="20" placeholder="Código" aria-label="Código do baú ${esc(b.nome)}"><button class="mini ${codigos[b.id] ? 'ok' : ''}" data-acao="cs-codigo" data-id="${esc(b.id)}">${codigos[b.id] ? 'Salvo ✓' : 'Salvar'}</button></span></div>`).join('')}
    </details>
    ${turma?.teste ? '<button class="mini ruim" data-acao="cs-zerar">Zerar os baús abertos (turma de teste)</button>' : ''}`;
}

export function htmlProjecao(st, f, turma) {
  const v = vidaDoChefao({ f, fases: st.fases, estados: turma?.estadoFases, grupos: st.grupos ?? [], acertos: st.acertos ?? [] });
  const guildas = v.guildas.map((g) => {
    const feitos = (st.acertos ?? []).filter((a) => a.grupo === g.id && a.fase === f.id).length;
    return `<li>${g.escudo ? svgEscudo(g.escudo, 56) : '<span class="escudo-vazio">?</span>'}<strong>${esc(nomeGuilda(g))}</strong><span>${feitos}/${f.baus?.length ?? 0} baús</span></li>`;
  }).join('');
  return `<div class="projecao">
    <button class="mini" data-acao="cs-sair">Sair da projeção</button>
    <h1>${esc(f.nome)}</h1>
    ${htmlBarra(v.vida, true)}
    ${v.vida === 0 ? '<p class="vitoria grande">🎉 O Barão da Bagunça foi derrotado!</p>' : `<p class="nota">${v.abertos} de ${v.total} baús abertos</p>`}
    <ul class="guildas-proj">${guildas}</ul></div>`;
}

export async function tratarCastelo(acao, b, st, falha) {
  const f = st.fases.find((x) => x.id === st.faseSel);
  switch (acao) {
    case 'cs-projetar': st.projetando = true; return 'desenhar';
    case 'cs-sair': st.projetando = false; return 'desenhar';
    case 'cs-codigo': {
      const bau = b.dataset.id;
      const novo = normalizarCodigo(document.querySelector(`[data-cod-bau="${bau}"]`)?.value);
      if (!novo) { falha('Digite um código com letras ou números.'); return true; }
      const antigo = st.profFase?.professor?.codigos?.[bau];
      const lote = writeBatch(db);
      if (antigo && antigo !== novo) lote.delete(doc(db, 'chaves', `${f.id}_${bau}_${antigo}`));
      lote.set(doc(db, 'chaves', `${f.id}_${bau}_${novo}`), { fase: f.id, bau });
      lote.set(doc(db, 'fasesProfessor', f.id), { professor: { codigos: { [bau]: novo } }, atualizadoEm: serverTimestamp() }, { merge: true });
      await lote.commit();
      return true;
    }
    case 'cs-zerar': {
      if (!confirm('Apagar todos os baús abertos desta turma de teste?')) return true;
      const lote = writeBatch(db);
      for (const a of (st.acertos ?? []).filter((x) => x.fase === f.id)) lote.delete(doc(db, 'acertos', a.id));
      await lote.commit();
      return true;
    }
    default: return false;
  }
}
