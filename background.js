// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
    // 设置默认配置
    chrome.storage.sync.get([
        'baseUrl',
        'modelId',
        'systemPrompt'
    ], (items) => {
        if (!items.baseUrl) {
            chrome.storage.sync.set({
                baseUrl: 'https://api.openai.com/v1'
            });
        }
        if (!items.modelId) {
            chrome.storage.sync.set({
                modelId: 'gpt-4'
            });
        }
        if (!items.systemPrompt) {
            chrome.storage.sync.set({
                systemPrompt: '你是一个学术搜索助手。你的任务是帮助用户将他们的研究需求转化为专业的学术搜索关键词。请分析用户的描述，识别相关研究领域，并提供1-3组专业的搜索关键词组合。每组关键词应该简洁且具有专业性。'
            });
        }
    });
}); 