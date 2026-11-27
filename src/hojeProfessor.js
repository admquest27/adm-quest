// Tela "Hoje": a aula do dia (ou a próxima), com o roteiro no horário da turma, e o que está esperando o professor.
import { esc, hoje } from './ui.js';
import { liberado, etapasDe } from './fases.js';
import { formatar } from './agenda.js';
import { planejar, roteiroDaFase, htmlBlocos, horarioDoTipo } from './calendario.js';
import { calcularRadar } from './registros.js';
import { diasDesde } from './backup.js';
import { nomeCurto } from './alunos.js';
import { turmaAtual, estadoDe, resumoFase } from './professorComum.js';

const TIPO = { din: 'Dinâmica na sala', cons: 'Segunda no laboratório' };

const pendencia = (cor, titulo, detalhe, rotulo, attrs) => `<li class="px-pend ${cor}"><div><strong>${titulo}</strong><small>${detalhe}</small></div><button type="button" class="px-btn" ${attrs}>${rotulo}</button></li>`;

function aula(st) {
  if (!st.cal) return `<section class="px-card"><h2>Calendário ainda não carregado</h2><p class="px-sub">Carregue o calendário oficial para ver a aula do dia.</p><button type="button" class="px-btn cheio" data-acao="ir" data-v="planejar" data-sub="calendario">Carregar calendário</button></section>`;
  const p = planejar({ ...st, calBim: null });
  const h = hoje();
  const doDia = (d) => p.dias.get(d)?.itens.find((i) => i.faseId && ['din', 'cons'].includes(i.tipo));
  let data = h; let it = doDia(h);
  if (!it) {
    const prox = [...p.dias.keys()].filter((d) => d > h && doDia(d)).sort()[0];
    data = prox; it = prox ? doDia(prox) : null;
  }
  const f = it ? st.fases.find((x) => x.id === it.faseId) : null;
  const semHoje = p.dias.get(h)?.semAula;
  if (!f) return `<section class="px-card"><h2>${semHoje ? `Sem aula hoje: ${esc(semHoje)}` : 'Nenhuma aula planejada à frente'}</h2><p class="px-sub">Neste bimestre não há mais fases no calendário.</p><button type="button" class="px-btn" data-acao="ir" data-v="planejar" data-sub="calendario">Abrir o calendário</button></section>`;
  const turma = turmaAtual(st);
  const est = estadoDe(st, f.id);
  const travadas = etapasDe(f).filter((e) => e.travada === true && !liberado(turma, f.id, e, 'travada')).length;
  const temSeg = etapasDe(f).some((e) => e.dia === 'seg');
  const segAberta = turma?.liberacoes?.[f.id]?.seg === true;
  const eHoje = data === h;
  return `<section class="px-card px-aula ${eHoje ? 'hoje' : ''}">
    <div class="px-aula-topo"><div><span class="px-tag ${eHoje ? 'azul' : ''}">${eHoje ? 'Aula de hoje' : `Próxima aula: ${formatar(data)}`}</span>
      <h2>${esc(f.codigo)} · ${esc(f.nome)}</h2><p class="px-sub">${TIPO[it.tipo]} · fase ${est === 'aberta' ? 'aberta para a turma' : est === 'encerrada' ? 'encerrada' : 'ainda fechada para os alunos'}</p></div>
      <button type="button" class="px-btn cheio" data-acao="ir-sala" data-id="${esc(f.id)}">Acompanhar na sala</button></div>
    <div class="px-linha">
      ${est === 'trancada' || est === 'adiada' ? `<button type="button" class="px-btn ouro" data-acao="abrir-fase" data-id="${esc(f.id)}">Abrir a fase para a turma</button>` : ''}
      ${temSeg && it.tipo === 'cons' ? `<button type="button" class="px-btn ${segAberta ? 'verde' : 'ouro'}" data-acao="cal-seg" data-id="${esc(f.id)}">${segAberta ? 'Parte de segunda liberada ✓' : 'Liberar a parte de segunda'}</button>` : ''}
      <button type="button" class="px-btn" data-acao="ir-fase" data-id="${esc(f.id)}">Material e edição${travadas ? ` · ${travadas} item(ns) travado(s)` : ''}</button>
    </div>
    <details class="px-roteiro" ${eHoje ? 'open' : ''}><summary>Roteiro da aula</summary>${htmlBlocos(roteiroDaFase(st, f, it.tipo), turma, horarioDoTipo(st.plano, it.tipo))}
      <button type="button" class="px-btn leve" data-acao="cal-roteiro" data-id="${esc(f.id)}" data-k="${it.tipo}">Editar este roteiro</button></details>
  </section>`;
}

export function htmlHoje(st) {
  if (!st.turmas.length) return '<h1>Bem-vindo</h1><section class="px-card"><h2>Comece criando uma turma</h2><button type="button" class="px-btn cheio" data-acao="ir" data-v="ajustes" data-sub="turmas">Criar turma</button></section>';
  const turma = turmaAtual(st);
  const lista = [];
  const pend = st.alunos.filter((a) => a.status === 'pendente' && !st.arquivadas?.some((t) => t.id === a.turma));
  const daqui = pend.filter((a) => a.turma === st.turma);
  if (pend.length) lista.push(pendencia('ambar', `${pend.length} cadastro(s) esperando aprovação`, daqui.length === pend.length ? daqui.map((a) => esc(nomeCurto(a))).join(', ') : `${daqui.length} nesta turma e ${pend.length - daqui.length} em outra`, 'Revisar', 'data-acao="ir" data-v="alunos"'));
  for (const f of st.fases.filter((x) => !x.arquivada && ['aberta', 'encerrada'].includes(estadoDe(st, x.id)))) {
    const r = resumoFase(st, f);
    if (r.paraValidar) lista.push(pendencia('azul', `${r.paraValidar} para validar`, `${esc(f.codigo)} · ${esc(f.nome)}`, 'Validar', `data-acao="ir-sala" data-id="${esc(f.id)}" data-filtro="validar"`));
  }
  const radar = calcularRadar(st);
  if (radar.length) lista.push(pendencia('verm', `${radar.length} aluno(s) sem registro há mais de duas semanas`, `${radar.slice(0, 3).map((x) => esc(nomeCurto(x.aluno))).join(', ')}${radar.length > 3 ? ` e mais ${radar.length - 3}` : ''}`, 'Ver', 'data-acao="ir-radar"'));
  if (st.cal && !st.plano?.horarios) lista.push(pendencia('', 'Horário real da turma não definido', 'Sem ele o roteiro não mostra a hora certa', 'Definir', 'data-acao="ir" data-v="planejar" data-sub="calendario"'));
  const dias = diasDesde(st.cfgBackup?.ultimo);
  if (dias === null || dias === undefined || dias > 7) lista.push(pendencia('ambar', dias === null || dias === undefined ? 'Nenhum backup feito ainda' : `Último backup há ${dias} dias`, 'Faça pelo menos um por semana', 'Fazer agora', 'data-acao="backup"'));
  const data = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return `<div><h1>${data.charAt(0).toUpperCase()}${data.slice(1)}</h1><p class="px-sub">${esc(turma?.nome ?? '')}</p></div>
    ${st.fases.length ? aula(st) : '<section class="px-card"><h2>Falta o conteúdo do jogo</h2><button type="button" class="px-btn cheio" data-acao="ir" data-v="ajustes" data-sub="conteudo">Importar conteúdo</button></section>'}
    <h2>Precisa de você</h2>
    <ul class="px-pends">${lista.join('') || '<li class="px-vazio">Tudo em dia.</li>'}</ul>`;
}
