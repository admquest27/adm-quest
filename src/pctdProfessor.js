// PCTD da Formação Técnica, na Agenda: planejamento do bimestre já preenchido a partir das fases e da Agenda,
// com cada semana editável, visualização na tela, download em .docx e um registro de mudanças para o ano seguinte.
import { doc, setDoc, serverTimestamp, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc, hoje } from './ui.js';
import { MAPA, curto } from './fechamento.js';
import { COMPETENCIAS, HABILIDADES } from './catalogo.js';
import { semanasDoBimestre, agendaAvaliativa, saberesPadrao, CAMPOS_SEMANA, pctdFtp } from './documentos.js';
import { MARCAS } from './registros.js';
import { roteiroDaFase, ANO } from './calendario.js';
import { formatar } from './agenda.js';

// Um documento por bimestre, só do professor (as regras de fasesProfessor valem para qualquer id).
export const idPctd = (bim) => `pctd_${bim}`;
export const cfgPctd = (st, bim) => st.profTodas?.[idPctd(bim)] ?? {};
const gravar = (bim, dados) => setDoc(doc(db, 'fasesProfessor', idPctd(bim)), { tipo: 'pctd', bim, professor: dados, atualizadoEm: serverTimestamp() }, { merge: true });
const linhas = (t) => String(t ?? '').split('\n').map(esc).join('<br>');
const negrito = (h) => h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

// O mesmo conteúdo do .docx, desenhado na tela como a folha do Word (A4 deitada, tabelas com as mesmas larguras).
export function htmlDocumento(blocos) {
  return blocos.map((b) => {
    if (b.tipo === 'titulo') return `<p class="d-titulo">${negrito(esc(b.texto))}</p>`;
    if (b.tipo === 'subtitulo') return `<p class="d-sub">${negrito(esc(b.texto))}</p>`;
    if (b.tipo === 'lista') return `<ul class="d-lista">${b.itens.map((t) => `<li>${negrito(esc(t))}</li>`).join('')}</ul>`;
    if (b.tipo === 'tabela') {
      const cab = b.cabecalho ?? 0;
      return `<table class="d-tab"><colgroup>${b.colunas.map((c) => `<col style="width:${c}cm">`).join('')}</colgroup>${b.linhas.map((cels, r) => {
        const sem = b.semanas && r >= cab ? ` data-acao="pc-ir-semana" data-n="${r - cab + 1}" class="d-semana" title="Editar esta semana"` : '';
        return `<tr${sem}>${cels.map((c) => {
          const cel = typeof c === 'object' && c !== null ? c : { texto: c };
          const tag = r < cab ? 'th' : 'td';
          return `<${tag}${cel.mesclar > 1 ? ` colspan="${cel.mesclar}"` : ''}${cel.negrito ? ' class="d-neg"' : ''}>${negrito(linhas(cel.texto))}</${tag}>`;
        }).join('')}</tr>`;
      }).join('')}</table>`;
    }
    return `<p>${negrito(esc(b.texto))}</p>`;
  }).join('');
}

