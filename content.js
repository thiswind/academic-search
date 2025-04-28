// CCF分类数据
let ccfData = null;

// 加载CCF数据
fetch(chrome.runtime.getURL('ccf_categories.json'))
    .then(response => response.json())
    .then(data => {
        ccfData = data;
        processPapers();
        // 增加定期检查新论文的功能
        setInterval(processPapers, 2000);
    })
    .catch(error => console.error('Error loading CCF data:', error));

// 处理论文条目
function processPapers() {
    console.log('Processing papers...');
    const papers = document.querySelectorAll('.gs_ri');
    papers.forEach(paper => {
        // 检查是否已经处理过
        if (paper.querySelector('.ccf-info')) return;
        
        const venueElement = paper.querySelector('.gs_a');
        if (venueElement) {
            const venueText = venueElement.textContent;
            console.log('Venue text:', venueText);
            const ccfInfo = findCCFInfo(venueText);
            if (ccfInfo) {
                console.log('CCF info found:', ccfInfo);
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

// 创建AI搜索按钮和框
function createAISearchFeature() {
    // 创建悬浮按钮
    const toggleButton = document.createElement('div');
    toggleButton.className = 'ai-search-toggle';
    toggleButton.innerHTML = 'AI';
    toggleButton.title = 'AI辅助搜索';
    document.body.appendChild(toggleButton);

    // 创建搜索框
    const searchBox = document.createElement('div');
    searchBox.className = 'ai-search-box';
    searchBox.innerHTML = `
        <span class="close-button">&times;</span>
        <h3>AI辅助搜索</h3>
        <textarea placeholder="请描述您要搜索的研究内容..."></textarea>
        <button>获取搜索建议</button>
        <div class="loader">
            <div class="spinner"></div>
            <p>正在生成搜索建议...</p>
        </div>
        <div class="keyword-suggestions"></div>
    `;
    document.body.appendChild(searchBox);

    // 绑定切换事件
    toggleButton.addEventListener('click', () => {
        searchBox.classList.toggle('visible');
    });

    // 绑定关闭按钮
    searchBox.querySelector('.close-button').addEventListener('click', () => {
        searchBox.classList.remove('visible');
    });

    // 绑定搜索事件
    const button = searchBox.querySelector('button');
    button.addEventListener('click', () => {
        const textarea = searchBox.querySelector('textarea');
        getSearchSuggestions(textarea.value, searchBox);
    });

    // 阻止事件冒泡
    searchBox.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // 点击其他地方关闭搜索框
    document.addEventListener('click', (e) => {
        if (!searchBox.contains(e.target) && e.target !== toggleButton) {
            searchBox.classList.remove('visible');
        }
    });
}

// 获取搜索建议
async function getSearchSuggestions(query, searchBox) {
    if (!query.trim()) {
        alert('请输入您要搜索的内容');
        return;
    }

    const loader = searchBox.querySelector('.loader');
    const suggestionsDiv = searchBox.querySelector('.keyword-suggestions');
    
    try {
        // 显示加载指示器
        loader.classList.add('visible');
        suggestionsDiv.innerHTML = '';

        // 获取设置
        const settings = await new Promise(resolve => {
            chrome.storage.sync.get([
                'apiKey',
                'baseUrl',
                'modelId',
                'systemPrompt'
            ], resolve);
        });

        // 检查API设置
        if (!settings.apiKey) {
            throw new Error('未设置API Key，请点击插件图标进行设置');
        }

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

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API请求失败: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const suggestions = data.choices[0].message.content;

        // 显示建议
        displaySuggestions(suggestions, searchBox);

    } catch (error) {
        console.error('Error getting suggestions:', error);
        suggestionsDiv.innerHTML = `<div class="error-message">出错: ${error.message}</div>`;
    } finally {
        // 隐藏加载指示器
        loader.classList.remove('visible');
    }
}

// 显示搜索建议
function displaySuggestions(suggestions, searchBox) {
    const suggestionsDiv = searchBox.querySelector('.keyword-suggestions');
    suggestionsDiv.innerHTML = '';

    // 将建议文本按行分割，每行作为一组关键词
    const keywordGroups = suggestions.split('\n').filter(group => group.trim());

    if (keywordGroups.length === 0) {
        suggestionsDiv.innerHTML = `<div class="no-suggestions">无法生成建议，请尝试更详细的描述</div>`;
        return;
    }

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

// 初始化
createAISearchFeature();

// 监听URL变化
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(processPapers, 1000); // 延迟一秒，等待页面加载
    }
}).observe(document, { subtree: true, childList: true }); 