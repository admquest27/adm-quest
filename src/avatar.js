// Catálogo de avatares. Os arquivos ficam em public/avatares/<fantasia>-<tom>.png.
// O jogo guarda só a escolha do aluno ({ fantasia, tom }), então a arte pode ser trocada
// depois sem perder nenhum avatar já escolhido.

export const FANTASIAS = [
  { id: 'bichinho', nome: 'Bichinho de bolso elétrico' },
  { id: 'cavaleiro', nome: 'Cavaleiro da força' },
  { id: 'mestre', nome: 'Mestre verdinho' },
  { id: 'corredor', nome: 'Corredor azul' },
  { id: 'minerador', nome: 'Minerador de blocos' },
  { id: 'encanador', nome: 'Encanador de bigode' },
  { id: 'aprendiz', nome: 'Aprendiz de magia' },
  { id: 'heroi', nome: 'Herói de túnica verde' },
];

// Cores de pele (claro ao escuro), só para mostrar nos botões.
export const TONS = ['#ffe0c2', '#f6c99c', '#e9aa72', '#c98550', '#a8683a', '#84502a'];

export function urlAvatar(av, tamanho = 'g') {
  const a = av && FANTASIAS.some((f) => f.id === av.fantasia) ? av : { fantasia: 'heroi', tom: 2 };
  const tom = Number.isInteger(a.tom) && a.tom >= 0 && a.tom < TONS.length ? a.tom : 2;
  return `${import.meta.env.BASE_URL}avatares/${a.fantasia}-${tom}.png`;
}

export function imgAvatar(av, classe = 'avatar') {
  return `<img class="${classe}" src="${urlAvatar(av)}" alt="" width="32" height="32">`;
}
