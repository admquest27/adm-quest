import { defineConfig } from 'vite';

// Identificador desta versão do site (data e hora da montagem). Também é gravado em versao.txt,
// para o site avisar quando houver uma versão nova.
const VERSAO = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

// O site fica em https://admquest27.github.io/adm-quest/
export default defineConfig({
  base: '/adm-quest/',
  define: { __VERSAO__: JSON.stringify(VERSAO) },
  build: { target: 'es2020' },
  plugins: [
    {
      name: 'versao',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'versao.txt', source: VERSAO });
      },
    },
  ],
});
