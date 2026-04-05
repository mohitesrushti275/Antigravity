#!/usr/bin/env node
/**
 * Environment Validation Script
 * Validates all required environment variables and AWS/S3 configuration
 */

import { S3Client, ListBucketsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

interface ValidationResult {
  category: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
  }>;
}

const results: ValidationResult[] = [];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(status: 'pass' | 'fail' | 'warn', message: string) {
  const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
  const color = status === 'pass' ? colors.green : status === 'warn' ? colors.yellow : colors.red;
  console.log(`${color}${icon} ${message}${colors.reset}`);
}

function addCheck(category: string, name: string, status: 'pass' | 'fail' | 'warn', message: string) {
  let categoryResult = results.find(r => r.category === category);
  if (!categoryResult) {
    categoryResult = { category, checks: [] };
    results.push(categoryResult);
  }
  categoryResult.checks.push({ name, status, message });
}

// ═══════════════════════════════════════════════════
// 1. Check Required Environment Variables
// ═══════════════════════════════════════════════════

async function checkEnvironmentVariables() {
  console.log(`\n${colors.blue}━━━ Checking Environment Variables ━━━${colors.reset}\n`);

  const required = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', category: 'Supabase' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', category: 'Supabase' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', category: 'Supabase' },
    { key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', category: 'Clerk' },
    { key: 'CLERK_SECRET_KEY', category: 'Clerk' },
    { key: 'AWS_REGION', category: 'AWS' },
    { key: 'AWS_ACCESS_KEY_ID', category: 'AWS' },
    { key: 'AWS_SECRET_ACCESS_KEY', category: 'AWS' },
    { key: 'S3_BUCKET_NAME', category: 'AWS' },
    { key: 'NEXT_PUBLIC_APP_URL', category: 'App' },
  ];

  const optional = [
    { key: 'ANTHROPIC_API_KEY', category: 'AI', feature: 'AI component generation' },
    { key: 'OPENAI_API_KEY', category: 'AI', feature: 'OpenAI features' },
    { key: 'NEXT_PUBLIC_CDN_URL', category: 'AWS', feature: 'CloudFront CDN' },
    { key: 'CLERK_WEBHOOK_SECRET', category: 'Clerk', feature: 'User sync webhooks' },
    { key: 'UPSTASH_REDIS_REST_URL', category: 'Cache', feature: 'Redis caching' },
    { key: 'UPSTASH_REDIS_REST_TOKEN', category: 'Cache', feature: 'Redis caching' },
    { key: 'RESEND_API_KEY', category: 'Email', feature: 'Email notifications' },
    { key: 'SENTRY_DSN', category: 'Monitoring', feature: 'Error tracking' },
    { key: 'CRON_SECRET', category: 'Security', feature: 'Cron job authentication' },
  ];

  // Check required variables
  for (const { key, category } of required) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      log('fail', `${key} is missing`);
      addCheck('Environment', key, 'fail', 'Required variable is missing');
    } else {
      log('pass', `${key} is set`);
      addCheck('Environment', key, 'pass', 'Variable is configured');
    }
  }

  // Check optional variables
  for (const { key, category, feature } of optional) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      log('warn', `${key} is missing (${feature} will be disabled)`);
      addCheck('Environment', key, 'warn', `Optional: ${feature} disabled`);
    } else {
      log('pass', `${key} is set`);
      addCheck('Environment', key, 'pass', `Optional: ${feature} enabled`);
    }
  }
}

// ═══════════════════════════════════════════════════
// 2. Validate AWS S3 Connection
// ═══════════════════════════════════════════════════

