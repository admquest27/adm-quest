// Cartão da fase do aluno: uma semana com duas partes (terça na sala, segunda no laboratório).
// Função pura: recebe os dados e devolve o HTML. Usada pelo aluno e pelo "ver como aluno".
import { esc } from './ui.js';
import {
  SITUACAO_ROTULO, contarTarefas, situacao, etapasDe, normMateriais, liberado, urlSegura, COMO, DIAS_FASE, diaDe, etapaLiberada,
} from './fases.js';

const links = (lista) => (lista ?? []).filter((l) => l?.url).map((l) => `<a class="link" href="${esc(urlSegura(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.titulo || l.url)}</a>`).join('');
const saibaMais = (txt) => (txt ? `<details class="mais"><summary>Saiba mais</summary><p>${esc(txt).replace(/\n/g, '<br>')}</p></details>` : '');
const dataCurta = (ts) => (ts?.toMillis ? new Date(ts.toMillis()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '');

function etapaHtml(it, n, ctx) {
  const { f, p, turma, editavel } = ctx;
  if (!etapaLiberada(turma, f.id, it)) return null;
  const marcavel = it.semMarcar !== true;
  const feita = p?.tarefas?.[it.id] === true;
  const dis = editavel ? '' : 'disabled';
  const campos = (it.campos ?? []).map((c) => `<label class="campo" for="r-${esc(it.id)}-${esc(c.id)}">${esc(c.rotulo)}${c.dica ? ` <span class="nota">${esc(c.dica)}</span>` : ''}</label>
    <textarea id="r-${esc(it.id)}-${esc(c.id)}" rows="2" maxlength="600" data-resp="${esc(it.id)}" data-campo="${esc(c.id)}" ${dis}>${esc(p?.respostas?.[it.id]?.[c.id] ?? '')}</textarea>`).join('');
  const camposOk = (it.campos ?? []).every((c) => (p?.respostas?.[it.id]?.[c.id] ?? '').trim());
  const faltaCampo = marcavel && (it.campos ?? []).length > 0 && !camposOk && !feita;
  const como = COMO[it.como];
  return `<li class="etapa ${feita ? 'feita' : ''} ${it.opcional ? 'opcional' : ''}" data-n="${n}">
    <p class="txt">${como ? `<span class="como" title="${como.rotulo}" aria-label="${como.rotulo}">${como.icone}</span> ` : ''}${esc(it.texto)}${it.opcional ? ' <span class="chip bonus">bônus</span>' : ''}</p>
    ${it.links?.length ? `<p class="links">${links(it.links)}</p>` : ''}
    ${campos ? `<div class="campos">${campos}</div>` : ''}
    ${saibaMais(it.saibaMais)}
    ${marcavel ? `<label class="check feito"><input type="checkbox" data-tarefa="${esc(it.id)}" ${feita ? 'checked' : ''} ${editavel && !faltaCampo ? '' : 'disabled'}> Feito</label>${faltaCampo && editavel ? '<span class="nota">Preencha os campos para marcar como feito.</span>' : ''}` : ''}
  </li>`;
}

export function htmlCartao(ctx) {
  const { f, p, a, est, mundo, recados, ver, editavel, aviso, turma } = ctx;
  const sit = situacao(f, p, a, est);
  const { total, feitas } = contarTarefas(f, p);
  const faltam = total - feitas;
  const habs = mundo?.habilidades ?? {};

  const criterios = (f.habilidades ?? []).map((cod) => {
    const c = f.criterios?.[cod] ?? {};
    return `<div class="crit"><strong>${esc(cod)}</strong> <span class="nota">${esc(habs[cod] ?? '')}</span>
      ${f.evidencias?.[cod] ? `<p class="nota">Evidência: ${esc(f.evidencias[cod])}</p>` : ''}
      <dl><dt>A</dt><dd>${esc(c.A ?? '')}</dd><dt>PA</dt><dd>${esc(c.PA ?? '')}</dd><dt>NA</dt><dd>${esc(c.NA ?? '')}</dd></dl></div>`;
  }).join('');

  const mencoes = a?.validada && a.mencoes && Object.values(a.mencoes).some(Boolean)
    ? `<div class="mencoes"><strong>Sua menção nesta fase</strong>${Object.entries(a.mencoes).filter(([, v]) => v).map(([cod, v]) => `<p>${esc(cod)}: <span class="chip m-${esc(v)}">${esc(v)}</span></p>`).join('')}</div>`
    : '';
  const recadosFase = (recados ?? []).filter((r) => r.fase === f.id);
  const htmlRecados = recadosFase.length ? `<div class="recados-fase"><strong>Recado do professor nesta fase</strong>${recadosFase.map((r) => `<p class="${r.tipoAtitude === 'atencao' ? 'atencao' : ''}"><span class="nota">${dataCurta(r.criadoEm)} · ${esc(r.marca)}</span><br>${esc(r.texto)}</p>`).join('')}</div>` : '';

  // etapas por dia, numeradas em sequência
  const todas = etapasDe(f);
  let n = 0;
  const partes = ['ter', 'seg'].map((dia) => {
    const lista = todas.filter((e) => diaDe(e) === dia);
    if (!lista.length) return '';
    const segFechada = dia === 'seg' && turma?.liberacoes?.[f.id]?.seg !== true;
    if (segFechada) {
      n += lista.length;
      return `<section class="parte-dia"><h2>${DIAS_FASE[dia]}</h2><p class="trava-dia"><span aria-hidden="true">🔒</span> Esta parte abre na segunda, no laboratório (${lista.length} etapa${lista.length > 1 ? 's' : ''}).</p></section>`;
    }
    const itens = lista.map((it) => {
      n += 1;
      return etapaHtml(it, n, ctx) ?? `<li class="etapa trava" data-n="${n}"><span aria-hidden="true">🔒</span> Aguarde o professor liberar esta etapa.</li>`;
    }).join('');
    return `<section class="parte-dia"><h2>${DIAS_FASE[dia]}</h2><ol class="etapas">${itens}</ol></section>`;
  }).join('');

  const usados = new Set(todas.map((e) => e.como).filter(Boolean));
  const legenda = usados.size ? `<p class="legenda-como">${[...usados].map((k) => COMO[k] ? `<span>${COMO[k].icone} ${COMO[k].rotulo}</span>` : '').join('')}</p>` : '';

  const materiais = normMateriais(f).map((m) => liberado(turma, f.id, m, 'travado')
    ? `<li>${links([m])}${m.descricao ? ` <span class="nota">${esc(m.descricao)}</span>` : ''}</li>`
    : '<li class="trava"><span aria-hidden="true">🔒</span> Material que o professor vai liberar durante a aula.</li>').join('');

  const faltou = a?.faltou && !p?.concluida;
  const podeConcluir = editavel && (faltam === 0 || p?.concluida === true);
  const pct = total ? Math.round((100 * feitas) / total) : 0;
  return `<section class="cartao largo esq">
    <button id="voltar" class="mini">← Fases</button>
    <h1>${esc(f.codigo)} · ${esc(f.nome)}</h1>
    <p class="centro-txt"><span class="chip sit-${sit}">${SITUACAO_ROTULO[sit]}</span>${est === 'encerrada' ? ' <span class="chip">Fase encerrada</span>' : ''}</p>
    ${faltou ? '<p class="banner">Você faltou na dinâmica desta fase, então ela ficou <strong>a fazer</strong>. Faça as etapas com ajuda do professor ou dos colegas e marque como concluída no fim.</p>' : ''}
    ${est === 'encerrada' && !editavel && !ver && !p?.concluida ? '<p class="banner">O professor encerrou esta fase. Se você precisa terminá-la, converse com ele.</p>' : ''}
    ${mencoes}${htmlRecados}
    <p class="missao">${esc(f.missao)}</p>
    ${total ? `<div class="progresso" aria-label="${feitas} de ${total} etapas feitas"><span style="width:${pct}%"></span></div><p class="nota centro-txt">${feitas} de ${total} etapas feitas</p>` : ''}
    ${legenda}
    ${partes}
    ${materiais ? `<h2>Material de apoio</h2><ul class="materiais">${materiais}</ul>` : ''}
    ${criterios ? `<details><summary>Como serei avaliado</summary>${criterios}</details>` : f.avaliacao ? `<p class="nota">${esc(f.avaliacao)}</p>` : ''}
    ${f.cartaoResumo ? `<details><summary>Resumo da fase</summary><p>${esc(f.cartaoResumo)}</p></details>` : ''}
    <p class="erro" id="msg">${esc(aviso ?? '')}</p>
    ${f.tipo === 'chefao' || ver ? '' : `<button id="concluir" class="botao ${p?.concluida ? 'secundario' : !podeConcluir ? 'parcial' : ''}" ${editavel ? '' : 'disabled'}>${p?.concluida ? 'Desmarcar como concluída' : 'Concluir a fase'}</button>
      ${!p?.concluida && faltam > 0 && editavel ? `<p class="nota centro-txt">Faltam ${faltam} etapa(s) para concluir.</p>` : ''}`}
  </section>`;
}
