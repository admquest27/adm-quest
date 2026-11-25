// Aba Agenda do professor: calendário do mês (segundas e terças), painel do dia com o roteiro da aula,
// eventos, plano das fases e reencaixe com autorização.
import { doc, setDoc, updateDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc, hoje } from './ui.js';
import { ESTADO_ROTULO, MUNDO, etapasDe } from './fases.js';
import {
  addDias, diaSemana, segundaDa, diasEntre, formatar, bloqueadosDe, limiteDoBimestre, gerarAgenda, diferencas, bimestreDe, dataDe, montarDias,
} from './agenda.js';
import { horarioDoDia, encaixar, resumoEncaixe, hhmm, lerHorario, escreverHorario, tempoUtil } from './horarios.js';

export const ANO = 2027;
const TIPOS = { senac: 'Evento do Senac', pessoal: 'Pessoal', outro: 'Outro', oficial: 'Calendário oficial' };
const DIAS_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// ---------- roteiros padrão (quando a fase ainda não tem o seu) ----------
const B = (min, titulo, detalhe, extra = {}) => ({ min, titulo, detalhe, ...extra });
// A chamada (10 min) e o encerramento (5 min) entram sozinhos em todo encontro; os roteiros guardam só o miolo.
// "quebra": se a aula do dia for dividida (1A na terça), o bloco começa no segundo encontro.
// "corta": sai primeiro quando o tempo da turma não dá.
export const PADRAO = {
  din: [
    B(10, 'Abertura da missão', 'Ler a missão em voz alta e combinar o que será feito hoje. Liberar as etapas no jogo conforme avançar.'),
    B(22, 'Dinâmica, primeira parte', 'Até um ponto em que a dinâmica pode parar sem perder o fio. Escreva o passo a passo em "Editar o roteiro".'),
    B(20, 'Dinâmica, segunda parte', 'Retomar de onde parou e chegar ao resultado.', { quebra: true }),
    B(13, 'Conversa', 'Perguntas preparadas sobre o que aconteceu na experiência. Se não couber, abre a aula de segunda.', { corta: true }),
    B(10, 'Registro no Diário de fases', 'Cada aluno escreve a data, o nome da fase e as três respostas.'),
  ],
  cons: [
    B(5, 'Retomar a terça', 'Lembrar em poucas palavras o que aconteceu na dinâmica.'),
    B(20, 'Conceito formal e a empresa de verdade', 'O conceito da fase e como ele aparece numa empresa. Escreva o roteiro em "Editar o roteiro".'),
    B(10, 'Registro no caderno', 'Glossário e Diário de fases.'),
    B(30, 'Excel do dia', 'Aquecimento, demonstração e desafio. Enquanto a turma faz o desafio, circule conferindo o caderno e atualize o jogo.', { excel: true }),
    B(20, 'Bônus e caderno em dia', 'Quem terminou faz o bônus; quem está atrasado põe o caderno em dia. No 1A, que tem mais tempo na segunda, dá para fazer aqui a conversa que não coube na terça.', { corta: true }),
  ],
  antes: [
    B(10, 'Retomada', 'Onde a turma está e o que vem na dinâmica de amanhã.'),
    B(55, 'Preparação', 'Dia livre antes da dinâmica: use para preparar a turma. Escreva o roteiro em "Editar o roteiro".'),
    B(20, 'Ensaio e ajustes', 'Tempo extra para quem precisa.', { corta: true }),
  ],
  folga: [
    B(10, 'Retomada', 'O que ficou pendente e o que vamos fazer hoje.'),
    B(22, 'Semana coringa, primeira parte', 'Revisão, ensaio, fase bônus ou uma atividade que precisou de mais tempo.'),
    B(30, 'Semana coringa, segunda parte', 'Continuação.', { quebra: true }),
    B(13, 'Dúvidas e ajustes', 'Tempo extra para quem precisa.', { corta: true }),
  ],
  recup_seg: [
    B(10, 'Enquete do mundo', 'Três perguntas no jogo sobre como foi o mundo. Antes da semana, converse rapidamente com cada aluno em recuperação.'),
    B(50, 'Missões Pessoais', 'Todos recebem uma Missão Pessoal igual por fora: quem tem pendência faz a recuperação, os demais fazem uma missão bônus. Ninguém vê a missão do colega.'),
    B(5, 'Registrar os resultados', 'Marcar no jogo o resultado das recuperações.'),
    B(20, 'Tempo extra das missões', 'Para quem precisa de mais tempo.', { corta: true }),
  ],
  recup_ter: [
    B(32, 'Missões Pessoais, últimas entregas', 'Quem ainda tem missão termina; os demais ajudam a preparar a Roleta.'),
    B(20, 'Roleta do Destino', 'Revelação da recompensa do mundo.', { quebra: true }),
    B(10, 'Fechamento do mundo', 'Fechar o mundo e convidar para o próximo. A Carta do Bimestre chega no começo do mundo seguinte.'),
    B(13, 'Nome do reino', 'Votação e proclamação do nome da turma, se ainda não foi feito.', { corta: true }),
  ],
  livre: [
    B(75, 'Dia sem fase planejada', 'Use como quiser: revisão, atividade que precisou de mais tempo ou um evento.'),
  ],
};
const NOME_ROTEIRO = { din: 'dinâmica', cons: 'segunda no laboratório', antes: 'preparação', folga: 'semana coringa', recup_seg: 'recuperação (segunda)', recup_ter: 'fechamento do mundo (terça)' };
// Os roteiros da semana de recuperação e fechamento são do mundo, não de uma fase.
export const idFimDoMundo = (mundo) => `${mundo}fim`;

const soma = (blocos) => blocos.reduce((s, b) => s + (Number(b.min) || 0), 0);

// ---------- planejamento ----------
export function planejar(st) {
  const cal = st.cal;
  if (!cal?.bimestres?.length) return null;
  const alvo = st.calBim ?? bimestreDe(cal, hoje())?.id;
  const b = cal.bimestres.find((x) => x.id === alvo) ?? cal.bimestres[0];
  const bloq = bloqueadosDe(cal, st.turma);
  const plano = st.plano ?? {};
  const todas = st.mundo?.ordem === b.id ? st.fases : [];
  const fases = todas.filter((f) => f.tipo !== 'excel');
  const excel = todas.filter((f) => f.tipo === 'excel');
  const diaDin = plano.diaDin ?? 2;
  const diaCons = plano.diaCons ?? 1;
  const ag = fases.length
    ? gerarAgenda({ fases, bimestre: b, bloqueados: bloq, fixas: plano.fixas ?? {}, diaDin, diaCons })
    : { itens: [], limite: limiteDoBimestre(b), livres: [], folgas: [] };
  const dias = montarDias({ ag, fases: todas, bimestre: b, bloqueados: bloq, eventos: cal.eventos, diaDin, diaCons });
  return { cal, b, bloq, plano, fases, excel, todas, ag, dias, diaDin, diaCons, minutosDia: plano.minutosDia ?? 100, dif: diferencas(plano.confirmado, ag.itens) };
}

