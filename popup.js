document.addEventListener('DOMContentLoaded', function() {
    // 加载保存的设置
    chrome.storage.sync.get([
        'apiKey',
        'baseUrl',
        'modelId',
        'systemPrompt'
    ], function(items) {
        document.getElementById('apiKey').value = items.apiKey || '';
        document.getElementById('baseUrl').value = items.baseUrl || 'https://api.openai.com/v1';
        document.getElementById('modelId').value = items.modelId || 'gpt-4';
        document.getElementById('systemPrompt').value = items.systemPrompt || document.getElementById('systemPrompt').value;
    });

    // 保存设置
    document.getElementById('saveButton').addEventListener('click', function() {
        const settings = {
            apiKey: document.getElementById('apiKey').value,
            baseUrl: document.getElementById('baseUrl').value,
            modelId: document.getElementById('modelId').value,
            systemPrompt: document.getElementById('systemPrompt').value
        };

        chrome.storage.sync.set(settings, function() {
            const status = document.getElementById('status');
            status.textContent = '设置已保存！';
            status.className = 'status success';
            status.style.display = 'block';
            setTimeout(function() {
                status.style.display = 'none';
            }, 2000);
        });
    });
}); 