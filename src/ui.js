export const app = document.getElementById('app');

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function tela(html, classe = '') {
  app.className = classe;
  app.innerHTML = html;
}

export function carregando(texto) {
  tela(`<p class="carregando">${esc(texto)}</p>`, 'centro');
}

export function hoje() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function guardar(chave, valor) {
  try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento: segue sem lembrar */ }
}

export function ler(chave) {
  try { return localStorage.getItem(chave); } catch { return null; }
}