const faseDe = (p, id) => p.todas.find((f) => f.id === id);
const item = (p, id) => p.ag.itens.find((i) => i.faseId === id);

// ---------- roteiro de um item do dia ----------
function roteiroDoItem(p, st, it) {
  const prof = (id) => st.profTodas?.[id]?.cronograma ?? {};
  let blocos; let titulo; let editavel = null;
  if (it.tipo === 'din') { const f = faseDe(p, it.faseId); titulo = `Dinâmica · ${f.codigo} ${f.nome}`; blocos = prof(f.id).din ?? PADRAO.din; editavel = 'din'; }
  else if (it.tipo === 'cons') { const f = faseDe(p, it.faseId); titulo = `Consolidação · ${f.codigo} ${f.nome}`; blocos = prof(f.id).cons ?? PADRAO.cons; editavel = 'cons'; }
  else if (it.tipo === 'excel') { return null; } // o Excel entra dentro do roteiro da consolidação
  else if (it.tipo === 'antes') { const f = faseDe(p, it.faseId); titulo = `Preparação para a ${f.codigo} ${f.nome}`; blocos = prof(f.id).antes ?? PADRAO.antes; editavel = 'antes'; }
  else if (it.tipo === 'folga') { const f = faseDe(p, it.faseId); titulo = `Semana coringa antes da ${f.codigo} ${f.nome}`; blocos = prof(f.id).folga ?? PADRAO.folga; editavel = 'folga'; }
  else {
    const k = it.parte === 'seg' ? 'recup_seg' : 'recup_ter';
    titulo = it.parte === 'seg' ? 'Semana de recuperação · segunda' : 'Fechamento do mundo · terça';
    blocos = prof(idFimDoMundo(MUNDO))[k] ?? PADRAO[k];
    return { titulo, blocos, editavel: k, faseId: idFimDoMundo(MUNDO), doMundo: true };
  }
  if (it.tipo === 'cons') blocos = comExcel(faseDe(p, it.faseId), blocos);
  return { titulo, blocos, editavel, faseId: it.faseId };
}

// Horário real da turma no dia da semana de um tipo de roteiro.
export function diaDoTipo(plano, tipo) {
  const din = plano?.diaDin ?? 2;
  const cons = plano?.diaCons ?? 1;
  return ['din', 'folga', 'recup_ter'].includes(tipo) ? din : cons;
}
export const horarioDoTipo = (plano, tipo) => horarioDoDia(plano, diaDoTipo(plano, tipo));

// O bloco de Excel do roteiro de segunda recebe o desafio que está nas etapas de segunda da fase.
export function comExcel(f, blocos) {
  const ex = etapasDe(f).filter((e) => e.excel);
  if (!ex.length) return blocos;
  return blocos.map((b) => (b.excel ? { ...b, titulo: 'Excel do dia', detalhe: `${b.detalhe}\n${ex.map((e) => e.texto).join('\n')}`, segDe: f.id } : b));
}

// Roteiro de um dia de uma fase (a mesma fonte para a Agenda e para o painel da fase).
export function roteiroDaFase(st, f, tipo) {
  const blocos = st.profTodas?.[f.id]?.cronograma?.[tipo] ?? PADRAO[tipo] ?? PADRAO.din;
  return tipo === 'cons' ? comExcel(f, blocos) : blocos;
}

// Linha do tempo da aula no horário real da turma: chamada, blocos, intervalos, pausas e encerramento.
export function htmlBlocos(blocos, turma, horario = horarioDoDia(null, 1)) {
  const r = encaixar(blocos, horario.encontros);
  const fixo = (ini, fim, titulo, detalhe) => `<li class="bloco fixo"><span class="bloco-t">${hhmm(ini)}</span><div><strong>${titulo}</strong> <span class="chip">${fim - ini} min</span><p>${detalhe}</p></div></li>`;
  const pausa = (txt) => `<li class="bloco pausa"><span class="bloco-t"></span><div><span class="nota">${txt}</span></div></li>`;
  const livre = (a, b) => `<li class="bloco pausa"><span class="bloco-t">${hhmm(a)}</span><div><span class="nota">Tempo livre: ${b - a} min</span></div></li>`;
  const lacuna = (e, a, b) => {
    const out = [];
    let x = a;
    for (let i = 0; i < e.trechos.length - 1; i++) {
      const t = e.trechos[i]; const u = e.trechos[i + 1];
      if (t.fim >= x && t.fim <= b) {
        if (t.fim > x) out.push(livre(x, t.fim));
        out.push(pausa(`Intervalo: libera às ${hhmm(t.fim)}, recomeça às ${hhmm(u.ini)}.`));
        x = u.ini;
      }
    }
    if (b > x) out.push(livre(x, b));
    return out.join('');
  };
  const peca = (p) => {
    const b = r.blocos[p.bi];
    const aberta = b.segDe && turma?.liberacoes?.[b.segDe]?.seg === true;
    const primeira = p.parte === 0;
    const tags = `${p.cansado ? ' <span class="chip cansado">turma cansada: algo leve</span>' : ''}${primeira && b.corta ? ' <span class="chip">pode cortar</span>' : ''}`;
    return `<li class="bloco ${b.excel ? 'excel' : ''} ${p.cansado ? 'cansado' : ''}"><span class="bloco-t">${hhmm(p.ini)}</span><div><strong>${esc(b.titulo)}${primeira ? '' : ' (continua)'}</strong> <span class="chip">${p.fim - p.ini} min</span>${tags}
      ${primeira ? `<p>${esc(b.detalhe ?? '').replace(/\n/g, '<br>')}</p>` : ''}
      ${primeira && b.segDe ? `<button class="mini ${aberta ? 'ok' : ''}" data-acao="cal-seg" data-id="${esc(b.segDe)}">${aberta ? 'Parte de segunda liberada ✓' : 'Liberar a parte de segunda para a turma'}</button>` : ''}</div></li>`;
  };
  const linhas = [];
  r.enc.forEach((e, n) => {
    if (n > 0) linhas.push(pausa(`Pausa: a turma vai para outras aulas e volta às ${hhmm(e.trechos[0].ini)}.`));
    linhas.push(fixo(e.chamada.ini, e.chamada.fim, 'Chamada e boas-vindas', 'Receber a turma, fazer a chamada e dizer o que fazer primeiro.'));
    let fim = e.chamada.fim;
    for (const p of r.pecas.filter((x) => x.k === e.k)) {
      if (p.ini > fim) linhas.push(lacuna(e, fim, p.ini));
      linhas.push(peca(p));
      fim = p.fim;
    }
    if (e.encerra.ini > fim) linhas.push(lacuna(e, fim, e.encerra.ini));
    linhas.push(fixo(e.encerra.ini, e.encerra.fim, 'Encerramento', 'Marcar no jogo quem faltou e combinar a próxima aula.'));
  });
  for (const f of r.fora) linhas.push(`<li class="bloco fora"><span class="bloco-t">!</span><div><strong>Não coube: ${esc(f.bloco.titulo)}</strong> <span class="chip m-NA">${f.min} min</span><p>Encurte os blocos ou marque algum como "pode cortar".</p></div></li>`);
  const cortados = r.cortados.length ? `<p class="nota">Fica de fora nesta turma, por falta de tempo: ${r.cortados.map((b) => esc(b.titulo)).join(', ')}.</p>` : '';
  return `<ol class="blocos">${linhas.join('')}</ol>${cortados}`;
}

