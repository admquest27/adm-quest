// Peças compartilhadas pelas telas do professor.
import { esc } from './ui.js';
import { imgAvatar } from './avatar.js';
import { progId, contarTarefas, situacao } from './fases.js';
import { nomeDe, ordenarAlunos } from './alunos.js';

const ICONES = {
  hoje: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
  sala: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  alunos: '<circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 4-6 7-6s6 2 7 6M17 4a4 4 0 010 8M22 20c-.4-2.4-1.6-4-3.5-5"/>',
  planejar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  avaliar: '<path d="M5 3h14v18H5zM8.5 9l2 2 4-4M8.5 16h7"/>',
  ajustes: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  jogar: '<path d="M7 4l13 8-13 8z"/>',
};
export const icone = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[n]}</svg>`;

export const turmaAtual = (st) => st.turmas.find((t) => t.id === st.turma);
export const estadoDe = (st, faseId) => turmaAtual(st)?.estadoFases?.[faseId] ?? 'trancada';
export const ativosDaTurma = (st) => ordenarAlunos(st.alunos.filter((a) => a.turma === st.turma && a.status === 'ativo'));

const CORES = [8, 36, 96, 150, 188, 220, 262, 300, 336];
export function rosto(a) {
  if (a.avatar) return imgAvatar(a.avatar, 'avatar p');
  const n = [...String(a.uid ?? nomeDe(a))].reduce((s, c) => s + c.charCodeAt(0), 0);
  return `<span class="avatar p inicial" style="--h:${CORES[n % CORES.length]}">${esc(nomeDe(a).slice(0, 1).toUpperCase())}</span>`;
}

export const abas = (acao, atual, itens) => `<div class="px-abas" role="tablist">${itens.map(([id, rot]) => `<button type="button" role="tab" aria-selected="${id === atual}" data-acao="${acao}" data-v="${id}">${rot}</button>`).join('')}</div>`;

export function resumoFase(st, f) {
  const ativos = ativosDaTurma(st);
  let concluidas = 0; let faltas = 0; let validadas = 0; let presentes = 0; let paraValidar = 0;
  for (const a of ativos) {
    const id = progId(a.uid, f.id);
    const concluiu = st.progresso[id]?.concluida === true;
    const faltou = st.aval[id]?.faltou === true;
    if (concluiu) concluidas++;
    if (faltou) faltas++;
    if (st.aval[id]?.validada) validadas++;
    else if (concluiu) paraValidar++;
    if (!faltou || concluiu) presentes++;
  }
  return { total: ativos.length, concluidas, faltas, validadas, presentes, paraValidar };
}

// Em que pé está um aluno numa fase, do jeito que interessa na sala.
export function pontoDoAluno(st, f, uid) {
  const id = progId(uid, f.id);
  const p = st.progresso[id]; const v = st.aval[id];
  const { total, feitas } = contarTarefas(f, p);
  const sit = situacao(f, p, v, estadoDe(st, f.id));
  let ponto;
  if (v?.validada) ponto = ['validada', 'Validada', 'verde'];
  else if (p?.concluida) ponto = ['validar', 'Para validar', 'azul'];
  else if (v?.faltou) ponto = ['falta', 'Faltou', 'verm'];
  else if (sit === 'naoconcluida') ponto = ['parado', 'Não concluiu', 'ambar'];
  else if (feitas || sit === 'andamento') ponto = ['andando', 'Fazendo', 'ambar'];
  else ponto = ['parado', 'Não começou', ''];
  return { p, v, total, feitas, chave: ponto[0], rotulo: ponto[1], cor: ponto[2] };
}

export const tagMencao = (m) => `<span class="px-tag ${m === 'A' ? 'verde' : m === 'PA' ? 'ambar' : 'verm'}">${esc(m)}</span>`;

// Aviso curto no pé da tela, fora da área que é redesenhada.
let relogio = null;
export function aviso(texto, { desfazer = null, tempo = 2600 } = {}) {
  let el = document.getElementById('px-aviso');
  if (!el) { el = document.createElement('div'); el.id = 'px-aviso'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = `<span>${esc(texto)}</span>${desfazer ? '<button type="button">Desfazer</button>' : ''}`;
  if (desfazer) el.querySelector('button').onclick = () => { el.hidden = true; desfazer(); };
  el.hidden = false;
  clearTimeout(relogio);
  relogio = setTimeout(() => { el.hidden = true; }, tempo);
}
