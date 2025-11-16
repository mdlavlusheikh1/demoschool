#!/usr/bin/env node

/**
 * Vercel Deployment Automation Script
 * This script helps automate the Vercel deployment process
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Vercel Deployment Automation Script\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkCommand(command) {
  try {
    // Windows uses 'where', Unix uses 'which'
    const isWindows = process.platform === 'win32';
    const checkCmd = isWindows ? `where ${command}` : `which ${command}`;
    execSync(checkCmd, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function runCommand(command, description) {
  try {
    log(`\n📌 ${description}...`, 'cyan');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error: ${description} failed`, 'red');
    return false;
  }
}

// Step 1: Check prerequisites
log('\n📋 Step 1: Checking Prerequisites', 'blue');
log('─'.repeat(50), 'blue');

const hasGit = checkCommand('git');
const hasNode = checkCommand('node');
const hasNpm = checkCommand('npm');

if (!hasGit) {
  log('❌ Git is not installed. Please install Git first.', 'red');
  process.exit(1);
}
if (!hasNode) {
  log('❌ Node.js is not installed. Please install Node.js first.', 'red');
  process.exit(1);
}
if (!hasNpm) {
  log('❌ npm is not installed. Please install npm first.', 'red');
  process.exit(1);
}

log('✅ Git: Installed', 'green');
log('✅ Node.js: Installed', 'green');
log('✅ npm: Installed', 'green');

// Step 2: Check if Vercel CLI is installed
log('\n📋 Step 2: Checking Vercel CLI', 'blue');
log('─'.repeat(50), 'blue');

const hasVercel = checkCommand('vercel');

if (!hasVercel) {
  log('⚠️  Vercel CLI is not installed.', 'yellow');
  log('📦 Installing Vercel CLI globally...', 'cyan');
  
  if (!runCommand('npm install -g vercel', 'Installing Vercel CLI')) {
    log('❌ Failed to install Vercel CLI. Please install manually:', 'red');
    log('   npm install -g vercel', 'yellow');
    process.exit(1);
  }
} else {
  log('✅ Vercel CLI: Installed', 'green');
}

// Step 3: Check Git status
log('\n📋 Step 3: Checking Git Repository', 'blue');
log('─'.repeat(50), 'blue');

try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
  if (gitStatus.trim()) {
    log('⚠️  You have uncommitted changes.', 'yellow');
    log('📝 Current changes:', 'cyan');
    console.log(gitStatus);
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\n❓ Do you want to commit and push changes? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        runCommand('git add .', 'Staging changes');
        runCommand('git commit -m "Deploy to Vercel"', 'Committing changes');
        runCommand('git push', 'Pushing to remote');
      }
      readline.close();
      continueDeployment();
    });
  } else {
    log('✅ Git repository is clean', 'green');
    continueDeployment();
  }
} catch (error) {
  log('⚠️  Not a Git repository or Git not initialized.', 'yellow');
  log('💡 Tip: Initialize Git and push to GitHub first:', 'cyan');
  log('   git init', 'yellow');
  log('   git add .', 'yellow');
  log('   git commit -m "Initial commit"', 'yellow');
  log('   git remote add origin <your-github-repo-url>', 'yellow');
  log('   git push -u origin main', 'yellow');
  process.exit(1);
}

function continueDeployment() {
  // Step 4: Check environment variables
  log('\n📋 Step 4: Environment Variables Check', 'blue');
  log('─'.repeat(50), 'blue');
  
  const envFile = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    log('✅ Found .env.local file', 'green');
    log('💡 Make sure to add these variables to Vercel Dashboard:', 'cyan');
    log('   Project Settings → Environment Variables', 'yellow');
  } else {
    log('⚠️  .env.local file not found', 'yellow');
    log('💡 Create .env.local with your environment variables', 'cyan');
  }
  
  log('\n📋 Required Environment Variables:', 'cyan');
  log('   - NEXT_PUBLIC_FIREBASE_API_KEY', 'yellow');
  log('   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'yellow');
  log('   - NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'yellow');
  log('   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'yellow');
  log('   - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'yellow');
  log('   - NEXT_PUBLIC_FIREBASE_APP_ID', 'yellow');
  log('   - FIREBASE_ADMIN_PROJECT_ID', 'yellow');
  log('   - FIREBASE_ADMIN_PRIVATE_KEY', 'yellow');
  log('   - FIREBASE_ADMIN_CLIENT_EMAIL', 'yellow');
  log('   - NEXT_PUBLIC_SCHOOL_ID', 'yellow');
  log('   - NEXT_PUBLIC_SCHOOL_NAME', 'yellow');
  log('\n📄 See VERCEL_ENV_VARIABLES.md for complete list', 'cyan');
  
  // Step 5: Build check
  log('\n📋 Step 5: Building Project', 'blue');
  log('─'.repeat(50), 'blue');
  
  if (!runCommand('npm run build', 'Building project')) {
    log('❌ Build failed. Please fix errors before deploying.', 'red');
    process.exit(1);
  }
  
  // Step 6: Deploy to Vercel
  log('\n📋 Step 6: Deploying to Vercel', 'blue');
  log('─'.repeat(50), 'blue');
  
  log('💡 Choose deployment method:', 'cyan');
  log('   1. Deploy to preview (vercel)', 'yellow');
  log('   2. Deploy to production (vercel --prod)', 'yellow');
  log('   3. Skip (deploy manually from Vercel Dashboard)', 'yellow');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('\n❓ Enter choice (1/2/3): ', (choice) => {
    if (choice === '1') {
      log('\n🚀 Deploying to preview...', 'cyan');
      runCommand('vercel', 'Deploying to Vercel preview');
    } else if (choice === '2') {
      log('\n🚀 Deploying to production...', 'cyan');
      runCommand('vercel --prod', 'Deploying to Vercel production');
    } else {
      log('\n📋 Manual Deployment Steps:', 'cyan');
      log('   1. Go to https://vercel.com/dashboard', 'yellow');
      log('   2. Click "Add New..." → "Project"', 'yellow');
      log('   3. Import your GitHub repository', 'yellow');
      log('   4. Add environment variables', 'yellow');
      log('   5. Click "Deploy"', 'yellow');
      log('\n📄 See DEPLOY_VERCEL.md for detailed guide', 'cyan');
    }
    readline.close();
    
    log('\n✅ Deployment process completed!', 'green');
    log('🎉 Check your Vercel dashboard for deployment status', 'green');
  });
}