// Resumo do roteiro para todas as turmas (o roteiro é um só; o tempo de cada turma é diferente).
export function resumoTurmas(st, blocos, tipo) {
  const turmas = (st.turmas ?? []).filter((t) => !t.teste || t.id === st.turma);
  return turmas.map((t) => {
    const plano = t.id === st.turma ? (st.plano ?? st.planos?.[t.id]) : st.planos?.[t.id];
    const h = horarioDoTipo(plano, tipo);
    const { texto, ruim } = resumoEncaixe(blocos, h.encontros);
    return `<li><strong>${esc(t.nome ?? t.id)}</strong>${h.relativo ? ' <span class="nota">(sem horário definido)</span>' : ''}: <span class="${ruim ? 'erro' : ''}">${esc(texto)}</span></li>`;
  }).join('');
}

function chipsDoDia(p, st, d, max = 3) {
  const dia = p.dias.get(d);
  if (!dia) return { html: '', n: 0, linhas: [] };
  const chips = [];
  const linhas = [];
  for (const it of dia.itens) {
    const f = it.faseId ? faseDe(p, it.faseId) : null;
    if (it.tipo === 'din') { chips.push(`<span class="cc din ${it.estouro ? 'estouro' : ''}">${it.fixa ? '📌 ' : ''}${esc(f.codigo)} ${esc(f.nome)}</span>`); linhas.push(`Dinâmica: ${f.codigo} ${f.nome}`); }
    else if (it.tipo === 'cons') {
      const temExcel = etapasDe(f).some((e) => e.excel);
      chips.push(`<span class="cc cons ${it.estouro ? 'estouro' : ''}">${it.fixa ? '📌 ' : ''}${esc(f.codigo)} laboratório${temExcel ? ' 💻' : ''}</span>`);
      linhas.push(`Segunda da ${f.codigo}: conceito, caderno${temExcel ? ' e Excel' : ''}`);
    }
    else if (it.tipo === 'antes') { chips.push('<span class="cc prep">Preparação</span>'); linhas.push('Preparação'); }
    else if (it.tipo === 'folga') { chips.push('<span class="cc folga">Coringa</span>'); linhas.push('Semana coringa'); }
    else { chips.push(`<span class="cc recup">${it.parte === 'seg' ? 'Recuperação' : 'Fecha o mundo'}</span>`); linhas.push(it.parte === 'seg' ? 'Recuperação' : 'Fechamento do mundo'); }
  }
  for (const e of dia.eventos) { chips.push(`<span class="cc ev ${e.bloqueia === 'dia' ? 'bloq' : ''}">${esc(e.titulo)}</span>`); linhas.push(`Evento: ${e.titulo}`); }
  const html = chips.slice(0, max).join('') + (chips.length > max ? `<span class="cc mais">+${chips.length - max}</span>` : '');
  return { html, n: chips.length, linhas };
}

// ---------- peças da tela ----------
export function seletorBimestre(p) {
  return `<div class="marcas">${p.cal.bimestres.map((b) => `<button class="mini ${b.id === p.b.id ? 'ok cheio' : ''}" data-acao="cal-bim" data-id="${b.id}">${esc(b.nome)}</button>`).join('')}</div>
    <p class="nota">${formatar(p.b.inicio)} a ${formatar(p.b.fim)} · fechamento ${formatar(p.b.fechamento)} · as tarefas terminam até ${formatar(p.ag.limite)}</p>`;
}

function cartaoHoje(p, st) {
  const h = hoje();
  const dia = p.dias.get(h);
  const estados = st.turmas.find((t) => t.id === st.turma)?.estadoFases ?? {};
  const prox = [...p.dias.entries()].filter(([d, v]) => d > h && v.itens.length).sort((a, b) => a[0].localeCompare(b[0]))[0];
  const aberta = (id) => (estados[id] ?? 'trancada') === 'aberta';
  const din = dia?.itens.find((i) => i.tipo === 'din');
  return `<section class="cal-hoje"><div><strong>Hoje, ${formatar(h)}</strong>
    ${dia?.semAula ? `<p class="nota">Sem aula: ${esc(dia.semAula)}.</p>` : dia?.itens.length ? `<p class="nota">${chipsDoDia(p, st, h, 9).linhas.map(esc).join(' · ')}</p>` : '<p class="nota">Nenhuma fase planejada para hoje.</p>'}
    ${prox ? `<p class="nota">Próximo dia com aula planejada: ${formatar(prox[0])}</p>` : ''}</div>
    <div class="linha-btn">${dia?.itens.length ? `<button class="mini ok" data-acao="cal-dia" data-d="${h}">Ver o roteiro de hoje</button>` : ''}
    ${din && !aberta(din.faseId) ? `<button class="mini" data-acao="cal-abrir" data-id="${esc(din.faseId)}">Abrir a fase</button>` : ''}</div></section>`;
}

function alertas(p) {
  const partes = [];
  if (!p.plano.horarios) partes.push('<div class="alerta"><strong>Horário real da turma ainda não definido</strong><p>Defina em "Dias e horários desta turma", no fim da página, para o roteiro mostrar a hora certa de cada bloco, o intervalo e o que cabe.</p></div>');
  const est = p.ag.itens.filter((i) => i.estouro);
  const cEst = p.ag.itens.filter((i) => i.consEstouro && !i.estouro);
  if (est.length) partes.push(`<div class="alerta ruim"><strong>Não cabe no bimestre</strong><p>${est.map((i) => `${esc(faseDe(p, i.faseId).codigo)} ficaria em ${formatar(i.din)}`).join('; ')}. O limite é ${formatar(p.ag.limite)}. Corte uma fase, use uma sobra ou fixe datas.</p></div>`);
  if (cEst.length) partes.push(`<div class="alerta"><strong>Consolidação depois do limite</strong><p>${cEst.map((i) => `${esc(faseDe(p, i.faseId).codigo)} em ${formatar(i.cons)}`).join('; ')}.</p></div>`);
  if (!p.fases.length) {
    partes.push('<div class="alerta"><strong>Sem fases neste bimestre</strong><p>Este bimestre ainda não tem conteúdo de fases. O calendário mostra só os dias sem aula e os seus eventos.</p></div>');
  } else if (!Object.keys(p.plano.confirmado ?? {}).length) {
    partes.push('<div class="alerta"><strong>Plano ainda não confirmado</strong><p>Este é o plano sugerido. Confirme para o sistema avisar quando algo mudar.</p><button class="mini ok" data-acao="cal-confirmar">Confirmar este plano</button></div>');
  } else if (p.dif.length) {
    partes.push(`<div class="alerta mudou"><strong>O plano sugerido mudou</strong><p>${p.dif.length} fase(s) mudariam de data:</p>
      <ul>${p.dif.map((d) => `<li>${esc(faseDe(p, d.faseId).codigo)}: dinâmica ${d.de.din ? formatar(d.de.din) : '—'} → <strong>${d.para.din ? formatar(d.para.din) : '—'}</strong>${(d.de.cons ?? null) !== (d.para.cons ?? null) ? `; consolidação ${d.de.cons ? formatar(d.de.cons) : '—'} → <strong>${d.para.cons ? formatar(d.para.cons) : '—'}</strong>` : ''}</li>`).join('')}</ul>
      <button class="mini ok" data-acao="cal-confirmar">Aceitar o novo plano</button></div>`);
  } else {
    partes.push('<div class="alerta ok"><strong>Plano confirmado em dia</strong><p>Nada mudou desde que você confirmou.</p></div>');
  }
  if (p.fases.length && p.ag.livres.length) partes.push(`<div class="alerta"><strong>Sobram ${p.ag.livres.length} dia(s) de dinâmica livres</strong><p>${p.ag.livres.map((d) => formatar(d)).join(', ')}. Use como coringa, revisão ou fase bônus.</p></div>`);
  return partes.join('');
}

