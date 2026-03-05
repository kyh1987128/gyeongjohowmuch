import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'gyeongjohowmuch',
  brand: {
    displayName: '경조사비 얼마?',
    primaryColor: '#3182F6',
    icon: 'https://static.toss.im/appsintoss/22981/fc3dd057-af7c-4ff2-8876-1a6b47d6c839.png',
  },
  outdir: 'out',
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
  },
  permissions: [],
});