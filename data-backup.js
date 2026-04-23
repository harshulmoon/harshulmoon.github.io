// ==================== DATA COLLECTOR ====================

const DataExporter = {
    
    // Collect all data from the site
    collectAllData: function() {
        return {
            version: "2.0",
            exportDate: new Date().toISOString(),
            siteName: "Noah's Tutoring Hub",
            exportType: "site-data",
            
            // All localStorage data
            localStorageData: this.getAllLocalStorage(),
            
            // All sessionStorage data
            sessionStorageData: this.getAllSessionStorage(),
            
            // All cookies
            cookiesData: this.getAllCookies(),
            
            // Favorites/custom data
            favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
            
            // Settings
            settings: {
                selectedTheme: localStorage.getItem('selectedTheme') || 'default',
                selectedBackground: localStorage.getItem('selectedBackground') || 'default',
                customThemeColor: localStorage.getItem('customThemeColor') || null,
                cursorEnabled: localStorage.getItem('cursorEnabled') || 'true',
                cursorStyle: localStorage.getItem('cursorStyle') || 'default',
                inactiveTabTitle: localStorage.getItem('inactiveTabTitle') || 'Home',
                inactiveTabFavicon: localStorage.getItem('inactiveTabFavicon') || null,
                customLogo: localStorage.getItem('customLogo') || null,
                flashEnabled: localStorage.getItem('flashEnabled') || 'true',
                lastSearchTerm: localStorage.getItem('lastSearchTerm') || '',
                sortMethod: localStorage.getItem('sortMethod') || 'default'
            },
            
            // Metadata
            metadata: {
                browser: navigator.userAgent,
                language: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                exportMethod: 'Noah\'s Tutoring Hub Data Export v2.0'
            }
        };
    },
    
    // Get ALL localStorage items
    getAllLocalStorage: function() {
        const data = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    data[key] = localStorage.getItem(key);
                }
            }
        } catch(e) {
            console.warn('localStorage error:', e);
        }
        return data;
    },
    
    // Get ALL sessionStorage items
    getAllSessionStorage: function() {
        const data = {};
        try {
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key) {
                    data[key] = sessionStorage.getItem(key);
                }
            }
        } catch(e) {
            console.warn('sessionStorage error:', e);
        }
        return data;
    },
    
    // Get ALL cookies
    getAllCookies: function() {
        const cookies = {};
        try {
            document.cookie.split(';').forEach(cookie => {
                const [name, value] = cookie.split('=');
                if (name && name.trim()) {
                    try {
                        cookies[name.trim()] = decodeURIComponent(value.trim());
                    } catch(e) {
                        cookies[name.trim()] = value.trim();
                    }
                }
            });
        } catch(e) {
            console.warn('Cookie error:', e);
        }
        return cookies;
    }
};

// ==================== EXPORT FUNCTIONS ====================

function analyzeExport() {
    try {
        const data = DataExporter.collectAllData();
        const analysis = analyzeData(data);
        
        document.getElementById('exportSummary').style.display = 'block';
        document.getElementById('gamesCount').textContent = analysis.gameCount;
        document.getElementById('itemsCount').textContent = analysis.itemCount;
        document.getElementById('fileSize').textContent = analysis.sizeKB.toFixed(2);
        document.getElementById('walletBalance').textContent = 
            localStorage.getItem('wallet_balance') || '0';
        
        showStatus('exportStatus', 
            `✓ Ready to export! Found ${analysis.itemCount} saved items.`, 
            'success');
    } catch(error) {
        showStatus('exportStatus', '✗ Analysis failed: ' + error.message, 'error');
    }
}

