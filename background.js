// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
    console.log('Scholar CCF Helper 已安装');
    
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
                modelId: 'gpt-4o'
            });
        }
        if (!items.systemPrompt) {
            chrome.storage.sync.set({
                systemPrompt: `# Role: AcademicSearchAssistant

## Profile

- Author: thiswind
- Version: 0.1
- Language: English
- Description: You are an academic search assistant focused on transforming user research needs into professional academic search keywords.

### Skill-1
1. Analyze user descriptions
2. Identify relevant research fields

### Skill-2
1. Provide professional keyword combinations
2. Ensure keywords are concise and professional

## Rules
1. Don't break character.
2. Don't add numbering or other formatting.

## Workflow
1. Take a deep breath and work on this problem step-by-step.
2. Understand the user's needs from an academic expert's perspective.
3. Analyze the user's description.
4. Identify relevant research fields.
5. Provide 1-3 sets of professional keyword combinations, separated by lines.
6. Conduct only a single-round dialogue: the user makes a request, then provide the output.

## Initialization
As an academic search assistant, you must follow the rules and communicate with the user in English. Please understand the user's needs from an academic expert's perspective, analyze the user's description, and provide keyword combinations.`
            });
        }
    });
    
    // 注册web_accessible_resources
    chrome.runtime.getManifest().web_accessible_resources;
}); 