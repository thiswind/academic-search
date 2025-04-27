# 学术论文智能搜索系统

这是一个基于LLM和谷歌学术的智能学术搜索工具，可以基于自然语言描述生成适合的搜索关键词，并从CCF推荐的期刊和会议中查找相关论文。

## 功能特点

1. 自然语言理解：用户可以用自然语言描述研究需求
2. 智能关键词生成：系统会自动生成多组搜索关键词组合
3. CCF期刊/会议过滤：只显示CCF推荐的高质量学术资源
4. 友好的用户界面：简洁明了的搜索结果展示

## 安装运行

### 使用conda创建环境

```bash
# 创建环境
conda create -n academic-search python=3.11
conda activate academic-search

# 安装依赖
pip install -r requirements.txt

# 运行应用
python app.py
```

然后在浏览器中访问：http://localhost:8000

## 使用方法

1. 在文本框中详细描述您的研究需求
2. 点击"分析并生成搜索方案"按钮
3. 从生成的关键词组合中选择一组进行搜索
4. 浏览符合CCF标准的搜索结果

## 技术栈

- 前端：HTML, CSS, JavaScript
- 后端：FastAPI, Python
- 大语言模型：OpenAI API
- 学术搜索：Scholarly API 