export function htmlPctd(st, p) {
  const bim = p.b.id;
  const mapa = MAPA[bim];
  const cfg = cfgPctd(st, bim);
  const temFases = p.todas.length > 0;
  const ag = agendaAvaliativa({ p, habsDoBim: mapa.habs, integrada: cfg.integrada });
  const semanas = semanasDoBimestre({ p, roteiro: (f, tipo) => roteiroDaFase(st, f, tipo), marcas: MARCAS, habsDoBim: mapa.habs, editadas: cfg.semanas });
  const aberta = st.pctdSemana ?? null;
  const mudancas = [...(cfg.mudancas ?? [])].sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const saberes = cfg.saberes?.length ? cfg.saberes : saberesPadrao(bim);

  const modo = st.pctdModo === 'editar' ? 'editar' : 'doc';
  const alternar = `<div class="fc-passos">${[['doc', 'Ver o documento'], ['editar', 'Editar']].map(([id, r]) => `<button class="mini ${modo === id ? 'ok cheio' : ''}" data-acao="pc-modo" data-id="${id}">${r}</button>`).join('')}</div>`;
  if (modo === 'doc') {
    const turma = st.turmas?.find((t) => t.id === st.turma);
    const blocos = pctdFtp({ bim, turmaNome: turma?.nome || st.turma, ano: ANO, p, roteiro: (f, tipo) => roteiroDaFase(st, f, tipo), marcas: MARCAS, cfg, mundo: st.mundo?.ordem === bim ? st.mundo : null });
    return `${alternar}
      <p class="nota">Assim fica o documento que você baixa. Toque numa semana da tabela para editá-la; os outros campos ficam em "Editar". No celular, arraste a folha para os lados.</p>
      <div class="linha-btn"><button class="botao" data-acao="pc-docx">Baixar PCTD (.docx)</button></div>
      <p class="nota" id="pc-msg"></p>
      <div class="pc-doc-rolagem"><div class="pc-doc">${htmlDocumento(blocos)}</div></div>`;
  }

  const semana = (w) => {
    const ab = aberta === w.n;
    return `<li class="pc-semana ${ab ? 'aberta' : ''}" id="pc-sem-${w.n}">
      <button class="pc-sem-topo" data-acao="pc-semana" data-n="${w.n}" aria-expanded="${ab}">
        <strong>Semana ${w.n}</strong> <span class="nota">${esc(w.periodo)}</span>
        <span class="pc-resumo">${esc(w.resumo)}</span>${w.editados.length ? '<span class="chip">editada</span>' : ''}</button>
      ${ab ? `<div class="form">${CAMPOS_SEMANA.map(([k, rot]) => `<label for="pc-${k}-${w.n}">${esc(rot)}${w.editados.includes(k) ? ' <span class="nota">(editado)</span>' : ''}</label>
          <textarea id="pc-${k}-${w.n}" class="fc-edita" rows="${k === 'como' || k === 'oque' ? 6 : 3}" data-pc="semana" data-n="${w.n}" data-campo="${k}">${esc(w.campos[k])}</textarea>`).join('')}
        ${w.editados.length ? `<button class="mini" data-acao="pc-auto" data-n="${w.n}">Voltar ao texto automático desta semana</button>` : ''}</div>`
      : `<dl class="pc-ver">${CAMPOS_SEMANA.filter(([k]) => w.campos[k]).map(([k, rot]) => `<dt>${esc(rot)}</dt><dd>${linhas(w.campos[k]).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</dd>`).join('')}</dl>`}</li>`;
  };

  return `${alternar}<p class="nota">O PCTD da Formação Técnica do ${bim}º bimestre, montado a partir das fases e da Agenda. Ajuste o que quiser; tudo aparece em "Ver o documento" e no .docx. Toque numa semana para editar.</p>
    ${temFases ? '' : '<div class="alerta"><p>As fases deste bimestre ainda não foram cadastradas no jogo: as semanas aparecem só com as datas.</p></div>'}
    <div class="linha-btn"><button class="botao" data-acao="pc-docx">Baixar PCTD (.docx)</button></div>
    <p class="nota" id="pc-msg"></p>

    <section class="fc-bloco"><h3>Dados gerais</h3>
      <p class="nota">Técnico em Administração · ${esc(p.b.nome)} de ${ANO} · ${formatar(p.b.inicio, false)} a ${formatar(p.b.fim, false)} · reunião de fechamento em ${formatar(p.b.fechamento, false)}</p>
      <div class="form">
        <label for="pc-prof">Professor(es)</label><input id="pc-prof" class="fc-edita" data-pc="campo" data-campo="professores" value="${esc(cfg.professores ?? '')}" placeholder="Seu nome como aparece no PCTD">
        <label for="pc-sit">Nome da situação de ensino-aprendizagem</label><input id="pc-sit" class="fc-edita" data-pc="campo" data-campo="situacao" value="${esc(cfg.situacao ?? '')}" placeholder="${esc(st.mundo?.ordem === bim ? `${st.mundo.nome}: ${st.mundo.pergunta}` : '')}">
      </div></section>

    <h3>Semana a semana</h3>
    <ul class="pc-semanas">${semanas.map(semana).join('')}</ul>

    <section class="fc-bloco"><h3>Agenda avaliativa (linha da FTP)</h3>
      <ol class="pc-avs">${ag.avs.map((a) => `<li>${linhas(a)}</li>`).join('') || '<li class="vazio">Nenhuma fase com habilidade deste bimestre.</li>'}</ol>
      <p class="nota">Recuperação final: ${linhas(ag.recup) || 'semana da reunião de fechamento'}</p>
      <div class="form"><label for="pc-int">Avaliação integrada: instrumento e data</label><input id="pc-int" class="fc-edita" data-pc="campo" data-campo="integrada" value="${esc(cfg.integrada ?? '')}" placeholder="Por exemplo: Projeto integrador, 06/04">
        <label for="pc-intx">Avaliação integrada: descrição</label><textarea id="pc-intx" class="fc-edita" rows="3" data-pc="campo" data-campo="integradaTexto">${esc(cfg.integradaTexto ?? '')}</textarea></div></section>

    <section class="fc-bloco"><h3>Competências e habilidades</h3>
      ${mapa.comps.map((k) => `<p><strong>${esc(k)}</strong> · ${esc(COMPETENCIAS[k])}</p>
        <ul class="fc-habs">${mapa.habs.filter((h) => h.startsWith(k) && h.length > k.length).map((h) => `<li><span class="chip">${esc(curto(h))}</span> ${esc(HABILIDADES[h])}</li>`).join('')}</ul>`).join('')}
      <h3>Saberes do bimestre</h3>
      <div class="form"><label for="pc-sab">Um por linha${cfg.saberes?.length ? '' : ' (vindos das Orientações do curso)'}</label>
        <textarea id="pc-sab" class="fc-edita" rows="8" data-pc="campo" data-campo="saberes">${esc(saberes.join('\n'))}</textarea></div></section>

    <section class="fc-bloco"><h3>Registro de mudanças</h3>
      <p class="nota">O PCTD enviado à coordenação não precisa mudar. Anote aqui o que mudou de verdade ao longo do bimestre (uma fase que trocou de semana, uma dinâmica que não funcionou, uma ideia para o ano que vem), pensando em 2028.</p>
      <div class="form"><label for="pc-mud">O que mudou</label><textarea id="pc-mud" class="fc-edita" rows="3" placeholder="Por exemplo: a 1-4 foi para a semana 7 por causa do simulado; a votação ficou curta, dar mais tempo em 2028."></textarea>
        <label for="pc-mud-sem">Semana (opcional)</label><select id="pc-mud-sem"><option value="">sem semana</option>${semanas.map((w) => `<option value="${w.n}">Semana ${w.n} (${esc(w.periodo)})</option>`).join('')}</select></div>
      <div class="linha-btn"><button class="botao secundario" data-acao="pc-mudanca">Registrar mudança</button></div>
      <ul class="lista">${mudancas.map((m) => `<li class="pc-mud"><span><strong>${esc(formatar(m.data, false))}</strong>${m.semana ? ` · semana ${esc(m.semana)}` : ''}: ${esc(m.texto)}</span>
        <button class="mini" data-acao="pc-mud-apagar" data-id="${esc(m.id)}" aria-label="Apagar">✕</button></li>`).join('') || '<li class="vazio">Nenhuma mudança registrada.</li>'}</ul></section>`;
}

