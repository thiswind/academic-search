// 示例查询
const exampleQueries = [
    "我想找一些关于深度学习在自然语言处理领域的最新研究，特别是关于大型语言模型的应用",
    "我关注数据库优化技术，尤其是面向高并发场景下的查询性能调优方法",
    "我想了解计算机视觉中目标检测的最新进展，特别是在复杂场景下的精确检测技术",
    "我对分布式系统和区块链技术的结合很感兴趣，希望找到相关的研究论文"
];

// 加载示例
function loadExample(index) {
    const textArea = document.getElementById('query');
    textArea.value = exampleQueries[index];
} 