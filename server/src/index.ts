import app from './app';
import config from './config';

// Start Server
const server = app.listen(config.port, () => {
  console.log(`🚀 LearnLoop AI Server running at http://localhost:${config.port}`);
  console.log(`📡 Health Check available at http://localhost:${config.port}/api/health`);
  console.log(`🤖 Gemini API Key configured: ${!!config.geminiApiKey ? 'Yes' : 'No (Offline Fallback Engine Ready)'}`);
});

export { app, server };
export default app;
