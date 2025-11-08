import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Minimal Vite config for the React frontend
export default defineConfig({
	plugins: [react()],
	server: {
		host: '192.168.1.14',
		port: 5173
	}
});