function grade(p, st) {
  const mes = st.calMes;
  const [ano, m] = mes.split('-').map(Number);
  const primeiro = `${mes}-01`;
  const ultimo = addDias(`${m === 12 ? ano + 1 : ano}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`, -1);
  const cols = [...new Set([p.diaCons, p.diaDin])].sort((a, b) => a - b);
  const h = hoje();
  const semanas = [];
  for (let seg = segundaDa(primeiro); seg <= ultimo; seg = addDias(seg, 7)) {
    const cels = cols.map((c) => {
      const d = addDias(seg, c - 1);
      const dia = p.dias.get(d);
      const fora = d.slice(0, 7) !== mes;
      const { html, n, linhas } = chipsDoDia(p, st, d);
      const dataTxt = `${DIAS_LONGO[diaSemana(d)]}, ${formatar(d, false)}`;
      const tip = [dataTxt, dia?.semAula ? `Sem aula: ${dia.semAula}` : '', ...linhas].filter(Boolean).join('\n');
      const num = `${Number(d.slice(8))}${d.slice(8) === '01' || d === seg ? ` ${MESES_CURTO[Number(d.slice(5, 7)) - 1]}` : ''}`;
      return `<button class="cal-cel ${fora ? 'fora' : ''} ${d === h ? 'hoje' : ''} ${dia?.semAula ? 'sem-aula' : ''} ${d < h ? 'passado' : ''} ${n ? 'tem' : ''}" data-acao="cal-dia" data-d="${d}" data-tip="${esc(tip)}" aria-label="${esc(tip.replace(/\n/g, '. '))}">
        <span class="cal-num">${num}</span>${dia?.semAula ? `<span class="cal-sem">${esc(dia.semAula)}</span>` : ''}${html}${!n && !dia?.semAula ? '<span class="cal-livre">livre</span>' : ''}</button>`;
    }).join('');
    semanas.push(`<div class="cal-linha" style="--cols:${cols.length}"><span class="cal-sem-rot">${formatar(seg, false)}</span>${cels}</div>`);
  }
  const ant = mes > st.calMin;
  const prox = mes < st.calMax;
  return `<div class="cal-nav"><button class="mini" data-acao="cal-mes" data-d="-1" ${ant ? '' : 'disabled'} aria-label="Mês anterior">‹</button>
      <h3>${MESES[m - 1]} ${ano}</h3>
      <button class="mini" data-acao="cal-mes" data-d="1" ${prox ? '' : 'disabled'} aria-label="Próximo mês">›</button>
      <button class="mini" data-acao="cal-mes" data-d="0">Hoje</button></div>
    <div class="cal" style="--cols:${cols.length}"><div class="cal-cab"><span></span>${cols.map((c) => `<span>${DIAS_LONGO[c]}</span>`).join('')}</div>${semanas.join('')}</div>
    <p class="cal-legenda"><span class="cc din">dinâmica</span><span class="cc cons">laboratório (💻 com Excel)</span><span class="cc prep">preparação</span><span class="cc folga">coringa</span><span class="cc recup">recuperação</span><span class="cc ev">seu evento</span></p>
    <p class="nota">Passe o mouse num dia para ver o resumo. Toque ou clique para ver o roteiro da aula.</p>`;
}

// linha do tempo do bimestre (visão geral, opcional)
function linhaDoTempo(p, st) {
  if (!p.fases.length) return '';
  const { b } = p;
  const W = 520, esq = 40, dir = 8, topo = 28, h = 26;
  const total = Math.max(1, diasEntre(b.inicio, b.fim));
  const util = W - esq - dir;
  const x = (d) => esq + (Math.max(0, Math.min(total, diasEntre(b.inicio, d))) / total) * util;
  const larg = Math.max(3, util / total);
  const H = topo + p.fases.length * h + 22;
  const turma = st.turmas.find((t) => t.id === st.turma);
  let faixas = '';
  for (const [d, motivo] of p.bloq) {
    if (d < b.inicio || d > b.fim) continue;
    const dow = diaSemana(d);
    if (dow === 0 || dow === 6) continue;
    faixas += `<rect class="g-semaula" x="${x(d)}" y="${topo}" width="${larg}" height="${p.fases.length * h}"><title>${esc(formatar(d))}: ${esc(motivo)}</title></rect>`;
  }
  let meses = '';
  for (let d = b.inicio; d <= b.fim; d = addDias(d, 1)) {
    if (d === b.inicio || d.endsWith('-01')) meses += `<line class="g-eixo" x1="${x(d)}" x2="${x(d)}" y1="${topo - 6}" y2="${H - 22}"/><text class="g-mes" x="${x(d) + 3}" y="${topo - 10}">${MESES_CURTO[dataDe(d).getUTCMonth()]}</text>`;
  }
  const linhas = p.fases.map((f, r) => {
    const i = item(p, f.id);
    const y = topo + r * h + 5;
    const datas = turma?.datas?.[f.id] ?? {};
    let s = `<text class="g-rot" x="4" y="${y + 12}">${esc(f.codigo)}</text>`;
    if (i?.din) {
      if (i.cons) s += `<line class="g-lig" x1="${x(i.din)}" x2="${x(i.cons)}" y1="${y + 8}" y2="${y + 8}"/>`;
      s += `<rect class="g-din ${i.estouro ? 'g-estouro' : ''} ${i.fixaDin ? 'g-fixa' : ''}" x="${x(i.din) - 1}" y="${y}" width="${larg + 2}" height="16" rx="3"><title>${esc(f.nome)} · dinâmica ${formatar(i.din)}</title></rect>`;
      if (i.cons) s += `<rect class="g-cons ${i.consEstouro ? 'g-estouro' : ''}" x="${x(i.cons) - 1}" y="${y}" width="${larg + 2}" height="16" rx="3"><title>${esc(f.nome)} · consolidação ${formatar(i.cons)}</title></rect>`;
    }
    if (datas.aberta) s += `<path class="g-real" d="M${x(datas.aberta)} ${y + 20} l-4 6 h8 z"><title>Aberta em ${formatar(datas.aberta)}</title></path>`;
    return s;
  }).join('');
  return `<details class="mais"><summary>Ver a linha do tempo do bimestre</summary>
    <div class="rolagem-x"><svg class="gantt" viewBox="0 0 ${W} ${H}" role="img" aria-label="Linha do tempo das fases do bimestre">
      ${faixas}${meses}${linhas}
      <line class="g-limite" x1="${x(p.ag.limite)}" x2="${x(p.ag.limite)}" y1="${topo - 6}" y2="${H - 20}"/>
      <line class="g-fecha" x1="${x(p.b.fechamento)}" x2="${x(p.b.fechamento)}" y1="${topo - 6}" y2="${H - 20}"/>
    </svg></div>
    <p class="legenda-gantt"><span class="lg g-din"></span> dinâmica <span class="lg g-cons"></span> consolidação <span class="lg g-semaula"></span> sem aula <span class="lg g-estouro"></span> não cabe <span class="lg g-real"></span> aberta de fato</p></details>`;
}

