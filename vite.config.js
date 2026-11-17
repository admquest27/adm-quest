import { defineConfig } from 'vite';

// O site fica em https://admquest27.github.io/adm-quest/
export default defineConfig({
  base: '/adm-quest/',
  build: { target: 'es2020' },
});
