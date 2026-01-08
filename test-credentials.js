// Simple test script to verify credentials reading
const { CredentialsManager } = require('./src/lib/credentials-manager.ts');

async function testCredentials() {
  console.log('🔍 Testing credentials manager...');
  
  try {
    // Auto-detect credentials file
    const manager = await CredentialsManager.autoDetectCredentialsFile();
    
    if (!manager) {
      console.log('❌ No credentials file found');
      return;
    }
    
    console.log('✅ Credentials file detected');
    
    // Load all credentials
    const credentials = await manager.getAllCredentials();
    
    console.log(`📊 Found ${credentials.length} site credentials:`);
    
    credentials.forEach((cred, index) => {
      console.log(`  ${index + 1}. ${cred.siteName} (${cred.username})`);
      if (cred.url) {
        console.log(`     URL: ${cred.url}`);
      }
      if (cred.notes) {
        console.log(`     Notes: ${cred.notes}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing credentials:', error.message);
  }
}

testCredentials();