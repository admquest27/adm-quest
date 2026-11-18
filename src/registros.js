// Atitudes (marcas formativas), conversas anotadas e radar da turma. Só para o professor.
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { esc } from './ui.js';

export const MARCAS = [
  { id: 'colaborativa', nome: 'Atitude colaborativa',
    positivas: ['Ajudou um colega com dificuldade', 'Ouviu as ideias do grupo', 'Dividiu as tarefas de forma justa', 'Incentivou quem estava mais quieto', 'Assumiu uma parte importante do trabalho'],
    atencao: ['Ficou de fora do grupo', 'Decidiu sozinho pelo grupo', 'Deixou o trabalho para os colegas', 'Interrompeu os colegas com frequência'] },
  { id: 'critica', nome: 'Visão crítica',
    positivas: ['Questionou com bons argumentos', 'Percebeu algo que ninguém tinha visto', 'Comparou com situações reais', 'Conferiu a informação antes de aceitar'],
    atencao: ['Aceitou a primeira resposta sem pensar', 'Copiou sem entender', 'Ficou só na opinião, sem argumento'] },
  { id: 'empreendedora', nome: 'Atitude empreendedora',
    positivas: ['Tomou a iniciativa', 'Propôs uma solução nova', 'Buscou informação por conta própria', 'Ofereceu ajuda sem precisar pedir'],
    atencao: ['Esperou alguém mandar', 'Desistiu na primeira dificuldade', 'Precisou ser chamado várias vezes para começar'] },
  { id: 'sustentavel', nome: 'Atitude sustentável',
    positivas: ['Pensou no coletivo', 'Cuidou dos materiais e do espaço', 'Usou os recursos com economia'],
    atencao: ['Desperdiçou materiais', 'Deixou o espaço desorganizado'] },
  { id: 'resultados', nome: 'Foco em resultados',
    positivas: ['Entregou no prazo', 'Foi além do que foi pedido', 'Manteve o foco até o fim', 'Revisou antes de entregar'],
    atencao: ['Deixou a tarefa pela metade', 'Entregou fora do prazo', 'Se distraiu com o celular durante a atividade'] },
  { id: 'tecnico', nome: 'Domínio técnico-científico',
    positivas: ['Usou bem os conceitos', 'Explicou com as próprias palavras', 'Aplicou o conceito numa situação nova', 'Usou o vocabulário da área'],
    atencao: ['Confundiu conceitos', 'Ainda não usa o vocabulário da área', 'Registro superficial no caderno'] },
];

const DIAS_RADAR = 14;

function ms(ts) {
  if (!ts) return Date.now(); // escrita ainda não confirmada: conta como agora
  return typeof ts.toMillis === 'function' ? ts.toMillis() : new Date(ts).getTime();
}

function dataCurta(ts) {
  return new Date(ms(ts)).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Alunos ativos há mais de duas semanas sem comentário nem conversa anotada.
export function calcularRadar(st) {
  const agora = Date.now();
  const dia = 86400000;
  const ultimo = {};
  for (const c of st.comentarios) ultimo[c.uid] = Math.max(ultimo[c.uid] ?? 0, ms(c.criadoEm));
  for (const a of st.anotacoes) ultimo[a.uid] = Math.max(ultimo[a.uid] ?? 0, ms(a.criadoEm));
  return st.alunos
    .filter((a) => a.turma === st.turma && a.status === 'ativo')
    .map((a) => {
      const entrou = a.dataEntrada ? new Date(`${a.dataEntrada}T12:00:00`).getTime() : 0;
      const ref = Math.max(ultimo[a.uid] ?? 0, entrou);
      return { aluno: a, dias: ref ? Math.floor((agora - ref) / dia) : null, nunca: !ultimo[a.uid] };
    })
    .filter((x) => x.dias === null || x.dias > DIAS_RADAR)
    .sort((x, y) => (y.dias ?? 9999) - (x.dias ?? 9999));
}

let aberto = null; // { st, dlg, uid, faseId, marca, visivel }

export function registrosAbertos() {
  return aberto !== null;
}

export function abrirRegistros(st, dlg, uid, faseId) {
  const aluno = st.alunos.find((x) => x.uid === uid);
  if (!aluno) return;
  aberto = { st, dlg, uid, faseId: faseId ?? null, marca: MARCAS[0].id, visivel: false };
  dlg.addEventListener('close', () => { aberto = null; }, { once: true });
  pintar();
  dlg.showModal();
}

function turmaDeTeste() {
  return aberto.st.turmas.find((t) => t.id === aberto.st.turma)?.teste === true;
}

function historico() {
  const { st, uid } = aberto;
  const itens = [
    ...st.comentarios.filter((c) => c.uid === uid).map((c) => ({ tipo: 'atitude', ...c })),
    ...st.anotacoes.filter((a) => a.uid === uid).map((a) => ({ tipo: 'conversa', ...a })),
  ].sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm));
  if (!itens.length) return '<li class="vazio">Nenhum registro ainda.</li>';
  return itens.map((i) => i.tipo === 'atitude' ? `
    <li class="reg ${i.tipoAtitude === 'atencao' ? 'atencao' : ''}">
      <span class="nota">${dataCurta(i.criadoEm)} · ${esc(i.marca)}${i.fase ? ` · ${esc(i.fase)}` : ''}</span>
      <p>${esc(i.texto)}</p>
      <button class="mini ${i.visivel ? 'ok' : ''}" data-reg="visivel" data-id="${esc(i.id)}" data-v="${i.visivel ? '1' : '0'}">${i.visivel ? 'O aluno vê ✓' : 'Só eu vejo'}</button>
      ${turmaDeTeste() ? `<button class="mini ruim" data-reg="apagar-c" data-id="${esc(i.id)}">Apagar</button>` : ''}
    </li>` : `
    <li class="reg conversa">
      <span class="nota">${dataCurta(i.criadoEm)} · conversa (só você vê)</span>
      <p>${esc(i.texto)}</p>
      ${turmaDeTeste() ? `<button class="mini ruim" data-reg="apagar-a" data-id="${esc(i.id)}">Apagar</button>` : ''}
    </li>`).join('');
}

