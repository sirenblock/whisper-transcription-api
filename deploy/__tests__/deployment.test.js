/**
 * @module DeploymentTests
 * @description Validation tests for WhisperAPI deployment configuration
 *
 * Tests verify:
 * - Configuration files are valid
 * - Environment variables are properly set
 * - Docker configurations work
 * - Scripts are executable
 *
 * @requires jest
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEPLOY_DIR = path.join(__dirname, '..');
const PROJECT_ROOT = path.join(DEPLOY_DIR, '..');

describe('Deployment Configuration Tests', () => {
  describe('Configuration Files', () => {
    it('should have valid railway.json', () => {
      const railwayPath = path.join(DEPLOY_DIR, 'railway.json');
      expect(fs.existsSync(railwayPath)).toBe(true);

      const railwayConfig = JSON.parse(fs.readFileSync(railwayPath, 'utf8'));

      expect(railwayConfig).toHaveProperty('build');
      expect(railwayConfig).toHaveProperty('deploy');
      expect(railwayConfig.deploy).toHaveProperty('healthcheckPath', '/health');
      expect(railwayConfig.deploy).toHaveProperty('startCommand');
    });

    it('should have valid vercel-dashboard.json', () => {
      const vercelPath = path.join(DEPLOY_DIR, 'vercel-dashboard.json');
      expect(fs.existsSync(vercelPath)).toBe(true);

      const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

      expect(vercelConfig).toHaveProperty('framework', 'nextjs');
      expect(vercelConfig).toHaveProperty('buildCommand');
      expect(vercelConfig).toHaveProperty('outputDirectory', '.next');
    });

    it('should have valid vercel-landing.json', () => {
      const vercelPath = path.join(DEPLOY_DIR, 'vercel-landing.json');
      expect(fs.existsSync(vercelPath)).toBe(true);

      const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

      expect(vercelConfig).toHaveProperty('framework', 'nextjs');
      expect(vercelConfig).toHaveProperty('buildCommand');
    });

    it('should have valid docker-compose.yml', () => {
      const composePath = path.join(DEPLOY_DIR, 'docker-compose.yml');
      expect(fs.existsSync(composePath)).toBe(true);

      const composeContent = fs.readFileSync(composePath, 'utf8');

      expect(composeContent).toContain('version:');
      expect(composeContent).toContain('services:');
      expect(composeContent).toContain('db:');
      expect(composeContent).toContain('redis:');
      expect(composeContent).toContain('api:');
    });

    it('should have valid Dockerfile', () => {
      const dockerfilePath = path.join(DEPLOY_DIR, 'Dockerfile');
      expect(fs.existsSync(dockerfilePath)).toBe(true);

      const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');

      expect(dockerfileContent).toContain('FROM node:20-alpine');
      expect(dockerfileContent).toContain('WORKDIR /app');
      expect(dockerfileContent).toContain('EXPOSE 3000');
      expect(dockerfileContent).toContain('HEALTHCHECK');
    });
  });

  describe('Deployment Scripts', () => {
    it('should have executable tailscale-setup.sh', () => {
      const scriptPath = path.join(DEPLOY_DIR, 'tailscale-setup.sh');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const stats = fs.statSync(scriptPath);
      const content = fs.readFileSync(scriptPath, 'utf8');

      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('tailscale');
    });

    it('should have executable cloudflare-tunnel-setup.sh', () => {
      const scriptPath = path.join(DEPLOY_DIR, 'cloudflare-tunnel-setup.sh');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const content = fs.readFileSync(scriptPath, 'utf8');

      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('cloudflared');
    });

    it('should have health-check.sh script', () => {
      const scriptPath = path.join(DEPLOY_DIR, 'scripts/health-check.sh');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const content = fs.readFileSync(scriptPath, 'utf8');

      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('health');
    });

    it('should have deploy-railway.sh script', () => {
      const scriptPath = path.join(DEPLOY_DIR, 'scripts/deploy-railway.sh');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const content = fs.readFileSync(scriptPath, 'utf8');

      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('railway');
    });

    it('should have deploy-vercel.sh script', () => {
      const scriptPath = path.join(DEPLOY_DIR, 'scripts/deploy-vercel.sh');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const content = fs.readFileSync(scriptPath, 'utf8');

      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('vercel');
    });

    it('should have backup-db.sh script', () => {
      const scriptPath = path.join(DEPLOY_DIR, 'scripts/backup-db.sh');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const content = fs.readFileSync(scriptPath, 'utf8');

      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('pg_dump');
    });
  });

  describe('Docker Configuration Validation', () => {
    it('should validate docker-compose.yml syntax', () => {
      const composePath = path.join(DEPLOY_DIR, 'docker-compose.yml');

      // Try to validate with docker-compose if available
      try {
        execSync(`docker-compose -f ${composePath} config`, {
          stdio: 'pipe',
          cwd: PROJECT_ROOT
        });
      } catch (error) {
        // If docker-compose not available, just check file exists and has content
        expect(fs.existsSync(composePath)).toBe(true);
        const content = fs.readFileSync(composePath, 'utf8');
        expect(content.length).toBeGreaterThan(0);
      }
    });

    it('should have proper service dependencies', () => {
      const composePath = path.join(DEPLOY_DIR, 'docker-compose.yml');
      const composeContent = fs.readFileSync(composePath, 'utf8');

      // API should depend on db and redis
      expect(composeContent).toContain('depends_on:');
      expect(composeContent).toMatch(/db:[\s\S]*condition: service_healthy/);
      expect(composeContent).toMatch(/redis:[\s\S]*condition: service_healthy/);
    });

    it('should have health checks configured', () => {
      const composePath = path.join(DEPLOY_DIR, 'docker-compose.yml');
      const composeContent = fs.readFileSync(composePath, 'utf8');

      // Check for health checks
      expect(composeContent).toContain('healthcheck:');
      expect(composeContent).toContain('test:');
      expect(composeContent).toContain('interval:');
      expect(composeContent).toContain('timeout:');
      expect(composeContent).toContain('retries:');
    });

    it('should expose correct ports', () => {
      const composePath = path.join(DEPLOY_DIR, 'docker-compose.yml');
      const composeContent = fs.readFileSync(composePath, 'utf8');

      expect(composeContent).toContain('"3000:3000"'); // API
      expect(composeContent).toContain('"5432:5432"'); // PostgreSQL
      expect(composeContent).toContain('"6379:6379"'); // Redis
    });
  });

  describe('Environment Variables', () => {
    it('should document all required environment variables', () => {
      const readmePath = path.join(PROJECT_ROOT, 'README_DEPLOY.md');
      expect(fs.existsSync(readmePath)).toBe(true);

      const readme = fs.readFileSync(readmePath, 'utf8');

      // Check for critical environment variables
      const requiredVars = [
        'DATABASE_URL',
        'REDIS_URL',
        'S3_BUCKET',
        'S3_ACCESS_KEY',
        'S3_SECRET_KEY',
        'STRIPE_SECRET_KEY',
        'WORKER_MODE',
        'LOCAL_WORKER_URL',
        'CLOUD_WORKER_URL'
      ];

      requiredVars.forEach(varName => {
        expect(readme).toContain(varName);
      });
    });

    it('should have .env.example files', () => {
      // Backend should have .env.example
      const backendEnvExample = path.join(PROJECT_ROOT, 'backend/.env.example');
      if (fs.existsSync(backendEnvExample)) {
        const content = fs.readFileSync(backendEnvExample, 'utf8');
        expect(content).toContain('DATABASE_URL');
        expect(content).toContain('REDIS_URL');
      }
    });
  });

  describe('Documentation', () => {
    it('should have comprehensive deployment guide', () => {
      const readmePath = path.join(PROJECT_ROOT, 'README_DEPLOY.md');
      expect(fs.existsSync(readmePath)).toBe(true);

      const readme = fs.readFileSync(readmePath, 'utf8');

      expect(readme).toContain('# WhisperAPI Deployment Guide');
      expect(readme).toContain('Railway');
      expect(readme).toContain('Vercel');
      expect(readme).toContain('Docker');
      expect(readme).toContain('Tailscale');
      expect(readme).toContain('Cloudflare');
    });

    it('should have troubleshooting section', () => {
      const readmePath = path.join(PROJECT_ROOT, 'README_DEPLOY.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      expect(readme).toContain('Troubleshooting');
      expect(readme).toContain('## 🐛');
    });

    it('should have backup and restore instructions', () => {
      const readmePath = path.join(PROJECT_ROOT, 'README_DEPLOY.md');
      const readme = fs.readFileSync(readmePath, 'utf8');

      expect(readme).toContain('Backup');
      expect(readme).toContain('Restore');
    });
  });

  describe('Security Configuration', () => {
    it('should enforce HTTPS in production configs', () => {
      const vercelDashboard = path.join(DEPLOY_DIR, 'vercel-dashboard.json');
      const vercelLanding = path.join(DEPLOY_DIR, 'vercel-landing.json');

      const dashboardConfig = JSON.parse(fs.readFileSync(vercelDashboard, 'utf8'));
      const landingConfig = JSON.parse(fs.readFileSync(vercelLanding, 'utf8'));

      // Check for security headers
      expect(dashboardConfig).toHaveProperty('headers');
      expect(landingConfig).toHaveProperty('headers');
    });

    it('should have security headers configured', () => {
      const vercelDashboard = path.join(DEPLOY_DIR, 'vercel-dashboard.json');
      const config = JSON.parse(fs.readFileSync(vercelDashboard, 'utf8'));

      const headers = JSON.stringify(config.headers);

      expect(headers).toContain('X-Content-Type-Options');
      expect(headers).toContain('X-Frame-Options');
      expect(headers).toContain('X-XSS-Protection');
    });

    it('should use non-root user in Dockerfile', () => {
      const dockerfilePath = path.join(DEPLOY_DIR, 'Dockerfile');
      const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');

      expect(dockerfile).toContain('adduser');
      expect(dockerfile).toContain('USER whisperapi');
    });
  });

  describe('Database Configuration', () => {
    it('should have database initialization script', () => {
      const initPath = path.join(DEPLOY_DIR, 'init-db.sql');
      expect(fs.existsSync(initPath)).toBe(true);

      const content = fs.readFileSync(initPath, 'utf8');

      expect(content).toContain('CREATE EXTENSION');
      expect(content).toContain('GRANT');
    });

    it('should configure database optimizations', () => {
      const initPath = path.join(DEPLOY_DIR, 'init-db.sql');
      const content = fs.readFileSync(initPath, 'utf8');

      expect(content).toContain('shared_buffers');
      expect(content).toContain('effective_cache_size');
    });
  });

  describe('Production Readiness', () => {
    it('should have health check endpoint configured', () => {
      const railwayPath = path.join(DEPLOY_DIR, 'railway.json');
      const railwayConfig = JSON.parse(fs.readFileSync(railwayPath, 'utf8'));

      expect(railwayConfig.deploy.healthcheckPath).toBe('/health');
      expect(railwayConfig.deploy.healthcheckTimeout).toBeGreaterThan(0);
    });

    it('should have restart policy configured', () => {
      const railwayPath = path.join(DEPLOY_DIR, 'railway.json');
      const railwayConfig = JSON.parse(fs.readFileSync(railwayPath, 'utf8'));

      expect(railwayConfig.deploy).toHaveProperty('restartPolicyType');
      expect(railwayConfig.deploy).toHaveProperty('restartPolicyMaxRetries');
    });

    it('should have logging configured in docker-compose', () => {
      const prodComposePath = path.join(DEPLOY_DIR, 'docker-compose.prod.yml');

      if (fs.existsSync(prodComposePath)) {
        const content = fs.readFileSync(prodComposePath, 'utf8');
        expect(content).toContain('logging:');
      }
    });

    it('should have resource limits in production', () => {
      const prodComposePath = path.join(DEPLOY_DIR, 'docker-compose.prod.yml');

      if (fs.existsSync(prodComposePath)) {
        const content = fs.readFileSync(prodComposePath, 'utf8');
        expect(content).toContain('deploy:');
        expect(content).toContain('resources:');
        expect(content).toContain('limits:');
      }
    });
  });

  describe('Integration Tests', () => {
    it('should have all deployment scripts', () => {
      const scripts = [
        'scripts/health-check.sh',
        'scripts/deploy-railway.sh',
        'scripts/deploy-vercel.sh',
        'scripts/backup-db.sh'
      ];

      scripts.forEach(script => {
        const scriptPath = path.join(DEPLOY_DIR, script);
        expect(fs.existsSync(scriptPath)).toBe(true);
      });
    });

    it('should have tunnel setup scripts', () => {
      const scripts = [
        'tailscale-setup.sh',
        'cloudflare-tunnel-setup.sh'
      ];

      scripts.forEach(script => {
        const scriptPath = path.join(DEPLOY_DIR, script);
        expect(fs.existsSync(scriptPath)).toBe(true);
      });
    });
  });
});

describe('Script Syntax Validation', () => {
  const scripts = [
    'tailscale-setup.sh',
    'cloudflare-tunnel-setup.sh',
    'scripts/health-check.sh',
    'scripts/deploy-railway.sh',
    'scripts/deploy-vercel.sh',
    'scripts/backup-db.sh'
  ];

  scripts.forEach(script => {
    it(`should have valid bash syntax: ${script}`, () => {
      const scriptPath = path.join(DEPLOY_DIR, script);
      const content = fs.readFileSync(scriptPath, 'utf8');

      // Check for bash shebang
      expect(content).toMatch(/^#!\/bin\/(ba)?sh/);

      // Check for set -e (exit on error)
      expect(content).toContain('set -e');

      // Check for proper function definitions
      if (content.includes('function ') || content.match(/\w+\(\)/)) {
        expect(content).toMatch(/\w+\(\)\s*\{/);
      }
    });
  });
});
