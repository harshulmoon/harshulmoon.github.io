// ==================== EXPORT FUNCTION ====================

function exportAllData() {
    try {
        // Collect all localStorage data
        const data = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            exportDate: new Date().toLocaleString(),
            localStorage: {},
            sessionStorage: {}
        };
        
        // Export localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data.localStorage[key] = localStorage.getItem(key);
        }
        
        // Export sessionStorage (optional - comment out if not needed)
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            data.sessionStorage[key] = sessionStorage.getItem(key);
        }
        
        // Create JSON string with formatting for readability
        const jsonString = JSON.stringify(data, null, 2);
        
        // Create blob and download link
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create temporary download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `player_data_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showStatus('✓ Data exported successfully! Check your downloads folder.', 'success');
        
    } catch (error) {
        showStatus('✗ Export failed: ' + error.message, 'error');
        console.error('Export error:', error);
    }
}

// ==================== IMPORT FUNCTION ====================

function importFromFile() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showStatus('✗ Please select a file first', 'error');
        return;
    }
    
    // Verify file type
    if (!file.name.endsWith('.json')) {
        showStatus('✗ Please select a valid .json file', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // Parse the JSON file
            const data = JSON.parse(e.target.result);
            
            // Validate data structure
            if (!data.localStorage) {
                throw new Error('Invalid data file format');
            }
            
            // Apply the imported data
            applyImportedData(data);
            
        } catch (error) {
            showStatus('✗ Invalid file format: ' + error.message, 'error');
            console.error('Import error:', error);
        }
    };
    
    reader.onerror = function() {
        showStatus('✗ Failed to read file', 'error');
    };
    
    // Read the file as text
    reader.readAsText(file);
}

// ==================== APPLY IMPORTED DATA ====================

function applyImportedData(data) {
    try {
        // Show confirmation dialog
        const confirmMessage = `This will overwrite your current data.\n\nImported data from: ${data.exportDate || 'Unknown date'}\n\nContinue?`;
        
        if (!confirm(confirmMessage)) {
            showStatus('Import cancelled', 'error');
            return;
        }
        
        // Optional: Create backup before importing
        createBackup();
        
        // Clear existing localStorage (optional - remove this line to merge data instead)
        localStorage.clear();
        
        // Import localStorage data
        if (data.localStorage) {
            Object.keys(data.localStorage).forEach(key => {
                localStorage.setItem(key, data.localStorage[key]);
            });
        }
        
        // Import sessionStorage data (optional)
        if (data.sessionStorage) {
            sessionStorage.clear();
            Object.keys(data.sessionStorage).forEach(key => {
                sessionStorage.setItem(key, data.sessionStorage[key]);
            });
        }
        
        showStatus('✓ Data imported successfully! Reloading page in 2 seconds...', 'success');
        
        // Clear the file input
        document.getElementById('importFile').value = '';
        
        // Reload page after 2 seconds to apply changes
        setTimeout(() => {
            location.reload();
        }, 2000);
        
    } catch (error) {
        showStatus('✗ Import failed: ' + error.message, 'error');
        console.error('Apply data error:', error);
    }
}

// ==================== UTILITY FUNCTIONS ====================

function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds (except for success messages before reload)
    if (!message.includes('Reloading')) {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }
}

// ==================== AUTO-BACKUP BEFORE IMPORT ====================

function createBackup() {
    try {
        const backupData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            backupData[key] = localStorage.getItem(key);
        }
        
        // Store backup with timestamp
        localStorage.setItem('_lastBackup', JSON.stringify({
            data: backupData,
            timestamp: Date.now(),
            date: new Date().toLocaleString()
        }));
        
        console.log('Backup created before import');
    } catch (error) {
        console.error('Backup failed:', error);
    }
}

// ==================== RESTORE FROM BACKUP ====================

function restoreFromBackup() {
    try {
        const backup = localStorage.getItem('_lastBackup');
        if (!backup) {
            alert('No backup found');
            return;
        }
        
        const backupData = JSON.parse(backup);
        
        if (confirm(`Restore backup from ${backupData.date}?`)) {
            Object.keys(backupData.data).forEach(key => {
                localStorage.setItem(key, backupData.data[key]);
            });
            alert('Backup restored!');
            location.reload();
        }
    } catch (error) {
        alert('Restore failed: ' + error.message);
    }
}

// ==================== DRAG & DROP SUPPORT (BONUS) ====================

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('importFile');
    const panel = document.querySelector('.import-section');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        panel.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        panel.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        panel.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    panel.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        panel.style.border = '3px solid #007bff';
        panel.style.backgroundColor = '#f0f8ff';
    }
    
    function unhighlight(e) {
        panel.style.border = '';
        panel.style.backgroundColor = '';
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            fileInput.files = files;
            showStatus('File ready to import. Click "Upload & Import Data" button.', 'success');
        }
    }
});
