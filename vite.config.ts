import { defineConfig } from 'vite';

// Сайт живёт по адресу https://apelsinchikov.github.io/it-office/,
// поэтому все пути к файлам начинаются с /it-office/.
export default defineConfig({
  base: '/it-office/',
  server: { host: true },
});