function previstoRealizado(p, st) {
  const turma = st.turmas.find((t) => t.id === st.turma);
  const linhas = p.fases.map((f) => {
    const i = item(p, f.id);
    const ab = turma?.datas?.[f.id]?.aberta;
    if (!i?.din || !ab) return '';
    const dif = diasEntre(i.din, ab);
    const classe = dif <= 0 ? 'm-A' : dif <= 6 ? 'm-PA' : 'm-NA';
    const txt = dif === 0 ? 'no dia previsto' : dif > 0 ? `${dif} dia(s) depois` : `${-dif} dia(s) antes`;
    return `<li class="aluno"><span class="cod">${esc(f.codigo)}</span><span class="nome">${esc(f.nome)}</span><span class="nota">previsto ${formatar(i.din)} · aberta ${formatar(ab)}</span><span class="chip ${classe}">${txt}</span></li>`;
  }).join('');
  return linhas ? `<h3>Previsto e realizado</h3><ul class="lista">${linhas}</ul>` : '';
}

function listaEventos(p) {
  const evs = Object.entries(p.cal.eventos ?? {}).map(([id, e]) => ({ id, ...e }))
    .filter((e) => (e.tipo !== 'oficial' || e.bloqueia === 'dia') && e.data >= p.b.inicio && e.data <= p.b.fim).sort((a, b) => a.data.localeCompare(b.data));
  return `<h3>Eventos e bloqueios</h3><button class="mini ok" data-acao="cal-evento" data-id="">+ Evento</button>
    <ul class="lista">${evs.map((e) => `<li class="aluno" data-acao="cal-evento" data-id="${esc(e.id)}"><span class="nome">${formatar(e.data)}${e.fim ? ` a ${formatar(e.fim)}` : ''} · ${esc(e.titulo)}</span><span class="chip ${e.bloqueia === 'dia' ? 'm-NA' : ''}">${e.bloqueia === 'dia' ? 'sem aula' : TIPOS[e.tipo] ?? 'lembrete'}</span></li>`).join('') || '<li class="vazio">Nenhum evento neste bimestre.</li>'}</ul>`;
}

