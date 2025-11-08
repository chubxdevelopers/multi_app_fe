import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal Vite config for the React frontend
export default defineConfig({
	plugins: [react()],
	server: {
		port: 5173
	}
});