function pintar() {
  const { st, dlg, uid, marca, visivel, faseId } = aberto;
  const a = st.alunos.find((x) => x.uid === uid);
  const m = MARCAS.find((x) => x.id === marca);
  dlg.innerHTML = `
    <div class="form registros">
      <h2>${esc(a.apelido)}${faseId ? ` <span class="nota">· ${esc(st.fases.find((f) => f.id === faseId)?.codigo ?? '')}</span>` : ''}</h2>
      <h3>Atitude</h3>
      <div class="marcas">${MARCAS.map((x) => `<button type="button" class="mini ${x.id === marca ? 'ok cheio' : ''}" data-reg="marca" data-id="${x.id}">${esc(x.nome.replace('Atitude ', '').replace('Domínio ', ''))}</button>`).join('')}</div>
      <label class="check"><input type="checkbox" id="reg-visivel" ${visivel ? 'checked' : ''}> Mostrar ao aluno</label>
      <p class="nota">Toque numa frase para registrar na hora.</p>
      <div class="frases">
        ${m.positivas.map((t) => `<button type="button" class="frase pos" data-reg="frase" data-tipo="positivo" data-t="${esc(t)}">${esc(t)}</button>`).join('')}
        ${m.atencao.map((t) => `<button type="button" class="frase atn" data-reg="frase" data-tipo="atencao" data-t="${esc(t)}">${esc(t)}</button>`).join('')}
      </div>
      <label for="reg-livre">Ou escreva (o ditado do teclado do celular ajuda)</label>
      <textarea id="reg-livre" rows="2" maxlength="500"></textarea>
      <button type="button" class="mini" data-reg="livre">Registrar atitude</button>
      <h3>Conversa com o aluno (só você vê)</h3>
      <textarea id="reg-conversa" rows="2" maxlength="1000" placeholder="O que vocês conversaram"></textarea>
      <button type="button" class="mini" data-reg="conversa">Anotar conversa</button>
      <p class="nota" id="reg-msg"></p>
      <h3>Histórico</h3>
      <ul class="lista" id="reg-hist">${historico()}</ul>
      <button class="botao" type="button" data-reg="fechar">Fechar</button>
    </div>`;
  dlg.onclick = tratar;
  dlg.onchange = (e) => { if (e.target.id === 'reg-visivel' && aberto) aberto.visivel = e.target.checked; };
}

// chamado pelo painel quando os dados mudam
export function atualizarRegistros() {
  if (!aberto) return;
  const h = document.getElementById('reg-hist');
  if (h) h.innerHTML = historico();
}

async function tratar(e) {
  const b = e.target.closest('[data-reg]');
  if (!b || !aberto) return;
  const { st, dlg, uid, faseId } = aberto;
  const msg = (t) => { const el = document.getElementById('reg-msg'); if (el) el.textContent = t; };
  const base = { uid, turma: st.turma, fase: faseId, criadoEm: serverTimestamp() };
  try {
    switch (b.dataset.reg) {
      case 'marca': aberto.visivel = document.getElementById('reg-visivel').checked; aberto.marca = b.dataset.id; pintar(); break;
      case 'frase': {
        const marca = MARCAS.find((x) => x.id === aberto.marca);
        await addDoc(collection(db, 'comentarios'), { ...base, marca: marca.nome, tipoAtitude: b.dataset.tipo, texto: b.dataset.t, visivel: document.getElementById('reg-visivel').checked });
        msg('Registrado ✓');
        break;
      }
      case 'livre': {
        const campo = document.getElementById('reg-livre');
        const texto = campo.value.trim();
        if (!texto) return;
        const marca = MARCAS.find((x) => x.id === aberto.marca);
        await addDoc(collection(db, 'comentarios'), { ...base, marca: marca.nome, tipoAtitude: 'livre', texto, visivel: document.getElementById('reg-visivel').checked });
        campo.value = ''; msg('Registrado ✓');
        break;
      }
      case 'conversa': {
        const campo = document.getElementById('reg-conversa');
        const texto = campo.value.trim();
        if (!texto) return;
        await addDoc(collection(db, 'anotacoes'), { ...base, texto });
        campo.value = ''; msg('Conversa anotada ✓');
        break;
      }
      case 'visivel': await updateDoc(doc(db, 'comentarios', b.dataset.id), { visivel: b.dataset.v !== '1' }); break;
      case 'apagar-c': if (confirm('Apagar este registro?')) await deleteDoc(doc(db, 'comentarios', b.dataset.id)); break;
      case 'apagar-a': if (confirm('Apagar esta anotação?')) await deleteDoc(doc(db, 'anotacoes', b.dataset.id)); break;
      case 'fechar': dlg.close(); break;
      default: break;
    }
  } catch { msg('Não consegui salvar agora.'); }
}