function exportData() {
    try {
        const allData = DataExporter.collectAllData();
        
        // Create backup before exporting
        createAutoBackup(allData);
        
        // Convert to JSON
        const jsonString = JSON.stringify(allData, null, 2);
        
        // Create file
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `noahs-tutoring-backup-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showStatus('exportStatus', 
            `✓ Backup downloaded successfully!\nFile: noahs-tutoring-backup-${Date.now()}.json`, 
            'success');
        
    } catch(error) {
        showStatus('exportStatus', '✗ Export failed: ' + error.message, 'error');
        console.error('Export error:', error);
    }
}

function analyzeData(data) {
    let itemCount = 0;
    let gameCount = 0;
    
    // Count localStorage items
    if (data.localStorageData) {
        itemCount = Object.keys(data.localStorageData).length;
        
        // Identify games
        const gameKeywords = ['game', 'PvZ', 'funkin', 'gd_', 'vcsky', 'ejs', 'sm64'];
        gameCount = Object.keys(data.localStorageData).filter(key =>
            gameKeywords.some(keyword => key.toLowerCase().includes(keyword))
        ).length;
    }
    
    const sizeKB = new Blob([JSON.stringify(data)]).size / 1024;
    
    return { gameCount, itemCount, sizeKB };
}

// ==================== IMPORT FUNCTIONS ====================

// Preview file when selected
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('importFile');
    
    fileInput.addEventListener('change', function(e) {
        if (this.files[0]) {
            previewImport();
        }
    });
    
    // Drag and drop support
    fileInput.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        this.style.border = '2px solid #667eea';
        this.style.background = '#f0f4ff';
    });
    
    fileInput.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.border = '2px dashed #667eea';
        this.style.background = 'transparent';
    });
    
    fileInput.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.border = '2px dashed #667eea';
        this.style.background = 'transparent';
        
        const files = e.dataTransfer.files;
        if (files[0]) {
            this.files = files;
            const event = new Event('change', { bubbles: true });
            this.dispatchEvent(event);
        }
    });
    
    loadAutoBackups();
});

function previewImport() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showStatus('importStatus', '✗ Please select a file', 'error');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            // Validate
            if (!data.localStorageData) {
                throw new Error('Invalid backup file format');
            }
            
            // Show preview
            const itemCount = Object.keys(data.localStorageData).length;
            
            document.getElementById('importSummary').style.display = 'block';
            document.getElementById('importDate').textContent = 
                new Date(data.exportDate).toLocaleString();
            document.getElementById('importSite').textContent = data.siteName || 'Unknown';
            document.getElementById('importItemCount').textContent = itemCount;
            
            showStatus('importStatus', 
                `✓ Valid backup file! Contains ${itemCount} saved items.\n` +
                `Ready to restore. Click "Restore All Data" to proceed.`, 
                'info');
            
        } catch(error) {
            showStatus('importStatus', '✗ Invalid file: ' + error.message, 'error');
            console.error('Preview error:', error);
        }
    };
    
    reader.readAsText(file);
}

function importData() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showStatus('importStatus', '✗ Please select a file first', 'error');
        return;
    }
    
    // Confirm before overwriting
    if (!confirm(
        '⚠️ This will OVERWRITE all your current data!\n\n' +
        'Make sure you have a backup.\n\n' +
        'Continue?'
    )) {
        showStatus('importStatus', 'Import cancelled', 'warning');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Create backup of current data FIRST
            const currentData = DataExporter.collectAllData();
            createAutoBackup(currentData);
            
            // Import localStorage
            if (importedData.localStorageData) {
                Object.keys(importedData.localStorageData).forEach(key => {
                    localStorage.setItem(key, importedData.localStorageData[key]);
                });
            }
            
            // Import sessionStorage
            if (importedData.sessionStorageData) {
                Object.keys(importedData.sessionStorageData).forEach(key => {
                    sessionStorage.setItem(key, importedData.sessionStorageData[key]);
                });
            }
            
            // Import settings
            if (importedData.settings) {
                Object.keys(importedData.settings).forEach(key => {
                    if (importedData.settings[key]) {
                        localStorage.setItem(key, importedData.settings[key]);
                    }
                });
            }
            
            showStatus('importStatus', 
                '✓ Data restored successfully!\nReloading page in 2 seconds...', 
                'success');
            
            setTimeout(() => {
                location.reload();
            }, 2000);
            
        } catch(error) {
            showStatus('importStatus', 
                '✗ Import failed: ' + error.message, 
                'error');
            console.error('Import error:', error);
        }
    };
    
    reader.readAsText(file);
}

// ==================== AUTO-BACKUP SYSTEM ====================

function createAutoBackup(data) {
    try {
        const backups = JSON.parse(localStorage.getItem('_autoBackups') || '[]');
        
        const backup = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleString(),
            itemCount: Object.keys(data.localStorageData || {}).length,
            data: data
        };
        
        // Keep only last 5 backups
        backups.unshift(backup);
        if (backups.length > 5) {
            backups.pop();
        }
        
        localStorage.setItem('_autoBackups', JSON.stringify(backups));
        loadAutoBackups();
        console.log('✓ Auto-backup created');
    } catch(error) {
        console.error('Backup error:', error);
    }
}

function loadAutoBackups() {
    try {
        const backups = JSON.parse(localStorage.getItem('_autoBackups') || '[]');
        const backupList = document.getElementById('backupList');
        
        if (backups.length === 0) {
            backupList.innerHTML = 
                '<p style="color: #999; text-align: center; padding: 20px;">No auto-backups found yet.</p>';
            return;
        }
        
        backupList.innerHTML = backups.map((backup, index) => `
            <div class="backup-item">
                <div>
                    <strong>#${index + 1}</strong> - ${backup.date}
                    <br>
                    <small style="color: #999;">${backup.itemCount} items</small>
                </div>
                <button class="restore-btn" onclick="restoreBackup(${backup.id})">Restore</button>
            </div>
        `).join('');
        
    } catch(error) {
        console.error('Load backups error:', error);
    }
}

function restoreBackup(backupId) {
    try {
        const backups = JSON.parse(localStorage.getItem('_autoBackups') || '[]');
        const backup = backups.find(b => b.id === backupId);
        
        if (!backup) {
            showStatus('importStatus', '✗ Backup not found', 'error');
            return;
        }
        
        if (!confirm(`Restore backup from ${backup.date}?`)) {
            return;
        }
        
        // Restore data
        const data = backup.data;
        
        if (data.localStorageData) {
            Object.keys(data.localStorageData).forEach(key => {
                localStorage.setItem(key, data.localStorageData[key]);
            });
        }
        
        showStatus('importStatus', 
            '✓ Backup restored! Reloading in 2 seconds...', 
            'success');
        
        setTimeout(() => {
            location.reload();
        }, 2000);
        
    } catch(error) {
        showStatus('importStatus', '✗ Restore failed: ' + error.message, 'error');
        console.error('Restore error:', error);
    }
}

function clearAllBackups() {
    if (confirm('Delete ALL auto-backups? This cannot be undone.')) {
        localStorage.removeItem('_autoBackups');
        loadAutoBackups();
        showStatus('exportStatus', '✓ All auto-backups cleared', 'success');
    }
}

// ==================== AUTO-BACKUP TOGGLE ====================

function toggleAutoBackup() {
    const isEnabled = localStorage.getItem('_autoBackupEnabled') === 'true';
    
    if (!isEnabled) {
        localStorage.setItem('_autoBackupEnabled', 'true');
        startAutoBackupInterval();
        showStatus('exportStatus', 
            '✓ Auto-backup enabled! Backups every 30 minutes.', 
            'success');
    } else {
        localStorage.setItem('_autoBackupEnabled', 'false');
        showStatus('exportStatus', '✓ Auto-backup disabled', 'info');
    }
    
    updateAutoBackupButton();
}

function startAutoBackupInterval() {
    // Auto-backup every 30 minutes
    setInterval(() => {
        if (localStorage.getItem('_autoBackupEnabled') === 'true') {
            const data = DataExporter.collectAllData();
            createAutoBackup(data);
            console.log('⏱️ Auto-backup interval triggered');
        }
    }, 30 * 60 * 1000); // 30 minutes
}

function updateAutoBackupButton() {
    const isEnabled = localStorage.getItem('_autoBackupEnabled') === 'true';
    const btn = document.getElementById('autoBackupText');
    btn.textContent = isEnabled ? '✓ Auto-Backup Enabled' : '🔄 Enable Auto-Backup';
}

// Start auto-backup if enabled
window.addEventListener('load', function() {
    updateAutoBackupButton();
    if (localStorage.getItem('_autoBackupEnabled') === 'true') {
        startAutoBackupInterval();
    }
});

// ==================== UTILITY ====================

function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status ${type}`;
    element.style.display = 'block';
    
    if (type !== 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 6000);
    }
}