export async function tratarPctd(acao, b, { st, p, desenhar, turma }) {
  const bim = p.b.id;
  const cfg = cfgPctd(st, bim);
  const msg = (t) => { const el = document.getElementById('pc-msg'); if (el) el.textContent = t; };
  switch (acao) {
    case 'pc-modo': st.pctdModo = b.dataset.id; desenhar(); return true;
    case 'pc-ir-semana': {
      st.pctdModo = 'editar';
      st.pctdSemana = Number(b.dataset.n);
      desenhar();
      document.getElementById(`pc-sem-${b.dataset.n}`)?.scrollIntoView({ block: 'start' });
      return true;
    }
    case 'pc-semana': st.pctdSemana = st.pctdSemana === Number(b.dataset.n) ? null : Number(b.dataset.n); desenhar(); return true;
    case 'pc-auto': await gravar(bim, { semanas: { [b.dataset.n]: deleteField() } }); return true;
    case 'pc-mudanca': {
      const texto = document.getElementById('pc-mud')?.value.trim();
      if (!texto) return true;
      const semana = document.getElementById('pc-mud-sem')?.value ?? '';
      await gravar(bim, { mudancas: arrayUnion({ id: `${Date.now()}`, data: hoje(), semana, texto }) });
      return true;
    }
    case 'pc-mud-apagar': {
      const m = (cfg.mudancas ?? []).find((x) => x.id === b.dataset.id);
      if (m && confirm('Apagar esta mudança registrada?')) await gravar(bim, { mudancas: arrayRemove(m) });
      return true;
    }
    case 'pc-docx': {
      msg('Montando o PCTD...');
      try {
        const [{ gerarDocx, baixarArquivo, TIPO_DOCX }, { pctdFtp }] = await Promise.all([import('./arquivos.js'), import('./documentos.js')]);
        const blocos = pctdFtp({ bim, turmaNome: turma?.nome || st.turma, ano: ANO, p, roteiro: (f, tipo) => roteiroDaFase(st, f, tipo), marcas: MARCAS, cfg, mundo: st.mundo?.ordem === bim ? st.mundo : null });
        baixarArquivo(`PCTD FTP ${bim}o bimestre - ${turma?.nome || st.turma}.docx`, gerarDocx(blocos), TIPO_DOCX);
        msg('PCTD baixado. Ele está na pasta de downloads.');
      } catch { msg('Não consegui montar o documento agora.'); }
      return true;
    }
    default: return false;
  }
}

// Campos que salvam sozinhos ao sair deles.
export async function mudarPctd(el, st, p) {
  const tipo = el?.dataset?.pc;
  if (!tipo || !p) return false;
  const bim = p.b.id;
  if (tipo === 'semana') {
    await gravar(bim, { semanas: { [el.dataset.n]: { [el.dataset.campo]: el.value.trim() } } });
  } else if (tipo === 'campo') {
    const c = el.dataset.campo;
    await gravar(bim, { [c]: c === 'saberes' ? el.value.split('\n').map((s) => s.trim()).filter(Boolean) : el.value.trim() });
  }
  return true;
}
