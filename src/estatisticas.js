// Painel da turma: visão geral, detalhes de cada item e ficha de um aluno. Só para o professor.
// A vista atual fica em st.painelVista: null (geral) ou { tipo: 'fase' | 'marca' | 'hab' | 'aluno', id }.
import { esc } from './ui.js';
import { progId, contarTarefas, situacao, SITUACAO_ROTULO } from './fases.js';
import { MARCAS } from './registros.js';
import { imgAvatar } from './avatar.js';

const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);
const ms = (ts) => (ts?.toMillis ? ts.toMillis() : Date.now());
const dataCurta = (ts) => new Date(ms(ts)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

function barra(partes) {
  const total = partes.reduce((s, p) => s + p.n, 0);
  if (!total) return '<div class="barra vazia"></div>';
  return `<div class="barra">${partes.filter((p) => p.n).map((p) => `<span class="${p.classe}" style="width:${(100 * p.n) / total}%" title="${esc(p.rotulo)}: ${p.n}">${p.n}</span>`).join('')}</div>`;
}

const ver = (tipo, id, conteudo, classe = 'clicavel') => `<li class="${classe}" data-acao="painel-ver" data-tipo="${tipo}" data-id="${esc(id)}" tabindex="0" role="button">${conteudo}</li>`;
const voltar = '<button class="mini" data-acao="painel-voltar">← Painel</button>';

function contexto(st) {
  const turma = st.turmas.find((t) => t.id === st.turma);
  const ativos = st.alunos.filter((a) => a.turma === st.turma && a.status === 'ativo')
    .sort((a, b) => (a.numeroChamada ?? 999) - (b.numeroChamada ?? 999) || String(a.apelido).localeCompare(String(b.apelido), 'pt-BR'));
  const estados = turma?.estadoFases ?? {};
  return { turma, ativos, estados };
}

const mencoesDe = (st, uid) => st.fases.flatMap((f) => Object.entries(st.aval[progId(uid, f.id)]?.mencoes ?? {})
  .filter(([, m]) => m).map(([cod, m]) => ({ fase: f, cod, m })));

function chipsMencao(lista) {
  return lista.map((x) => `<span class="chip m-${esc(x.m)}">${esc(x.fase.codigo)} · ${esc(x.cod.replace('EMT1ADM', ''))}: ${esc(x.m)}</span>`).join(' ');
}

const linhaComentario = (c, ap, st) => {
  const fase = st.fases.find((f) => f.id === c.fase);
  return `<li class="reg ${c.tipoAtitude === 'atencao' ? 'atencao' : ''}">
    <span class="nota">${dataCurta(c.criadoEm)} · ${esc(c.marca)}${fase ? ` · fase ${esc(fase.codigo)}` : ''}${ap ? ` · ${esc(ap)}` : ''}</span>
    <p>${esc(c.texto)}</p>
    <span class="chip ${c.tipoAtitude === 'atencao' ? 'm-PA' : c.tipoAtitude === 'positivo' ? 'm-A' : ''}">${c.tipoAtitude === 'atencao' ? 'Atenção' : c.tipoAtitude === 'positivo' ? 'Positivo' : 'Livre'}</span>
    <span class="chip">${c.visivel ? 'O aluno vê' : 'Só você vê'}</span>
  </li>`;
};

// ---------- vistas de detalhe ----------
function vistaFase(st, id) {
  const { ativos, estados } = contexto(st);
  const f = st.fases.find((x) => x.id === id);
  if (!f) return `${voltar}<p class="vazio">Fase não encontrada.</p>`;
  const est = estados[f.id] ?? 'trancada';
  const linhas = ativos.map((a) => {
    const pid = progId(a.uid, f.id);
    const p = st.progresso[pid]; const v = st.aval[pid];
    const sit = situacao(f, p, v, est);
    const { total, feitas } = contarTarefas(f, p);
    return ver('aluno', a.uid, `<span class="num">${a.numeroChamada ?? '—'}</span>${a.avatar ? imgAvatar(a.avatar, 'avatar p') : ''}<span class="nome">${esc(a.apelido)}</span>
      <span class="chip sit-${sit}">${SITUACAO_ROTULO[sit]} ${feitas}/${total}</span>${v?.validada ? '<span class="chip m-A">Validada</span>' : ''}${chipsMencao(mencoesDe(st, a.uid).filter((x) => x.fase.id === f.id))}`, 'aluno clicavel');
  }).join('');
  return `${voltar}<h2>${esc(f.codigo)} · ${esc(f.nome)}</h2><p class="nota">Toque num aluno para ver a ficha dele.</p><ul class="lista">${linhas}</ul>`;
}

function vistaMarca(st, id) {
  const m = MARCAS.find((x) => x.id === id);
  const { ativos } = contexto(st);
  // só alunos ativos da turma entram na conta
  const lista = st.comentarios.filter((c) => c.marca === m.nome && ativos.some((a) => a.uid === c.uid))
    .sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  const nome = (uid) => ativos.find((a) => a.uid === uid)?.apelido ?? '';
  return `${voltar}<h2>${esc(m.nome)}</h2>
    <p class="nota">${lista.filter((c) => c.tipoAtitude !== 'atencao').length} positiva(s) · ${lista.filter((c) => c.tipoAtitude === 'atencao').length} de atenção</p>
    <ul class="lista">${lista.map((c) => `<li class="clicavel-bloco" data-acao="painel-ver" data-tipo="aluno" data-id="${esc(c.uid)}" tabindex="0" role="button">${linhaComentario(c, nome(c.uid), st).replace(/^\s*<li/, '<div').replace(/<\/li>\s*$/, '</div>')}</li>`).join('') || '<li class="vazio">Nenhum registro ainda.</li>'}</ul>`;
}

function vistaHab(st, cod) {
  const { ativos } = contexto(st);
  const habs = st.mundo?.habilidades ?? {};
  const linhas = ativos.map((a) => {
    const itens = mencoesDe(st, a.uid).filter((x) => x.cod === cod);
    return ver('aluno', a.uid, `<span class="num">${a.numeroChamada ?? '—'}</span><span class="nome">${esc(a.apelido)}</span>${itens.length ? itens.map((x) => `<span class="chip m-${esc(x.m)}">${esc(x.fase.codigo)}: ${esc(x.m)}</span>`).join(' ') : '<span class="nota">sem menção</span>'}`, 'aluno clicavel');
  }).join('');
  return `${voltar}<h2>${esc(cod)}</h2><p class="nota">${esc(habs[cod] ?? '')}</p><ul class="lista">${linhas}</ul>`;
}

function fichaAluno(st, uid) {
  const { estados } = contexto(st);
  const a = st.alunos.find((x) => x.uid === uid);
  if (!a) return `${voltar}<p class="vazio">Aluno não encontrado.</p>`;
  const fases = st.fases.filter((f) => ['aberta', 'encerrada'].includes(estados[f.id] ?? 'trancada') || st.progresso[progId(uid, f.id)]);
  const linhasFase = fases.map((f) => {
    const pid = progId(uid, f.id);
    const p = st.progresso[pid]; const v = st.aval[pid];
    const sit = situacao(f, p, v, estados[f.id] ?? 'trancada');
    const { total, feitas } = contarTarefas(f, p);
    return `<li class="aluno"><span class="cod">${esc(f.codigo)}</span><span class="nome">${esc(f.nome)}</span>
      <span class="chip sit-${sit}">${SITUACAO_ROTULO[sit]} ${feitas}/${total}</span>
      ${v?.faltou ? '<span class="chip sit-afazer">Faltou</span>' : ''}${v?.validada ? '<span class="chip m-A">Validada</span>' : ''}
      ${chipsMencao(mencoesDe(st, uid).filter((x) => x.fase.id === f.id))}</li>`;
  }).join('');
  const comentarios = st.comentarios.filter((c) => c.uid === uid).sort((x, y) => ms(y.criadoEm) - ms(x.criadoEm));
  const conversas = st.anotacoes.filter((n) => n.uid === uid).sort((x, y) => ms(y.criadoEm) - ms(x.criadoEm));
  const m = mencoesDe(st, uid);
  const conta = (k) => m.filter((x) => x.m === k).length;
  return `${voltar}
    <div class="cab-aluno">${a.avatar ? imgAvatar(a.avatar, 'avatar p') : ''}<div><h2>${esc(a.apelido)}</h2><span class="nota">Nº ${a.numeroChamada ?? '—'} · ${esc(a.status)}${a.dataEntrada ? ` · entrou em ${esc(a.dataEntrada)}` : ''}</span></div></div>
    <div class="linha-btn">
      <button class="mini" data-acao="registros" data-uid="${esc(uid)}">Registrar atitude ou conversa</button>
      <button class="mini" data-acao="ver-aluno" data-uid="${esc(uid)}">Ver como aluno</button>
    </div>
    <h3>Menções</h3>
    <p><span class="chip m-A">A ${conta('A')}</span> <span class="chip m-PA">PA ${conta('PA')}</span> <span class="chip m-NA">NA ${conta('NA')}</span></p>
    <h3>Fases</h3>
    <ul class="lista">${linhasFase || '<li class="vazio">Nenhuma fase aberta ainda.</li>'}</ul>
    <h3>Atitudes registradas</h3>
    <ul class="lista">${comentarios.map((c) => linhaComentario(c, '', st)).join('') || '<li class="vazio">Nenhuma atitude registrada.</li>'}</ul>
    <h3>Conversas anotadas</h3>
    <ul class="lista">${conversas.map((n) => `<li class="reg conversa"><span class="nota">${dataCurta(n.criadoEm)}</span><p>${esc(n.texto)}</p></li>`).join('') || '<li class="vazio">Nenhuma conversa anotada.</li>'}</ul>`;
}

// ---------- visão geral ----------
export function htmlEstatisticas(st) {
  const { turma, ativos, estados } = contexto(st);
  if (!turma) return '<p class="vazio">Crie uma turma primeiro.</p>';
  if (!ativos.length) return '<p class="vazio">Ainda não há alunos ativos nesta turma.</p>';

  const v = st.painelVista;
  if (v?.tipo === 'fase') return vistaFase(st, v.id);
  if (v?.tipo === 'marca') return vistaMarca(st, v.id);
  if (v?.tipo === 'hab') return vistaHab(st, v.id);
  if (v?.tipo === 'aluno') return fichaAluno(st, v.id);

  const fases = st.fases.filter((f) => ['aberta', 'encerrada'].includes(estados[f.id] ?? 'trancada'));

  const linhasFase = fases.map((f) => {
    const est = estados[f.id];
    let concl = 0, val = 0, falt = 0, nao = 0, pres = 0, sumFeitas = 0, sumTotal = 0;
    for (const a of ativos) {
      const id = progId(a.uid, f.id);
      const p = st.progresso[id]; const av = st.aval[id];
      const sit = situacao(f, p, av, est);
      if (p?.concluida) concl++;
      if (av?.validada) val++;
      if (av?.faltou) falt++;
      if (sit === 'naoconcluida') nao++;
      if (!av?.faltou || p?.concluida) pres++;
      const { total, feitas } = contarTarefas(f, p);
      sumTotal += total; sumFeitas += feitas;
    }
    return ver('fase', f.id, `
      <div><strong>${esc(f.codigo)}</strong> ${esc(f.nome)} <span class="chip">${est === 'encerrada' ? 'Encerrada' : 'Aberta'}</span></div>
      ${barra([
        { n: val, classe: 'b-ok', rotulo: 'Validadas' },
        { n: Math.max(0, concl - val), classe: 'b-info', rotulo: 'Concluídas, sem validar' },
        { n: Math.max(0, ativos.length - concl - falt - nao), classe: 'b-meio', rotulo: 'Em andamento ou não iniciadas' },
        { n: nao, classe: 'b-aten', rotulo: 'Não concluídas (encerrada)' },
        { n: falt, classe: 'b-falta', rotulo: 'Faltaram' },
      ])}
      <p class="nota">${concl} de ${pres} presentes concluíram (${pct(concl, pres)}%) · ${val} validadas · ${falt} faltaram${nao ? ` · ${nao} não concluíram` : ''} · etapas feitas: ${pct(sumFeitas, sumTotal)}%</p>`, 'est-fase clicavel');
  }).join('');

  const habs = st.mundo?.habilidades ?? {};
  const cont = {};
  for (const a of ativos) {
    for (const x of mencoesDe(st, a.uid)) {
      cont[x.cod] = cont[x.cod] ?? { A: 0, PA: 0, NA: 0 };
      cont[x.cod][x.m] = (cont[x.cod][x.m] ?? 0) + 1;
    }
  }
  const linhasHab = Object.keys(habs).filter((c) => cont[c]).map((cod) => ver('hab', cod, `
      <div><strong>${esc(cod)}</strong> <span class="nota">${esc(habs[cod])}</span></div>
      ${barra([{ n: cont[cod].A, classe: 'b-ok', rotulo: 'A' }, { n: cont[cod].PA, classe: 'b-pa', rotulo: 'PA' }, { n: cont[cod].NA, classe: 'b-na', rotulo: 'NA' }])}
      <p class="nota"><span class="chip m-A">A ${cont[cod].A}</span> <span class="chip m-PA">PA ${cont[cod].PA}</span> <span class="chip m-NA">NA ${cont[cod].NA}</span></p>`, 'est-fase clicavel')).join('');

  const olhar = [];
  for (const a of ativos) {
    let nas = 0, pend = 0;
    for (const f of st.fases) {
      const id = progId(a.uid, f.id);
      const av = st.aval[id];
      nas += Object.values(av?.mencoes ?? {}).filter((m) => m === 'NA').length;
      const sit = situacao(f, st.progresso[id], av, estados[f.id]);
      if (sit === 'naoconcluida' || sit === 'afazer') pend++;
    }
    if (nas || pend) olhar.push({ a, nas, pend });
  }
  olhar.sort((x, y) => (y.nas * 3 + y.pend) - (x.nas * 3 + x.pend));

  const marcas = MARCAS.map((m) => {
    const lista = st.comentarios.filter((c) => c.marca === m.nome && ativos.some((a) => a.uid === c.uid));
    return { id: m.id, nome: m.nome, pos: lista.filter((c) => c.tipoAtitude !== 'atencao').length, atn: lista.filter((c) => c.tipoAtitude === 'atencao').length };
  });

  return `<h2>Painel da turma</h2>
    <p class="nota">${ativos.length} aluno(s) ativo(s). Só você vê esta tela. Toque em qualquer item para ver os detalhes.</p>
    <label for="painel-aluno">Ficha de um aluno</label>
    <select id="painel-aluno"><option value="">Escolha um aluno...</option>${ativos.map((a) => `<option value="${esc(a.uid)}">${a.numeroChamada ? `${a.numeroChamada} · ` : ''}${esc(a.apelido)}</option>`).join('')}</select>
    <h3>Por fase</h3>
    <ul class="lista">${linhasFase || '<li class="vazio">Nenhuma fase aberta ainda.</li>'}</ul>
    <h3>Menções por habilidade</h3>
    <ul class="lista">${linhasHab || '<li class="vazio">Nenhuma menção registrada ainda.</li>'}</ul>
    <h3>Para olhar com atenção</h3>
    <ul class="lista">${olhar.length ? olhar.map((o) => ver('aluno', o.a.uid, `<span class="num">${o.a.numeroChamada ?? '—'}</span><span class="nome">${esc(o.a.apelido)}</span>${o.nas ? `<span class="chip m-NA">${o.nas} NA</span>` : ''}${o.pend ? `<span class="chip sit-naoconcluida">${o.pend} fase(s) pendente(s)</span>` : ''}`, 'aluno clicavel')).join('') : '<li class="vazio">Ninguém com NA ou fase pendente.</li>'}</ul>
    <h3>Atitudes registradas</h3>
    <ul class="lista">${marcas.map((m) => ver('marca', m.id, `<span class="nome">${esc(m.nome)}</span><span class="chip m-A">${m.pos} positivas</span><span class="chip m-PA">${m.atn} de atenção</span>`, 'aluno clicavel')).join('')}</ul>`;
}
