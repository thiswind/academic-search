// CCF分类数据
let ccfData = null;

// 聊天历史记录
let chatHistory = [];
const MAX_CHAT_HISTORY = 50;

// 加载CCF数据
fetch(chrome.runtime.getURL('ccf_categories.json'))
    .then(response => response.json())
    .then(data => {
        ccfData = data;
        processPapers();
    });

// 处理论文条目
function processPapers() {
    const papers = document.querySelectorAll('.gs_ri');
    papers.forEach(paper => {
        const venueElement = paper.querySelector('.gs_a');
        if (venueElement) {
            const venueText = venueElement.textContent;
            const ccfInfo = findCCFInfo(venueText);
            if (ccfInfo) {
                displayCCFInfo(paper, ccfInfo);
            }
        }
    });
}

// 查找CCF信息
function findCCFInfo(venueText) {
    if (!ccfData) return null;

    for (const category of ccfData.categories) {
        // 检查期刊
        for (const journal of category.journals) {
            if (venueText.includes(journal.abbreviation) || 
                venueText.toLowerCase().includes(journal.fullName.toLowerCase())) {
                return {
                    category: category.name,
                    venue: journal,
                    type: 'journal'
                };
            }
        }
        // 检查会议
        for (const conference of category.conferences) {
            if (venueText.includes(conference.abbreviation) || 
                venueText.toLowerCase().includes(conference.fullName.toLowerCase())) {
                return {
                    category: category.name,
                    venue: conference,
                    type: 'conference'
                };
            }
        }
    }
    return null;
}

// 显示CCF信息
function displayCCFInfo(paperElement, ccfInfo) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'ccf-info';
    infoDiv.innerHTML = `
        <span class="ccf-category">${ccfInfo.category}</span> | 
        ${ccfInfo.type === 'journal' ? '期刊' : '会议'}: 
        ${ccfInfo.venue.abbreviation} (${ccfInfo.venue.fullName}) | 
        出版商: ${ccfInfo.venue.publisher} | 
        <span class="ccf-level">CCF ${ccfInfo.venue.level}</span>
    `;
    paperElement.appendChild(infoDiv);
}

// 创建AI搜索框
function createAISearchBox() {
    const searchBox = document.createElement('div');
    searchBox.className = 'ai-search-box';
    searchBox.innerHTML = `
        <textarea placeholder="请描述您要搜索的研究内容..."></textarea>
        <button>获取搜索建议</button>
        <div class="keyword-suggestions"></div>
        <div class="chat-history"></div>
    `;

    // 插入到搜索框下方
    const searchForm = document.querySelector('#gs_hdr_frm');
    if (searchForm) {
        searchForm.parentNode.insertBefore(searchBox, searchForm.nextSibling);
    }

    // 绑定事件
    const button = searchBox.querySelector('button');
    button.addEventListener('click', () => {
        const textarea = searchBox.querySelector('textarea');
        getSearchSuggestions(textarea.value, searchBox);
    });

    // 加载聊天历史
    loadChatHistory();
    displayChatHistory(searchBox);
}

// 获取搜索建议
async function getSearchSuggestions(query, searchBox) {
    try {
        // 获取设置
        const settings = await new Promise(resolve => {
            chrome.storage.sync.get([
                'apiKey',
                'baseUrl',
                'modelId',
                'systemPrompt'
            ], resolve);
        });

        const response = await fetch(`${settings.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: settings.modelId,
                messages: [
                    {
                        role: 'system',
                        content: settings.systemPrompt
                    },
                    {
                        role: 'user',
                        content: query
                    }
                ]
            })
        });

        const data = await response.json();
        const suggestions = data.choices[0].message.content;

        // 保存到聊天历史
        saveChatHistory({
            role: 'user',
            content: query
        });
        saveChatHistory({
            role: 'assistant',
            content: suggestions
        });

        // 显示建议
        displaySuggestions(suggestions, searchBox);
        displayChatHistory(searchBox);

    } catch (error) {
        console.error('Error getting suggestions:', error);
        alert('获取搜索建议时出错，请检查API设置是否正确。');
    }
}

// 显示搜索建议
function displaySuggestions(suggestions, searchBox) {
    const suggestionsDiv = searchBox.querySelector('.keyword-suggestions');
    suggestionsDiv.innerHTML = '';

    // 将建议文本按行分割，每行作为一组关键词
    const keywordGroups = suggestions.split('\n').filter(group => group.trim());

    keywordGroups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'keyword-group';
        groupDiv.textContent = group;
        groupDiv.addEventListener('click', () => {
            // 点击时直接在Google Scholar中搜索
            const searchInput = document.querySelector('#gs_hdr_frm input[name="q"]');
            if (searchInput) {
                searchInput.value = group;
                document.querySelector('#gs_hdr_frm').submit();
            }
        });
        suggestionsDiv.appendChild(groupDiv);
    });
}

// 保存聊天历史
function saveChatHistory(message) {
    chatHistory.push({
        ...message,
        timestamp: new Date().toISOString()
    });

    // 保持最大限制
    if (chatHistory.length > MAX_CHAT_HISTORY) {
        chatHistory = chatHistory.slice(-MAX_CHAT_HISTORY);
    }

    // 保存到storage
    chrome.storage.local.set({ chatHistory });
}

// 加载聊天历史
function loadChatHistory() {
    chrome.storage.local.get(['chatHistory'], (result) => {
        if (result.chatHistory) {
            chatHistory = result.chatHistory;
        }
    });
}

// 显示聊天历史
function displayChatHistory(searchBox) {
    const historyDiv = searchBox.querySelector('.chat-history');
    historyDiv.innerHTML = '';

    chatHistory.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.role}-message`;
        messageDiv.textContent = `${message.content}`;
        historyDiv.appendChild(messageDiv);
    });

    // 滚动到底部
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

// 初始化
createAISearchBox();

// 监听URL变化，重新处理论文
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        processPapers();
    }
}).observe(document, { subtree: true, childList: true }); 