async function checkS3Connection() {
  console.log(`\n${colors.blue}━━━ Validating AWS S3 Connection ━━━${colors.reset}\n`);

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.S3_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey) {
    log('fail', 'AWS credentials not configured');
    addCheck('AWS S3', 'Credentials', 'fail', 'Missing AWS credentials');
    return;
  }

  try {
    const s3 = new S3Client({
      region: region || 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Test connection by listing buckets
    await s3.send(new ListBucketsCommand({}));
    log('pass', 'AWS credentials are valid');
    addCheck('AWS S3', 'Credentials', 'pass', 'Successfully authenticated');

    // Check if specific bucket exists
    if (bucketName) {
      try {
        await s3.send(new HeadBucketCommand({ Bucket: bucketName }));
        log('pass', `Bucket "${bucketName}" exists and is accessible`);
        addCheck('AWS S3', 'Bucket Access', 'pass', `Bucket ${bucketName} is accessible`);
      } catch (error: any) {
        if (error.name === 'NotFound') {
          log('fail', `Bucket "${bucketName}" does not exist`);
          addCheck('AWS S3', 'Bucket Access', 'fail', `Bucket ${bucketName} not found`);
        } else if (error.name === 'Forbidden') {
          log('fail', `No permission to access bucket "${bucketName}"`);
          addCheck('AWS S3', 'Bucket Access', 'fail', 'Insufficient permissions');
        } else {
          log('fail', `Error accessing bucket: ${error.message}`);
          addCheck('AWS S3', 'Bucket Access', 'fail', error.message);
        }
      }
    }
  } catch (error: any) {
    log('fail', `AWS connection failed: ${error.message}`);
    addCheck('AWS S3', 'Connection', 'fail', error.message);
  }
}

// ═══════════════════════════════════════════════════
// 3. Validate Supabase Connection
// ═══════════════════════════════════════════════════

async function checkSupabaseConnection() {
  console.log(`\n${colors.blue}━━━ Validating Supabase Connection ━━━${colors.reset}\n`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    log('fail', 'Supabase credentials not configured');
    addCheck('Supabase', 'Credentials', 'fail', 'Missing Supabase credentials');
    return;
  }

  try {
    const supabase = createClient(url, serviceKey);
    
    // Test connection by querying a table
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      log('fail', `Supabase connection failed: ${error.message}`);
      addCheck('Supabase', 'Connection', 'fail', error.message);
    } else {
      log('pass', 'Supabase connection successful');
      addCheck('Supabase', 'Connection', 'pass', 'Database is accessible');
    }
  } catch (error: any) {
    log('fail', `Supabase error: ${error.message}`);
    addCheck('Supabase', 'Connection', 'fail', error.message);
  }
}

// ═══════════════════════════════════════════════════
// 4. Print Summary
// ═══════════════════════════════════════════════════

function printSummary() {
  console.log(`\n${colors.blue}━━━ Validation Summary ━━━${colors.reset}\n`);

  let totalPass = 0;
  let totalWarn = 0;
  let totalFail = 0;

  for (const result of results) {
    const pass = result.checks.filter(c => c.status === 'pass').length;
    const warn = result.checks.filter(c => c.status === 'warn').length;
    const fail = result.checks.filter(c => c.status === 'fail').length;

    totalPass += pass;
    totalWarn += warn;
    totalFail += fail;

    console.log(`${result.category}:`);
    console.log(`  ${colors.green}✅ ${pass} passed${colors.reset}`);
    if (warn > 0) console.log(`  ${colors.yellow}⚠️  ${warn} warnings${colors.reset}`);
    if (fail > 0) console.log(`  ${colors.red}❌ ${fail} failed${colors.reset}`);
    console.log();
  }

  console.log(`${colors.blue}Total:${colors.reset}`);
  console.log(`  ${colors.green}✅ ${totalPass} passed${colors.reset}`);
  if (totalWarn > 0) console.log(`  ${colors.yellow}⚠️  ${totalWarn} warnings${colors.reset}`);
  if (totalFail > 0) console.log(`  ${colors.red}❌ ${totalFail} failed${colors.reset}`);

  if (totalFail > 0) {
    console.log(`\n${colors.red}⚠️  Some critical checks failed. Please fix the issues above.${colors.reset}`);
    process.exit(1);
  } else if (totalWarn > 0) {
    console.log(`\n${colors.yellow}⚠️  All critical checks passed, but some optional features are disabled.${colors.reset}`);
  } else {
    console.log(`\n${colors.green}✅ All checks passed! Your environment is properly configured.${colors.reset}`);
  }
}

// ═══════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════

async function main() {
  console.log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  21st.dev Environment Validator        ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);

  await checkEnvironmentVariables();
  await checkS3Connection();
  await checkSupabaseConnection();
  printSummary();
}

main().catch(error => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