function configurar(p) {
  const opcoes = (sel) => [1, 2, 3, 4, 5].map((k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${DIAS_LONGO[k]}</option>`).join('');
  const campo = (dow) => {
    const h = p.plano.horarios?.[String(dow)];
    const util = h?.length ? tempoUtil(h) : [];
    return `<label for="cal-h${dow}">Horário real de ${DIAS_LONGO[dow].toLowerCase()}</label>
      <textarea id="cal-h${dow}" rows="2" placeholder="Exemplo: 9:40-10:27, 10:55-11:30">${esc(escreverHorario(h))}</textarea>
      <p class="nota" id="cal-h${dow}-util">${util.length ? `Tempo útil: ${util.join(' + ')} min, já sem a chamada e o encerramento.` : 'Sem horário: o roteiro aparece com o relógio a partir de 00:00.'}</p>`;
  };
  return `<details class="mais" ${p.plano.horarios ? '' : 'open'}><summary>Dias e horários desta turma</summary>
    <label for="cal-din">Dia da dinâmica (sala)</label><select id="cal-din">${opcoes(p.diaDin)}</select>
    <label for="cal-cons">Dia da consolidação (laboratório)</label><select id="cal-cons">${opcoes(p.diaCons)}</select>
    <p class="nota">Escreva o horário em que a aula acontece de fato, não o da grade. Uma linha por vez que a turma vem à sala. Se houver intervalo no meio, separe por vírgula: 9:40-10:27, 10:55-11:30. Se a turma cansa antes do fim, acrescente "atenção até 12:55". A chamada (10 min) e o encerramento (5 min) entram sozinhos.</p>
    ${campo(p.diaCons)}${p.diaDin !== p.diaCons ? campo(p.diaDin) : ''}
    <button class="mini ok" data-acao="cal-config">Salvar</button></details>`;
}

export function htmlAgenda(st) {
  if (!st.turma) return '<p class="vazio">Crie uma turma primeiro, em Ajustes.</p>';
  if (!st.cal) {
    return `<h2>Agenda</h2><div class="alerta"><strong>Calendário oficial ainda não carregado</strong>
      <p>Escolha o arquivo do calendário (por exemplo, calendario-2027.json).</p><input type="file" id="arq-cal" accept=".json,application/json"></div>`;
  }
  const p = planejar(st);
  // limites de navegação e mês atual
  st.calMin = p.cal.bimestres[0].inicio.slice(0, 7);
  st.calMax = p.cal.bimestres[p.cal.bimestres.length - 1].fim.slice(0, 7);
  if (!st.calMes) st.calMes = (hoje().slice(0, 7) >= st.calMin && hoje().slice(0, 7) <= st.calMax) ? hoje().slice(0, 7) : p.b.inicio.slice(0, 7);
  return `<h2>Agenda</h2>${seletorBimestre(p)}${cartaoHoje(p, st)}${alertas(p)}${grade(p, st)}${linhaDoTempo(p, st)}${previstoRealizado(p, st)}${listaEventos(p)}${configurar(p)}`;
}

// ---------- dica ao passar o mouse ----------
export function ligarDicas(raiz) {
  let dica = document.getElementById('dica-cal');
  if (!dica) { dica = document.createElement('div'); dica.id = 'dica-cal'; dica.className = 'dica-cal'; dica.hidden = true; document.body.appendChild(dica); }
  raiz.addEventListener('mouseover', (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (!el || !el.dataset.tip) { dica.hidden = true; return; }
    dica.textContent = el.dataset.tip;
    dica.hidden = false;
  });
  raiz.addEventListener('mousemove', (e) => {
    if (dica.hidden) return;
    const w = dica.offsetWidth;
    dica.style.left = `${Math.min(e.clientX + 14, window.innerWidth - w - 8)}px`;
    dica.style.top = `${e.clientY + 18}px`;
  });
  raiz.addEventListener('mouseout', (e) => { if (!e.relatedTarget?.closest?.('[data-tip]')) dica.hidden = true; });
}

// ---------- janelas ----------
const refCal = () => doc(db, 'calendario', String(ANO));
const refPlano = (turma) => doc(db, 'planos', turma);

function abrirDia(st, dlg, d, ctx) {
  const p = planejar(st);
  const dia = p.dias.get(d);
  const itens = dia?.itens ?? [];
  const estados = st.turmas.find((t) => t.id === st.turma)?.estadoFases ?? {};
  const roteiros = itens.map((it) => ({ it, r: roteiroDoItem(p, st, it) })).filter((x) => x.r);
  const turmaDoc = st.turmas.find((t) => t.id === st.turma);
  const horario = horarioDoDia(p.plano, diaSemana(d));
  const corpo = roteiros.length ? roteiros.map(({ it, r }) => {
    const total = soma(r.blocos);
    const f = r.faseId && !r.doMundo ? faseDe(p, r.faseId) : null;
    const lista = htmlBlocos(r.blocos, turmaDoc, horario);
    const aberta = f && (estados[f.id] ?? 'trancada') === 'aberta';
    return `<section class="dia-sec"><h3>${esc(r.titulo)}</h3>
      <p class="nota">${total} min no roteiro · ${esc(resumoEncaixe(r.blocos, horario.encontros).texto)}${horario.relativo ? ' · defina o horário real desta turma em "Dias e horários"' : ''}</p>
      <div class="linha-btn">
        ${it.tipo === 'din' && f ? `<button class="mini ${aberta ? 'ok' : ''}" data-acao="cal-abrir" data-id="${esc(f.id)}">${aberta ? 'Fase aberta ✓' : 'Abrir a fase'}</button>` : ''}
        ${f && ['din', 'cons'].includes(it.tipo) ? `<button class="mini" data-acao="cal-fase" data-id="${esc(f.id)}">Mover ou fixar a data</button>` : ''}
        ${r.editavel ? `<button class="mini" data-acao="cal-roteiro" data-id="${esc(r.faseId)}" data-k="${r.editavel}">Editar o roteiro</button>` : ''}
        ${f && it.tipo !== 'antes' && it.tipo !== 'folga' ? `<button class="mini" data-acao="cal-ver-fase" data-id="${esc(f.id)}">Ver a fase</button>` : ''}</div>
      ${lista}</section>`;
  }).join('') : `<section class="dia-sec"><h3>${dia?.semAula ? 'Sem aula' : 'Dia livre'}</h3><p>${dia?.semAula ? esc(dia.semAula) : 'Nenhuma fase planejada para este dia. Use como quiser: revisão, atividade que precisou de mais tempo ou um evento.'}</p></section>`;
  const eventos = (dia?.eventos ?? []).map((e) => `<li class="aluno" data-acao="cal-evento" data-id="${esc(e.id)}"><span class="nome">${esc(e.titulo)}</span><span class="chip ${e.bloqueia === 'dia' ? 'm-NA' : ''}">${e.bloqueia === 'dia' ? 'sem aula' : TIPOS[e.tipo] ?? 'lembrete'}</span></li>`).join('');
  dlg.className = 'folha';
  dlg.innerHTML = `<div class="form">
    <div class="folha-cab"><div><h2>${DIAS_LONGO[diaSemana(d)]}, ${formatar(d, false)}</h2><p class="nota">${d === hoje() ? 'Hoje' : d < hoje() ? 'Já passou' : `Faltam ${diasEntre(hoje(), d)} dia(s)`}</p></div>
      <button class="mini" data-acao="cal-fechar" aria-label="Fechar">✕</button></div>
    ${corpo}
    ${eventos ? `<h3>Eventos do dia</h3><ul class="lista">${eventos}</ul>` : ''}
    <div class="linha-btn"><button class="mini" data-acao="cal-evento" data-id="" data-d="${d}">+ Evento neste dia</button></div></div>`;
  dlg.onclick = (ev) => {
    const b = ev.target.closest('[data-acao]');
    if (!b) return;
    if (b.dataset.acao === 'cal-fechar') { dlg.close(); return; }
    dlg.close();
    ctx.tratar(b.dataset.acao, b);
  };
  dlg.addEventListener('close', () => { dlg.className = ''; }, { once: true });
  dlg.showModal();
}

function dialogoEvento(st, dlg, id, dataInicial) {
  const e = id ? st.cal.eventos?.[id] : null;
  if (e?.tipo === 'oficial') {
    dlg.innerHTML = `<div class="form"><h2>${esc(e.titulo)}</h2><p>${formatar(e.data)}${e.fim ? ` a ${formatar(e.fim)}` : ''}</p><p class="nota">Evento do calendário oficial do Senac. ${e.bloqueia === 'dia' ? 'Não há aula neste dia.' : 'Não bloqueia a aula.'}</p><button class="botao" type="button" id="ev-fechar">Fechar</button></div>`;
    dlg.onclick = (ev) => { if (ev.target.id === 'ev-fechar') dlg.close(); };
    dlg.showModal();
    return;
  }
  dlg.innerHTML = `
    <form class="form" id="form-evento">
      <h2>${id ? 'Editar evento' : 'Novo evento'}</h2>
      <label for="ev-titulo">O que é</label>
      <input id="ev-titulo" maxlength="80" value="${esc(e?.titulo ?? '')}" required>
      <label for="ev-data">Dia</label>
      <input id="ev-data" type="date" value="${esc(e?.data ?? dataInicial ?? hoje())}" required>
      <label for="ev-fim">Até (se durar mais de um dia)</label>
      <input id="ev-fim" type="date" value="${esc(e?.fim ?? '')}">
      <label for="ev-tipo">Tipo</label>
      <select id="ev-tipo">${['senac', 'pessoal', 'outro'].map((t) => `<option value="${t}" ${(e?.tipo ?? 'senac') === t ? 'selected' : ''}>${TIPOS[t]}</option>`).join('')}</select>
      <label for="ev-bloq">Efeito nas aulas</label>
      <select id="ev-bloq"><option value="nao" ${e?.bloqueia !== 'dia' ? 'selected' : ''}>Só um lembrete (as aulas continuam)</option><option value="dia" ${e?.bloqueia === 'dia' ? 'selected' : ''}>Não há aula nesse(s) dia(s)</option></select>
      <label for="ev-turmas">Vale para</label>
      <select id="ev-turmas"><option value="todas" ${!e?.turmas?.length ? 'selected' : ''}>Todas as turmas</option><option value="esta" ${e?.turmas?.length ? 'selected' : ''}>Só a turma ${esc(st.turma)}</option></select>
      <p class="erro" id="ev-msg"></p>
      <div class="linha-btn"><button class="botao" type="submit">Salvar</button><button class="botao secundario" type="button" id="ev-cancelar">Cancelar</button></div>
      ${id ? '<hr><button class="mini ruim" type="button" id="ev-apagar">Apagar evento</button>' : ''}
    </form>`;
  dlg.onclick = (ev) => {
    if (ev.target.id === 'ev-cancelar') dlg.close();
    if (ev.target.id === 'ev-apagar' && confirm('Apagar este evento?')) {
      updateDoc(refCal(), { [`eventos.${id}`]: deleteField() }).then(() => dlg.close()).catch(() => { document.getElementById('ev-msg').textContent = 'Não consegui apagar agora.'; });
    }
  };
  dlg.onsubmit = async (ev) => {
    if (ev.target.id !== 'form-evento') return;
    ev.preventDefault();
    const data = document.getElementById('ev-data').value;
    const fim = document.getElementById('ev-fim').value;
    if (fim && fim < data) { document.getElementById('ev-msg').textContent = 'O fim não pode ser antes do início.'; return; }
    const novo = { data, titulo: document.getElementById('ev-titulo').value.trim(), tipo: document.getElementById('ev-tipo').value, bloqueia: document.getElementById('ev-bloq').value };
    if (fim) novo.fim = fim;
    if (document.getElementById('ev-turmas').value === 'esta') novo.turmas = [st.turma];
    try { await updateDoc(refCal(), { [`eventos.${id || `e${Date.now().toString(36)}`}`]: novo }); dlg.close(); }
    catch { document.getElementById('ev-msg').textContent = 'Não consegui salvar agora.'; }
  };
  dlg.showModal();
}

function dialogoFase(st, dlg, faseId) {
  const p = planejar(st);
  const f = faseDe(p, faseId);
  const i = item(p, faseId);
  if (!f || !i) return;
  const confirmada = p.plano.confirmado?.[faseId];
  const turma = st.turmas.find((t) => t.id === st.turma);
  const datas = turma?.datas?.[faseId] ?? {};
  dlg.innerHTML = `
    <form class="form" id="form-cal-fase">
      <h2>${esc(f.codigo)} · ${esc(f.nome)}</h2>
      <p class="nota">Estado: ${esc(ESTADO_ROTULO[turma?.estadoFases?.[faseId] ?? 'trancada'])}${datas.aberta ? ` · aberta em ${formatar(datas.aberta)}` : ''}${datas.encerrada ? ` · encerrada em ${formatar(datas.encerrada)}` : ''}</p>
      ${confirmada ? `<p class="nota">Plano confirmado: dinâmica ${confirmada.din ? formatar(confirmada.din) : '—'}${confirmada.cons ? `, consolidação ${formatar(confirmada.cons)}` : ''}</p>` : ''}
      <label for="cf-din">Dinâmica (sala)</label>
      <input id="cf-din" type="date" value="${esc(i.din ?? '')}" required>
      ${f.tipo === 'chefao' ? '' : `<label for="cf-cons">Consolidação (laboratório)</label><input id="cf-cons" type="date" value="${esc(i.cons ?? '')}">`}
      <p class="nota">Ao fixar, as outras fases se reorganizam em volta, e você confirma o novo plano. ${i.fixaDin || i.fixaCons ? 'Esta fase está fixada.' : ''}</p>
      <p class="erro" id="cf-msg"></p>
      <div class="linha-btn"><button class="botao" type="submit">Fixar estas datas</button>
        ${i.fixaDin || i.fixaCons ? '<button class="botao secundario" type="button" id="cf-solta">Voltar ao automático</button>' : ''}
        <button class="botao secundario" type="button" id="cf-cancelar">Cancelar</button></div>
    </form>`;
  dlg.onclick = async (ev) => {
    if (ev.target.id === 'cf-cancelar') dlg.close();
    if (ev.target.id === 'cf-solta') {
      try { await updateDoc(refPlano(st.turma), { [`fixas.${faseId}`]: deleteField() }); dlg.close(); }
      catch { document.getElementById('cf-msg').textContent = 'Não consegui agora.'; }
    }
  };
  dlg.onsubmit = async (ev) => {
    if (ev.target.id !== 'form-cal-fase') return;
    ev.preventDefault();
    const din = document.getElementById('cf-din').value;
    const consEl = document.getElementById('cf-cons');
    const cons = consEl ? consEl.value : '';
    if (cons && cons <= din) { document.getElementById('cf-msg').textContent = 'A consolidação deve ser depois da dinâmica.'; return; }
    const fx = { din };
    if (cons) fx.cons = cons;
    try { await setDoc(refPlano(st.turma), { turma: st.turma, fixas: { [faseId]: fx }, atualizadoEm: serverTimestamp() }, { merge: true }); dlg.close(); }
    catch { document.getElementById('cf-msg').textContent = 'Não consegui salvar agora.'; }
  };
  dlg.showModal();
}

// editor do roteiro de um dia de uma fase
function dialogoRoteiro(st, dlg, faseId, tipo) {
  const doMundo = faseId === idFimDoMundo(MUNDO);
  const f = doMundo ? { codigo: 'Fim do mundo' } : st.fases.find((x) => x.id === faseId);
  if (!f) return;
  const atual = st.profTodas?.[faseId]?.cronograma?.[tipo] ?? PADRAO[tipo] ?? PADRAO.din;
  const blocos = atual.map((b) => ({ ...b }));
  const nome = NOME_ROTEIRO[tipo] ?? tipo;

  function pintar() {
    dlg.innerHTML = `
      <form class="form editor" id="form-roteiro">
        <h2>Roteiro · ${esc(f.codigo)} (${nome})</h2>
        <p class="nota">Escreva só o miolo da aula: a chamada (10 min) e o encerramento (5 min) entram sozinhos. O roteiro é o mesmo para todas as turmas; embaixo aparece como ele cabe no horário real de cada uma.</p>
        ${blocos.map((b, i) => `<fieldset class="card-ed"><legend>Bloco ${i + 1}${b.excel ? ' · Excel do dia' : ''}</legend>
          <div class="linha-btn"><input class="min-campo" type="number" min="1" max="200" data-i="${i}" data-f="min" value="${b.min}" aria-label="Minutos"><input data-i="${i}" data-f="titulo" value="${esc(b.titulo)}" placeholder="Título do bloco" aria-label="Título"></div>
          <textarea data-i="${i}" data-f="detalhe" rows="3" placeholder="O que fazer, o que dizer, perguntas">${esc(b.detalhe ?? '')}</textarea>
          <label class="check"><input type="checkbox" data-i="${i}" data-f="corta" ${b.corta ? 'checked' : ''}> Pode cortar se faltar tempo</label>
          ${i > 0 ? `<label class="check"><input type="checkbox" data-i="${i}" data-f="quebra" ${b.quebra ? 'checked' : ''}> Se a aula do dia for dividida, começa no segundo encontro</label>` : ''}
          <div class="linha-btn"><button type="button" class="mini" data-r="sobe" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="mini" data-r="desce" data-i="${i}" ${i === blocos.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="mini ruim" data-r="remove" data-i="${i}">Remover</button></div></fieldset>`).join('')}
        <button type="button" class="mini" data-r="add">+ Bloco</button>
        <p class="nota" id="r-total"></p>
        <ul class="nota" id="r-turmas"></ul>
        <p class="erro" id="r-msg"></p>
        <div class="linha-btn"><button class="botao" type="submit">Salvar roteiro</button><button class="botao secundario" type="button" id="r-cancelar">Cancelar</button>
        ${st.profTodas?.[faseId]?.cronograma?.[tipo] ? '<button class="mini" type="button" id="r-padrao">Voltar ao padrão</button>' : ''}</div>
      </form>`;
    totalizar();
  }
  function ler() {
    dlg.querySelectorAll('[data-f]').forEach((el) => {
      const k = el.dataset.f;
      blocos[Number(el.dataset.i)][k] = el.type === 'checkbox' ? el.checked : k === 'min' ? Number(el.value) || 0 : el.value;
    });
  }
  function totalizar() {
    ler();
    const el = document.getElementById('r-total');
    if (el) el.textContent = `Total: ${soma(blocos)} min de miolo.`;
    const ul = document.getElementById('r-turmas');
    if (ul) ul.innerHTML = resumoTurmas(st, blocos, tipo);
  }
  pintar();
  dlg.oninput = (e) => { if (e.target.dataset?.f) totalizar(); };
  dlg.onclick = async (ev) => {
    if (ev.target.id === 'r-cancelar') { dlg.close(); return; }
    if (ev.target.id === 'r-padrao' && confirm('Voltar ao roteiro padrão?')) {
      try { await updateDoc(doc(db, 'fasesProfessor', faseId), { [`professor.cronograma.${tipo}`]: deleteField() }); dlg.close(); } catch { document.getElementById('r-msg').textContent = 'Não consegui agora.'; }
      return;
    }
    const b = ev.target.closest('[data-r]');
    if (!b) return;
    ler();
    const i = Number(b.dataset.i);
    if (b.dataset.r === 'add') blocos.push({ min: 10, titulo: '', detalhe: '' });
    else if (b.dataset.r === 'remove') { if (!confirm('Remover este bloco?')) return; blocos.splice(i, 1); }
    else if (b.dataset.r === 'sobe' && i > 0) [blocos[i - 1], blocos[i]] = [blocos[i], blocos[i - 1]];
    else if (b.dataset.r === 'desce' && i < blocos.length - 1) [blocos[i + 1], blocos[i]] = [blocos[i], blocos[i + 1]];
    pintar();
  };
  dlg.onsubmit = async (ev) => {
    if (ev.target.id !== 'form-roteiro') return;
    ev.preventDefault();
    ler();
    const limpos = blocos.filter((b) => String(b.titulo).trim()).map((b) => ({
      min: b.min, titulo: String(b.titulo).trim(), detalhe: String(b.detalhe ?? '').trim(),
      ...(b.excel ? { excel: true } : {}), ...(b.corta ? { corta: true } : {}), ...(b.quebra ? { quebra: true } : {}),
    }));
    if (!limpos.length) { document.getElementById('r-msg').textContent = 'Coloque ao menos um bloco com título.'; return; }
    try {
      await setDoc(doc(db, 'fasesProfessor', faseId), { mundo: MUNDO, professor: { cronograma: { [tipo]: limpos } }, atualizadoEm: serverTimestamp() }, { merge: true });
      dlg.close();
    } catch { document.getElementById('r-msg').textContent = 'Não consegui salvar agora.'; }
  };
  dlg.showModal();
}

// ---------- ações da aba ----------
// Devolve true quando tratou a ação.
export async function tratarAgenda(acao, b, ctx) {
  const { st, dlg, desenhar, mudarEstado, irParaFase } = ctx;
  const self = { tratar: (a, el) => tratarAgenda(a, el, ctx) };
  switch (acao) {
    case 'cal-bim': {
      st.calBim = Number(b.dataset.id);
      const bim = st.cal.bimestres.find((x) => x.id === st.calBim);
      st.calMes = bim ? bim.inicio.slice(0, 7) : st.calMes;
      desenhar();
      return true;
    }
    case 'cal-mes': {
      const delta = Number(b.dataset.d);
      let [a, m] = (st.calMes ?? hoje().slice(0, 7)).split('-').map(Number);
      if (delta === 0) { st.calMes = hoje().slice(0, 7); } else { m += delta; if (m < 1) { m = 12; a -= 1; } if (m > 12) { m = 1; a += 1; } st.calMes = `${a}-${String(m).padStart(2, '0')}`; }
      const bim = bimestreDe(st.cal, `${st.calMes}-15`);
      if (bim) st.calBim = bim.id;
      desenhar();
      return true;
    }
    case 'cal-dia': abrirDia(st, dlg, b.dataset.d, self); return true;
    case 'cal-evento': dialogoEvento(st, dlg, b.dataset.id || '', b.dataset.d); return true;
    case 'cal-fase': dialogoFase(st, dlg, b.dataset.id); return true;
    case 'cal-roteiro': dialogoRoteiro(st, dlg, b.dataset.id, b.dataset.k); return true;
    case 'cal-ver-fase': irParaFase(b.dataset.id); return true;
    case 'cal-abrir':
      if (confirm('Abrir esta fase para a turma agora?')) await mudarEstado(b.dataset.id, 'aberta');
      return true;
    case 'cal-seg': await ctx.alternarSegunda(b.dataset.id); return true;
    case 'cal-confirmar': {
      const p = planejar(st);
      const mapa = Object.fromEntries(p.ag.itens.filter((i) => i.din).map((i) => [i.faseId, { din: i.din, cons: i.cons ?? null }]));
      await setDoc(refPlano(st.turma), { turma: st.turma, confirmado: mapa, confirmadoEm: serverTimestamp() }, { merge: true });
      return true;
    }
    case 'cal-config': {
      const horarios = { ...(st.plano?.horarios ?? {}) };
      for (const dow of [1, 2, 3, 4, 5]) {
        const el = document.getElementById(`cal-h${dow}`);
        if (!el) continue;
        const h = lerHorario(el.value);
        if (h.length) horarios[String(dow)] = h; else delete horarios[String(dow)];
      }
      // setDoc com merge mescla mapas: para apagar um dia, o mapa inteiro é regravado com updateDoc
      await setDoc(refPlano(st.turma), {
        turma: st.turma, diaDin: Number(document.getElementById('cal-din').value), diaCons: Number(document.getElementById('cal-cons').value), atualizadoEm: serverTimestamp(),
      }, { merge: true });
      await updateDoc(refPlano(st.turma), { horarios });
      return true;
    }
    default: return false;
  }
}

// Importa o calendário oficial (arquivo JSON) para o banco.
export async function importarCalendario(arquivo, falha) {
  let json;
  try { json = JSON.parse(await arquivo.text()); } catch { falha('Esse arquivo não é um JSON válido.'); return; }
  if (json?.formato !== 1 || !Array.isArray(json.bimestres) || !json.bimestres.length) { falha('Esse arquivo não está no formato do calendário.'); return; }
  await setDoc(doc(db, 'calendario', String(json.ano ?? ANO)), {
    ano: json.ano ?? ANO, bimestres: json.bimestres, semAula: json.semAula ?? [], eventos: json.eventos ?? {}, atualizadoEm: serverTimestamp(),
  });
  falha('Calendário carregado.');
}
