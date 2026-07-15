#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let redisStartedByScript = false;
const containerName = 'applyai-redis-cache';
const queueContainerName = 'applyai-redis-queue';

function isContainerRunning(name) {
  try {
    const output = execSync(`docker ps --filter "name=${name}" --format "{{.State}}"`, {
      encoding: 'utf-8',
    }).trim();
    return output === 'running';
  } catch {
    return false;
  }
}

async function waitForHealthy(name, label) {
  console.log(`⏳ Waiting for ${label} to be ready...`);
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    try {
      execSync(`docker exec ${name} redis-cli ping`, { stdio: 'ignore' });
      console.log(`✅ ${label} is ready!`);
      return true;
    } catch {
      attempts++;
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  console.warn(`⚠️  ${label} health check timed out, but it may still be starting...`);
  return false;
}

async function checkAndStartRedis() {
  try {
    // Check if Docker is installed
    try {
      execSync('docker --version', { stdio: 'ignore' });
    } catch {
      console.warn('⚠️  Docker is not installed. Redis will not start automatically.');
      console.warn('   Please start Redis manually: cd infra/docker && docker-compose -f docker-compose.redis.yml up');
      return false;
    }

    // Check if both containers are already running
    const cacheRunning = isContainerRunning(containerName);
    const queueRunning = isContainerRunning(queueContainerName);

    if (cacheRunning && queueRunning) {
      console.log('✅ Redis (cache + queue) is already running');
      redisStartedByScript = false;
      return true;
    }

    // Try to start the Redis containers
    console.log('🚀 Starting Redis containers...');
    const dockerComposePath = path.resolve(__dirname, '../../..', 'infra/docker');

    try {
      // Modern docker compose (or docker-compose fallback)
      execSync(`cd "${dockerComposePath}" && docker compose -f docker-compose.redis.yml up -d`, {
        stdio: 'inherit',
      });
      console.log('✅ Redis containers started successfully');
      redisStartedByScript = true;

      const cacheReady = await waitForHealthy(containerName, 'Redis cache');
      const queueReady = await waitForHealthy(queueContainerName, 'Redis queue');

      return cacheReady && queueReady;
    } catch (error) {
      console.warn('⚠️  Could not start Redis containers automatically');
      console.warn('   You can start them manually with:');
      console.warn('   cd infra/docker && docker compose -f docker-compose.redis.yml up');
      return false;
    }
  } catch (error) {
    console.error('Error checking Redis:', error.message);
    return false;
  }
}

async function stopRedis() {
  if (!redisStartedByScript) {
    return;
  }

  try {
    console.log('\n🛑 Stopping Redis containers...');
    const dockerComposePath = path.resolve(__dirname, '../../..', 'infra/docker');
    execSync(`cd "${dockerComposePath}" && docker compose -f docker-compose.redis.yml down`, {
      stdio: 'inherit',
    });
    console.log('✅ Redis containers stopped successfully');
  } catch (error) {
    console.warn('⚠️  Could not stop Redis containers');
  }
}

async function startDevServer() {
  const devProcess = spawn('npx', ['tsx', 'watch', 'src/index.ts'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true,
  });

  const handleTermination = async (signal) => {
    console.log(`\n📍 Received ${signal}, cleaning up...`);
    await stopRedis();
    process.exit(0);
  };

  process.on('SIGINT', () => handleTermination('SIGINT'));
  process.on('SIGTERM', () => handleTermination('SIGTERM'));

  devProcess.on('exit', async (code) => {
    console.log(`\n📍 Dev server exited with code ${code}`);
    await stopRedis();
    process.exit(code || 0);
  });

  devProcess.on('error', async (error) => {
    console.error('Dev server error:', error);
    await stopRedis();
    process.exit(1);
  });
}

async function main() {
  console.log('🔧 Setting up API development environment...\n');
  const redisReady = await checkAndStartRedis();

  if (!redisReady) {
    console.log('⚠️  Redis is not fully available, but continuing with API startup...\n');
  }

  console.log('📦 Starting API dev server...\n');
  await startDevServer();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});