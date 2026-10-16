import { defineConfig } from 'vite';

// Set VITE_BASE_PATH=/repository-name/ for GitHub project Pages.
const base = process.env.VITE_BASE_PATH ?? '/';
if (!base.startsWith('/') || !base.endsWith('/')) {
  throw new Error('VITE_BASE_PATH must begin and end with /');
}
export default defineConfig({ base });
