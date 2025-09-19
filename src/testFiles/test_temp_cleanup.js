import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5002/api/mockup';

/**
 * Test script for temporary file cleanup endpoints
 */
async function testTempCleanup() {
    console.log('🧪 Testing Temporary File Cleanup API\n');
    
    try {
        // Test 1: Check temp status before cleanup
        console.log('=== Test 1: Check Temp Status (Before Cleanup) ===');
        const statusResponse = await fetch(`${API_BASE_URL}/temp-status`);
        const statusData = await statusResponse.json();
        
        if (statusData.success) {
            console.log('✅ Temp status retrieved successfully');
            console.log(`📊 Total files: ${statusData.totalFiles}`);
            console.log(`📁 Directories: ${statusData.directories.length}`);
            
            statusData.directories.forEach(dir => {
                console.log(`  - ${dir.name}: ${dir.fileCount} files`);
            });
        } else {
            console.log('❌ Failed to get temp status:', statusData);
        }
        
        console.log('');
        
        // Test 2: Clear temp files
        console.log('=== Test 2: Clear Temp Files ===');
        const clearResponse = await fetch(`${API_BASE_URL}/clear-temp`, {
            method: 'POST'
        });
        const clearData = await clearResponse.json();
        
        if (clearData.success) {
            console.log('✅ Temp files cleared successfully');
            console.log(`🧹 Cleared ${clearData.clearedFiles} files`);
            console.log(`📁 Affected directories: ${clearData.clearedDirectories.length}`);
            
            clearData.clearedDirectories.forEach(dir => {
                console.log(`  - ${dir.directory}: ${dir.filesCleared} files cleared`);
            });
        } else {
            console.log('❌ Failed to clear temp files:', clearData);
        }
        
        console.log('');
        
        // Test 3: Check temp status after cleanup
        console.log('=== Test 3: Check Temp Status (After Cleanup) ===');
        const statusResponse2 = await fetch(`${API_BASE_URL}/temp-status`);
        const statusData2 = await statusResponse2.json();
        
        if (statusData2.success) {
            console.log('✅ Temp status retrieved successfully');
            console.log(`📊 Total files: ${statusData2.totalFiles}`);
            console.log(`📁 Directories: ${statusData2.directories.length}`);
            
            if (statusData2.totalFiles === 0) {
                console.log('🎉 All temporary files have been cleared!');
            } else {
                console.log('⚠️  Some files remain in temp directories');
                statusData2.directories.forEach(dir => {
                    if (dir.fileCount > 0) {
                        console.log(`  - ${dir.name}: ${dir.fileCount} files remaining`);
                    }
                });
            }
        } else {
            console.log('❌ Failed to get temp status:', statusData2);
        }
        
        console.log('\n🏁 Temp cleanup tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testTempCleanup();
}

export { testTempCleanup };
